import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess, requireAdmin } from '@/lib/auth/guards';
import {
  getActivityById,
  updateActivity,
  deleteActivity,
  getActivityRsvpCounts,
} from '@/lib/db/operations/activities';
import { ActivityCategories, type Activity, type ActivityRsvpStatus } from '@/lib/db/models';
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
 * Activity with RSVP counts for response.
 */
interface ActivityWithCounts extends Omit<Activity, '_id' | 'tripId'> {
  _id: string;
  tripId: string;
  rsvpCounts: Record<ActivityRsvpStatus, number>;
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
 * GET /api/trips/[tripId]/activities/[activityId]
 *
 * Get a single activity with RSVP details.
 * Requires trip access.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; activityId: string }> }
): Promise<NextResponse<ApiResponse<ActivityWithCounts>>> {
  try {
    const { tripId, activityId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Check trip access
    await requireTripAccess(tripId);

    // Validate activityId format
    if (!isValidObjectId(activityId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid activityId format' },
        { status: 400 }
      );
    }

    // Get the activity
    const activity = await getActivityById(new ObjectId(activityId));

    if (!activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Verify the activity belongs to the requested trip
    if (activity.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Get RSVP counts
    const rsvpCounts = await getActivityRsvpCounts(activity._id);

    return NextResponse.json({
      success: true,
      data: {
        ...serializeActivity(activity),
        rsvpCounts,
      } as unknown as ActivityWithCounts,
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

    console.error('GET /api/trips/[tripId]/activities/[activityId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trips/[tripId]/activities/[activityId]
 *
 * Update an activity.
 * Requires admin access.
 */
export async function PUT(
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

    // Check admin access
    await requireAdmin(tripId);

    // Validate activityId format
    if (!isValidObjectId(activityId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid activityId format' },
        { status: 400 }
      );
    }

    // Verify activity exists and belongs to the trip
    const existingActivity = await getActivityById(new ObjectId(activityId));

    if (!existingActivity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    if (existingActivity.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Build update data (excluding tripId to prevent changing it)
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'name must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim();
    }

    if (body.startDate !== undefined) {
      const startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'startDate must be a valid date' },
          { status: 400 }
        );
      }
      updateData.startDate = startDate;
    }

    if (body.endDate !== undefined) {
      if (body.endDate === null) {
        updateData.endDate = undefined;
      } else {
        const endDate = new Date(body.endDate);
        if (isNaN(endDate.getTime())) {
          return NextResponse.json(
            { success: false, error: 'endDate must be a valid date' },
            { status: 400 }
          );
        }
        updateData.endDate = endDate;
      }
    }

    if (body.location !== undefined) {
      updateData.location = body.location?.trim();
    }

    if (body.category !== undefined) {
      if (!ActivityCategories.includes(body.category)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid category. Must be one of: ${ActivityCategories.join(', ')}`,
          },
          { status: 400 }
        );
      }
      updateData.category = body.category;
    }

    // Update the activity
    const updatedActivity = await updateActivity(
      new ObjectId(activityId),
      updateData
    );

    if (!updatedActivity) {
      return NextResponse.json(
        { success: false, error: 'Failed to update activity' },
        { status: 500 }
      );
    }

    const serializedActivity = serializeActivity(updatedActivity);

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.ACTIVITY_UPDATED, {
      activity: serializedActivity,
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

    console.error('PUT /api/trips/[tripId]/activities/[activityId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/[tripId]/activities/[activityId]
 *
 * Soft delete an activity.
 * Requires admin access.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; activityId: string }> }
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  try {
    const { tripId, activityId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Check admin access
    await requireAdmin(tripId);

    // Validate activityId format
    if (!isValidObjectId(activityId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid activityId format' },
        { status: 400 }
      );
    }

    // Verify activity exists and belongs to the trip
    const existingActivity = await getActivityById(new ObjectId(activityId));

    if (!existingActivity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    if (existingActivity.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Soft delete the activity
    const deleted = await deleteActivity(new ObjectId(activityId));

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete activity' },
        { status: 500 }
      );
    }

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.ACTIVITY_DELETED, {
      activityId,
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Activity deleted successfully' },
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

    console.error('DELETE /api/trips/[tripId]/activities/[activityId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}
