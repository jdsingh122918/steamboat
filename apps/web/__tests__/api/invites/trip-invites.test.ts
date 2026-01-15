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
  listInvites: vi.fn(),
  getInviteById: vi.fn(),
  revokeInvite: vi.fn(),
}));

// Mock token generation
vi.mock('@/lib/auth/tokens', () => ({
  createTripInvite: vi.fn(),
}));

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

describe('Trip Invites API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('GET /api/trips/[tripId]/invites', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { GET } = await import('@/app/api/trips/[tripId]/invites/route');

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: undefined,
      });

      const tripId = new ObjectId().toString();
      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites`
      );

      const response = await GET(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 403 when user is not admin', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { GET } = await import('@/app/api/trips/[tripId]/invites/route');

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
        role: 'member',
        rsvpStatus: 'confirmed',
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites`
      );

      const response = await GET(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Admin');
    });

    it('should return list of invites for admin', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { listInvites } = await import('@/lib/db/operations/invites');
      const { GET } = await import('@/app/api/trips/[tripId]/invites/route');

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

      const mockInvites = [
        {
          _id: new ObjectId(),
          tripId: tripId,
          email: 'guest1@example.com',
          token: 'token123',
          status: 'pending',
          expiresAt: new Date(Date.now() + 86400000),
          createdBy: attendeeId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (listInvites as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockInvites,
        total: 1,
        page: 1,
        limit: 50,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites`
      );

      const response = await GET(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].email).toBe('guest1@example.com');
    });

    it('should return 403 when accessing different trip', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { GET } = await import('@/app/api/trips/[tripId]/invites/route');

      const tripId = new ObjectId();
      const differentTripId = new ObjectId();
      const attendeeId = new ObjectId();

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: attendeeId.toString(),
        tripId: differentTripId.toString(),
      });

      (getAttendeeById as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: attendeeId,
        tripId: differentTripId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites`
      );

      const response = await GET(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/trips/[tripId]/invites', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { POST } = await import('@/app/api/trips/[tripId]/invites/route');

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: undefined,
      });

      const tripId = new ObjectId().toString();
      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites`,
        {
          method: 'POST',
          body: JSON.stringify({ email: 'guest@example.com' }),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user is not admin', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { POST } = await import('@/app/api/trips/[tripId]/invites/route');

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
        role: 'member',
        rsvpStatus: 'confirmed',
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites`,
        {
          method: 'POST',
          body: JSON.stringify({ email: 'guest@example.com' }),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should create invite with email', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { createTripInvite } = await import('@/lib/auth/tokens');
      const { POST } = await import('@/app/api/trips/[tripId]/invites/route');

      const tripId = new ObjectId();
      const attendeeId = new ObjectId();
      const inviteId = new ObjectId();

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
        expiresAt: new Date(Date.now() + 7 * 86400000),
        createdBy: attendeeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (createTripInvite as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites`,
        {
          method: 'POST',
          body: JSON.stringify({ email: 'guest@example.com' }),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('guest@example.com');
      expect(data.data.token).toHaveLength(64);
      expect(createTripInvite).toHaveBeenCalledWith(
        expect.any(ObjectId),
        'guest@example.com',
        expect.any(ObjectId),
        7
      );
    });

    it('should create invite with custom expiration', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { createTripInvite } = await import('@/lib/auth/tokens');
      const { POST } = await import('@/app/api/trips/[tripId]/invites/route');

      const tripId = new ObjectId();
      const attendeeId = new ObjectId();
      const inviteId = new ObjectId();

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
        expiresAt: new Date(Date.now() + 14 * 86400000),
        createdBy: attendeeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (createTripInvite as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites`,
        {
          method: 'POST',
          body: JSON.stringify({ email: 'guest@example.com', expiresInDays: 14 }),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(createTripInvite).toHaveBeenCalledWith(
        expect.any(ObjectId),
        'guest@example.com',
        expect.any(ObjectId),
        14
      );
    });

    it('should create invite without email (generic link)', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { createTripInvite } = await import('@/lib/auth/tokens');
      const { POST } = await import('@/app/api/trips/[tripId]/invites/route');

      const tripId = new ObjectId();
      const attendeeId = new ObjectId();
      const inviteId = new ObjectId();

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
        email: '',
        token: 'a'.repeat(64),
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 86400000),
        createdBy: attendeeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (createTripInvite as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/invites`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.token).toHaveLength(64);
    });

    it('should return 400 for invalid email format', async () => {
      const { getSession } = await import('@/lib/auth/session');
      const { getAttendeeById } = await import('@/lib/db/operations/attendees');
      const { POST } = await import('@/app/api/trips/[tripId]/invites/route');

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
        `http://localhost/api/trips/${tripId}/invites`,
        {
          method: 'POST',
          body: JSON.stringify({ email: 'invalid-email' }),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('email');
    });
  });
});
