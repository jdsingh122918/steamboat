import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the dependencies
vi.mock('@/lib/db/operations/expenses', () => ({
  getExpensesByTrip: vi.fn(),
  getExpenseSummaryByCategory: vi.fn(),
}));

vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeesByTrip: vi.fn(),
}));

vi.mock('@/lib/db/operations/media', () => ({
  getMediaStats: vi.fn(),
}));

vi.mock('@/lib/db/operations/activities', () => ({
  getActivitiesByTrip: vi.fn(),
}));

vi.mock('@/lib/db/operations/polls', () => ({
  getPollsByTrip: vi.fn(),
}));

vi.mock('@/lib/db/operations/payments', () => ({
  getPaymentTotals: vi.fn(),
  getPaymentsByTrip: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
}));

import { GET } from '../route';
import * as expenseOperations from '@/lib/db/operations/expenses';
import * as attendeeOperations from '@/lib/db/operations/attendees';
import * as mediaOperations from '@/lib/db/operations/media';
import * as activityOperations from '@/lib/db/operations/activities';
import * as pollOperations from '@/lib/db/operations/polls';
import * as paymentOperations from '@/lib/db/operations/payments';
import * as guardsModule from '@/lib/auth/guards';

describe('/api/trips/[tripId]/stats route', () => {
  const mockTripId = new ObjectId();
  const mockAttendeeId = new ObjectId();

  const mockAttendee = {
    _id: mockAttendeeId,
    tripId: mockTripId,
    name: 'Test User',
    email: 'test@example.com',
    role: 'member' as const,
    rsvpStatus: 'confirmed' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/trips/[tripId]/stats', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/stats`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 403 if not trip member', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockRejectedValue(
        new Error('Forbidden: Not a member of this trip')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/stats`,
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

    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        'http://localhost/api/trips/invalid-id/stats',
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

    it('should return aggregated statistics for trip', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });

      // Mock expenses
      vi.mocked(expenseOperations.getExpensesByTrip).mockResolvedValue({
        data: [
          { _id: new ObjectId(), amount_cents: 10000, category: 'food' },
          { _id: new ObjectId(), amount_cents: 5000, category: 'transport' },
        ],
        total: 2,
        page: 1,
        limit: 1000,
      } as any);

      vi.mocked(expenseOperations.getExpenseSummaryByCategory).mockResolvedValue([
        { category: 'food', total_cents: 10000, count: 1 },
        { category: 'transport', total_cents: 5000, count: 1 },
      ] as any);

      // Mock attendees
      vi.mocked(attendeeOperations.getAttendeesByTrip).mockResolvedValue([
        { ...mockAttendee, rsvpStatus: 'confirmed' },
        { ...mockAttendee, _id: new ObjectId(), rsvpStatus: 'pending' },
        { ...mockAttendee, _id: new ObjectId(), rsvpStatus: 'confirmed' },
      ] as any);

      // Mock media
      vi.mocked(mediaOperations.getMediaStats).mockResolvedValue({
        count: 25,
        totalSize: 1000000,
      });

      // Mock activities (2 past activities count as completed)
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      vi.mocked(activityOperations.getActivitiesByTrip).mockResolvedValue([
        { _id: new ObjectId(), startDate: pastDate, name: 'Past Activity 1' },
        { _id: new ObjectId(), startDate: futureDate, name: 'Future Activity' },
        { _id: new ObjectId(), startDate: pastDate, name: 'Past Activity 2' },
      ] as any);

      // Mock polls
      vi.mocked(pollOperations.getPollsByTrip).mockResolvedValue([
        { _id: new ObjectId(), status: 'open' },
        { _id: new ObjectId(), status: 'closed' },
        { _id: new ObjectId(), status: 'open' },
      ] as any);

      // Mock payments
      vi.mocked(paymentOperations.getPaymentTotals).mockResolvedValue({
        confirmed_cents: 3000,
        pending_cents: 2000,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/stats`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalExpenses).toBe(15000);
      expect(data.data.expenseCount).toBe(2);
      expect(data.data.totalAttendees).toBe(3);
      expect(data.data.confirmedAttendees).toBe(2);
      expect(data.data.totalPhotos).toBe(25);
      expect(data.data.totalActivities).toBe(3);
      expect(data.data.completedActivities).toBe(2);
      expect(data.data.totalPolls).toBe(3);
      expect(data.data.openPolls).toBe(2);
      expect(data.data.closedPolls).toBe(1);
    });

    it('should calculate expense breakdown by category', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });

      vi.mocked(expenseOperations.getExpensesByTrip).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1000,
      } as any);

      vi.mocked(expenseOperations.getExpenseSummaryByCategory).mockResolvedValue([
        { category: 'food', total_cents: 20000, count: 5 },
        { category: 'transport', total_cents: 10000, count: 3 },
        { category: 'lodging', total_cents: 50000, count: 1 },
      ] as any);

      vi.mocked(attendeeOperations.getAttendeesByTrip).mockResolvedValue([]);
      vi.mocked(mediaOperations.getMediaStats).mockResolvedValue({ count: 0, totalSize: 0 });
      vi.mocked(activityOperations.getActivitiesByTrip).mockResolvedValue([]);
      vi.mocked(pollOperations.getPollsByTrip).mockResolvedValue([]);
      vi.mocked(paymentOperations.getPaymentTotals).mockResolvedValue({
        confirmed_cents: 0,
        pending_cents: 0,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/stats`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.expenseBreakdown).toHaveLength(3);
      expect(data.data.expenseBreakdown).toContainEqual({
        category: 'food',
        total: 20000,
        count: 5,
      });
      expect(data.data.expenseBreakdown).toContainEqual({
        category: 'transport',
        total: 10000,
        count: 3,
      });
    });

    it('should count attendees by status', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });

      vi.mocked(expenseOperations.getExpensesByTrip).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1000,
      } as any);
      vi.mocked(expenseOperations.getExpenseSummaryByCategory).mockResolvedValue([]);

      vi.mocked(attendeeOperations.getAttendeesByTrip).mockResolvedValue([
        { ...mockAttendee, rsvpStatus: 'confirmed' },
        { ...mockAttendee, _id: new ObjectId(), rsvpStatus: 'confirmed' },
        { ...mockAttendee, _id: new ObjectId(), rsvpStatus: 'pending' },
        { ...mockAttendee, _id: new ObjectId(), rsvpStatus: 'declined' },
        { ...mockAttendee, _id: new ObjectId(), rsvpStatus: 'confirmed' },
      ] as any);

      vi.mocked(mediaOperations.getMediaStats).mockResolvedValue({ count: 0, totalSize: 0 });
      vi.mocked(activityOperations.getActivitiesByTrip).mockResolvedValue([]);
      vi.mocked(pollOperations.getPollsByTrip).mockResolvedValue([]);
      vi.mocked(paymentOperations.getPaymentTotals).mockResolvedValue({
        confirmed_cents: 0,
        pending_cents: 0,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/stats`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.totalAttendees).toBe(5);
      expect(data.data.confirmedAttendees).toBe(3);
    });

    it('should track settlement progress', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });

      vi.mocked(expenseOperations.getExpensesByTrip).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1000,
      } as any);
      vi.mocked(expenseOperations.getExpenseSummaryByCategory).mockResolvedValue([]);
      vi.mocked(attendeeOperations.getAttendeesByTrip).mockResolvedValue([]);
      vi.mocked(mediaOperations.getMediaStats).mockResolvedValue({ count: 0, totalSize: 0 });
      vi.mocked(activityOperations.getActivitiesByTrip).mockResolvedValue([]);
      vi.mocked(pollOperations.getPollsByTrip).mockResolvedValue([]);

      vi.mocked(paymentOperations.getPaymentTotals).mockResolvedValue({
        confirmed_cents: 7500,
        pending_cents: 2500,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/stats`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.settlementStatus.pending).toBe(2500);
      expect(data.data.settlementStatus.completed).toBe(7500);
      expect(data.data.settlementStatus.total).toBe(10000);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAttendee,
      });

      vi.mocked(expenseOperations.getExpensesByTrip).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/stats`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});
