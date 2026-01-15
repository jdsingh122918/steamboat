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

  // Bind expense handlers
  if (handlers.onExpenseCreated) {
    channel.bind(PusherEventType.EXPENSE_CREATED, handlers.onExpenseCreated);
  }
  if (handlers.onExpenseUpdated) {
    channel.bind(PusherEventType.EXPENSE_UPDATED, handlers.onExpenseUpdated);
  }
  if (handlers.onExpenseDeleted) {
    channel.bind(PusherEventType.EXPENSE_DELETED, handlers.onExpenseDeleted);
  }

  // Bind activity handlers
  if (handlers.onActivityCreated) {
    channel.bind(PusherEventType.ACTIVITY_CREATED, handlers.onActivityCreated);
  }
  if (handlers.onActivityUpdated) {
    channel.bind(PusherEventType.ACTIVITY_UPDATED, handlers.onActivityUpdated);
  }
  if (handlers.onActivityDeleted) {
    channel.bind(PusherEventType.ACTIVITY_DELETED, handlers.onActivityDeleted);
  }
  if (handlers.onRsvpUpdated) {
    channel.bind(PusherEventType.RSVP_UPDATED, handlers.onRsvpUpdated);
  }

  // Bind payment handlers
  if (handlers.onPaymentReceived) {
    channel.bind(PusherEventType.PAYMENT_RECEIVED, handlers.onPaymentReceived);
  }
  if (handlers.onSettlementUpdated) {
    channel.bind(PusherEventType.SETTLEMENT_UPDATED, handlers.onSettlementUpdated);
  }

  // Bind media handlers
  if (handlers.onMediaUploaded) {
    channel.bind(PusherEventType.MEDIA_UPLOADED, handlers.onMediaUploaded);
  }
  if (handlers.onMediaDeleted) {
    channel.bind(PusherEventType.MEDIA_DELETED, handlers.onMediaDeleted);
  }

  // Bind attendee handlers
  if (handlers.onAttendeeJoined) {
    channel.bind(PusherEventType.ATTENDEE_JOINED, handlers.onAttendeeJoined);
  }
  if (handlers.onAttendeeLeft) {
    channel.bind(PusherEventType.ATTENDEE_LEFT, handlers.onAttendeeLeft);
  }

  // Bind poll handlers
  if (handlers.onPollCreated) {
    channel.bind(PusherEventType.POLL_CREATED, handlers.onPollCreated);
  }
  if (handlers.onPollVoted) {
    channel.bind(PusherEventType.POLL_VOTED, handlers.onPollVoted);
  }
  if (handlers.onPollClosed) {
    channel.bind(PusherEventType.POLL_CLOSED, handlers.onPollClosed);
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
