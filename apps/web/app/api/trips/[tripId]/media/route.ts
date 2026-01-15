import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { requireTripAccess } from '@/lib/auth/guards';
import { createMedia, listMedia } from '@/lib/db/operations/media';
import { ExifDataSchema, MediaTypes, type Media } from '@/lib/db/models';
import {
  type ApiResponse,
  isValidObjectId,
  errorResponse,
  successResponse,
  handleTripAccessError,
} from '@/lib/api';

/**
 * Route context with params.
 */
interface RouteContext {
  params: Promise<{ tripId: string }>;
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
      return errorResponse('Invalid tripId format', 400);
    }

    // Check trip access
    try {
      await requireTripAccess(tripId);
    } catch (error) {
      const accessError = handleTripAccessError(error);
      if (accessError) return accessError;
      throw error;
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const uploadedBy = searchParams.get('uploadedBy');

    // Validate type filter if provided
    if (type && !MediaTypes.includes(type as (typeof MediaTypes)[number])) {
      return errorResponse('Invalid type filter: must be photo or video', 400);
    }

    // Validate uploadedBy ObjectId format if provided
    if (uploadedBy && !isValidObjectId(uploadedBy)) {
      return errorResponse('Invalid uploadedBy format', 400);
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

    return successResponse(result.data);
  } catch (error) {
    console.error('GET /api/trips/[tripId]/media error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
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
      return errorResponse('Invalid tripId format', 400);
    }

    // Check trip access
    let attendee;
    try {
      const result = await requireTripAccess(tripId);
      attendee = result.attendee;
    } catch (error) {
      const accessError = handleTripAccessError(error);
      if (accessError) return accessError;
      throw error;
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = CreateMediaRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return errorResponse(
        `Invalid request: ${firstError.path.join('.')} - ${firstError.message}`,
        400
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

    return successResponse(media, 201);
  } catch (error) {
    console.error('POST /api/trips/[tripId]/media error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
