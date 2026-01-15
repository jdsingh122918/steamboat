/**
 * API routes for a single attendee.
 *
 * GET /api/trips/[tripId]/attendees/[attendeeId] - Get a single attendee
 * PUT /api/trips/[tripId]/attendees/[attendeeId] - Update an attendee
 * DELETE /api/trips/[tripId]/attendees/[attendeeId] - Remove an attendee
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess, requireAdmin } from '@/lib/auth/guards';
import {
  getAttendeeById,
  updateAttendee,
  deleteAttendee,
  getTripAdmins,
} from '@/lib/db/operations/attendees';
import { UpdateAttendeeSchema } from '@/lib/db/models';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate ObjectId format.
 */
function isValidObjectId(id: string): boolean {
  try {
    new ObjectId(id);
    return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
  } catch {
    return false;
  }
}

/**
 * GET /api/trips/[tripId]/attendees/[attendeeId]
 *
 * Get a single attendee. Requires trip access.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; attendeeId: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { tripId, attendeeId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Validate attendeeId format
    if (!isValidObjectId(attendeeId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid attendeeId format' },
        { status: 400 }
      );
    }

    // Check trip access
    await requireTripAccess(tripId);

    // Get the attendee
    const attendee = await getAttendeeById(new ObjectId(attendeeId));

    if (!attendee) {
      return NextResponse.json(
        { success: false, error: 'Attendee not found' },
        { status: 404 }
      );
    }

    // Verify attendee belongs to this trip
    if (attendee.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Attendee does not belong to this trip' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: attendee });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    if (message.includes('NEXT_REDIRECT') || message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('GET /api/trips/[tripId]/attendees/[attendeeId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trips/[tripId]/attendees/[attendeeId]
 *
 * Update an attendee. Admin can update any attendee.
 * Non-admin can only update their own payment handles.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; attendeeId: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { tripId, attendeeId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Validate attendeeId format
    if (!isValidObjectId(attendeeId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid attendeeId format' },
        { status: 400 }
      );
    }

    // Check trip access and get current user info
    const { attendee: currentUser } = await requireTripAccess(tripId);

    // Get the attendee being updated
    const targetAttendee = await getAttendeeById(new ObjectId(attendeeId));

    if (!targetAttendee) {
      return NextResponse.json(
        { success: false, error: 'Attendee not found' },
        { status: 404 }
      );
    }

    // Verify attendee belongs to this trip
    if (targetAttendee.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Attendee does not belong to this trip' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Check permissions
    const isAdmin = currentUser.role === 'admin';
    const isSelf = currentUser._id.toString() === attendeeId;

    // Non-admin can only update their own payment handles
    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot update other attendees' },
        { status: 403 }
      );
    }

    // Non-admin updating themselves can only change payment handles
    if (!isAdmin && isSelf) {
      const allowedFields = ['paymentHandles'];
      const requestedFields = Object.keys(body);
      const unauthorizedFields = requestedFields.filter(
        (f) => !allowedFields.includes(f)
      );

      if (unauthorizedFields.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Forbidden: You can only update: ${allowedFields.join(', ')}`,
          },
          { status: 403 }
        );
      }
    }

    // Validate update data
    const parseResult = UpdateAttendeeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid update data: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Update the attendee
    const updated = await updateAttendee(
      new ObjectId(attendeeId),
      parseResult.data
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update attendee' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    if (message.includes('NEXT_REDIRECT') || message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('PUT /api/trips/[tripId]/attendees/[attendeeId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/[tripId]/attendees/[attendeeId]
 *
 * Remove an attendee from a trip. Requires admin access.
 * Cannot remove the last admin.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; attendeeId: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { tripId, attendeeId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Validate attendeeId format
    if (!isValidObjectId(attendeeId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid attendeeId format' },
        { status: 400 }
      );
    }

    // Check admin access
    await requireAdmin(tripId);

    // Get the attendee being deleted
    const attendee = await getAttendeeById(new ObjectId(attendeeId));

    if (!attendee) {
      return NextResponse.json(
        { success: false, error: 'Attendee not found' },
        { status: 404 }
      );
    }

    // Verify attendee belongs to this trip
    if (attendee.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Attendee does not belong to this trip' },
        { status: 403 }
      );
    }

    // If deleting an admin, check that they're not the last one
    if (attendee.role === 'admin') {
      const admins = await getTripAdmins(new ObjectId(tripId));
      if (admins.length <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot remove the last admin from the trip',
          },
          { status: 400 }
        );
      }
    }

    // Delete the attendee
    const success = await deleteAttendee(new ObjectId(attendeeId));

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete attendee' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    if (message.includes('NEXT_REDIRECT') || message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error(
      'DELETE /api/trips/[tripId]/attendees/[attendeeId] error:',
      error
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
