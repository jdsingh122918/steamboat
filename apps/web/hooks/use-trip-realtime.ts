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
    const handlerKeys: (keyof TripEventHandlers)[] = [
      'onExpenseCreated',
      'onExpenseUpdated',
      'onExpenseDeleted',
      'onActivityCreated',
      'onActivityUpdated',
      'onActivityDeleted',
      'onRsvpUpdated',
      'onPaymentReceived',
      'onSettlementUpdated',
      'onMediaUploaded',
      'onMediaDeleted',
      'onAttendeeJoined',
      'onAttendeeLeft',
      'onPollCreated',
      'onPollVoted',
      'onPollClosed',
    ];

    return Object.fromEntries(
      handlerKeys.map((key) => [
        key,
        handlersRef.current[key]
          ? (data: unknown) => handlersRef.current[key]?.(data)
          : undefined,
      ])
    ) as TripEventHandlers;
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
