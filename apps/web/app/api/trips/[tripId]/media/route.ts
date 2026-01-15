import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { requireTripAccess } from '@/lib/auth/guards';
import { createMedia, listMedia } from '@/lib/db/operations/media';
import { ExifDataSchema, MediaTypes, type Media } from '@/lib/db/models';

/**
 * API Response interface.
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
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
 * Schema for creating new media.
 */
const CreateMediaRequestSchema = z.object({
  url: z.string().url('Invalid url format'),
  thumbnailUrl: z.string().url().optional(),
  type: z.enum(MediaTypes, {
    errorMap: () => ({ message: 'Invalid type: must be photo or video' }),
  }),
  fileSize: z.number().int().positive('fileSize must be a positive integer'),
  exif: ExifDataSchema.optional(),
  caption: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/trips/[tripId]/media
 *
 * List all media for a trip with optional filtering.
 * Query params: ?type=photo|video, ?uploadedBy=attendeeId
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Media[]>>> {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const uploadedBy = searchParams.get('uploadedBy');

    // Validate type filter if provided
    if (type && !MediaTypes.includes(type as (typeof MediaTypes)[number])) {
      return NextResponse.json(
        { success: false, error: 'Invalid type filter: must be photo or video' },
        { status: 400 }
      );
    }

    // Validate uploadedBy ObjectId format if provided
    if (uploadedBy && !isValidObjectId(uploadedBy)) {
      return NextResponse.json(
        { success: false, error: 'Invalid uploadedBy format' },
        { status: 400 }
      );
    }

    // Build filter
    const filter: Record<string, unknown> = {
      tripId: new ObjectId(tripId),
    };

    if (type) {
      filter.type = type;
    }

    if (uploadedBy) {
      filter.uploaderId = new ObjectId(uploadedBy);
    }

    // Fetch media
    const result = await listMedia(filter as any, { sort: { createdAt: -1 } });

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('GET /api/trips/[tripId]/media error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trips/[tripId]/media
 *
 * Create a new media record (after Cloudinary upload).
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Media>>> {
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
    let attendee;
    try {
      const result = await requireTripAccess(tripId);
      attendee = result.attendee;
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
    const parseResult = CreateMediaRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return NextResponse.json(
        { success: false, error: `Invalid request: ${firstError.path.join('.')} - ${firstError.message}` },
        { status: 400 }
      );
    }

    // Create media record
    const media = await createMedia({
      tripId: new ObjectId(tripId),
      uploaderId: attendee._id,
      url: parseResult.data.url,
      thumbnailUrl: parseResult.data.thumbnailUrl,
      type: parseResult.data.type,
      fileSize: parseResult.data.fileSize,
      exif: parseResult.data.exif,
      caption: parseResult.data.caption,
      tags: parseResult.data.tags,
    });

    return NextResponse.json(
      { success: true, data: media },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/trips/[tripId]/media error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
