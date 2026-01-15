import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock invite operations
vi.mock('@/lib/db/operations/invites', () => ({
  validateInviteToken: vi.fn(),
}));

// Mock trip operations
vi.mock('@/lib/db/operations/trips', () => ({
  getTripById: vi.fn(),
}));

describe('Validate Invite API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('POST /api/invites/validate', () => {
    it('should return 400 when token is missing', async () => {
      const { POST } = await import('@/app/api/invites/validate/route');

      const request = new NextRequest('http://localhost/api/invites/validate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('token');
    });

    it('should return valid: false for invalid token', async () => {
      const { validateInviteToken } = await import('@/lib/db/operations/invites');
      const { POST } = await import('@/app/api/invites/validate/route');

      (validateInviteToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: false,
        invite: null,
        reason: 'Invite not found',
      });

      const request = new NextRequest('http://localhost/api/invites/validate', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.valid).toBe(false);
      expect(data.data.reason).toBe('Invite not found');
    });

    it('should return valid: false with expired: true for expired token', async () => {
      const { validateInviteToken } = await import('@/lib/db/operations/invites');
      const { POST } = await import('@/app/api/invites/validate/route');

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
          expiresAt: new Date(Date.now() - 86400000),
        },
        reason: 'Invite has expired',
      });

      const request = new NextRequest('http://localhost/api/invites/validate', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64) }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.valid).toBe(false);
      expect(data.data.expired).toBe(true);
    });

    it('should return valid: true with trip details for valid token', async () => {
      const { validateInviteToken } = await import('@/lib/db/operations/invites');
      const { getTripById } = await import('@/lib/db/operations/trips');
      const { POST } = await import('@/app/api/invites/validate/route');

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

      const mockTrip = {
        _id: tripId,
        name: 'Bachelor Party',
        location: 'Steamboat, CO',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        adminIds: [createdBy],
      };

      (validateInviteToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        invite: mockInvite,
      });

      (getTripById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrip);

      const request = new NextRequest('http://localhost/api/invites/validate', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64) }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.valid).toBe(true);
      expect(data.data.trip.name).toBe('Bachelor Party');
      expect(data.data.trip.destination).toBe('Steamboat, CO');
      expect(data.data.expired).toBeUndefined();
    });

    it('should return valid: false when trip not found', async () => {
      const { validateInviteToken } = await import('@/lib/db/operations/invites');
      const { getTripById } = await import('@/lib/db/operations/trips');
      const { POST } = await import('@/app/api/invites/validate/route');

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

      (getTripById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/invites/validate', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64) }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.valid).toBe(false);
      expect(data.data.reason).toContain('Trip');
    });

    it('should not expose sensitive token in response', async () => {
      const { validateInviteToken } = await import('@/lib/db/operations/invites');
      const { getTripById } = await import('@/lib/db/operations/trips');
      const { POST } = await import('@/app/api/invites/validate/route');

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

      const mockTrip = {
        _id: tripId,
        name: 'Bachelor Party',
        location: 'Steamboat, CO',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        adminIds: [createdBy],
      };

      (validateInviteToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: true,
        invite: mockInvite,
      });

      (getTripById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrip);

      const request = new NextRequest('http://localhost/api/invites/validate', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64) }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Token should not be in response
      expect(JSON.stringify(data)).not.toContain('a'.repeat(64));
    });

    it('should return valid: false for already accepted invite', async () => {
      const { validateInviteToken } = await import('@/lib/db/operations/invites');
      const { POST } = await import('@/app/api/invites/validate/route');

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

      const request = new NextRequest('http://localhost/api/invites/validate', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64) }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.valid).toBe(false);
      expect(data.data.reason).toContain('accepted');
    });

    it('should return valid: false for revoked invite', async () => {
      const { validateInviteToken } = await import('@/lib/db/operations/invites');
      const { POST } = await import('@/app/api/invites/validate/route');

      const tripId = new ObjectId();
      const inviteId = new ObjectId();

      (validateInviteToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: false,
        invite: {
          _id: inviteId,
          tripId: tripId,
          email: 'guest@example.com',
          token: 'a'.repeat(64),
          status: 'revoked',
          expiresAt: new Date(Date.now() + 86400000),
        },
        reason: 'Invite is revoked',
      });

      const request = new NextRequest('http://localhost/api/invites/validate', {
        method: 'POST',
        body: JSON.stringify({ token: 'a'.repeat(64) }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.valid).toBe(false);
      expect(data.data.reason).toContain('revoked');
    });
  });
});
