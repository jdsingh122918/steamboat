/**
 * API route for updating attendee RSVP status.
 *
 * PUT /api/trips/[tripId]/attendees/[attendeeId]/rsvp - Update RSVP status (self only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { requireTripAccess } from '@/lib/auth/guards';
import { updateRsvpStatus } from '@/lib/db/operations/attendees';
import { RsvpStatuses } from '@/lib/db/models';

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
 * Schema for RSVP update request.
 */
const RsvpUpdateSchema = z.object({
  rsvpStatus: z.enum(RsvpStatuses),
});

/**
 * PUT /api/trips/[tripId]/attendees/[attendeeId]/rsvp
 *
 * Update RSVP status. Attendees can only update their own RSVP.
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

    // Users can only update their own RSVP
    if (currentUser._id.toString() !== attendeeId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update your own RSVP' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = RsvpUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Update the RSVP status
    const updated = await updateRsvpStatus(
      new ObjectId(attendeeId),
      parseResult.data.rsvpStatus
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update RSVP status' },
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

    console.error(
      'PUT /api/trips/[tripId]/attendees/[attendeeId]/rsvp error:',
      error
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
