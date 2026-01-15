/**
 * Pusher Real-time Utilities
 *
 * Provides real-time updates for trip data using Pusher.
 * Handles subscription management and event types.
 */

import Pusher from 'pusher-js';

// Channel name prefixes
export const PusherChannel = {
  TRIP_PREFIX: 'trip-',
} as const;

// Event types for real-time updates
export const PusherEventType = {
  // Expense events
  EXPENSE_CREATED: 'expense:created',
  EXPENSE_UPDATED: 'expense:updated',
  EXPENSE_DELETED: 'expense:deleted',

  // Activity events
  ACTIVITY_CREATED: 'activity:created',
  ACTIVITY_UPDATED: 'activity:updated',
  ACTIVITY_DELETED: 'activity:deleted',
  RSVP_UPDATED: 'rsvp:updated',

  // Payment events
  PAYMENT_RECEIVED: 'payment:received',
  SETTLEMENT_UPDATED: 'settlement:updated',

  // Media events
  MEDIA_UPLOADED: 'media:uploaded',
  MEDIA_DELETED: 'media:deleted',

  // Attendee events
  ATTENDEE_JOINED: 'attendee:joined',
  ATTENDEE_LEFT: 'attendee:left',

  // Poll events
  POLL_CREATED: 'poll:created',
  POLL_VOTED: 'poll:voted',
  POLL_CLOSED: 'poll:closed',
} as const;

export type PusherEventTypeValue = (typeof PusherEventType)[keyof typeof PusherEventType];

/**
 * Get the channel name for a trip
 */
export function getTripChannelName(tripId: string): string {
  return `${PusherChannel.TRIP_PREFIX}${tripId}`;
}

/**
 * Create a Pusher client instance
 */
export function createPusherClient(): Pusher | null {
  if (typeof window === 'undefined') return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    console.warn('Pusher configuration missing');
    return null;
  }

  return new Pusher(key, {
    cluster,
  });
}

// Event handler types
export interface TripEventHandlers {
  // Expense handlers
  onExpenseCreated?: (data: unknown) => void;
  onExpenseUpdated?: (data: unknown) => void;
  onExpenseDeleted?: (data: unknown) => void;

  // Activity handlers
  onActivityCreated?: (data: unknown) => void;
  onActivityUpdated?: (data: unknown) => void;
  onActivityDeleted?: (data: unknown) => void;
  onRsvpUpdated?: (data: unknown) => void;

  // Payment handlers
  onPaymentReceived?: (data: unknown) => void;
  onSettlementUpdated?: (data: unknown) => void;

  // Media handlers
  onMediaUploaded?: (data: unknown) => void;
  onMediaDeleted?: (data: unknown) => void;

  // Attendee handlers
  onAttendeeJoined?: (data: unknown) => void;
  onAttendeeLeft?: (data: unknown) => void;

  // Poll handlers
  onPollCreated?: (data: unknown) => void;
  onPollVoted?: (data: unknown) => void;
  onPollClosed?: (data: unknown) => void;
}

// Mapping from handler keys to event types
const handlerEventMapping: Record<keyof TripEventHandlers, PusherEventTypeValue> = {
  onExpenseCreated: PusherEventType.EXPENSE_CREATED,
  onExpenseUpdated: PusherEventType.EXPENSE_UPDATED,
  onExpenseDeleted: PusherEventType.EXPENSE_DELETED,
  onActivityCreated: PusherEventType.ACTIVITY_CREATED,
  onActivityUpdated: PusherEventType.ACTIVITY_UPDATED,
  onActivityDeleted: PusherEventType.ACTIVITY_DELETED,
  onRsvpUpdated: PusherEventType.RSVP_UPDATED,
  onPaymentReceived: PusherEventType.PAYMENT_RECEIVED,
  onSettlementUpdated: PusherEventType.SETTLEMENT_UPDATED,
  onMediaUploaded: PusherEventType.MEDIA_UPLOADED,
  onMediaDeleted: PusherEventType.MEDIA_DELETED,
  onAttendeeJoined: PusherEventType.ATTENDEE_JOINED,
  onAttendeeLeft: PusherEventType.ATTENDEE_LEFT,
  onPollCreated: PusherEventType.POLL_CREATED,
  onPollVoted: PusherEventType.POLL_VOTED,
  onPollClosed: PusherEventType.POLL_CLOSED,
};

/**
 * Subscribe to trip channel with event handlers
 */
export function subscribeToTrip(
  tripId: string,
  pusher: Pusher,
  handlers: TripEventHandlers
): () => void {
  const channelName = getTripChannelName(tripId);
  const channel = pusher.subscribe(channelName);

  // Bind handlers to their corresponding events
  for (const [handlerKey, eventType] of Object.entries(handlerEventMapping)) {
    const handler = handlers[handlerKey as keyof TripEventHandlers];
    if (handler) {
      channel.bind(eventType, handler);
    }
  }

  // Return unsubscribe function
  return () => {
    pusher.unsubscribe(channelName);
  };
}

/**
 * Unsubscribe from trip channel
 */
export function unsubscribeFromTrip(tripId: string, pusher: Pusher): void {
  const channelName = getTripChannelName(tripId);
  pusher.unsubscribe(channelName);
}

/**
 * Trigger an event via API (server-side)
 */
export async function triggerEvent(
  tripId: string,
  eventType: PusherEventTypeValue,
  data: unknown
): Promise<void> {
  const channelName = getTripChannelName(tripId);

  await fetch('/api/pusher/trigger', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelName,
      event: eventType,
      data,
    }),
  });
}

// Singleton for client-side usage
let pusherClient: Pusher | null = null;

/**
 * Get or create the Pusher client singleton
 */
export function getPusherClient(): Pusher | null {
  if (!pusherClient) {
    pusherClient = createPusherClient();
  }
  return pusherClient;
}

/**
 * Disconnect and cleanup Pusher client
 */
export function disconnectPusher(): void {
  if (pusherClient) {
    pusherClient.disconnect();
    pusherClient = null;
  }
}
