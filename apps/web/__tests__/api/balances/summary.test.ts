import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the dependencies
vi.mock('@/lib/db/operations/expenses', () => ({
  getExpensesByTrip: vi.fn(),
  getTripTotalExpenses: vi.fn(),
  getExpenseSummaryByCategory: vi.fn(),
}));

vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeesByTrip: vi.fn(),
  getAttendeeById: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
}));

import { GET } from '@/app/api/trips/[tripId]/balances/summary/route';
import * as expenseOperations from '@/lib/db/operations/expenses';
import * as attendeeOperations from '@/lib/db/operations/attendees';
import * as guardsModule from '@/lib/auth/guards';

describe('/api/trips/[tripId]/balances/summary route', () => {
  const mockTripId = new ObjectId();
  const mockAttendeeId1 = new ObjectId();
  const mockAttendeeId2 = new ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/trips/[tripId]/balances/summary', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/summary`,
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

    it('should return 403 when user is not a member of the trip', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockRejectedValue(
        new Error('Forbidden: Not a member of this trip')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/summary`,
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
        'http://localhost/api/trips/invalid-id/balances/summary',
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

    it('should return empty summary when no expenses exist', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId1.toString() } as any,
        attendee: {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Test User',
          role: 'member',
        } as any,
      });

      vi.mocked(attendeeOperations.getAttendeesByTrip).mockResolvedValue([
        {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Alice',
          email: 'alice@test.com',
          role: 'admin',
          rsvpStatus: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } as any,
      ]);

      vi.mocked(expenseOperations.getExpensesByTrip).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1000,
              });

      vi.mocked(expenseOperations.getTripTotalExpenses).mockResolvedValue(0);
      vi.mocked(expenseOperations.getExpenseSummaryByCategory).mockResolvedValue(
        []
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/summary`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalSpent_cents).toBe(0);
      expect(data.data.byCategory).toEqual({});
      expect(data.data.byPayer).toEqual({});
      expect(data.data.byDate).toEqual({});
    });

    it('should return summary with total spent', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId1.toString() } as any,
        attendee: {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Test User',
          role: 'member',
        } as any,
      });

      vi.mocked(attendeeOperations.getAttendeesByTrip).mockResolvedValue([
        {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Alice',
          email: 'alice@test.com',
          role: 'admin',
          rsvpStatus: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } as any,
      ]);

      vi.mocked(expenseOperations.getExpensesByTrip).mockResolvedValue({
        data: [
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId1,
            amount_cents: 10000,
            currency: 'USD',
            category: 'food',
            description: 'Dinner',
            participants: [{ attendeeId: mockAttendeeId1, optedIn: true }],
            status: 'pending',
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
        ],
        total: 1,
        page: 1,
        limit: 1000,
              });

      vi.mocked(expenseOperations.getTripTotalExpenses).mockResolvedValue(10000);
      vi.mocked(expenseOperations.getExpenseSummaryByCategory).mockResolvedValue(
        [{ category: 'food', total_cents: 10000, count: 1 }]
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/summary`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalSpent_cents).toBe(10000);
    });

    it('should return summary grouped by category', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId1.toString() } as any,
        attendee: {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Test User',
          role: 'member',
        } as any,
      });

      vi.mocked(attendeeOperations.getAttendeesByTrip).mockResolvedValue([
        {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Alice',
          email: 'alice@test.com',
          role: 'admin',
          rsvpStatus: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } as any,
      ]);

      vi.mocked(expenseOperations.getExpensesByTrip).mockResolvedValue({
        data: [
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId1,
            amount_cents: 10000,
            currency: 'USD',
            category: 'food',
            description: 'Dinner',
            participants: [{ attendeeId: mockAttendeeId1, optedIn: true }],
            status: 'pending',
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId1,
            amount_cents: 5000,
            currency: 'USD',
            category: 'drinks',
            description: 'Bar',
            participants: [{ attendeeId: mockAttendeeId1, optedIn: true }],
            status: 'pending',
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId1,
            amount_cents: 20000,
            currency: 'USD',
            category: 'accommodation',
            description: 'Hotel',
            participants: [{ attendeeId: mockAttendeeId1, optedIn: true }],
            status: 'pending',
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
        ],
        total: 3,
        page: 1,
        limit: 1000,
              });

      vi.mocked(expenseOperations.getTripTotalExpenses).mockResolvedValue(35000);
      vi.mocked(expenseOperations.getExpenseSummaryByCategory).mockResolvedValue(
        [
          { category: 'food', total_cents: 10000, count: 1 },
          { category: 'drinks', total_cents: 5000, count: 1 },
          { category: 'accommodation', total_cents: 20000, count: 1 },
        ]
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/summary`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.byCategory).toEqual({
        food: { total_cents: 10000, count: 1 },
        drinks: { total_cents: 5000, count: 1 },
        accommodation: { total_cents: 20000, count: 1 },
      });
    });

    it('should return summary grouped by payer', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId1.toString() } as any,
        attendee: {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Test User',
          role: 'member',
        } as any,
      });

      vi.mocked(attendeeOperations.getAttendeesByTrip).mockResolvedValue([
        {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Alice',
          email: 'alice@test.com',
          role: 'admin',
          rsvpStatus: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } as any,
        {
          _id: mockAttendeeId2,
          tripId: mockTripId,
          name: 'Bob',
          email: 'bob@test.com',
          role: 'member',
          rsvpStatus: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } as any,
      ]);

      vi.mocked(expenseOperations.getExpensesByTrip).mockResolvedValue({
        data: [
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId1,
            amount_cents: 10000,
            currency: 'USD',
            category: 'food',
            description: 'Dinner',
            participants: [
              { attendeeId: mockAttendeeId1, optedIn: true },
              { attendeeId: mockAttendeeId2, optedIn: true },
            ],
            status: 'pending',
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId2,
            amount_cents: 5000,
            currency: 'USD',
            category: 'drinks',
            description: 'Bar',
            participants: [
              { attendeeId: mockAttendeeId1, optedIn: true },
              { attendeeId: mockAttendeeId2, optedIn: true },
            ],
            status: 'pending',
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
        ],
        total: 2,
        page: 1,
        limit: 1000,
              });

      vi.mocked(expenseOperations.getTripTotalExpenses).mockResolvedValue(15000);
      vi.mocked(expenseOperations.getExpenseSummaryByCategory).mockResolvedValue(
        [
          { category: 'food', total_cents: 10000, count: 1 },
          { category: 'drinks', total_cents: 5000, count: 1 },
        ]
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/summary`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.byPayer).toHaveProperty('Alice');
      expect(data.data.byPayer).toHaveProperty('Bob');
      expect(data.data.byPayer.Alice.total_cents).toBe(10000);
      expect(data.data.byPayer.Bob.total_cents).toBe(5000);
    });

    it('should return summary grouped by date', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId1.toString() } as any,
        attendee: {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Test User',
          role: 'member',
        } as any,
      });

      vi.mocked(attendeeOperations.getAttendeesByTrip).mockResolvedValue([
        {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Alice',
          email: 'alice@test.com',
          role: 'admin',
          rsvpStatus: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } as any,
      ]);

      vi.mocked(expenseOperations.getExpensesByTrip).mockResolvedValue({
        data: [
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId1,
            amount_cents: 10000,
            currency: 'USD',
            category: 'food',
            description: 'Day 1 Dinner',
            participants: [{ attendeeId: mockAttendeeId1, optedIn: true }],
            status: 'pending',
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId1,
            amount_cents: 5000,
            currency: 'USD',
            category: 'food',
            description: 'Day 1 Lunch',
            participants: [{ attendeeId: mockAttendeeId1, optedIn: true }],
            status: 'pending',
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId1,
            amount_cents: 8000,
            currency: 'USD',
            category: 'activities',
            description: 'Day 2 Activity',
            participants: [{ attendeeId: mockAttendeeId1, optedIn: true }],
            status: 'pending',
            createdAt: new Date('2025-01-16'),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
        ],
        total: 3,
        page: 1,
        limit: 1000,
              });

      vi.mocked(expenseOperations.getTripTotalExpenses).mockResolvedValue(23000);
      vi.mocked(expenseOperations.getExpenseSummaryByCategory).mockResolvedValue(
        [
          { category: 'food', total_cents: 15000, count: 2 },
          { category: 'activities', total_cents: 8000, count: 1 },
        ]
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/summary`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.byDate).toHaveProperty('2025-01-15');
      expect(data.data.byDate).toHaveProperty('2025-01-16');
      expect(data.data.byDate['2025-01-15'].total_cents).toBe(15000);
      expect(data.data.byDate['2025-01-15'].count).toBe(2);
      expect(data.data.byDate['2025-01-16'].total_cents).toBe(8000);
      expect(data.data.byDate['2025-01-16'].count).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId1.toString() } as any,
        attendee: {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Test User',
          role: 'member',
        } as any,
      });

      vi.mocked(attendeeOperations.getAttendeesByTrip).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/summary`,
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

    it('should include expense count in category summary', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId1.toString() } as any,
        attendee: {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Test User',
          role: 'member',
        } as any,
      });

      vi.mocked(attendeeOperations.getAttendeesByTrip).mockResolvedValue([
        {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Alice',
          email: 'alice@test.com',
          role: 'admin',
          rsvpStatus: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } as any,
      ]);

      vi.mocked(expenseOperations.getExpensesByTrip).mockResolvedValue({
        data: [
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId1,
            amount_cents: 5000,
            currency: 'USD',
            category: 'food',
            description: 'Lunch',
            participants: [{ attendeeId: mockAttendeeId1, optedIn: true }],
            status: 'pending',
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId1,
            amount_cents: 10000,
            currency: 'USD',
            category: 'food',
            description: 'Dinner',
            participants: [{ attendeeId: mockAttendeeId1, optedIn: true }],
            status: 'pending',
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
        ],
        total: 2,
        page: 1,
        limit: 1000,
              });

      vi.mocked(expenseOperations.getTripTotalExpenses).mockResolvedValue(15000);
      vi.mocked(expenseOperations.getExpenseSummaryByCategory).mockResolvedValue(
        [{ category: 'food', total_cents: 15000, count: 2 }]
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/summary`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.byCategory.food.count).toBe(2);
      expect(data.data.byCategory.food.total_cents).toBe(15000);
    });
  });
});
