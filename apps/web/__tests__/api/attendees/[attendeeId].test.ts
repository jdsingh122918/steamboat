import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the database operations
vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeeById: vi.fn(),
  updateAttendee: vi.fn(),
  deleteAttendee: vi.fn(),
  getTripAdmins: vi.fn(),
}));

// Mock the auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
  requireAdmin: vi.fn(),
}));

import {
  GET,
  PUT,
  DELETE,
} from '@/app/api/trips/[tripId]/attendees/[attendeeId]/route';
import * as attendeesOps from '@/lib/db/operations/attendees';
import * as guards from '@/lib/auth/guards';

describe('/api/trips/[tripId]/attendees/[attendeeId]', () => {
  const mockTripId = new ObjectId().toString();
  const mockAttendeeId = new ObjectId().toString();
  const mockOtherAttendeeId = new ObjectId().toString();

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

  const mockMemberAttendee = {
    _id: new ObjectId(mockOtherAttendeeId),
    tripId: new ObjectId(mockTripId),
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'member' as const,
    rsvpStatus: 'pending' as const,
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

  describe('GET /api/trips/[tripId]/attendees/[attendeeId]', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        `http://localhost/api/trips/invalid-id/attendees/${mockAttendeeId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({
          tripId: 'invalid-id',
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 400 for invalid attendeeId format', async () => {
      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/invalid-id`
      );

      const response = await GET(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: 'invalid-id',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid attendeeId');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 404 when attendee not found', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return 403 when attendee belongs to different trip', async () => {
      const otherTripId = new ObjectId();
      const otherTripAttendee = {
        ...mockAttendee,
        tripId: otherTripId,
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(
        otherTripAttendee
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('does not belong');
    });

    it('should return attendee successfully', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(mockAttendee);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('John Doe');
    });
  });

  describe('PUT /api/trips/[tripId]/attendees/[attendeeId]', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        `http://localhost/api/trips/invalid-id/attendees/${mockAttendeeId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: 'invalid-id',
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should allow admin to update any attendee', async () => {
      const updatedAttendee = {
        ...mockMemberAttendee,
        name: 'Updated Jane',
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(
        mockMemberAttendee
      );
      vi.mocked(attendeesOps.updateAttendee).mockResolvedValue(updatedAttendee);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockOtherAttendeeId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Jane' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockOtherAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Jane');
    });

    it('should allow user to update their own payment handles', async () => {
      const memberSession = {
        attendeeId: mockOtherAttendeeId,
        tripId: mockTripId,
        role: 'member' as const,
      };

      const updatedAttendee = {
        ...mockMemberAttendee,
        paymentHandles: { venmo: '@newhandle' },
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: memberSession as any,
        attendee: mockMemberAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(
        mockMemberAttendee
      );
      vi.mocked(attendeesOps.updateAttendee).mockResolvedValue(updatedAttendee);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockOtherAttendeeId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ paymentHandles: { venmo: '@newhandle' } }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockOtherAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.paymentHandles.venmo).toBe('@newhandle');
    });

    it('should return 403 when non-admin tries to update other attendee fields', async () => {
      const memberSession = {
        attendeeId: mockOtherAttendeeId,
        tripId: mockTripId,
        role: 'member' as const,
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: memberSession as any,
        attendee: mockMemberAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(mockAttendee);

      // Non-admin trying to update someone else's name
      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Hacked Name' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 404 when attendee not found', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid update data', async () => {
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(mockAttendee);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ email: 'invalid-email' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/trips/[tripId]/attendees/[attendeeId]', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest(
        `http://localhost/api/trips/invalid-id/attendees/${mockAttendeeId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({
          tripId: 'invalid-id',
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(guards.requireAdmin).mockRejectedValue(
        new Error('Unauthorized')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when not an admin', async () => {
      vi.mocked(guards.requireAdmin).mockRejectedValue(
        new Error('Forbidden: Admin access required')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 404 when attendee not found', async () => {
      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 when trying to remove last admin', async () => {
      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(mockAttendee);
      vi.mocked(attendeesOps.getTripAdmins).mockResolvedValue([mockAttendee]); // Only one admin

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockAttendeeId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('last admin');
    });

    it('should delete attendee successfully', async () => {
      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(
        mockMemberAttendee
      );
      vi.mocked(attendeesOps.deleteAttendee).mockResolvedValue(true);

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${mockOtherAttendeeId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: mockOtherAttendeeId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should allow deleting admin when multiple admins exist', async () => {
      const secondAdmin = {
        ...mockAttendee,
        _id: new ObjectId(),
      };

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: mockSession as any,
        attendee: mockAttendee,
      });
      vi.mocked(attendeesOps.getAttendeeById).mockResolvedValue(secondAdmin);
      vi.mocked(attendeesOps.getTripAdmins).mockResolvedValue([
        mockAttendee,
        secondAdmin,
      ]); // Two admins
      vi.mocked(attendeesOps.deleteAttendee).mockResolvedValue(true);

      const secondAdminId = secondAdmin._id.toString();
      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/attendees/${secondAdminId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({
          tripId: mockTripId,
          attendeeId: secondAdminId,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
