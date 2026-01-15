import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the dependencies
vi.mock('@/lib/db/operations/expenses', () => ({
  getExpensesByTrip: vi.fn(),
  updateExpense: vi.fn(),
}));

vi.mock('@/lib/db/operations/payments', () => ({
  getPaymentsByTrip: vi.fn(),
  createPayment: vi.fn(),
}));

vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeesByTrip: vi.fn(),
  getAttendeeById: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
  requireAdmin: vi.fn(),
}));

// Mock the expense-optimizer WASM module
vi.mock('expense-optimizer', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  optimize_settlements: vi.fn(),
}));

import { GET, POST } from '@/app/api/trips/[tripId]/balances/settlements/route';
import * as expenseOperations from '@/lib/db/operations/expenses';
import * as paymentOperations from '@/lib/db/operations/payments';
import * as attendeeOperations from '@/lib/db/operations/attendees';
import * as guardsModule from '@/lib/auth/guards';
import * as wasmModule from 'expense-optimizer';

describe('/api/trips/[tripId]/balances/settlements route', () => {
  const mockTripId = new ObjectId();
  const mockAttendeeId1 = new ObjectId();
  const mockAttendeeId2 = new ObjectId();
  const mockAttendeeId3 = new ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/trips/[tripId]/balances/settlements', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/settlements`,
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
        `http://localhost/api/trips/${mockTripId}/balances/settlements`,
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
        'http://localhost/api/trips/invalid-id/balances/settlements',
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

    it('should return empty settlements when no debts exist', async () => {
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

      vi.mocked(paymentOperations.getPaymentsByTrip).mockResolvedValue([]);

      vi.mocked(wasmModule.optimize_settlements).mockReturnValue({
        original_count: 0,
        optimized_count: 0,
        payments: [],
        savings_percent: 0,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/settlements`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.settlements).toEqual([]);
      expect(data.data.original_count).toBe(0);
      expect(data.data.optimized_count).toBe(0);
    });

    it('should return optimized settlements using WASM optimizer', async () => {
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
        {
          _id: mockAttendeeId3,
          tripId: mockTripId,
          name: 'Charlie',
          email: 'charlie@test.com',
          role: 'member',
          rsvpStatus: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } as any,
      ]);

      // Alice paid $90 for all three
      vi.mocked(expenseOperations.getExpensesByTrip).mockResolvedValue({
        data: [
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId1,
            amount_cents: 9000,
            currency: 'USD',
            category: 'food',
            description: 'Dinner',
            participants: [
              { attendeeId: mockAttendeeId1, optedIn: true },
              { attendeeId: mockAttendeeId2, optedIn: true },
              { attendeeId: mockAttendeeId3, optedIn: true },
            ],
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
        ],
        total: 1,
        page: 1,
        limit: 1000,
              });

      vi.mocked(paymentOperations.getPaymentsByTrip).mockResolvedValue([]);

      // Mock the WASM optimizer response
      vi.mocked(wasmModule.optimize_settlements).mockReturnValue({
        original_count: 2,
        optimized_count: 2,
        payments: [
          {
            from: mockAttendeeId2.toString(),
            to: mockAttendeeId1.toString(),
            amount_cents: 3000,
            reason: 'Settlement',
          },
          {
            from: mockAttendeeId3.toString(),
            to: mockAttendeeId1.toString(),
            amount_cents: 3000,
            reason: 'Settlement',
          },
        ],
        savings_percent: 0,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/settlements`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.settlements).toHaveLength(2);
      expect(data.data.original_count).toBe(2);
      expect(data.data.optimized_count).toBe(2);
    });

    it('should include attendee names in settlement response', async () => {
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
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
        ],
        total: 1,
        page: 1,
        limit: 1000,
              });

      vi.mocked(paymentOperations.getPaymentsByTrip).mockResolvedValue([]);

      vi.mocked(wasmModule.optimize_settlements).mockReturnValue({
        original_count: 1,
        optimized_count: 1,
        payments: [
          {
            from: mockAttendeeId2.toString(),
            to: mockAttendeeId1.toString(),
            amount_cents: 5000,
            reason: 'Settlement',
          },
        ],
        savings_percent: 0,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/settlements`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.settlements[0].fromName).toBe('Bob');
      expect(data.data.settlements[0].toName).toBe('Alice');
    });

    it('should handle WASM errors gracefully', async () => {
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
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
        ],
        total: 1,
        page: 1,
        limit: 1000,
              });

      vi.mocked(paymentOperations.getPaymentsByTrip).mockResolvedValue([]);

      vi.mocked(wasmModule.optimize_settlements).mockImplementation(() => {
        throw new Error('WASM execution failed');
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/settlements`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('WASM');
    });
  });

  describe('POST /api/trips/[tripId]/balances/settlements', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(guardsModule.requireAdmin).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/settlements`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 403 when user is not admin', async () => {
      vi.mocked(guardsModule.requireAdmin).mockRejectedValue(
        new Error('Forbidden: Admin access required')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/settlements`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });

    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        'http://localhost/api/trips/invalid-id/balances/settlements',
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId format');
    });

    it('should execute settlements successfully', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId1.toString() } as any,
        attendee: {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Admin User',
          role: 'admin',
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

      const mockExpenseId = new ObjectId();
      vi.mocked(expenseOperations.getExpensesByTrip).mockResolvedValue({
        data: [
          {
            _id: mockExpenseId,
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
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
        ],
        total: 1,
        page: 1,
        limit: 1000,
              });

      vi.mocked(paymentOperations.getPaymentsByTrip).mockResolvedValue([]);

      vi.mocked(wasmModule.optimize_settlements).mockReturnValue({
        original_count: 1,
        optimized_count: 1,
        payments: [
          {
            from: mockAttendeeId2.toString(),
            to: mockAttendeeId1.toString(),
            amount_cents: 5000,
            reason: 'Settlement',
          },
        ],
        savings_percent: 0,
      });

      const mockPaymentId = new ObjectId();
      vi.mocked(paymentOperations.createPayment).mockResolvedValue({
        _id: mockPaymentId,
        tripId: mockTripId,
        fromId: mockAttendeeId2,
        toId: mockAttendeeId1,
        amount_cents: 5000,
        status: 'pending',
        method: 'other',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);

      vi.mocked(expenseOperations.updateExpense).mockResolvedValue({
        _id: mockExpenseId,
        tripId: mockTripId,
        payerId: mockAttendeeId1,
        amount_cents: 10000,
        status: 'settled',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/settlements`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.paymentsCreated).toBe(1);
      expect(data.data.expensesSettled).toBe(1);
      expect(paymentOperations.createPayment).toHaveBeenCalledTimes(1);
      expect(expenseOperations.updateExpense).toHaveBeenCalledWith(
        mockExpenseId,
        { status: 'settled' }
      );
    });

    it('should return success with no changes when no settlements needed', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId1.toString() } as any,
        attendee: {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Admin User',
          role: 'admin',
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

      vi.mocked(paymentOperations.getPaymentsByTrip).mockResolvedValue([]);

      vi.mocked(wasmModule.optimize_settlements).mockReturnValue({
        original_count: 0,
        optimized_count: 0,
        payments: [],
        savings_percent: 0,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/settlements`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.paymentsCreated).toBe(0);
      expect(data.data.expensesSettled).toBe(0);
      expect(paymentOperations.createPayment).not.toHaveBeenCalled();
    });

    it('should handle database errors during settlement execution', async () => {
      vi.mocked(guardsModule.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendeeId1.toString() } as any,
        attendee: {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Admin User',
          role: 'admin',
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
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
        ],
        total: 1,
        page: 1,
        limit: 1000,
              });

      vi.mocked(paymentOperations.getPaymentsByTrip).mockResolvedValue([]);

      vi.mocked(wasmModule.optimize_settlements).mockReturnValue({
        original_count: 1,
        optimized_count: 1,
        payments: [
          {
            from: mockAttendeeId2.toString(),
            to: mockAttendeeId1.toString(),
            amount_cents: 5000,
            reason: 'Settlement',
          },
        ],
        savings_percent: 0,
      });

      vi.mocked(paymentOperations.createPayment).mockRejectedValue(
        new Error('Database write failed')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances/settlements`,
        { method: 'POST' }
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
