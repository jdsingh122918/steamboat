import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the dependencies
vi.mock('@/lib/db/operations/trips', () => ({
  createTrip: vi.fn(),
  getTripsByAttendee: vi.fn(),
  listTrips: vi.fn(),
}));

vi.mock('@/lib/db/operations/attendees', () => ({
  createAttendee: vi.fn(),
  getAttendeeById: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn(),
}));

import { GET, POST } from '@/app/api/trips/route';
import * as tripOperations from '@/lib/db/operations/trips';
import * as attendeeOperations from '@/lib/db/operations/attendees';
import * as sessionModule from '@/lib/auth/session';
import * as guardsModule from '@/lib/auth/guards';

describe('/api/trips route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/trips', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(guardsModule.requireAuth).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest('http://localhost/api/trips', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return empty array when user has no trips', async () => {
      const mockSession = {
        attendeeId: new ObjectId().toString(),
        tripId: new ObjectId().toString(),
        role: 'member' as const,
      };

      vi.mocked(guardsModule.requireAuth).mockResolvedValue(mockSession as any);
      vi.mocked(attendeeOperations.getAttendeeById).mockResolvedValue({
        _id: new ObjectId(mockSession.attendeeId),
        tripId: new ObjectId(mockSession.tripId),
        name: 'Test User',
        email: 'test@example.com',
        role: 'member',
        rsvpStatus: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);
      vi.mocked(tripOperations.listTrips).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      });

      const request = new NextRequest('http://localhost/api/trips', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should return trips for authenticated user', async () => {
      const mockTripId = new ObjectId();
      const mockAttendeeId = new ObjectId();
      const mockSession = {
        attendeeId: mockAttendeeId.toString(),
        tripId: mockTripId.toString(),
        role: 'member' as const,
      };

      const mockTrip = {
        _id: mockTripId,
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

      vi.mocked(guardsModule.requireAuth).mockResolvedValue(mockSession as any);
      vi.mocked(attendeeOperations.getAttendeeById).mockResolvedValue({
        _id: mockAttendeeId,
        tripId: mockTripId,
        name: 'Test User',
        email: 'test@example.com',
        role: 'member',
        rsvpStatus: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);
      vi.mocked(tripOperations.listTrips).mockResolvedValue({
        data: [mockTrip],
        total: 1,
        page: 1,
        limit: 50,
      });

      const request = new NextRequest('http://localhost/api/trips', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('Bachelor Party 2025');
    });
  });

  describe('POST /api/trips', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(sessionModule.getSession).mockResolvedValue({
        attendeeId: undefined,
      } as any);

      const request = new NextRequest('http://localhost/api/trips', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Trip',
          location: 'Test Location',
          startDate: '2025-06-01',
          endDate: '2025-06-05',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 400 for invalid request body', async () => {
      const mockAttendeeId = new ObjectId();
      vi.mocked(sessionModule.getSession).mockResolvedValue({
        attendeeId: mockAttendeeId.toString(),
        tripId: new ObjectId().toString(),
        role: 'admin',
      } as any);

      const request = new NextRequest('http://localhost/api/trips', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          name: '',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should return 400 when endDate is before startDate', async () => {
      const mockAttendeeId = new ObjectId();
      vi.mocked(sessionModule.getSession).mockResolvedValue({
        attendeeId: mockAttendeeId.toString(),
        tripId: new ObjectId().toString(),
        role: 'admin',
      } as any);

      const request = new NextRequest('http://localhost/api/trips', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Trip',
          location: 'Test Location',
          startDate: '2025-06-10',
          endDate: '2025-06-05', // Before start date
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('endDate');
    });

    it('should create trip successfully with creator as admin', async () => {
      const mockAttendeeId = new ObjectId();
      const mockTripId = new ObjectId();
      const mockNewAttendeeId = new ObjectId();

      vi.mocked(sessionModule.getSession).mockResolvedValue({
        attendeeId: mockAttendeeId.toString(),
        tripId: new ObjectId().toString(),
        role: 'admin',
      } as any);

      vi.mocked(attendeeOperations.getAttendeeById).mockResolvedValue({
        _id: mockAttendeeId,
        tripId: new ObjectId(),
        name: 'Creator User',
        email: 'creator@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);

      const mockTrip = {
        _id: mockTripId,
        name: 'Bachelor Party 2025',
        location: 'Las Vegas',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-05'),
        groomId: mockAttendeeId,
        adminIds: [mockNewAttendeeId],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(tripOperations.createTrip).mockResolvedValue(mockTrip);
      vi.mocked(attendeeOperations.createAttendee).mockResolvedValue({
        _id: mockNewAttendeeId,
        tripId: mockTripId,
        name: 'Creator User',
        email: 'creator@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);

      const request = new NextRequest('http://localhost/api/trips', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Bachelor Party 2025',
          location: 'Las Vegas',
          startDate: '2025-06-01',
          endDate: '2025-06-05',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Bachelor Party 2025');
      expect(tripOperations.createTrip).toHaveBeenCalled();
      expect(attendeeOperations.createAttendee).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockAttendeeId = new ObjectId();
      vi.mocked(sessionModule.getSession).mockResolvedValue({
        attendeeId: mockAttendeeId.toString(),
        tripId: new ObjectId().toString(),
        role: 'admin',
      } as any);

      vi.mocked(attendeeOperations.getAttendeeById).mockResolvedValue({
        _id: mockAttendeeId,
        tripId: new ObjectId(),
        name: 'Creator User',
        email: 'creator@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);

      vi.mocked(tripOperations.createTrip).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost/api/trips', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Bachelor Party 2025',
          location: 'Las Vegas',
          startDate: '2025-06-01',
          endDate: '2025-06-05',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});
