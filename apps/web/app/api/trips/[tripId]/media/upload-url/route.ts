import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { requireTripAccess } from '@/lib/auth/guards';
import { env } from '@/lib/env';
import { MediaTypes } from '@/lib/db/models';

/**
 * API Response interface.
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Upload URL response data.
 */
interface UploadUrlData {
  uploadUrl: string;
  publicId: string;
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  resourceType: 'image' | 'video';
}

/**
 * Route context with params.
 */
interface RouteContext {
  params: Promise<{ tripId: string }>;
}

/**
 * Validate ObjectId format.
 */
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Schema for upload URL request.
 */
const UploadUrlRequestSchema = z.object({
  type: z.enum(MediaTypes, {
    errorMap: () => ({ message: 'Invalid type: must be photo or video' }),
  }),
});

/**
 * Generate a unique public ID for Cloudinary.
 */
function generatePublicId(tripId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `trips/${tripId}/${timestamp}_${random}`;
}

/**
 * Generate Cloudinary signature for signed uploads.
 * Cloudinary signature = SHA-1(params_to_sign + api_secret)
 */
function generateCloudinarySignature(
  paramsToSign: Record<string, string | number>,
  apiSecret: string
): string {
  // Sort params alphabetically and join with &
  const sortedParams = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&');

  // Generate SHA-1 hash
  const hash = createHash('sha1');
  hash.update(sortedParams + apiSecret);
  return hash.digest('hex');
}

/**
 * POST /api/trips/[tripId]/media/upload-url
 *
 * Generate a signed Cloudinary upload URL.
 * Client uploads directly to Cloudinary, then calls POST /media with result.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<UploadUrlData>>> {
  try {
    const { tripId } = await context.params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Check trip access
    try {
      await requireTripAccess(tripId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
      throw error;
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = UploadUrlRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return NextResponse.json(
        { success: false, error: `Invalid request: ${firstError.path.join('.')} - ${firstError.message}` },
        { status: 400 }
      );
    }

    const { type } = parseResult.data;

    // Determine resource type based on media type
    const resourceType = type === 'photo' ? 'image' : 'video';

    // Generate unique public ID
    const publicId = generatePublicId(tripId);

    // Generate timestamp
    const timestamp = Math.floor(Date.now() / 1000);

    // Folder for organization
    const folder = `trips/${tripId}`;

    // Parameters to sign (alphabetically sorted for Cloudinary)
    const paramsToSign = {
      folder,
      public_id: publicId,
      timestamp,
    };

    // Generate signature
    const signature = generateCloudinarySignature(
      paramsToSign,
      env.CLOUDINARY_API_SECRET
    );

    // Build upload URL
    const uploadUrl = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl,
        publicId,
        signature,
        timestamp,
        apiKey: env.CLOUDINARY_API_KEY,
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        folder,
        resourceType,
      },
    });
  } catch (error) {
    console.error('POST /api/trips/[tripId]/media/upload-url error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
