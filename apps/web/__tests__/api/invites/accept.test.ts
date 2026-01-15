import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock session module
vi.mock('@/lib/auth/session', () => ({
  createSession: vi.fn(),
}));

// Mock invite operations
vi.mock('@/lib/db/operations/invites', () => ({
  validateInviteToken: vi.fn(),
  acceptInvite: vi.fn(),
}));

// Mock attendee operations
vi.mock('@/lib/db/operations/attendees', () => ({
  createAttendee: vi.fn(),
  getAttendeeByEmail: vi.fn(),
}));

// Mock trip operations
vi.mock('@/lib/db/operations/trips', () => ({
  getTripById: vi.fn(),
}));

describe('Accept Invite API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('POST /api/invites/accept', () => {
    it('should return 400 when token is missing', async () => {
      const { POST } = await import('@/app/api/invites/accept/route');

      const request = new NextRequest('http://localhost/api/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ name: 'John Doe' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('token');
    });

    it('should return 400 when name is missing', async () => {
      const { POST } = await import('@/app/api/invites/accept/route');

      const request = new NextRequest('http://localhost/api/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64) }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('name');
    });

    it('should return 400 when token is invalid', async () => {
      const { validateInviteToken } = await import('@/lib/db/operations/invites');
      const { POST } = await import('@/app/api/invites/accept/route');

      (validateInviteToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: false,
        invite: null,
        reason: 'Invite not found',
      });

      const request = new NextRequest('http://localhost/api/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token', name: 'John Doe' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return 400 when invite is expired', async () => {
      const { validateInviteToken } = await import('@/lib/db/operations/invites');
      const { POST } = await import('@/app/api/invites/accept/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();

      (validateInviteToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: false,
        invite: {
          _id: inviteId,
          tripId: tripId,
          email: 'guest@example.com',
          token: 'a'.repeat(64),
          status: 'expired',
          expiresAt: new Date(Date.now() - 86400000), // Expired
        },
        reason: 'Invite has expired',
      });

      const request = new NextRequest('http://localhost/api/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64), name: 'John Doe' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('expired');
    });

    it('should return 400 when invite is already accepted', async () => {
      const { validateInviteToken } = await import('@/lib/db/operations/invites');
      const { POST } = await import('@/app/api/invites/accept/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();

      (validateInviteToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: false,
        invite: {
          _id: inviteId,
          tripId: tripId,
          email: 'guest@example.com',
          token: 'a'.repeat(64),
          status: 'accepted',
          expiresAt: new Date(Date.now() + 86400000),
        },
        reason: 'Invite is accepted',
      });

      const request = new NextRequest('http://localhost/api/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64), name: 'John Doe' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('accepted');
    });

    it('should accept invite and create attendee successfully', async () => {
      const { validateInviteToken, acceptInvite } = await import('@/lib/db/operations/invites');
      const { createAttendee, getAttendeeByEmail } = await import('@/lib/db/operations/attendees');
      const { getTripById } = await import('@/lib/db/operations/trips');
      const { createSession } = await import('@/lib/auth/session');
      const { POST } = await import('@/app/api/invites/accept/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();
      const attendeeId = new ObjectId();
      const createdBy = new ObjectId();

      const mockInvite = {
        _id: inviteId,
        tripId: tripId,
        email: 'guest@example.com',
        token: 'a'.repeat(64),
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        createdBy: createdBy,
      };

      const mockTrip = {
        _id: tripId,
        name: 'Bachelor Party',
        location: 'Steamboat, CO',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        adminIds: [createdBy],
      };

      const mockAttendee = {
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'guest@example.com',
        role: 'member',
        rsvpStatus: 'pending',
        inviteToken: 'a'.repeat(64),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (validateInviteToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        invite: mockInvite,
      });

      (getAttendeeByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getTripById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrip);
      (createAttendee as ReturnType<typeof vi.fn>).mockResolvedValue(mockAttendee);
      (acceptInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockInvite,
        status: 'accepted',
      });
      (createSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64), name: 'John Doe' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.attendee.name).toBe('John Doe');
      expect(data.data.trip.name).toBe('Bachelor Party');

      // Verify attendee was created with correct data
      expect(createAttendee).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: tripId,
          name: 'John Doe',
          email: 'guest@example.com',
          role: 'member',
          rsvpStatus: 'pending',
          inviteToken: 'a'.repeat(64),
        })
      );

      // Verify invite was marked as accepted
      expect(acceptInvite).toHaveBeenCalledWith(inviteId);

      // Verify session was created
      expect(createSession).toHaveBeenCalledWith(
        attendeeId.toString(),
        tripId.toString(),
        'member'
      );
    });

    it('should use email from invite if not provided in request', async () => {
      const { validateInviteToken, acceptInvite } = await import('@/lib/db/operations/invites');
      const { createAttendee, getAttendeeByEmail } = await import('@/lib/db/operations/attendees');
      const { getTripById } = await import('@/lib/db/operations/trips');
      const { createSession } = await import('@/lib/auth/session');
      const { POST } = await import('@/app/api/invites/accept/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();
      const attendeeId = new ObjectId();
      const createdBy = new ObjectId();

      const mockInvite = {
        _id: inviteId,
        tripId: tripId,
        email: 'guest@example.com',
        token: 'a'.repeat(64),
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        createdBy: createdBy,
      };

      const mockTrip = {
        _id: tripId,
        name: 'Bachelor Party',
        location: 'Steamboat, CO',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        adminIds: [createdBy],
      };

      const mockAttendee = {
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'guest@example.com',
        role: 'member',
        rsvpStatus: 'pending',
        inviteToken: 'a'.repeat(64),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (validateInviteToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        invite: mockInvite,
      });

      (getAttendeeByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getTripById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrip);
      (createAttendee as ReturnType<typeof vi.fn>).mockResolvedValue(mockAttendee);
      (acceptInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockInvite,
        status: 'accepted',
      });
      (createSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64), name: 'John Doe' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Email should come from invite
      expect(createAttendee).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'guest@example.com',
        })
      );
    });

    it('should allow overriding email with request body', async () => {
      const { validateInviteToken, acceptInvite } = await import('@/lib/db/operations/invites');
      const { createAttendee, getAttendeeByEmail } = await import('@/lib/db/operations/attendees');
      const { getTripById } = await import('@/lib/db/operations/trips');
      const { createSession } = await import('@/lib/auth/session');
      const { POST } = await import('@/app/api/invites/accept/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();
      const attendeeId = new ObjectId();
      const createdBy = new ObjectId();

      // Invite with empty email (generic link)
      const mockInvite = {
        _id: inviteId,
        tripId: tripId,
        email: '',
        token: 'a'.repeat(64),
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        createdBy: createdBy,
      };

      const mockTrip = {
        _id: tripId,
        name: 'Bachelor Party',
        location: 'Steamboat, CO',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        adminIds: [createdBy],
      };

      const mockAttendee = {
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'john@newemail.com',
        role: 'member',
        rsvpStatus: 'pending',
        inviteToken: 'a'.repeat(64),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (validateInviteToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        invite: mockInvite,
      });

      (getAttendeeByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getTripById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrip);
      (createAttendee as ReturnType<typeof vi.fn>).mockResolvedValue(mockAttendee);
      (acceptInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockInvite,
        status: 'accepted',
      });
      (createSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/invites/accept', {
        method: 'POST',
        body: JSON.stringify({
          token: 'a'.repeat(64),
          name: 'John Doe',
          email: 'john@newemail.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Email should come from request
      expect(createAttendee).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@newemail.com',
        })
      );
    });

    it('should return 409 if attendee already exists for trip', async () => {
      const { validateInviteToken } = await import('@/lib/db/operations/invites');
      const { getAttendeeByEmail } = await import('@/lib/db/operations/attendees');
      const { POST } = await import('@/app/api/invites/accept/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();
      const attendeeId = new ObjectId();
      const createdBy = new ObjectId();

      const mockInvite = {
        _id: inviteId,
        tripId: tripId,
        email: 'guest@example.com',
        token: 'a'.repeat(64),
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        createdBy: createdBy,
      };

      const existingAttendee = {
        _id: attendeeId,
        tripId: tripId,
        name: 'John Doe',
        email: 'guest@example.com',
        role: 'member',
        rsvpStatus: 'confirmed',
      };

      (validateInviteToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        invite: mockInvite,
      });

      (getAttendeeByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(existingAttendee);

      const request = new NextRequest('http://localhost/api/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64), name: 'John Doe' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already');
    });

    it('should return 404 if trip not found', async () => {
      const { validateInviteToken } = await import('@/lib/db/operations/invites');
      const { getAttendeeByEmail } = await import('@/lib/db/operations/attendees');
      const { getTripById } = await import('@/lib/db/operations/trips');
      const { POST } = await import('@/app/api/invites/accept/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();
      const createdBy = new ObjectId();

      const mockInvite = {
        _id: inviteId,
        tripId: tripId,
        email: 'guest@example.com',
        token: 'a'.repeat(64),
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        createdBy: createdBy,
      };

      (validateInviteToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        invite: mockInvite,
      });

      (getAttendeeByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getTripById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64), name: 'John Doe' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Trip');
    });
  });
});
