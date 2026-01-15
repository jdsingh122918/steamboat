import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the database operations
vi.mock('@/lib/db/operations/payments', () => ({
  getPaymentById: vi.fn(),
  updatePayment: vi.fn(),
  cancelPayment: vi.fn(),
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

import { GET, PUT, DELETE } from '@/app/api/trips/[tripId]/payments/[paymentId]/route';
import * as paymentsOps from '@/lib/db/operations/payments';
import * as attendeesOps from '@/lib/db/operations/attendees';
import * as guards from '@/lib/auth/guards';

describe('/api/trips/[tripId]/payments/[paymentId]', () => {
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

  describe('GET /api/trips/[tripId]/payments/[paymentId]', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        `http://localhost/api/trips/invalid-id/payments/${mockPaymentId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: 'invalid-id', paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 400 for invalid paymentId format', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/invalid-id`
      );

      const response = await GET(request, {
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
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 404 when payment not found', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`
      );

      const response = await GET(request, {
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
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue({
        ...mockPayment,
        tripId: new ObjectId(differentTripId),
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return payment with participant names', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);
      vi.mocked(attendeesOps.getAttendeeById)
        .mockResolvedValueOnce(mockAttendee)
        .mockResolvedValueOnce(mockRecipient);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.amount_cents).toBe(5000);
      expect(data.data.fromName).toBe('John Doe');
      expect(data.data.toName).toBe('Jane Doe');
    });
  });

  describe('PUT /api/trips/[tripId]/payments/[paymentId]', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        `http://localhost/api/trips/invalid-id/payments/${mockPaymentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ note: 'Updated note' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: 'invalid-id', paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 403 when not the sender', async () => {
      const differentAttendeeId = new ObjectId().toString();
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { ...mockSession, attendeeId: differentAttendeeId } as any,
        attendee: { ...mockAttendee, _id: new ObjectId(differentAttendeeId), role: 'member' },
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ note: 'Updated note' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should allow admin to update payment', async () => {
      const adminId = new ObjectId().toString();
      const adminAttendee = {
        ...mockAttendee,
        _id: new ObjectId(adminId),
        role: 'admin' as const,
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { ...mockSession, attendeeId: adminId } as any,
        attendee: adminAttendee,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);
      vi.mocked(paymentsOps.updatePayment).mockResolvedValue({
        ...mockPayment,
        note: 'Admin updated note',
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ note: 'Admin updated note' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 when payment is not pending', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue({
        ...mockPayment,
        status: 'confirmed',
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ note: 'Updated note' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('pending');
    });

    it('should update payment note successfully', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);
      vi.mocked(paymentsOps.updatePayment).mockResolvedValue({
        ...mockPayment,
        note: 'Updated note',
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ note: 'Updated note' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.note).toBe('Updated note');
    });

    it('should update payment amount successfully', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);
      vi.mocked(paymentsOps.updatePayment).mockResolvedValue({
        ...mockPayment,
        amount_cents: 7500,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ amount_cents: 7500 }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.amount_cents).toBe(7500);
    });

    it('should return 400 for negative amount in update', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ amount_cents: -100 }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/trips/[tripId]/payments/[paymentId]', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        `http://localhost/api/trips/invalid-id/payments/${mockPaymentId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: 'invalid-id', paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 403 when not the sender or admin', async () => {
      const differentAttendeeId = new ObjectId().toString();
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { ...mockSession, attendeeId: differentAttendeeId } as any,
        attendee: { ...mockAttendee, _id: new ObjectId(differentAttendeeId), role: 'member' },
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 when payment is not pending', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue({
        ...mockPayment,
        status: 'confirmed',
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('pending');
    });

    it('should cancel payment successfully as sender', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);
      vi.mocked(paymentsOps.cancelPayment).mockResolvedValue({
        ...mockPayment,
        status: 'cancelled',
        cancelledAt: new Date(),
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('cancelled');
    });

    it('should cancel payment successfully as admin', async () => {
      const adminId = new ObjectId().toString();
      const adminAttendee = {
        ...mockAttendee,
        _id: new ObjectId(adminId),
        role: 'admin' as const,
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { ...mockSession, attendeeId: adminId } as any,
        attendee: adminAttendee,
      });
      vi.mocked(paymentsOps.getPaymentById).mockResolvedValue(mockPayment);
      vi.mocked(paymentsOps.cancelPayment).mockResolvedValue({
        ...mockPayment,
        status: 'cancelled',
        cancelledAt: new Date(),
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/${mockPaymentId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: mockTripId, paymentId: mockPaymentId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
