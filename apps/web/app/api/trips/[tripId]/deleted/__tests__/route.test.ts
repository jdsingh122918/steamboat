import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the dependencies
vi.mock('@/lib/db/client', () => ({
  getCollection: vi.fn(),
  COLLECTIONS: {
    EXPENSES: 'expenses',
    MEDIA: 'media',
    ACTIVITIES: 'activities',
  },
}));

vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeeById: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
}));

import { GET } from '../route';
import * as guardsModule from '@/lib/auth/guards';
import * as attendeeOperations from '@/lib/db/operations/attendees';
import * as clientModule from '@/lib/db/client';

describe('/api/trips/[tripId]/deleted route', () => {
  const mockTripId = new ObjectId();
  const mockAttendeeId = new ObjectId();
  const mockDeletedById = new ObjectId();

  const mockAttendee = {
    _id: mockAttendeeId,
    tripId: mockTripId,
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin' as const,
    rsvpStatus: 'confirmed' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockDeletedByAttendee = {
    _id: mockDeletedById,
    tripId: mockTripId,
    name: 'Deleter User',
    email: 'deleter@example.com',
    role: 'member' as const,
    rsvpStatus: 'confirmed' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const now = new Date();
  const mockDeletedExpense = {
    _id: new ObjectId(),
    tripId: mockTripId,
    description: 'Deleted Dinner',
    amount_cents: 5000,
    deletedAt: now,
    deletedBy: mockDeletedById,
    createdAt: new Date(now.getTime() - 86400000),
    updatedAt: now,
  };

  const mockDeletedMedia = {
    _id: new ObjectId(),
    tripId: mockTripId,
    filename: 'photo.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    deletedAt: now,
    deletedBy: mockDeletedById,
    createdAt: new Date(now.getTime() - 86400000),
    updatedAt: now,
  };

  const mockDeletedActivity = {
    _id: new ObjectId(),
    tripId: mockTripId,
    title: 'Deleted Activity',
    startDate: new Date('2025-06-01'),
    deletedAt: now,
    deletedBy: mockDeletedById,
    createdAt: new Date(now.getTime() - 86400000),
    updatedAt: now,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/trips/[tripId]/deleted', () => {
    it('should return 403 if not admin', async () => {
      vi.mocked(guardsModule.requireAdmin).mockRejectedValue(
        new Error('Forbidden: Admin access required')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/deleted`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(guardsModule.requireAdmin).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/deleted`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        'http://localhost/api/trips/invalid-id/deleted',
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId format');
    });

    it('should list all soft-deleted items', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });

      vi.mocked(attendeeOperations.getAttendeeById).mockResolvedValue(
        mockDeletedByAttendee as any
      );

      const mockExpensesCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([mockDeletedExpense]),
        }),
      };

      const mockMediaCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([mockDeletedMedia]),
        }),
      };

      const mockActivitiesCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([mockDeletedActivity]),
        }),
      };

      vi.mocked(clientModule.getCollection).mockImplementation(
        async (collection: string) => {
          if (collection === 'expenses') return mockExpensesCollection as any;
          if (collection === 'media') return mockMediaCollection as any;
          if (collection === 'activities') return mockActivitiesCollection as any;
          return {} as any;
        }
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/deleted`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
      expect(data.data.some((item: any) => item.type === 'expense')).toBe(true);
      expect(data.data.some((item: any) => item.type === 'media')).toBe(true);
      expect(data.data.some((item: any) => item.type === 'activity')).toBe(true);
    });

    it('should filter by type query param', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });

      vi.mocked(attendeeOperations.getAttendeeById).mockResolvedValue(
        mockDeletedByAttendee as any
      );

      const mockExpensesCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([mockDeletedExpense]),
        }),
      };

      const mockMediaCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      };

      const mockActivitiesCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      };

      vi.mocked(clientModule.getCollection).mockImplementation(
        async (collection: string) => {
          if (collection === 'expenses') return mockExpensesCollection as any;
          if (collection === 'media') return mockMediaCollection as any;
          if (collection === 'activities') return mockActivitiesCollection as any;
          return {} as any;
        }
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/deleted?type=expense`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].type).toBe('expense');
    });

    it('should include autoDeleteAt date (30 days from deletion)', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });

      vi.mocked(attendeeOperations.getAttendeeById).mockResolvedValue(
        mockDeletedByAttendee as any
      );

      const mockExpensesCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([mockDeletedExpense]),
        }),
      };

      const mockMediaCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      };

      const mockActivitiesCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      };

      vi.mocked(clientModule.getCollection).mockImplementation(
        async (collection: string) => {
          if (collection === 'expenses') return mockExpensesCollection as any;
          if (collection === 'media') return mockMediaCollection as any;
          if (collection === 'activities') return mockActivitiesCollection as any;
          return {} as any;
        }
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/deleted`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].autoDeleteAt).toBeDefined();

      // Verify autoDeleteAt is approximately 30 days after deletedAt
      const deletedAt = new Date(data.data[0].deletedAt);
      const autoDeleteAt = new Date(data.data[0].autoDeleteAt);
      const daysDiff = (autoDeleteAt.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(daysDiff)).toBe(30);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });

      vi.mocked(clientModule.getCollection).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/deleted`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
