import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock session module
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

// Mock attendee operations
vi.mock('@/lib/db/operations/attendees', () => ({
  getAttendeeById: vi.fn(),
}));

// Mock invite operations
vi.mock('@/lib/db/operations/invites', () => ({
  getInviteById: vi.fn(),
  revokeInvite: vi.fn(),
}));

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

describe('Single Invite API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('GET /api/trips/[tripId]/invites/[inviteId]', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { GET } = await import('@/app/api/trips/[tripId]/invites/[inviteId]/route');

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: undefined,
      });

      const tripId = new ObjectId().toString();
      const inviteId = new ObjectId().toString();
      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites/${inviteId}`
      );

      const response = await GET(request, { params: Promise.resolve({ tripId, inviteId }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 403 when user is not admin', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { GET } = await import('@/app/api/trips/[tripId]/invites/[inviteId]/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();
      const attendeeId = new ObjectId();

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      });

      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'member',
        rsvpStatus: 'confirmed',
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites/${inviteId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: tripId.toString(), inviteId: inviteId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return invite details for admin', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { getInviteById } = await import('@/lib/db/operations/invites');
      const { GET } = await import('@/app/api/trips/[tripId]/invites/[inviteId]/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();
      const attendeeId = new ObjectId();

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      });

      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
      });

      const mockInvite = {
        _id: inviteId,
        tripId: tripId,
        email: 'guest@example.com',
        token: 'a'.repeat(64),
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        createdBy: attendeeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (getInviteById as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites/${inviteId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: tripId.toString(), inviteId: inviteId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('guest@example.com');
      expect(data.data._id).toBe(inviteId.toString());
    });

    it('should return 404 when invite not found', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { getInviteById } = await import('@/lib/db/operations/invites');
      const { GET } = await import('@/app/api/trips/[tripId]/invites/[inviteId]/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();
      const attendeeId = new ObjectId();

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      });

      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
      });

      (getInviteById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites/${inviteId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: tripId.toString(), inviteId: inviteId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return 403 when invite belongs to different trip', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { getInviteById } = await import('@/lib/db/operations/invites');
      const { GET } = await import('@/app/api/trips/[tripId]/invites/[inviteId]/route');

      const tripId = new ObjectId();
      const differentTripId = new ObjectId();
      const inviteId = new ObjectId();
      const attendeeId = new ObjectId();

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      });

      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
      });

      const mockInvite = {
        _id: inviteId,
        tripId: differentTripId, // Different trip
        email: 'guest@example.com',
        token: 'a'.repeat(64),
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        createdBy: attendeeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (getInviteById as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites/${inviteId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: tripId.toString(), inviteId: inviteId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('does not belong');
    });

    it('should return 400 for invalid inviteId format', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { GET } = await import('@/app/api/trips/[tripId]/invites/[inviteId]/route');

      const tripId = new ObjectId();
      const attendeeId = new ObjectId();

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      });

      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites/invalid-id`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId: tripId.toString(), inviteId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });
  });

  describe('DELETE /api/trips/[tripId]/invites/[inviteId]', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { DELETE } = await import('@/app/api/trips/[tripId]/invites/[inviteId]/route');

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: undefined,
      });

      const tripId = new ObjectId().toString();
      const inviteId = new ObjectId().toString();
      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites/${inviteId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, { params: Promise.resolve({ tripId, inviteId }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user is not admin', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { DELETE } = await import('@/app/api/trips/[tripId]/invites/[inviteId]/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();
      const attendeeId = new ObjectId();

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      });

      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'member',
        rsvpStatus: 'confirmed',
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites/${inviteId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: tripId.toString(), inviteId: inviteId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should revoke invite successfully', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { getInviteById, revokeInvite } = await import('@/lib/db/operations/invites');
      const { DELETE } = await import('@/app/api/trips/[tripId]/invites/[inviteId]/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();
      const attendeeId = new ObjectId();

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      });

      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
      });

      const mockInvite = {
        _id: inviteId,
        tripId: tripId,
        email: 'guest@example.com',
        token: 'a'.repeat(64),
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        createdBy: attendeeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (getInviteById as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);

      const revokedInvite = { ...mockInvite, status: 'revoked' };
      (revokeInvite as ReturnType<typeof vi.fn>).mockResolvedValue(revokedInvite);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites/${inviteId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: tripId.toString(), inviteId: inviteId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('revoked');
      expect(revokeInvite).toHaveBeenCalledWith(inviteId);
    });

    it('should return 404 when invite not found', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { getInviteById } = await import('@/lib/db/operations/invites');
      const { DELETE } = await import('@/app/api/trips/[tripId]/invites/[inviteId]/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();
      const attendeeId = new ObjectId();

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      });

      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
      });

      (getInviteById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites/${inviteId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: tripId.toString(), inviteId: inviteId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 when invite is already used', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { getInviteById } = await import('@/lib/db/operations/invites');
      const { DELETE } = await import('@/app/api/trips/[tripId]/invites/[inviteId]/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();
      const attendeeId = new ObjectId();

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: attendeeId.toString(),
        tripId: tripId.toString(),
      });

      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
      });

      const mockInvite = {
        _id: inviteId,
        tripId: tripId,
        email: 'guest@example.com',
        token: 'a'.repeat(64),
        status: 'accepted', // Already used
        expiresAt: new Date(Date.now() + 86400000),
        createdBy: attendeeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (getInviteById as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites/${inviteId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: tripId.toString(), inviteId: inviteId.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already');
    });
  });
});
