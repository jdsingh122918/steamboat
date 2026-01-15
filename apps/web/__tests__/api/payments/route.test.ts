import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the database operations
vi.mock('@/lib/db/operations/payments', () => ({
  getPaymentsByTrip: vi.fn(),
  createPayment: vi.fn(),
  listPayments: vi.fn(),
}));

vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeeById: vi.fn(),
  getAttendeesByTrip: vi.fn(),
}));

// Mock the auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
  requireAdmin: vi.fn(),
}));

import { GET, POST } from '@/app/api/trips/[tripId]/payments/route';
import * as paymentsOps from '@/lib/db/operations/payments';
import * as attendeesOps from '@/lib/db/operations/attendees';
import * as guards from '@/lib/auth/guards';

describe('/api/trips/[tripId]/payments', () => {
  const mockTripId = new ObjectId().toString();
  const mockAttendeeId = new ObjectId().toString();
  const mockRecipientId = new ObjectId().toString();
  const mockPaymentId = new ObjectId().toString();

  const mockAttendee = {
    _id: new ObjectId(mockAttendeeId),
    tripId: new ObjectId(mockTripId),
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin' as const,
    rsvpStatus: 'confirmed' as const,
    paymentHandles: {
      venmo: '@johndoe',
      paypal: 'john@paypal.com',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockRecipient = {
    _id: new ObjectId(mockRecipientId),
    tripId: new ObjectId(mockTripId),
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'member' as const,
    rsvpStatus: 'confirmed' as const,
    paymentHandles: {
      venmo: '@janedoe',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPayment = {
    _id: new ObjectId(mockPaymentId),
    tripId: new ObjectId(mockTripId),
    fromId: new ObjectId(mockAttendeeId),
    toId: new ObjectId(mockRecipientId),
    amount_cents: 5000,
    status: 'pending' as const,
    method: 'venmo' as const,
    note: 'Dinner payment',
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

  describe('GET /api/trips/[tripId]/payments', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        'http://localhost/api/trips/invalid-id/payments'
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
        `http://localhost/api/trips/${mockTripId}/payments`
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
        `http://localhost/api/trips/${mockTripId}/payments`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return all payments for a trip', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.getPaymentsByTrip).mockResolvedValue([mockPayment]);
      vi.mocked(attendeesOps.getAttendeesByTrip).mockResolvedValue([
        mockAttendee,
        mockRecipient,
      ]);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].amount_cents).toBe(5000);
      expect(data.data[0].fromName).toBe('John Doe');
      expect(data.data[0].toName).toBe('Jane Doe');
    });

    it('should filter payments by status', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.listPayments).mockResolvedValue({
        data: [mockPayment],
        total: 1,
        page: 1,
        limit: 50,
              });
      vi.mocked(attendeesOps.getAttendeesByTrip).mockResolvedValue([
        mockAttendee,
        mockRecipient,
      ]);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments?status=pending`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(paymentsOps.listPayments).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
        }),
        expect.anything()
      );
    });

    it('should filter payments by fromId', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.listPayments).mockResolvedValue({
        data: [mockPayment],
        total: 1,
        page: 1,
        limit: 50,
              });
      vi.mocked(attendeesOps.getAttendeesByTrip).mockResolvedValue([
        mockAttendee,
        mockRecipient,
      ]);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments?fromId=${mockAttendeeId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter payments by toId', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.listPayments).mockResolvedValue({
        data: [mockPayment],
        total: 1,
        page: 1,
        limit: 50,
              });
      vi.mocked(attendeesOps.getAttendeesByTrip).mockResolvedValue([
        mockAttendee,
        mockRecipient,
      ]);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments?toId=${mockRecipientId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return empty array when no payments', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.getPaymentsByTrip).mockResolvedValue([]);
      vi.mocked(attendeesOps.getAttendeesByTrip).mockResolvedValue([
        mockAttendee,
        mockRecipient,
      ]);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
    });

    it('should return 400 for invalid status filter', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments?status=invalid`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid status');
    });
  });

  describe('POST /api/trips/[tripId]/payments', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        'http://localhost/api/trips/invalid-id/payments',
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: mockAttendeeId,
            toId: mockRecipientId,
            amount_cents: 5000,
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
      vi.mocked(guards.requireTripAccess).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: mockAttendeeId,
            toId: mockRecipientId,
            amount_cents: 5000,
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

    it('should return 400 for missing required fields', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: mockAttendeeId,
            // missing toId and amount_cents
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid fromId format', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: 'invalid-id',
            toId: mockRecipientId,
            amount_cents: 5000,
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid fromId');
    });

    it('should return 400 for invalid toId format', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: mockAttendeeId,
            toId: 'invalid-id',
            amount_cents: 5000,
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid toId');
    });

    it('should return 400 for negative amount', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: mockAttendeeId,
            toId: mockRecipientId,
            amount_cents: -100,
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for zero amount', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: mockAttendeeId,
            toId: mockRecipientId,
            amount_cents: 0,
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for same fromId and toId', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: mockAttendeeId,
            toId: mockAttendeeId,
            amount_cents: 5000,
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('same');
    });

    it('should return 404 for non-existent fromId attendee', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValueOnce(null);

      const nonExistentId = new ObjectId().toString();
      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: nonExistentId,
            toId: mockRecipientId,
            amount_cents: 5000,
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Sender');
    });

    it('should return 404 for non-existent toId attendee', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById)
        .mockResolvedValueOnce(mockAttendee)
        .mockResolvedValueOnce(null);

      const nonExistentId = new ObjectId().toString();
      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: mockAttendeeId,
            toId: nonExistentId,
            amount_cents: 5000,
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Receiver');
    });

    it('should create a payment successfully', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById)
        .mockResolvedValueOnce(mockAttendee)
        .mockResolvedValueOnce(mockRecipient);
      vi.mocked(paymentsOps.createPayment).mockResolvedValue(mockPayment);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: mockAttendeeId,
            toId: mockRecipientId,
            amount_cents: 5000,
            method: 'venmo',
            note: 'Dinner payment',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.amount_cents).toBe(5000);
      expect(data.data.status).toBe('pending');
    });

    it('should create payment with default method as other', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById)
        .mockResolvedValueOnce(mockAttendee)
        .mockResolvedValueOnce(mockRecipient);
      vi.mocked(paymentsOps.createPayment).mockResolvedValue({
        ...mockPayment,
        method: 'other',
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: mockAttendeeId,
            toId: mockRecipientId,
            amount_cents: 5000,
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should return 400 for invalid payment method', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById)
        .mockResolvedValueOnce(mockAttendee)
        .mockResolvedValueOnce(mockRecipient);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({
            fromId: mockAttendeeId,
            toId: mockRecipientId,
            amount_cents: 5000,
            method: 'bitcoin',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid method');
    });
  });
});
