import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the dependencies
vi.mock('@/lib/db/operations/trips', () => ({
  getTripById: vi.fn(),
  updateTrip: vi.fn(),
  deleteTrip: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
  requireAdmin: vi.fn(),
}));

import { GET, PUT, DELETE } from '@/app/api/trips/[tripId]/route';
import * as tripOperations from '@/lib/db/operations/trips';
import * as guardsModule from '@/lib/auth/guards';

describe('/api/trips/[tripId] route', () => {
  const validTripId = new ObjectId().toString();
  const mockAttendeeId = new ObjectId();

  const mockTrip = {
    _id: new ObjectId(validTripId),
    name: 'Bachelor Party 2025',
    location: 'Las Vegas',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-06-05'),
    groomId: new ObjectId(),
    adminIds: [mockAttendeeId],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockAttendee = {
    _id: mockAttendeeId,
    tripId: new ObjectId(validTripId),
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin' as const,
    rsvpStatus: 'confirmed' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/trips/[tripId]', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        'http://localhost/api/trips/invalid-id',
        { method: 'GET' }
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
      vi.mocked(guardsModule.requireTripAccess).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user lacks trip access', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockRejectedValue(
        new Error('Forbidden: Not a member of this trip')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 404 when trip not found', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(tripOperations.getTripById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return trip successfully', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(tripOperations.getTripById).mockResolvedValue(mockTrip);

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Bachelor Party 2025');
      expect(data.data.location).toBe('Las Vegas');
    });
  });

  describe('PUT /api/trips/[tripId]', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        'http://localhost/api/trips/invalid-id',
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Trip' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(guardsModule.requireAdmin).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Trip' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user is not admin', async () => {
      vi.mocked(guardsModule.requireAdmin).mockRejectedValue(
        new Error('Forbidden: Admin access required')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Trip' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid request body', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: '' }), // Empty name is invalid
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 when trip not found during update', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(tripOperations.updateTrip).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Trip Name' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should update trip successfully', async () => {
      const updatedTrip = {
        ...mockTrip,
        name: 'Updated Trip Name',
        updatedAt: new Date(),
      };

      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(tripOperations.updateTrip).mockResolvedValue(updatedTrip);

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Trip Name' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Trip Name');
    });

    it('should update trip settings', async () => {
      const updatedTrip = {
        ...mockTrip,
        settings: {
          currency: 'EUR',
          timezone: 'Europe/London',
          isPublic: true,
        },
        updatedAt: new Date(),
      };

      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(tripOperations.updateTrip).mockResolvedValue(updatedTrip);

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            settings: {
              currency: 'EUR',
              timezone: 'Europe/London',
              isPublic: true,
            },
          }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.settings.currency).toBe('EUR');
    });
  });

  describe('DELETE /api/trips/[tripId]', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        'http://localhost/api/trips/invalid-id',
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(guardsModule.requireAdmin).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user is not admin', async () => {
      vi.mocked(guardsModule.requireAdmin).mockRejectedValue(
        new Error('Forbidden: Admin access required')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 404 when trip not found', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(tripOperations.deleteTrip).mockResolvedValue(false);

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should soft delete trip successfully', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(tripOperations.deleteTrip).mockResolvedValue(true);

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(tripOperations.deleteTrip).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${validTripId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: validTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
