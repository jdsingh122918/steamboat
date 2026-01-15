import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Pusher
vi.mock('pusher-js', () => ({
  default: vi.fn().mockImplementation(() => ({
    subscribe: vi.fn().mockReturnValue({
      bind: vi.fn(),
      unbind: vi.fn(),
    }),
    unsubscribe: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

import {
  PusherChannel,
  PusherEventType,
  createPusherClient,
  getTripChannelName,
  subscribeToTrip,
  unsubscribeFromTrip,
  triggerEvent,
} from '../pusher';

describe('Pusher Utilities', () => {
  const originalEnv = process.env;
  let mockPusherInstance: {
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
  let mockChannel: {
    bind: ReturnType<typeof vi.fn>;
    unbind: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_PUSHER_KEY: 'test-key',
      NEXT_PUBLIC_PUSHER_CLUSTER: 'us2',
    };

    mockChannel = {
      bind: vi.fn(),
      unbind: vi.fn(),
    };
    mockPusherInstance = {
      subscribe: vi.fn().mockReturnValue(mockChannel),
      unsubscribe: vi.fn(),
      disconnect: vi.fn(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('PusherChannel', () => {
    it('should have trip prefix', () => {
      expect(PusherChannel.TRIP_PREFIX).toBe('trip-');
    });
  });

  describe('PusherEventType', () => {
    it('should have expense events', () => {
      expect(PusherEventType.EXPENSE_CREATED).toBe('expense:created');
      expect(PusherEventType.EXPENSE_UPDATED).toBe('expense:updated');
      expect(PusherEventType.EXPENSE_DELETED).toBe('expense:deleted');
    });

    it('should have activity events', () => {
      expect(PusherEventType.ACTIVITY_CREATED).toBe('activity:created');
      expect(PusherEventType.ACTIVITY_UPDATED).toBe('activity:updated');
      expect(PusherEventType.RSVP_UPDATED).toBe('rsvp:updated');
    });

    it('should have payment events', () => {
      expect(PusherEventType.PAYMENT_RECEIVED).toBe('payment:received');
      expect(PusherEventType.SETTLEMENT_UPDATED).toBe('settlement:updated');
    });

    it('should have media events', () => {
      expect(PusherEventType.MEDIA_UPLOADED).toBe('media:uploaded');
    });
  });

  describe('getTripChannelName', () => {
    it('should generate correct channel name', () => {
      expect(getTripChannelName('trip123')).toBe('trip-trip123');
    });

    it('should handle different trip IDs', () => {
      expect(getTripChannelName('abc')).toBe('trip-abc');
      expect(getTripChannelName('xyz-456')).toBe('trip-xyz-456');
    });
  });

  describe('createPusherClient', () => {
    it('should return null when config is missing', () => {
      delete process.env.NEXT_PUBLIC_PUSHER_KEY;
      const client = createPusherClient();
      expect(client).toBeNull();
    });
  });

  describe('subscribeToTrip', () => {
    it('should subscribe to trip channel', () => {
      const unsubscribe = subscribeToTrip('trip123', mockPusherInstance as any, {
        onExpenseCreated: vi.fn(),
      });

      expect(mockPusherInstance.subscribe).toHaveBeenCalledWith('trip-trip123');
      expect(typeof unsubscribe).toBe('function');
    });

    it('should bind expense event handlers', () => {
      const onExpenseCreated = vi.fn();
      subscribeToTrip('trip123', mockPusherInstance as any, {
        onExpenseCreated,
      });

      expect(mockChannel.bind).toHaveBeenCalledWith('expense:created', onExpenseCreated);
    });

    it('should bind activity event handlers', () => {
      const onActivityUpdated = vi.fn();
      subscribeToTrip('trip123', mockPusherInstance as any, {
        onActivityUpdated,
      });

      expect(mockChannel.bind).toHaveBeenCalledWith('activity:updated', onActivityUpdated);
    });

    it('should return unsubscribe function', () => {
      const unsubscribe = subscribeToTrip('trip123', mockPusherInstance as any, {});

      unsubscribe();

      expect(mockPusherInstance.unsubscribe).toHaveBeenCalledWith('trip-trip123');
    });
  });

  describe('unsubscribeFromTrip', () => {
    it('should unsubscribe from trip channel', () => {
      unsubscribeFromTrip('trip123', mockPusherInstance as any);

      expect(mockPusherInstance.unsubscribe).toHaveBeenCalledWith('trip-trip123');
    });
  });

  describe('triggerEvent', () => {
    it('should make API call to trigger event', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await triggerEvent('trip123', PusherEventType.EXPENSE_CREATED, {
        id: 'exp1',
        amount: 100,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/pusher/trigger',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('expense:created'),
        })
      );
    });

    it('should include trip ID and event data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await triggerEvent('trip123', PusherEventType.PAYMENT_RECEIVED, {
        from: 'user1',
        to: 'user2',
        amount: 50,
      });

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.channel).toBe('trip-trip123');
      expect(body.event).toBe('payment:received');
      expect(body.data.amount).toBe(50);
    });
  });
});
