import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';

// Mock the database operations
vi.mock('@/lib/db/operations/invites', () => ({
  createInvite: vi.fn(),
  getInviteByToken: vi.fn(),
  revokeInvite: vi.fn(),
}));

describe('Token System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateInviteToken', () => {
    it('should return a 64-character hex string (32 bytes)', async () => {
      const { generateInviteToken } = await import('@/lib/auth/tokens');

      const token = generateInviteToken();

      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce unique tokens (no duplicates in 100 calls)', async () => {
      const { generateInviteToken } = await import('@/lib/auth/tokens');

      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateInviteToken());
      }

      expect(tokens.size).toBe(100);
    });
  });

  describe('createTripInvite', () => {
    it('should create invite with generated token', async () => {
      const { createInvite } = await import('@/lib/db/operations/invites');
      const { createTripInvite } = await import('@/lib/auth/tokens');

      const tripId = new ObjectId();
      const createdBy = new ObjectId();
      const email = 'Test@Example.com';

      const mockInvite = {
        _id: new ObjectId(),
        tripId,
        email: email.toLowerCase(),
        token: expect.stringMatching(/^[0-9a-f]{64}$/),
        expiresAt: expect.any(Date),
        status: 'pending',
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (createInvite as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);

      const result = await createTripInvite(tripId, email, createdBy);

      expect(createInvite).toHaveBeenCalledWith({
        tripId,
        email: email.toLowerCase(),
        token: expect.stringMatching(/^[0-9a-f]{64}$/),
        expiresAt: expect.any(Date),
        status: 'pending',
        createdBy,
      });
      expect(result).toEqual(mockInvite);
    });

    it('should set correct expiration (default 7 days)', async () => {
      const { createInvite } = await import('@/lib/db/operations/invites');
      const { createTripInvite } = await import('@/lib/auth/tokens');

      const tripId = new ObjectId();
      const createdBy = new ObjectId();
      const email = 'test@example.com';

      const mockInvite = {
        _id: new ObjectId(),
        tripId,
        email,
        token: 'mock-token',
        expiresAt: new Date(),
        status: 'pending',
        createdBy,
      };

      (createInvite as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);

      const beforeCall = Date.now();
      await createTripInvite(tripId, email, createdBy);
      const afterCall = Date.now();

      expect(createInvite).toHaveBeenCalled();
      const callArg = (createInvite as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const expiresAt = callArg.expiresAt as Date;

      // 7 days = 7 * 24 * 60 * 60 * 1000 ms
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const expectedMin = beforeCall + sevenDaysMs;
      const expectedMax = afterCall + sevenDaysMs;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('should set custom expiration when specified', async () => {
      const { createInvite } = await import('@/lib/db/operations/invites');
      const { createTripInvite } = await import('@/lib/auth/tokens');

      const tripId = new ObjectId();
      const createdBy = new ObjectId();
      const email = 'test@example.com';
      const customDays = 14;

      const mockInvite = {
        _id: new ObjectId(),
        tripId,
        email,
        token: 'mock-token',
        expiresAt: new Date(),
        status: 'pending',
        createdBy,
      };

      (createInvite as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);

      const beforeCall = Date.now();
      await createTripInvite(tripId, email, createdBy, customDays);
      const afterCall = Date.now();

      expect(createInvite).toHaveBeenCalled();
      const callArg = (createInvite as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const expiresAt = callArg.expiresAt as Date;

      const customDaysMs = customDays * 24 * 60 * 60 * 1000;
      const expectedMin = beforeCall + customDaysMs;
      const expectedMax = afterCall + customDaysMs;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('should associate with tripId and createdBy', async () => {
      const { createInvite } = await import('@/lib/db/operations/invites');
      const { createTripInvite } = await import('@/lib/auth/tokens');

      const tripId = new ObjectId();
      const createdBy = new ObjectId();
      const email = 'test@example.com';

      const mockInvite = {
        _id: new ObjectId(),
        tripId,
        email,
        token: 'mock-token',
        expiresAt: new Date(),
        status: 'pending',
        createdBy,
      };

      (createInvite as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);

      await createTripInvite(tripId, email, createdBy);

      expect(createInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId,
          createdBy,
        })
      );
    });
  });

  describe('revokeInviteByToken', () => {
    it('should revoke invite by token and return true', async () => {
      const { getInviteByToken, revokeInvite } = await import(
        '@/lib/db/operations/invites'
      );
      const { revokeInviteByToken } = await import('@/lib/auth/tokens');

      const inviteId = new ObjectId();
      const token = 'valid-token-123';
      const mockInvite = {
        _id: inviteId,
        tripId: new ObjectId(),
        email: 'test@example.com',
        token,
        expiresAt: new Date(),
        status: 'pending',
        createdBy: new ObjectId(),
      };

      (getInviteByToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);
      (revokeInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockInvite,
        status: 'revoked',
      });

      const result = await revokeInviteByToken(token);

      expect(getInviteByToken).toHaveBeenCalledWith(token);
      expect(revokeInvite).toHaveBeenCalledWith(inviteId);
      expect(result).toBe(true);
    });

    it('should return false if invite not found', async () => {
      const { getInviteByToken, revokeInvite } = await import(
        '@/lib/db/operations/invites'
      );
      const { revokeInviteByToken } = await import('@/lib/auth/tokens');

      const token = 'non-existent-token';

      (getInviteByToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await revokeInviteByToken(token);

      expect(getInviteByToken).toHaveBeenCalledWith(token);
      expect(revokeInvite).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false if invite has no _id', async () => {
      const { getInviteByToken, revokeInvite } = await import(
        '@/lib/db/operations/invites'
      );
      const { revokeInviteByToken } = await import('@/lib/auth/tokens');

      const token = 'token-without-id';
      const mockInvite = {
        tripId: new ObjectId(),
        email: 'test@example.com',
        token,
        expiresAt: new Date(),
        status: 'pending',
        createdBy: new ObjectId(),
      };

      (getInviteByToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);

      const result = await revokeInviteByToken(token);

      expect(getInviteByToken).toHaveBeenCalledWith(token);
      expect(revokeInvite).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false if revokeInvite returns null', async () => {
      const { getInviteByToken, revokeInvite } = await import(
        '@/lib/db/operations/invites'
      );
      const { revokeInviteByToken } = await import('@/lib/auth/tokens');

      const inviteId = new ObjectId();
      const token = 'valid-token';
      const mockInvite = {
        _id: inviteId,
        tripId: new ObjectId(),
        email: 'test@example.com',
        token,
        expiresAt: new Date(),
        status: 'pending',
        createdBy: new ObjectId(),
      };

      (getInviteByToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvite);
      (revokeInvite as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await revokeInviteByToken(token);

      expect(getInviteByToken).toHaveBeenCalledWith(token);
      expect(revokeInvite).toHaveBeenCalledWith(inviteId);
      expect(result).toBe(false);
    });
  });
});
