/**
 * Trip-specific database operations.
 */

import { ObjectId, Filter } from 'mongodb';
import { getCollection, COLLECTIONS } from '@/lib/db/client';
import { Trip, CreateTrip, UpdateTrip } from '@/lib/db/models';
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
 * Trip statistics.
 */
export interface TripStats {
  attendeeCount: number;
  expenseCount: number;
  activityCount: number;
  totalExpenses_cents: number;
}

/**
 * Create a new trip.
 *
 * @param data - Trip creation data
 * @returns The created trip
 */
export async function createTrip(data: CreateTrip): Promise<Trip> {
  return create<Trip>(COLLECTIONS.TRIPS, data);
}

/**
 * Get a trip by its ID.
 *
 * @param id - Trip ObjectId
 * @param options - Query options
 * @returns The trip or null
 */
export async function getTripById(
  id: ObjectId,
  options?: GetByIdOptions
): Promise<Trip | null> {
  return getById<Trip>(COLLECTIONS.TRIPS, id, options);
}

/**
 * Update a trip.
 *
 * @param id - Trip ObjectId
 * @param data - Fields to update
 * @returns The updated trip or null
 */
export async function updateTrip(
  id: ObjectId,
  data: UpdateTrip
): Promise<Trip | null> {
  return update<Trip>(COLLECTIONS.TRIPS, id, data);
}

/**
 * Soft delete a trip.
 *
 * @param id - Trip ObjectId
 * @returns True if deleted
 */
export async function deleteTrip(id: ObjectId): Promise<boolean> {
  return softDelete(COLLECTIONS.TRIPS, id);
}

/**
 * List trips with optional filtering.
 *
 * @param filter - MongoDB filter
 * @param options - Pagination options
 * @returns Paginated trips
 */
export async function listTrips(
  filter: Filter<Trip>,
  options?: PaginationOptions
): Promise<PaginatedResult<Trip>> {
  return list<Trip>(COLLECTIONS.TRIPS, filter, options);
}

/**
 * Get all trips for an attendee.
 *
 * @param attendeeId - Attendee ObjectId
 * @returns Array of trips the attendee is part of
 */
export async function getTripsByAttendee(attendeeId: ObjectId): Promise<Trip[]> {
  const attendeesCollection = await getCollection(COLLECTIONS.ATTENDEES);
  const tripsCollection = await getCollection<Trip>(COLLECTIONS.TRIPS);

  // Find all attendee records for this user
  const attendeeRecords = await attendeesCollection
    .find({
      _id: attendeeId,
      deletedAt: null,
    })
    .toArray();

  if (attendeeRecords.length === 0) {
    // Try by matching attendee._id to attendeeId in attendees collection
    const attendeesByUserId = await attendeesCollection
      .find({
        deletedAt: null,
      })
      .toArray();

    // Get unique trip IDs
    const tripIds = [...new Set(
      attendeesByUserId
        .filter((a) => a._id.equals(attendeeId))
        .map((a) => a.tripId)
    )];

    if (tripIds.length === 0) {
      return [];
    }

    return tripsCollection
      .find({
        _id: { $in: tripIds },
        deletedAt: null,
      })
      .toArray();
  }

  // Get unique trip IDs from attendee records
  const tripIds = attendeeRecords.map((a) => a.tripId);

  return tripsCollection
    .find({
      _id: { $in: tripIds },
      deletedAt: null,
    })
    .toArray();
}

/**
 * Get statistics for a trip.
 *
 * @param tripId - Trip ObjectId
 * @returns Trip statistics
 */
export async function getTripStats(tripId: ObjectId): Promise<TripStats> {
  const [attendeesCollection, expensesCollection, activitiesCollection] =
    await Promise.all([
      getCollection(COLLECTIONS.ATTENDEES),
      getCollection(COLLECTIONS.EXPENSES),
      getCollection(COLLECTIONS.ACTIVITIES),
    ]);

  const [attendeeCount, expenseCount, activityCount, expenseTotal] =
    await Promise.all([
      attendeesCollection.countDocuments({ tripId, deletedAt: null }),
      expensesCollection.countDocuments({ tripId, deletedAt: null }),
      activitiesCollection.countDocuments({ tripId, deletedAt: null }),
      expensesCollection
        .aggregate([
          { $match: { tripId, deletedAt: null } },
          { $group: { _id: null, total: { $sum: '$amount_cents' } } },
        ])
        .toArray(),
    ]);

  return {
    attendeeCount,
    expenseCount,
    activityCount,
    totalExpenses_cents: expenseTotal[0]?.total ?? 0,
  };
}

/**
 * Get trips where a user is an admin.
 *
 * @param userId - User ObjectId
 * @returns Array of trips where user is admin
 */
export async function getAdminTrips(userId: ObjectId): Promise<Trip[]> {
  const collection = await getCollection<Trip>(COLLECTIONS.TRIPS);

  return collection
    .find({
      adminIds: userId,
      deletedAt: null,
    })
    .toArray();
}

/**
 * Check if a user is an admin of a trip.
 *
 * @param tripId - Trip ObjectId
 * @param userId - User ObjectId
 * @returns True if user is admin
 */
export async function isUserTripAdmin(
  tripId: ObjectId,
  userId: ObjectId
): Promise<boolean> {
  const trip = await getTripById(tripId);

  if (!trip) {
    return false;
  }

  return trip.adminIds.some((adminId) => {
    if (adminId instanceof ObjectId) {
      return adminId.equals(userId);
    }
    return String(adminId) === String(userId);
  });
}
