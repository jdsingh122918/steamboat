/**
 * Tests for useTripRealtime hook
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTripRealtime } from '../use-trip-realtime';
import * as pusherLib from '@/lib/pusher';

// Mock the pusher library
vi.mock('@/lib/pusher', () => ({
  getPusherClient: vi.fn(),
  subscribeToTrip: vi.fn(),
  getTripChannelName: vi.fn((tripId: string) => `trip-${tripId}`),
  PusherEventType: {
    EXPENSE_CREATED: 'expense:created',
    EXPENSE_UPDATED: 'expense:updated',
    EXPENSE_DELETED: 'expense:deleted',
    ACTIVITY_CREATED: 'activity:created',
    ACTIVITY_UPDATED: 'activity:updated',
    ACTIVITY_DELETED: 'activity:deleted',
    RSVP_UPDATED: 'rsvp:updated',
    PAYMENT_RECEIVED: 'payment:received',
    SETTLEMENT_UPDATED: 'settlement:updated',
    MEDIA_UPLOADED: 'media:uploaded',
    MEDIA_DELETED: 'media:deleted',
    ATTENDEE_JOINED: 'attendee:joined',
    ATTENDEE_LEFT: 'attendee:left',
    POLL_CREATED: 'poll:created',
    POLL_VOTED: 'poll:voted',
    POLL_CLOSED: 'poll:closed',
  },
}));

describe('useTripRealtime', () => {
  const mockPusherClient = {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };

  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (pusherLib.getPusherClient as Mock).mockReturnValue(mockPusherClient);
    (pusherLib.subscribeToTrip as Mock).mockReturnValue(mockUnsubscribe);
  });

  it('should not subscribe when tripId is undefined', () => {
    renderHook(() => useTripRealtime(undefined));

    expect(pusherLib.getPusherClient).not.toHaveBeenCalled();
    expect(pusherLib.subscribeToTrip).not.toHaveBeenCalled();
  });

  it('should not subscribe when enabled is false', () => {
    renderHook(() =>
      useTripRealtime('trip-123', {
        enabled: false,
      })
    );

    expect(pusherLib.getPusherClient).not.toHaveBeenCalled();
    expect(pusherLib.subscribeToTrip).not.toHaveBeenCalled();
  });

  it('should subscribe to trip channel on mount', () => {
    const tripId = 'trip-123';

    renderHook(() => useTripRealtime(tripId));

    expect(pusherLib.getPusherClient).toHaveBeenCalled();
    expect(pusherLib.subscribeToTrip).toHaveBeenCalledWith(
      tripId,
      mockPusherClient,
      expect.any(Object)
    );
  });

  it('should unsubscribe on unmount', () => {
    const tripId = 'trip-123';

    const { unmount } = renderHook(() => useTripRealtime(tripId));

    expect(pusherLib.subscribeToTrip).toHaveBeenCalled();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should resubscribe when tripId changes', () => {
    const { rerender } = renderHook(
      ({ tripId }) => useTripRealtime(tripId),
      { initialProps: { tripId: 'trip-123' } }
    );

    expect(pusherLib.subscribeToTrip).toHaveBeenCalledTimes(1);
    expect(pusherLib.subscribeToTrip).toHaveBeenCalledWith(
      'trip-123',
      mockPusherClient,
      expect.any(Object)
    );

    // Change tripId
    rerender({ tripId: 'trip-456' });

    // Should unsubscribe from old and subscribe to new
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(pusherLib.subscribeToTrip).toHaveBeenCalledTimes(2);
    expect(pusherLib.subscribeToTrip).toHaveBeenLastCalledWith(
      'trip-456',
      mockPusherClient,
      expect.any(Object)
    );
  });

  it('should pass event handlers to subscribeToTrip', () => {
    const tripId = 'trip-123';
    const onExpenseCreated = vi.fn();
    const onPaymentReceived = vi.fn();

    renderHook(() =>
      useTripRealtime(tripId, {
        onExpenseCreated,
        onPaymentReceived,
      })
    );

    expect(pusherLib.subscribeToTrip).toHaveBeenCalled();
    const passedHandlers = (pusherLib.subscribeToTrip as Mock).mock.calls[0][2];

    // The handlers should be wrapped but still callable
    expect(passedHandlers.onExpenseCreated).toBeDefined();
    expect(passedHandlers.onPaymentReceived).toBeDefined();
  });

  it('should not subscribe when Pusher client is null', () => {
    (pusherLib.getPusherClient as Mock).mockReturnValue(null);

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderHook(() => useTripRealtime('trip-123'));

    expect(pusherLib.subscribeToTrip).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'useTripRealtime: Pusher client not available'
    );

    consoleWarnSpy.mockRestore();
  });

  it('should handle enabled toggle', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useTripRealtime('trip-123', { enabled }),
      { initialProps: { enabled: true } }
    );

    expect(pusherLib.subscribeToTrip).toHaveBeenCalledTimes(1);

    // Disable
    rerender({ enabled: false });
    expect(mockUnsubscribe).toHaveBeenCalled();

    // Re-enable
    mockUnsubscribe.mockClear();
    rerender({ enabled: true });
    expect(pusherLib.subscribeToTrip).toHaveBeenCalledTimes(2);
  });

  it('should maintain stable handler references', () => {
    const tripId = 'trip-123';
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const { rerender } = renderHook(
      ({ handler }) => useTripRealtime(tripId, { onExpenseCreated: handler }),
      { initialProps: { handler: handler1 } }
    );

    // Initial subscription
    expect(pusherLib.subscribeToTrip).toHaveBeenCalledTimes(1);

    // Change handler - should not re-subscribe since we use refs
    rerender({ handler: handler2 });

    // Still only one subscription
    expect(pusherLib.subscribeToTrip).toHaveBeenCalledTimes(1);
  });

  it('should handle all event handler types', () => {
    const tripId = 'trip-123';
    const handlers = {
      onExpenseCreated: vi.fn(),
      onExpenseUpdated: vi.fn(),
      onExpenseDeleted: vi.fn(),
      onActivityCreated: vi.fn(),
      onActivityUpdated: vi.fn(),
      onActivityDeleted: vi.fn(),
      onRsvpUpdated: vi.fn(),
      onPaymentReceived: vi.fn(),
      onSettlementUpdated: vi.fn(),
      onMediaUploaded: vi.fn(),
      onMediaDeleted: vi.fn(),
      onAttendeeJoined: vi.fn(),
      onAttendeeLeft: vi.fn(),
      onPollCreated: vi.fn(),
      onPollVoted: vi.fn(),
      onPollClosed: vi.fn(),
    };

    renderHook(() => useTripRealtime(tripId, handlers));

    const passedHandlers = (pusherLib.subscribeToTrip as Mock).mock.calls[0][2];

    // All handlers should be defined
    expect(passedHandlers.onExpenseCreated).toBeDefined();
    expect(passedHandlers.onExpenseUpdated).toBeDefined();
    expect(passedHandlers.onExpenseDeleted).toBeDefined();
    expect(passedHandlers.onActivityCreated).toBeDefined();
    expect(passedHandlers.onActivityUpdated).toBeDefined();
    expect(passedHandlers.onActivityDeleted).toBeDefined();
    expect(passedHandlers.onRsvpUpdated).toBeDefined();
    expect(passedHandlers.onPaymentReceived).toBeDefined();
    expect(passedHandlers.onSettlementUpdated).toBeDefined();
    expect(passedHandlers.onMediaUploaded).toBeDefined();
    expect(passedHandlers.onMediaDeleted).toBeDefined();
    expect(passedHandlers.onAttendeeJoined).toBeDefined();
    expect(passedHandlers.onAttendeeLeft).toBeDefined();
    expect(passedHandlers.onPollCreated).toBeDefined();
    expect(passedHandlers.onPollVoted).toBeDefined();
    expect(passedHandlers.onPollClosed).toBeDefined();
  });
});
