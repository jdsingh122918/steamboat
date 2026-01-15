import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { requireTripAccess } from '@/lib/auth/guards';
import { getMediaById, updateMedia, deleteMedia } from '@/lib/db/operations/media';
import type { Media } from '@/lib/db/models';

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
  params: Promise<{ tripId: string; mediaId: string }>;
}

/**
 * Validate ObjectId format.
 */
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Schema for updating media (only caption and tags allowed).
 */
const UpdateMediaRequestSchema = z.object({
  caption: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).strict();

/**
 * GET /api/trips/[tripId]/media/[mediaId]
 *
 * Get a single media item.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Media>>> {
  try {
    const { tripId, mediaId } = await context.params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Validate mediaId format
    if (!isValidObjectId(mediaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mediaId format' },
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

    // Get media item
    const media = await getMediaById(new ObjectId(mediaId));

    if (!media) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    // Ensure media belongs to the requested trip
    if (media.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: media,
    });
  } catch (error) {
    console.error('GET /api/trips/[tripId]/media/[mediaId] error:', error);
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
 * PUT /api/trips/[tripId]/media/[mediaId]
 *
 * Update a media item (caption/tags only). Only uploader or admin can update.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Media>>> {
  try {
    const { tripId, mediaId } = await context.params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Validate mediaId format
    if (!isValidObjectId(mediaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mediaId format' },
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

    // Get existing media
    const media = await getMediaById(new ObjectId(mediaId));

    if (!media) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    // Ensure media belongs to the requested trip
    if (media.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    // Check if user is uploader or admin
    const isUploader = media.uploaderId.toString() === attendee._id.toString();
    const isAdmin = attendee.role === 'admin';

    if (!isUploader && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only the uploader or admin can update this media' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = UpdateMediaRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid update fields: only caption and tags can be updated' },
        { status: 400 }
      );
    }

    // Update media
    const updatedMedia = await updateMedia(new ObjectId(mediaId), parseResult.data);

    if (!updatedMedia) {
      return NextResponse.json(
        { success: false, error: 'Failed to update media' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedMedia,
    });
  } catch (error) {
    console.error('PUT /api/trips/[tripId]/media/[mediaId] error:', error);
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
 * DELETE /api/trips/[tripId]/media/[mediaId]
 *
 * Soft delete a media item. Only uploader or admin can delete.
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const { tripId, mediaId } = await context.params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Validate mediaId format
    if (!isValidObjectId(mediaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mediaId format' },
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

    // Get existing media
    const media = await getMediaById(new ObjectId(mediaId));

    if (!media) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    // Ensure media belongs to the requested trip
    if (media.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    // Check if user is uploader or admin
    const isUploader = media.uploaderId.toString() === attendee._id.toString();
    const isAdmin = attendee.role === 'admin';

    if (!isUploader && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only the uploader or admin can delete this media' },
        { status: 403 }
      );
    }

    // Soft delete media
    const deleted = await deleteMedia(new ObjectId(mediaId));

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete media' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('DELETE /api/trips/[tripId]/media/[mediaId] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
