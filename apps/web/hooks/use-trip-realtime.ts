'use client';

/**
 * useTripRealtime Hook
 *
 * A React hook for subscribing to real-time trip events via Pusher.
 * Handles subscription lifecycle and provides stable event handlers.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  getPusherClient,
  subscribeToTrip,
  type TripEventHandlers,
} from '@/lib/pusher';
import type Pusher from 'pusher-js';

export interface UseTripRealtimeOptions extends TripEventHandlers {
  /**
   * Whether to enable real-time subscriptions.
   * Set to false to disable without unmounting.
   */
  enabled?: boolean;
}

/**
 * Hook for subscribing to real-time trip events.
 *
 * @param tripId - The trip ID to subscribe to
 * @param options - Event handlers and configuration options
 *
 * @example
 * ```tsx
 * useTripRealtime(tripId, {
 *   onExpenseCreated: (data) => {
 *     // Handle new expense
 *     refetchExpenses();
 *   },
 *   onExpenseUpdated: (data) => {
 *     // Handle expense update
 *     updateExpenseInList(data);
 *   },
 *   onPaymentReceived: (data) => {
 *     // Handle payment
 *     refetchBalances();
 *   },
 * });
 * ```
 */
export function useTripRealtime(
  tripId: string | undefined,
  options: UseTripRealtimeOptions = {}
): void {
  const { enabled = true, ...handlers } = options;

  // Store handlers in refs to avoid re-subscribing on handler changes
  const handlersRef = useRef<TripEventHandlers>(handlers);

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Store Pusher client in ref
  const pusherRef = useRef<Pusher | null>(null);

  // Create stable wrapper handlers that call the current handlers from ref
  const createStableHandlers = useCallback((): TripEventHandlers => {
    const wrap =
      <T extends unknown>(handler: ((data: T) => void) | undefined) =>
      (data: T) => {
        handler?.(data);
      };

    return {
      onExpenseCreated: handlersRef.current.onExpenseCreated
        ? wrap(handlersRef.current.onExpenseCreated)
        : undefined,
      onExpenseUpdated: handlersRef.current.onExpenseUpdated
        ? wrap(handlersRef.current.onExpenseUpdated)
        : undefined,
      onExpenseDeleted: handlersRef.current.onExpenseDeleted
        ? wrap(handlersRef.current.onExpenseDeleted)
        : undefined,
      onActivityCreated: handlersRef.current.onActivityCreated
        ? wrap(handlersRef.current.onActivityCreated)
        : undefined,
      onActivityUpdated: handlersRef.current.onActivityUpdated
        ? wrap(handlersRef.current.onActivityUpdated)
        : undefined,
      onActivityDeleted: handlersRef.current.onActivityDeleted
        ? wrap(handlersRef.current.onActivityDeleted)
        : undefined,
      onRsvpUpdated: handlersRef.current.onRsvpUpdated
        ? wrap(handlersRef.current.onRsvpUpdated)
        : undefined,
      onPaymentReceived: handlersRef.current.onPaymentReceived
        ? wrap(handlersRef.current.onPaymentReceived)
        : undefined,
      onSettlementUpdated: handlersRef.current.onSettlementUpdated
        ? wrap(handlersRef.current.onSettlementUpdated)
        : undefined,
      onMediaUploaded: handlersRef.current.onMediaUploaded
        ? wrap(handlersRef.current.onMediaUploaded)
        : undefined,
      onMediaDeleted: handlersRef.current.onMediaDeleted
        ? wrap(handlersRef.current.onMediaDeleted)
        : undefined,
      onAttendeeJoined: handlersRef.current.onAttendeeJoined
        ? wrap(handlersRef.current.onAttendeeJoined)
        : undefined,
      onAttendeeLeft: handlersRef.current.onAttendeeLeft
        ? wrap(handlersRef.current.onAttendeeLeft)
        : undefined,
      onPollCreated: handlersRef.current.onPollCreated
        ? wrap(handlersRef.current.onPollCreated)
        : undefined,
      onPollVoted: handlersRef.current.onPollVoted
        ? wrap(handlersRef.current.onPollVoted)
        : undefined,
      onPollClosed: handlersRef.current.onPollClosed
        ? wrap(handlersRef.current.onPollClosed)
        : undefined,
    };
  }, []);

  // Subscribe to trip channel
  useEffect(() => {
    // Don't subscribe if disabled or no tripId
    if (!enabled || !tripId) {
      return;
    }

    // Get or create Pusher client
    const pusher = getPusherClient();
    if (!pusher) {
      console.warn('useTripRealtime: Pusher client not available');
      return;
    }

    pusherRef.current = pusher;

    // Subscribe with stable handlers
    const stableHandlers = createStableHandlers();
    const unsubscribe = subscribeToTrip(tripId, pusher, stableHandlers);

    // Cleanup on unmount or when tripId/enabled changes
    return () => {
      unsubscribe();
    };
  }, [tripId, enabled, createStableHandlers]);
}

export default useTripRealtime;
