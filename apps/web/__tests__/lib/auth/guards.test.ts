import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// Mock session module
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

// Mock attendee operations
vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeeById: vi.fn(),
}));

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

describe('Auth Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('requireAuth', () => {
    it('should return session when attendeeId exists', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { requireAuth } = await import('@/lib/auth/guards');

      const mockSession = {
        attendeeId: new ObjectId().toString(),
        tripId: new ObjectId().toString(),
      };

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      const result = await requireAuth();

      expect(getSession).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should redirect to /join when no attendeeId', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { requireAuth } = await import('@/lib/auth/guards');

      const mockSession = {
        attendeeId: undefined,
      };

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      mockRedirect.mockImplementation(() => {
        throw new Error('NEXT_REDIRECT');
      });

      await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT');
      expect(mockRedirect).toHaveBeenCalledWith('/join');
    });

    it('should redirect to /join when attendeeId is null', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { requireAuth } = await import('@/lib/auth/guards');

      const mockSession = {
        attendeeId: null,
      };

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      mockRedirect.mockImplementation(() => {
        throw new Error('NEXT_REDIRECT');
      });

      await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT');
      expect(mockRedirect).toHaveBeenCalledWith('/join');
    });
  });

  describe('requireTripAccess', () => {
    it('should return session and attendee for valid trip member', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { requireTripAccess } = await import('@/lib/auth/guards');

      const tripId = new ObjectId();
      const attendeeId = new ObjectId();

      const mockSession = {
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      };

      const mockAttendee = {
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'member',
        rsvpStatus: 'confirmed',
      };

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAttendee);

      const result = await requireTripAccess(tripId.toString());

      expect(result.session).toEqual(mockSession);
      expect(result.attendee).toEqual(mockAttendee);
    });

    it('should throw Forbidden for non-member', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { requireTripAccess } = await import('@/lib/auth/guards');

      const tripId = new ObjectId();
      const differentTripId = new ObjectId();
      const attendeeId = new ObjectId();

      const mockSession = {
        attendeeId: attendeeId.toString(),
        tripId: differentTripId.toString(),
      };

      const mockAttendee = {
        _id: attendeeId,
        tripId: differentTripId, // Different trip
        name: 'John Doe',
        email: 'john@example.com',
        role: 'member',
        rsvpStatus: 'confirmed',
      };

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAttendee);

      await expect(requireTripAccess(tripId.toString())).rejects.toThrow(
        'Forbidden: Not a member of this trip'
      );
    });

    it('should throw Forbidden when attendee not found', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { requireTripAccess } = await import('@/lib/auth/guards');

      const tripId = new ObjectId();
      const attendeeId = new ObjectId();

      const mockSession = {
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      };

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(requireTripAccess(tripId.toString())).rejects.toThrow(
        'Forbidden: Attendee not found'
      );
    });

    it('should redirect to /join when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { requireTripAccess } = await import('@/lib/auth/guards');

      const tripId = new ObjectId();

      const mockSession = {
        attendeeId: undefined,
      };

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      mockRedirect.mockImplementation(() => {
        throw new Error('NEXT_REDIRECT');
      });

      await expect(requireTripAccess(tripId.toString())).rejects.toThrow('NEXT_REDIRECT');
      expect(mockRedirect).toHaveBeenCalledWith('/join');
    });
  });

  describe('requireAdmin', () => {
    it('should return session and attendee for admin', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { requireAdmin } = await import('@/lib/auth/guards');

      const tripId = new ObjectId();
      const attendeeId = new ObjectId();

      const mockSession = {
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      };

      const mockAttendee = {
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
      };

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAttendee);

      const result = await requireAdmin(tripId.toString());

      expect(result.session).toEqual(mockSession);
      expect(result.attendee).toEqual(mockAttendee);
      expect(result.attendee.role).toBe('admin');
    });

    it('should throw Forbidden for member role', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { requireAdmin } = await import('@/lib/auth/guards');

      const tripId = new ObjectId();
      const attendeeId = new ObjectId();

      const mockSession = {
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      };

      const mockAttendee = {
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'member', // Not an admin
        rsvpStatus: 'confirmed',
      };

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAttendee);

      await expect(requireAdmin(tripId.toString())).rejects.toThrow(
        'Forbidden: Admin access required'
      );
    });

    it('should throw Forbidden when attendee not found', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { requireAdmin } = await import('@/lib/auth/guards');

      const tripId = new ObjectId();
      const attendeeId = new ObjectId();

      const mockSession = {
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      };

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(requireAdmin(tripId.toString())).rejects.toThrow(
        'Forbidden: Attendee not found'
      );
    });

    it('should redirect to /join when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { requireAdmin } = await import('@/lib/auth/guards');

      const tripId = new ObjectId();

      const mockSession = {
        attendeeId: undefined,
      };

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      mockRedirect.mockImplementation(() => {
        throw new Error('NEXT_REDIRECT');
      });

      await expect(requireAdmin(tripId.toString())).rejects.toThrow('NEXT_REDIRECT');
      expect(mockRedirect).toHaveBeenCalledWith('/join');
    });
  });
});
