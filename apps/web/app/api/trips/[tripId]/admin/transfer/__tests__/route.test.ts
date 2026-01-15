import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the dependencies
vi.mock('@/lib/db/operations/trips', () => ({
  getTripById: vi.fn(),
  updateTrip: vi.fn(),
}));

vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeeById: vi.fn(),
  getAttendeesByTrip: vi.fn(),
  updateAttendee: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
}));

import { POST } from '../route';
import * as tripOperations from '@/lib/db/operations/trips';
import * as attendeeOperations from '@/lib/db/operations/attendees';
import * as guardsModule from '@/lib/auth/guards';

describe('/api/trips/[tripId]/admin/transfer route', () => {
  const mockTripId = new ObjectId();
  const mockCurrentAdminId = new ObjectId();
  const mockNewAdminId = new ObjectId();
  const mockNonMemberId = new ObjectId();

  const mockTrip = {
    _id: mockTripId,
    name: 'Bachelor Party 2025',
    location: 'Las Vegas',
    adminIds: [mockCurrentAdminId],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockCurrentAdmin = {
    _id: mockCurrentAdminId,
    tripId: mockTripId,
    name: 'Current Admin',
    email: 'admin@example.com',
    role: 'admin' as const,
    rsvpStatus: 'confirmed' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockNewAdmin = {
    _id: mockNewAdminId,
    tripId: mockTripId,
    name: 'New Admin',
    email: 'newadmin@example.com',
    role: 'member' as const,
    rsvpStatus: 'confirmed' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/trips/[tripId]/admin/transfer', () => {
    it('should return 403 if not current admin', async () => {
      vi.mocked(guardsModule.requireAdmin).mockRejectedValue(
        new Error('Forbidden: Admin access required')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/admin/transfer`,
        {
          method: 'POST',
          body: JSON.stringify({ newAdminId: mockNewAdminId.toString() }),
        }
      );

      const response = await POST(request, {
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
        `http://localhost/api/trips/${mockTripId}/admin/transfer`,
        {
          method: 'POST',
          body: JSON.stringify({ newAdminId: mockNewAdminId.toString() }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        'http://localhost/api/trips/invalid-id/admin/transfer',
        {
          method: 'POST',
          body: JSON.stringify({ newAdminId: mockNewAdminId.toString() }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId format');
    });

    it('should return 400 if newAdminId is current admin', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockCurrentAdminId.toString() } as any,
        attendee: mockCurrentAdmin,
      });

      vi.mocked(tripOperations.getTripById).mockResolvedValue(mockTrip as any);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/admin/transfer`,
        {
          method: 'POST',
          body: JSON.stringify({ newAdminId: mockCurrentAdminId.toString() }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already an admin');
    });

    it('should return 404 if newAdminId not trip member', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockCurrentAdminId.toString() } as any,
        attendee: mockCurrentAdmin,
      });

      vi.mocked(tripOperations.getTripById).mockResolvedValue(mockTrip as any);

      vi.mocked(attendeeOperations.getAttendeesByTrip).mockResolvedValue([
        mockCurrentAdmin,
        mockNewAdmin,
      ] as any);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/admin/transfer`,
        {
          method: 'POST',
          body: JSON.stringify({ newAdminId: mockNonMemberId.toString() }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should transfer admin role successfully', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockCurrentAdminId.toString() } as any,
        attendee: mockCurrentAdmin,
      });

      vi.mocked(tripOperations.getTripById).mockResolvedValue(mockTrip as any);

      vi.mocked(attendeeOperations.getAttendeesByTrip).mockResolvedValue([
        mockCurrentAdmin,
        mockNewAdmin,
      ] as any);

      vi.mocked(attendeeOperations.updateAttendee).mockResolvedValue({} as any);

      vi.mocked(tripOperations.updateTrip).mockResolvedValue({
        ...mockTrip,
        adminIds: [mockNewAdminId],
      } as any);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/admin/transfer`,
        {
          method: 'POST',
          body: JSON.stringify({ newAdminId: mockNewAdminId.toString() }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.previousAdmin.id).toBe(mockCurrentAdminId.toString());
      expect(data.data.previousAdmin.name).toBe('Current Admin');
      expect(data.data.newAdmin.id).toBe(mockNewAdminId.toString());
      expect(data.data.newAdmin.name).toBe('New Admin');

      // Verify both attendee records were updated
      expect(attendeeOperations.updateAttendee).toHaveBeenCalledTimes(2);
    });

    it('should return 400 for missing newAdminId', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockCurrentAdminId.toString() } as any,
        attendee: mockCurrentAdmin,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/admin/transfer`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockCurrentAdminId.toString() } as any,
        attendee: mockCurrentAdmin,
      });

      vi.mocked(tripOperations.getTripById).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/admin/transfer`,
        {
          method: 'POST',
          body: JSON.stringify({ newAdminId: mockNewAdminId.toString() }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
