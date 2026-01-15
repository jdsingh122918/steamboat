import { getIronSession, SessionOptions, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

/**
 * Session data structure.
 * Contains attendee information and session metadata.
 */
export interface SessionData {
  /** The unique identifier of the authenticated attendee */
  attendeeId?: string;
  /** The trip ID the attendee is associated with */
  tripId?: string;
  /** The role of the attendee in the trip */
  role?: 'admin' | 'member';
  /** Timestamp when the session expires (in milliseconds) */
  expiresAt?: number;
}

/**
 * Session configuration options for iron-session.
 * Configures secure, httpOnly cookies with 7-day expiration.
 */
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
  cookieName: 'steamboat-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  },
};

/**
 * Get the current session from cookies.
 *
 * @returns Promise resolving to the iron-session instance with session data
 *
 * @example
 * const session = await getSession();
 * if (session.attendeeId) {
 *   // User is authenticated
 * }
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Create a new session for an attendee.
 * Sets the attendee ID, trip ID, role, and expiration timestamp.
 *
 * @param attendeeId - The unique identifier of the attendee
 * @param tripId - The trip ID the attendee is joining
 * @param role - The role of the attendee ('admin' or 'member')
 *
 * @example
 * await createSession('att_123', 'trip_456', 'member');
 */
export async function createSession(
  attendeeId: string,
  tripId: string,
  role: 'admin' | 'member'
): Promise<void> {
  const session = await getSession();
  session.attendeeId = attendeeId;
  session.tripId = tripId;
  session.role = role;
  session.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  await session.save();
}

/**
 * Destroy the current session.
 * Removes all session data and clears the session cookie.
 *
 * @example
 * await destroySession();
 * // User is now logged out
 */
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
