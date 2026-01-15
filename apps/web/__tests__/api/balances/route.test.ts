import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the dependencies
vi.mock('@/lib/db/operations/expenses', () => ({
  getExpensesByTrip: vi.fn(),
}));

vi.mock('@/lib/db/operations/payments', () => ({
  getPaymentsByTrip: vi.fn(),
}));

vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeesByTrip: vi.fn(),
  getAttendeeById: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
}));

import { GET } from '@/app/api/trips/[tripId]/balances/route';
import * as expenseOperations from '@/lib/db/operations/expenses';
import * as paymentOperations from '@/lib/db/operations/payments';
import * as attendeeOperations from '@/lib/db/operations/attendees';
import * as guardsModule from '@/lib/auth/guards';

describe('/api/trips/[tripId]/balances route', () => {
  const mockTripId = new ObjectId();
  const mockAttendeeId1 = new ObjectId();
  const mockAttendeeId2 = new ObjectId();
  const mockAttendeeId3 = new ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/trips/[tripId]/balances', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances`,
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
        `http://localhost/api/trips/${mockTripId}/balances`,
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
        'http://localhost/api/trips/invalid-id/balances',
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

    it('should return empty balances when no expenses exist', async () => {
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

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].balance_cents).toBe(0);
      expect(data.data[0].name).toBe('Alice');
    });

    it('should calculate balances correctly for a single expense', async () => {
      vi.mocked(guardsModule.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId1.toString() } as any,
        attendee: {
          _id: mockAttendeeId1,
          tripId: mockTripId,
          name: 'Test User',
          role: 'member',
        } as any,
      });

      // Two attendees: Alice and Bob
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

      // Alice paid $100 for both Alice and Bob
      // Alice paid: +10000 cents
      // Alice share: -5000 cents (half of 10000)
      // Net: +5000 cents (Alice is owed money)
      // Bob paid: 0
      // Bob share: -5000 cents
      // Net: -5000 cents (Bob owes money)
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

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);

      // Find Alice and Bob in response
      const alice = data.data.find((b: any) => b.name === 'Alice');
      const bob = data.data.find((b: any) => b.name === 'Bob');

      // Alice is owed $50 (positive balance)
      expect(alice.balance_cents).toBe(5000);
      // Bob owes $50 (negative balance)
      expect(bob.balance_cents).toBe(-5000);
    });

    it('should calculate balances correctly with custom share amounts', async () => {
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

      // Alice paid $100, Alice owes $30, Bob owes $70 (custom split)
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
              { attendeeId: mockAttendeeId1, optedIn: true, share_cents: 3000 },
              { attendeeId: mockAttendeeId2, optedIn: true, share_cents: 7000 },
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

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const alice = data.data.find((b: any) => b.name === 'Alice');
      const bob = data.data.find((b: any) => b.name === 'Bob');

      // Alice paid $100, owes $30, so net = +$70
      expect(alice.balance_cents).toBe(7000);
      // Bob paid $0, owes $70, so net = -$70
      expect(bob.balance_cents).toBe(-7000);
    });

    it('should factor in payments when calculating balances', async () => {
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

      // Alice paid $100 for both, equal split
      // Before payments: Alice +$50, Bob -$50
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

      // Bob sent $30 to Alice
      // Bob: -$30 (sent), Alice: +$30 (received) -> net adjustment
      // Actually for balance:
      // - They sent: +amount_cents (increases balance, reduces debt)
      // - They received: -amount_cents (decreases balance)
      vi.mocked(paymentOperations.getPaymentsByTrip).mockResolvedValue([
        {
          _id: new ObjectId(),
          tripId: mockTripId,
          fromId: mockAttendeeId2, // Bob sends
          toId: mockAttendeeId1, // to Alice
          amount_cents: 3000,
          status: 'paid',
          method: 'venmo',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } as any,
      ]);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const alice = data.data.find((b: any) => b.name === 'Alice');
      const bob = data.data.find((b: any) => b.name === 'Bob');

      // Alice: was +$50, received $30 payment, so now +$50 - $30 = +$20 (still owed)
      expect(alice.balance_cents).toBe(2000);
      // Bob: was -$50, sent $30 payment, so now -$50 + $30 = -$20 (still owes)
      expect(bob.balance_cents).toBe(-2000);
    });

    it('should exclude opted-out participants from expense splits', async () => {
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

      // Alice paid $90 for Alice, Bob, Charlie but Charlie opted out
      // Only Alice and Bob should split, so each owes $45
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
              { attendeeId: mockAttendeeId3, optedIn: false }, // Charlie opted out
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

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const alice = data.data.find((b: any) => b.name === 'Alice');
      const bob = data.data.find((b: any) => b.name === 'Bob');
      const charlie = data.data.find((b: any) => b.name === 'Charlie');

      // Alice paid $90, owes $45, net = +$45
      expect(alice.balance_cents).toBe(4500);
      // Bob paid $0, owes $45, net = -$45
      expect(bob.balance_cents).toBe(-4500);
      // Charlie opted out, should have 0 balance
      expect(charlie.balance_cents).toBe(0);
    });

    it('should handle multiple expenses correctly', async () => {
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

      // Expense 1: Alice paid $100, split evenly -> Alice +$50, Bob -$50
      // Expense 2: Bob paid $60, split evenly -> Alice -$30, Bob +$30
      // Net: Alice = +$50 - $30 = +$20, Bob = -$50 + $30 = -$20
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
          {
            _id: new ObjectId(),
            tripId: mockTripId,
            payerId: mockAttendeeId2,
            amount_cents: 6000,
            currency: 'USD',
            category: 'drinks',
            description: 'Bar tab',
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
        total: 2,
        page: 1,
        limit: 1000,
              });

      vi.mocked(paymentOperations.getPaymentsByTrip).mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const alice = data.data.find((b: any) => b.name === 'Alice');
      const bob = data.data.find((b: any) => b.name === 'Bob');

      expect(alice.balance_cents).toBe(2000);
      expect(bob.balance_cents).toBe(-2000);
    });

    it('should handle single attendee with expenses', async () => {
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

      // Alice paid $100 only for herself
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

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const alice = data.data.find((b: any) => b.name === 'Alice');
      // Alice paid $100, owes $100, net = 0
      expect(alice.balance_cents).toBe(0);
    });

    it('should include attendee IDs in response', async () => {
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

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/balances`,
        { method: 'GET' }
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].attendeeId).toBe(mockAttendeeId1.toString());
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
        `http://localhost/api/trips/${mockTripId}/balances`,
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
