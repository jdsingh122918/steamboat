import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the database operations
vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeesByTrip: vi.fn(),
  createAttendee: vi.fn(),
  getAttendeeByEmail: vi.fn(),
}));

// Mock the auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
  requireAdmin: vi.fn(),
}));

import { GET, POST } from '@/app/api/trips/[tripId]/attendees/route';
import * as attendeesOps from '@/lib/db/operations/attendees';
import * as guards from '@/lib/auth/guards';

describe('/api/trips/[tripId]/attendees', () => {
  const mockTripId = new ObjectId().toString();
  const mockAttendeeId = new ObjectId().toString();

  const mockAttendee = {
    _id: new ObjectId(mockAttendeeId),
    tripId: new ObjectId(mockTripId),
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin' as const,
    rsvpStatus: 'confirmed' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockSession = {
    attendeeId: mockAttendeeId,
    tripId: mockTripId,
    role: 'admin' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/trips/[tripId]/attendees', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        'http://localhost/api/trips/invalid-id/attendees'
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when not a member of the trip', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(
        new Error('Forbidden: Not a member of this trip')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return all attendees for a trip', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeesByTrip).mockResolvedValue([
        mockAttendee,
      ]);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('John Doe');
    });

    it('should return empty array when no attendees', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeesByTrip).mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
    });
  });

  describe('POST /api/trips/[tripId]/attendees', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        'http://localhost/api/trips/invalid-id/attendees',
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Jane Doe',
            email: 'jane@example.com',
            role: 'member',
            rsvpStatus: 'pending',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(guards.requireAdmin).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Jane Doe',
            email: 'jane@example.com',
            role: 'member',
            rsvpStatus: 'pending',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when not an admin', async () => {
      vi.mocked(guards.requireAdmin).mockRejectedValue(
        new Error('Forbidden: Admin access required')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Jane Doe',
            email: 'jane@example.com',
            role: 'member',
            rsvpStatus: 'pending',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid request body', async () => {
      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: '', // Invalid: empty name
            email: 'invalid-email',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should return 409 if attendee email already exists', async () => {
      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeByEmail).mockResolvedValue(mockAttendee);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Jane Doe',
            email: 'john@example.com', // Same email as mockAttendee
            role: 'member',
            rsvpStatus: 'pending',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
    });

    it('should create a new attendee successfully', async () => {
      const newAttendeeId = new ObjectId();
      const newAttendee = {
        _id: newAttendeeId,
        tripId: new ObjectId(mockTripId),
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'member' as const,
        rsvpStatus: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeByEmail).mockResolvedValue(null);
      vi.mocked(attendeesOps.createAttendee).mockResolvedValue(newAttendee);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Jane Doe',
            email: 'jane@example.com',
            role: 'member',
            rsvpStatus: 'pending',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Jane Doe');
      expect(data.data.email).toBe('jane@example.com');
    });

    it('should create attendee with payment handles', async () => {
      const newAttendeeId = new ObjectId();
      const newAttendee = {
        _id: newAttendeeId,
        tripId: new ObjectId(mockTripId),
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'member' as const,
        rsvpStatus: 'pending' as const,
        paymentHandles: {
          venmo: '@janedoe',
          paypal: 'jane@paypal.com',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeByEmail).mockResolvedValue(null);
      vi.mocked(attendeesOps.createAttendee).mockResolvedValue(newAttendee);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Jane Doe',
            email: 'jane@example.com',
            role: 'member',
            rsvpStatus: 'pending',
            paymentHandles: {
              venmo: '@janedoe',
              paypal: 'jane@paypal.com',
            },
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.paymentHandles.venmo).toBe('@janedoe');
    });
  });
});
