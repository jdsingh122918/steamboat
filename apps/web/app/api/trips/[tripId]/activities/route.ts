import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess, requireAdmin } from '@/lib/auth/guards';
import {
  getActivitiesByTrip,
  createActivity,
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
 * Activity with RSVP counts for list response.
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
 * GET /api/trips/[tripId]/activities
 *
 * List all activities for a trip with optional date filtering.
 * Requires trip access.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse<ApiResponse<ActivityWithCounts[]>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Check trip access
    await requireTripAccess(tripId);

    // Get activities for the trip
    const activities = await getActivitiesByTrip(new ObjectId(tripId));

    // Parse optional date filter
    const url = new URL(request.url);
    const dateFilter = url.searchParams.get('date');

    let filteredActivities = activities;
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      if (isNaN(filterDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }

      // Filter activities that start on the given date
      filteredActivities = activities.filter((activity) => {
        const activityDate = new Date(activity.startDate);
        return (
          activityDate.getUTCFullYear() === filterDate.getUTCFullYear() &&
          activityDate.getUTCMonth() === filterDate.getUTCMonth() &&
          activityDate.getUTCDate() === filterDate.getUTCDate()
        );
      });
    }

    // Add RSVP counts to each activity
    const activitiesWithCounts = await Promise.all(
      filteredActivities.map(async (activity) => {
        const rsvpCounts = await getActivityRsvpCounts(activity._id);
        return {
          ...serializeActivity(activity),
          rsvpCounts,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: activitiesWithCounts as unknown as ActivityWithCounts[],
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

    console.error('GET /api/trips/[tripId]/activities error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trips/[tripId]/activities
 *
 * Create a new activity for a trip.
 * Requires admin access.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse<ApiResponse<Record<string, unknown>>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Check admin access
    await requireAdmin(tripId);

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!body.startDate) {
      return NextResponse.json(
        { success: false, error: 'startDate is required' },
        { status: 400 }
      );
    }

    const startDate = new Date(body.startDate);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'startDate must be a valid date' },
        { status: 400 }
      );
    }

    if (!body.category) {
      return NextResponse.json(
        { success: false, error: 'category is required' },
        { status: 400 }
      );
    }

    if (!ActivityCategories.includes(body.category)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category. Must be one of: ${ActivityCategories.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Parse optional endDate
    let endDate: Date | undefined;
    if (body.endDate) {
      endDate = new Date(body.endDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'endDate must be a valid date' },
          { status: 400 }
        );
      }
    }

    // Create the activity
    const activityData = {
      tripId: new ObjectId(tripId),
      name: body.name.trim(),
      description: body.description?.trim(),
      startDate,
      endDate,
      location: body.location?.trim(),
      category: body.category,
      rsvps: [],
      linkedExpenseIds: [],
    };

    const activity = await createActivity(activityData);

    const serializedActivity = serializeActivity(activity);

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.ACTIVITY_CREATED, {
      activity: serializedActivity,
    });

    return NextResponse.json(
      {
        success: true,
        data: serializedActivity,
      },
      { status: 201 }
    );
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

    console.error('POST /api/trips/[tripId]/activities error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}
