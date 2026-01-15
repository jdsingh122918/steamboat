/**
 * Activity-specific database operations.
 */

import { ObjectId, Filter } from 'mongodb';
import { getCollection, COLLECTIONS } from '@/lib/db/client';
import {
  Activity,
  CreateActivity,
  UpdateActivity,
  ActivityRsvpStatus,
} from '@/lib/db/models';
import {
  create,
  getById,
  update,
  softDelete,
  list,
  PaginationOptions,
  PaginatedResult,
  GetByIdOptions,
} from './base';

/**
 * Create a new activity.
 */
export async function createActivity(data: CreateActivity): Promise<Activity> {
  return create<Activity>(COLLECTIONS.ACTIVITIES, data);
}

/**
 * Get an activity by ID.
 */
export async function getActivityById(
  id: ObjectId,
  options?: GetByIdOptions
): Promise<Activity | null> {
  return getById<Activity>(COLLECTIONS.ACTIVITIES, id, options);
}

/**
 * Update an activity.
 */
export async function updateActivity(
  id: ObjectId,
  data: UpdateActivity
): Promise<Activity | null> {
  return update<Activity>(COLLECTIONS.ACTIVITIES, id, data);
}

/**
 * Soft delete an activity.
 */
export async function deleteActivity(id: ObjectId): Promise<boolean> {
  return softDelete(COLLECTIONS.ACTIVITIES, id);
}

/**
 * List activities with optional filtering.
 */
export async function listActivities(
  filter: Filter<Activity>,
  options?: PaginationOptions
): Promise<PaginatedResult<Activity>> {
  return list<Activity>(COLLECTIONS.ACTIVITIES, filter, options);
}

/**
 * Get all activities for a trip.
 */
export async function getActivitiesByTrip(tripId: ObjectId): Promise<Activity[]> {
  const collection = await getCollection<Activity>(COLLECTIONS.ACTIVITIES);

  return collection
    .find({
      tripId,
      deletedAt: null,
    })
    .sort({ startDate: 1 })
    .toArray();
}

/**
 * Get upcoming activities for a trip.
 */
export async function getUpcomingActivities(tripId: ObjectId): Promise<Activity[]> {
  const collection = await getCollection<Activity>(COLLECTIONS.ACTIVITIES);

  return collection
    .find({
      tripId,
      startDate: { $gte: new Date() },
      deletedAt: null,
    })
    .sort({ startDate: 1 })
    .toArray();
}

/**
 * Update an attendee's RSVP for an activity.
 */
export async function updateActivityRsvp(
  activityId: ObjectId,
  attendeeId: ObjectId,
  status: ActivityRsvpStatus
): Promise<Activity | null> {
  const collection = await getCollection<Activity>(COLLECTIONS.ACTIVITIES);
  const activity = await getActivityById(activityId);

  if (!activity) {
    return null;
  }

  const existingRsvp = activity.rsvps.find((r) =>
    r.attendeeId instanceof ObjectId
      ? r.attendeeId.equals(attendeeId)
      : String(r.attendeeId) === String(attendeeId)
  );

  if (existingRsvp) {
    await collection.updateOne(
      {
        _id: activityId,
        'rsvps.attendeeId': attendeeId,
      },
      {
        $set: {
          'rsvps.$.status': status,
          updatedAt: new Date(),
        },
      }
    );
  } else {
    await collection.updateOne(
      { _id: activityId },
      {
        $push: {
          rsvps: {
            attendeeId,
            status,
          },
        } as unknown as never,
        $set: { updatedAt: new Date() },
      }
    );
  }

  return getActivityById(activityId);
}

/**
 * Get RSVP counts for an activity.
 */
export async function getActivityRsvpCounts(
  activityId: ObjectId
): Promise<Record<ActivityRsvpStatus, number>> {
  const activity = await getActivityById(activityId);

  if (!activity) {
    return { going: 0, maybe: 0, not_going: 0 };
  }

  const counts: Record<ActivityRsvpStatus, number> = {
    going: 0,
    maybe: 0,
    not_going: 0,
  };

  for (const rsvp of activity.rsvps) {
    counts[rsvp.status]++;
  }

  return counts;
}

/**
 * Link an expense to an activity.
 */
export async function linkExpenseToActivity(
  activityId: ObjectId,
  expenseId: ObjectId
): Promise<Activity | null> {
  const collection = await getCollection<Activity>(COLLECTIONS.ACTIVITIES);

  await collection.updateOne(
    { _id: activityId },
    {
      $addToSet: { linkedExpenseIds: expenseId } as unknown as never,
      $set: { updatedAt: new Date() },
    }
  );

  return getActivityById(activityId);
}
