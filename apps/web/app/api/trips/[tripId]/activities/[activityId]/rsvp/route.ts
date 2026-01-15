import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import {
  getActivityById,
  updateActivityRsvp,
  updateActivity,
} from '@/lib/db/operations/activities';
import { ActivityRsvpStatuses, type Activity, type ActivityRsvpStatus } from '@/lib/db/models';
import { triggerTripEvent } from '@/lib/pusher-server';
import { PusherEventType } from '@/lib/pusher';

/**
 * Standard API response interface.
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate ObjectId format.
 */
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Serialize an activity for JSON response.
 */
function serializeActivity(activity: Activity): Record<string, unknown> {
  return {
    ...activity,
    _id: activity._id.toString(),
    tripId: activity.tripId.toString(),
    rsvps: activity.rsvps.map((r) => ({
      ...r,
      attendeeId: r.attendeeId.toString(),
    })),
    linkedExpenseIds: activity.linkedExpenseIds?.map((id) => id.toString()),
  };
}

/**
 * POST /api/trips/[tripId]/activities/[activityId]/rsvp
 *
 * Add or update RSVP for current attendee.
 * Requires trip access.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; activityId: string }> }
): Promise<NextResponse<ApiResponse<Record<string, unknown>>>> {
  try {
    const { tripId, activityId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Check trip access and get current attendee
    const { attendee } = await requireTripAccess(tripId);

    // Validate activityId format
    if (!isValidObjectId(activityId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid activityId format' },
        { status: 400 }
      );
    }

    // Verify activity exists and belongs to the trip
    const activity = await getActivityById(new ObjectId(activityId));

    if (!activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    if (activity.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate status field
    if (!body.status) {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      );
    }

    if (!ActivityRsvpStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${ActivityRsvpStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const status: ActivityRsvpStatus = body.status;

    // Update the RSVP (this handles both adding new and updating existing)
    const updatedActivity = await updateActivityRsvp(
      new ObjectId(activityId),
      new ObjectId(attendee._id.toString()),
      status
    );

    if (!updatedActivity) {
      return NextResponse.json(
        { success: false, error: 'Failed to update RSVP' },
        { status: 500 }
      );
    }

    const serializedActivity = serializeActivity(updatedActivity);

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.RSVP_UPDATED, {
      activityId,
      activity: serializedActivity,
      attendeeId: attendee._id.toString(),
      status,
    });

    return NextResponse.json({
      success: true,
      data: serializedActivity,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    if (message.includes('Invalid')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    console.error('POST /api/trips/[tripId]/activities/[activityId]/rsvp error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update RSVP' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/[tripId]/activities/[activityId]/rsvp
 *
 * Remove RSVP for current attendee.
 * Requires trip access.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; activityId: string }> }
): Promise<NextResponse<ApiResponse<Record<string, unknown>>>> {
  try {
    const { tripId, activityId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Check trip access and get current attendee
    const { attendee } = await requireTripAccess(tripId);

    // Validate activityId format
    if (!isValidObjectId(activityId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid activityId format' },
        { status: 400 }
      );
    }

    // Verify activity exists and belongs to the trip
    const activity = await getActivityById(new ObjectId(activityId));

    if (!activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    if (activity.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Check if the attendee has an RSVP
    const attendeeId = attendee._id.toString();
    const existingRsvp = activity.rsvps.find(
      (r) => r.attendeeId.toString() === attendeeId
    );

    if (!existingRsvp) {
      return NextResponse.json(
        { success: false, error: 'RSVP not found' },
        { status: 404 }
      );
    }

    // Remove the RSVP by filtering out the current attendee's RSVP
    const updatedRsvps = activity.rsvps.filter(
      (r) => r.attendeeId.toString() !== attendeeId
    );

    const updatedActivity = await updateActivity(new ObjectId(activityId), {
      rsvps: updatedRsvps,
    });

    if (!updatedActivity) {
      return NextResponse.json(
        { success: false, error: 'Failed to remove RSVP' },
        { status: 500 }
      );
    }

    const serializedActivity = serializeActivity(updatedActivity);

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.RSVP_UPDATED, {
      activityId,
      activity: serializedActivity,
      attendeeId: attendee._id.toString(),
      status: null,
    });

    return NextResponse.json({
      success: true,
      data: serializedActivity,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    if (message.includes('Invalid')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    console.error('DELETE /api/trips/[tripId]/activities/[activityId]/rsvp error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove RSVP' },
      { status: 500 }
    );
  }
}
