import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the database operations
vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeeById: vi.fn(),
}));

// Mock the auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
}));

import { POST } from '@/app/api/trips/[tripId]/payments/links/route';
import * as attendeesOps from '@/lib/db/operations/attendees';
import * as guards from '@/lib/auth/guards';

describe('/api/trips/[tripId]/payments/links', () => {
  const mockTripId = new ObjectId().toString();
  const mockSenderId = new ObjectId().toString();
  const mockReceiverId = new ObjectId().toString();

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

  const mockReceiverWithHandles = {
    _id: new ObjectId(mockReceiverId),
    tripId: new ObjectId(mockTripId),
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'member' as const,
    rsvpStatus: 'confirmed' as const,
    paymentHandles: {
      venmo: '@janedoe',
      paypal: 'jane@paypal.com',
      cashapp: '$janedoe',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockReceiverWithoutHandles = {
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

  const mockSession = {
    attendeeId: mockSenderId,
    tripId: mockTripId,
    role: 'member' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/trips/[tripId]/payments/links', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        'http://localhost/api/trips/invalid-id/payments/links',
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: 5000,
            method: 'venmo',
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
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: 5000,
            method: 'venmo',
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
        attendee: mockSender,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            // missing amount_cents and method
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

    it('should return 400 for invalid toId format', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: 'invalid-id',
            amount_cents: 5000,
            method: 'venmo',
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

    it('should return 400 for invalid method', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
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

    it('should return 400 for negative amount', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: -100,
            method: 'venmo',
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

    it('should return 404 for non-existent receiver', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: 5000,
            method: 'venmo',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Receiver not found');
    });

    it('should return 404 when receiver belongs to different trip', async () => {
      const differentTripId = new ObjectId().toString();
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue({
        ...mockReceiverWithHandles,
        tripId: new ObjectId(differentTripId),
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: 5000,
            method: 'venmo',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 when receiver has no payment handles', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(
        mockReceiverWithoutHandles
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: 5000,
            method: 'venmo',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('payment handle');
    });

    it('should return 400 when receiver does not have the requested payment method', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue({
        ...mockReceiverWithHandles,
        paymentHandles: {
          venmo: '@janedoe',
          // no paypal or cashapp
        },
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: 5000,
            method: 'paypal',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('paypal');
    });

    it('should generate Venmo payment link successfully', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(
        mockReceiverWithHandles
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: 5000,
            method: 'venmo',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.method).toBe('venmo');
      expect(data.data.link).toContain('venmo://');
      expect(data.data.link).toContain('janedoe');
      expect(data.data.link).toContain('50.00');
    });

    it('should generate PayPal payment link successfully', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(
        mockReceiverWithHandles
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: 7500,
            method: 'paypal',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.method).toBe('paypal');
      expect(data.data.link).toContain('paypal.me');
      expect(data.data.link).toContain('75.00');
    });

    it('should generate CashApp payment link successfully', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(
        mockReceiverWithHandles
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: 12345,
            method: 'cashapp',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.method).toBe('cashapp');
      expect(data.data.link).toContain('cash.app');
      expect(data.data.link).toContain('123.45');
    });

    it('should include receiver name in response', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(
        mockReceiverWithHandles
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: 5000,
            method: 'venmo',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.receiverName).toBe('Jane Doe');
    });

    it('should handle Venmo handle without @ prefix', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue({
        ...mockReceiverWithHandles,
        paymentHandles: {
          venmo: 'janedoe', // without @ prefix
        },
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: 5000,
            method: 'venmo',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.link).toContain('%40janedoe'); // @ is URL encoded
    });

    it('should handle CashApp handle without $ prefix', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockSender,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue({
        ...mockReceiverWithHandles,
        paymentHandles: {
          cashapp: 'janedoe', // without $ prefix
        },
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/payments/links`,
        {
          method: 'POST',
          body: JSON.stringify({
            toId: mockReceiverId,
            amount_cents: 5000,
            method: 'cashapp',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId: mockTripId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.link).toContain('%24janedoe'); // $ is URL encoded
    });
  });
});
