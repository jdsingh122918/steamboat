/**
 * Pusher Server-Side Utilities
 *
 * Provides server-side Pusher functionality for triggering events
 * from API routes.
 */

import Pusher from 'pusher';
import { getTripChannelName, type PusherEventTypeValue } from './pusher';

// Singleton Pusher server instance
let pusherServer: Pusher | null = null;

/**
 * Get or create the Pusher server singleton.
 * Returns null if Pusher is not configured.
 */
export function getPusherServer(): Pusher | null {
  if (pusherServer) {
    return pusherServer;
  }

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    console.warn('Pusher server configuration missing');
    return null;
  }

  pusherServer = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusherServer;
}

/**
 * Trigger a real-time event for a trip.
 *
 * @param tripId - The trip ID to trigger the event for
 * @param eventType - The type of event (from PusherEventType)
 * @param data - The event payload
 *
 * @example
 * ```ts
 * await triggerTripEvent(tripId, PusherEventType.EXPENSE_CREATED, {
 *   expense: serializedExpense,
 * });
 * ```
 */
export async function triggerTripEvent(
  tripId: string,
  eventType: PusherEventTypeValue,
  data: unknown
): Promise<boolean> {
  const pusher = getPusherServer();

  if (!pusher) {
    // Silently succeed if Pusher is not configured (development mode)
    console.warn('Pusher not configured, skipping event trigger');
    return false;
  }

  try {
    const channelName = getTripChannelName(tripId);
    await pusher.trigger(channelName, eventType, data);
    return true;
  } catch (error) {
    console.error('Failed to trigger Pusher event:', error);
    return false;
  }
}
