import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the database operations
vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeeById: vi.fn(),
  updateRsvpStatus: vi.fn(),
}));

// Mock the auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
}));

import { PUT } from '@/app/api/trips/[tripId]/attendees/[attendeeId]/rsvp/route';
import * as attendeesOps from '@/lib/db/operations/attendees';
import * as guards from '@/lib/auth/guards';

describe('/api/trips/[tripId]/attendees/[attendeeId]/rsvp', () => {
  const mockTripId = new ObjectId().toString();
  const mockAttendeeId = new ObjectId().toString();
  const mockOtherAttendeeId = new ObjectId().toString();

  const mockAttendee = {
    _id: new ObjectId(mockAttendeeId),
    tripId: new ObjectId(mockTripId),
    name: 'John Doe',
    email: 'john@example.com',
    role: 'member' as const,
    rsvpStatus: 'pending' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockSession = {
    attendeeId: mockAttendeeId,
    tripId: mockTripId,
    role: 'member' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PUT /api/trips/[tripId]/attendees/[attendeeId]/rsvp', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        `http://localhost/api/trips/invalid-id/attendees/${mockAttendeeId}/rsvp`,
        {
          method: 'PUT',
          body: JSON.stringify({ rsvpStatus: 'confirmed' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: 'invalid-id',
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 400 for invalid attendeeId format', async () => {
      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/invalid-id/rsvp`,
        {
          method: 'PUT',
          body: JSON.stringify({ rsvpStatus: 'confirmed' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: 'invalid-id',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid attendeeId');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}/rsvp`,
        {
          method: 'PUT',
          body: JSON.stringify({ rsvpStatus: 'confirmed' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when trying to update another attendee RSVP', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });

      // User is trying to update someone else's RSVP
      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockOtherAttendeeId}/rsvp`,
        {
          method: 'PUT',
          body: JSON.stringify({ rsvpStatus: 'confirmed' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockOtherAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('own RSVP');
    });

    it('should return 400 for invalid rsvpStatus', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}/rsvp`,
        {
          method: 'PUT',
          body: JSON.stringify({ rsvpStatus: 'invalid-status' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });

    it('should return 400 when rsvpStatus is missing', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}/rsvp`,
        {
          method: 'PUT',
          body: JSON.stringify({}),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should update RSVP to confirmed successfully', async () => {
      const updatedAttendee = {
        ...mockAttendee,
        rsvpStatus: 'confirmed' as const,
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.updateRsvpStatus).mockResolvedValue(
        updatedAttendee
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}/rsvp`,
        {
          method: 'PUT',
          body: JSON.stringify({ rsvpStatus: 'confirmed' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.rsvpStatus).toBe('confirmed');
    });

    it('should update RSVP to declined successfully', async () => {
      const updatedAttendee = {
        ...mockAttendee,
        rsvpStatus: 'declined' as const,
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.updateRsvpStatus).mockResolvedValue(
        updatedAttendee
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}/rsvp`,
        {
          method: 'PUT',
          body: JSON.stringify({ rsvpStatus: 'declined' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.rsvpStatus).toBe('declined');
    });

    it('should update RSVP to maybe successfully', async () => {
      const updatedAttendee = {
        ...mockAttendee,
        rsvpStatus: 'maybe' as const,
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.updateRsvpStatus).mockResolvedValue(
        updatedAttendee
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}/rsvp`,
        {
          method: 'PUT',
          body: JSON.stringify({ rsvpStatus: 'maybe' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.rsvpStatus).toBe('maybe');
    });

    it('should handle database error', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.updateRsvpStatus).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}/rsvp`,
        {
          method: 'PUT',
          body: JSON.stringify({ rsvpStatus: 'confirmed' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
