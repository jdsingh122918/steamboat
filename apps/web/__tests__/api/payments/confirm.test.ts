import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the database operations
vi.mock('@/lib/db/operations/payments', () => ({
  getPaymentById: vi.fn(),
  confirmPayment: vi.fn(),
  updatePayment: vi.fn(),
}));

vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeeById: vi.fn(),
}));

// Mock the auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
}));

import { POST } from '@/app/api/trips/[tripId]/payments/[paymentId]/confirm/route';
import * as paymentsOps from '@/lib/db/operations/payments';
import * as attendeesOps from '@/lib/db/operations/attendees';
import * as guards from '@/lib/auth/guards';

describe('/api/trips/[tripId]/payments/[paymentId]/confirm', () => {
  const mockTripId = new ObjectId().toString();
  const mockSenderId = new ObjectId().toString();
  const mockReceiverId = new ObjectId().toString();
  const mockPaymentId = new ObjectId().toString();

  const mockSender = {
    _id: new ObjectId(mockSenderId),
    tripId: new ObjectId(mockTripId),
    name: 'John Doe',
    email: 'john@example.com',
    role: 'member' as const,
    rsvpStatus: 'confirmed' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockReceiver = {
    _id: new ObjectId(mockReceiverId),
    tripId: new ObjectId(mockTripId),
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'member' as const,
    rsvpStatus: 'confirmed' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPayment = {
    _id: new ObjectId(mockPaymentId),
    tripId: new ObjectId(mockTripId),
    fromId: new ObjectId(mockSenderId),
    toId: new ObjectId(mockReceiverId),
    amount_cents: 5000,
    status: 'pending' as const,
    method: 'venmo' as const,
    note: 'Dinner payment',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockSessionAsReceiver = {
    attendeeId: mockReceiverId,
    tripId: mockTripId,
    role: 'member' as const,
  };

  const mockSessionAsSender = {
    attendeeId: mockSenderId,
    tripId: mockTripId,
    role: 'member' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/trips/[tripId]/payments/[paymentId]/confirm', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        `http://localhost/api/trips/invalid-id/payments/${mockPaymentId}/confirm`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: 'invalid-id', paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 400 for invalid paymentId format', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSessionAsReceiver as any,
        attendee: mockReceiver,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/invalid-id/confirm`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid paymentId');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}/confirm`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 404 when payment not found', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSessionAsReceiver as any,
        attendee: mockReceiver,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}/confirm`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return 404 when payment belongs to different trip', async () => {
      const differentTripId = new ObjectId().toString();
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSessionAsReceiver as any,
        attendee: mockReceiver,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue({
        ...mockPayment,
        tripId: new ObjectId(differentTripId),
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}/confirm`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 403 when not the receiver', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSessionAsSender as any,
        attendee: mockSender,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}/confirm`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('receiver');
    });

    it('should return 400 when payment is already confirmed', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSessionAsReceiver as any,
        attendee: mockReceiver,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue({
        ...mockPayment,
        status: 'confirmed',
        confirmedAt: new Date(),
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}/confirm`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already confirmed');
    });

    it('should return 400 when payment is cancelled', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSessionAsReceiver as any,
        attendee: mockReceiver,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue({
        ...mockPayment,
        status: 'cancelled',
        cancelledAt: new Date(),
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}/confirm`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('cancelled');
    });

    it('should confirm payment successfully as receiver', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSessionAsReceiver as any,
        attendee: mockReceiver,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);
      vi.mocked(paymentsOps.confirmPayment).mockResolvedValue({
        ...mockPayment,
        status: 'confirmed',
        confirmedAt: new Date(),
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}/confirm`,
        { method: 'POST' }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('confirmed');
      expect(data.data.confirmedAt).toBeDefined();
    });

    it('should confirm payment with expense IDs', async () => {
      const expenseId1 = new ObjectId().toString();
      const expenseId2 = new ObjectId().toString();

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSessionAsReceiver as any,
        attendee: mockReceiver,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);
      vi.mocked(paymentsOps.updatePayment).mockResolvedValue({
        ...mockPayment,
        status: 'confirmed',
        confirmedAt: new Date(),
        expenseIds: [new ObjectId(expenseId1), new ObjectId(expenseId2)],
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({
            expenseIds: [expenseId1, expenseId2],
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('confirmed');
      expect(paymentsOps.updatePayment).toHaveBeenCalledWith(
        expect.any(ObjectId),
        expect.objectContaining({
          status: 'confirmed',
          expenseIds: expect.any(Array),
        })
      );
    });

    it('should return 400 for invalid expense ID format', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSessionAsReceiver as any,
        attendee: mockReceiver,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({
            expenseIds: ['invalid-id'],
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid expenseId');
    });
  });
});
