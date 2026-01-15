/**
 * Attendee-specific database operations.
 */

import { ObjectId, Filter } from 'mongodb';
import { getCollection, COLLECTIONS } from '@/lib/db/client';
import { Attendee, CreateAttendee, UpdateAttendee } from '@/lib/db/models';
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
 * Create a new attendee.
 */
export async function createAttendee(data: CreateAttendee): Promise<Attendee> {
  return create<Attendee>(COLLECTIONS.ATTENDEES, data);
}

/**
 * Get an attendee by ID.
 */
export async function getAttendeeById(
  id: ObjectId,
  options?: GetByIdOptions
): Promise<Attendee | null> {
  return getById<Attendee>(COLLECTIONS.ATTENDEES, id, options);
}

/**
 * Update an attendee.
 */
export async function updateAttendee(
  id: ObjectId,
  data: UpdateAttendee
): Promise<Attendee | null> {
  return update<Attendee>(COLLECTIONS.ATTENDEES, id, data);
}

/**
 * Soft delete an attendee.
 */
export async function deleteAttendee(id: ObjectId): Promise<boolean> {
  return softDelete(COLLECTIONS.ATTENDEES, id);
}

/**
 * List attendees with optional filtering.
 */
export async function listAttendees(
  filter: Filter<Attendee>,
  options?: PaginationOptions
): Promise<PaginatedResult<Attendee>> {
  return list<Attendee>(COLLECTIONS.ATTENDEES, filter, options);
}

/**
 * Get all attendees for a trip.
 */
export async function getAttendeesByTrip(tripId: ObjectId): Promise<Attendee[]> {
  const collection = await getCollection<Attendee>(COLLECTIONS.ATTENDEES);

  return collection
    .find({
      tripId,
      deletedAt: null,
    })
    .toArray();
}

/**
 * Get an attendee by email within a trip.
 */
export async function getAttendeeByEmail(
  tripId: ObjectId,
  email: string
): Promise<Attendee | null> {
  const collection = await getCollection<Attendee>(COLLECTIONS.ATTENDEES);

  return collection.findOne({
    tripId,
    email: email.toLowerCase(),
    deletedAt: null,
  });
}

/**
 * Get an attendee by invite token.
 */
export async function getAttendeeByInviteToken(
  token: string
): Promise<Attendee | null> {
  const collection = await getCollection<Attendee>(COLLECTIONS.ATTENDEES);

  return collection.findOne({
    inviteToken: token,
    deletedAt: null,
  });
}

/**
 * Update attendee RSVP status.
 */
export async function updateRsvpStatus(
  id: ObjectId,
  status: Attendee['rsvpStatus']
): Promise<Attendee | null> {
  return updateAttendee(id, { rsvpStatus: status });
}

/**
 * Get admin attendees for a trip.
 */
export async function getTripAdmins(tripId: ObjectId): Promise<Attendee[]> {
  const collection = await getCollection<Attendee>(COLLECTIONS.ATTENDEES);

  return collection
    .find({
      tripId,
      role: 'admin',
      deletedAt: null,
    })
    .toArray();
}
