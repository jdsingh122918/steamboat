import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTripAccess } from '@/lib/auth/guards';
import {
  uploadToBlob,
  uploadThumbnail,
  validateBlobUpload,
  type BlobUploadResult,
} from '@/lib/utils/blob-upload';

/**
 * API Response interface.
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Upload response data.
 */
interface UploadResponseData {
  url: string;
  thumbnailUrl: string;
  size: number;
  contentType: string;
  type: 'image' | 'video';
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number;
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
 * Schema for validating form data fields.
 */
const UploadFormSchema = z.object({
  type: z.enum(['photo', 'video'], {
    errorMap: () => ({ message: 'Invalid type: must be photo or video' }),
  }),
  videoDuration: z.string().optional(),
  videoWidth: z.string().optional(),
  videoHeight: z.string().optional(),
});

/**
 * POST /api/trips/[tripId]/media/upload
 *
 * Upload a file directly to Vercel Blob storage.
 * Handles both images and videos with thumbnail generation.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<UploadResponseData>>> {
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const typeField = formData.get('type') as string | null;
    const thumbnail = formData.get('thumbnail') as File | null;
    const videoDuration = formData.get('videoDuration') as string | null;
    const videoWidth = formData.get('videoWidth') as string | null;
    const videoHeight = formData.get('videoHeight') as string | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate form fields
    const parseResult = UploadFormSchema.safeParse({
      type: typeField,
      videoDuration,
      videoWidth,
      videoHeight,
    });

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request: ${firstError.path.join('.')} - ${firstError.message}`,
        },
        { status: 400 }
      );
    }

    const { type } = parseResult.data;

    // Validate file
    const validation = validateBlobUpload({
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Parse video metadata if provided
    const videoMetadata = videoDuration
      ? {
          duration: parseFloat(videoDuration),
          width: videoWidth ? parseInt(videoWidth, 10) : undefined,
          height: videoHeight ? parseInt(videoHeight, 10) : undefined,
        }
      : undefined;

    // Convert File to Buffer for server-side processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload main file
    const result: BlobUploadResult = await uploadToBlob(buffer, file.name, {
      tripId,
      type,
      videoDuration: videoMetadata?.duration,
      videoDimensions:
        videoMetadata?.width && videoMetadata?.height
          ? { width: videoMetadata.width, height: videoMetadata.height }
          : undefined,
    });

    // Upload thumbnail if provided (for videos)
    let thumbnailUrl = result.thumbnailUrl;
    if (thumbnail) {
      const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());
      thumbnailUrl = await uploadThumbnail(thumbBuffer, tripId);
    }

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        thumbnailUrl,
        size: result.size,
        contentType: result.contentType,
        type: result.type,
        dimensions: result.dimensions,
        duration: result.duration,
      },
    });
  } catch (error) {
    console.error('POST /api/trips/[tripId]/media/upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
