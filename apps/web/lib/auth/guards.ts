/**
 * Authentication and authorization guards.
 *
 * These guards provide route protection with role-based access control.
 * Use in Server Components, Server Actions, and Route Handlers.
 */

import { redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { getSession, SessionData } from './session';
import { getAttendeeById } from '@/lib/db/operations/attendees';
import { Attendee } from '@/lib/db/models';
import { IronSession } from 'iron-session';

/**
 * Require authentication. Redirects to /join if not authenticated.
 *
 * @returns The authenticated session
 * @throws Redirects to /join if no attendeeId in session
 *
 * @example
 * // In a Server Component or Server Action
 * const session = await requireAuth();
 * // User is guaranteed to be authenticated here
 */
export async function requireAuth(): Promise<IronSession<SessionData>> {
  const session = await getSession();

  if (!session.attendeeId) {
    redirect('/join');
  }

  return session;
}

/**
 * Require access to a specific trip.
 * Verifies the user is authenticated and is a member of the trip.
 *
 * @param tripId - The trip ID to verify access for
 * @returns The session and attendee data
 * @throws Redirects to /join if not authenticated
 * @throws Error with "Forbidden:" prefix if not a member of the trip
 *
 * @example
 * const { session, attendee } = await requireTripAccess(params.tripId);
 * // User is verified to be a member of this trip
 */
export async function requireTripAccess(
  tripId: string
): Promise<{ session: IronSession<SessionData>; attendee: Attendee }> {
  const session = await requireAuth();

  const attendee = await getAttendeeById(new ObjectId(session.attendeeId));

  if (!attendee) {
    throw new Error('Forbidden: Attendee not found');
  }

  if (attendee.tripId.toString() !== tripId) {
    throw new Error('Forbidden: Not a member of this trip');
  }

  return { session, attendee };
}

/**
 * Require admin access to a trip.
 * Verifies the user is authenticated, is a member of the trip, and has admin role.
 *
 * @param tripId - The trip ID to verify admin access for
 * @returns The session and attendee data
 * @throws Redirects to /join if not authenticated
 * @throws Error with "Forbidden:" prefix if not a member or not an admin
 *
 * @example
 * const { session, attendee } = await requireAdmin(params.tripId);
 * // User is verified to be an admin of this trip
 */
export async function requireAdmin(
  tripId: string
): Promise<{ session: IronSession<SessionData>; attendee: Attendee }> {
  const { session, attendee } = await requireTripAccess(tripId);

  if (attendee.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }

  return { session, attendee };
}
