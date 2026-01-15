import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Mock iron-session
vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
}));

describe('Session Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache to ensure fresh imports
    vi.resetModules();
  });

  describe('sessionOptions', () => {
    it('should have correct cookie name', async () => {
      const { sessionOptions } = await import('@/lib/auth/session');
      expect(sessionOptions.cookieName).toBe('steamboat-session');
    });

    it('should have httpOnly set to true', async () => {
      const { sessionOptions } = await import('@/lib/auth/session');
      expect(sessionOptions.cookieOptions?.httpOnly).toBe(true);
    });

    it('should have sameSite set to lax', async () => {
      const { sessionOptions } = await import('@/lib/auth/session');
      expect(sessionOptions.cookieOptions?.sameSite).toBe('lax');
    });

    it('should have 7-day maxAge', async () => {
      const { sessionOptions } = await import('@/lib/auth/session');
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      expect(sessionOptions.cookieOptions?.maxAge).toBe(sevenDaysInSeconds);
    });

    it('should have a password configured', async () => {
      const { sessionOptions } = await import('@/lib/auth/session');
      expect(sessionOptions.password).toBeDefined();
      expect(typeof sessionOptions.password).toBe('string');
      expect((sessionOptions.password as string).length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('getSession', () => {
    it('should call getIronSession with cookies and options', async () => {
      const { cookies } = await import('next/headers');
      const { getIronSession } = await import('iron-session');
      const { getSession, sessionOptions } = await import('@/lib/auth/session');

      const mockCookieStore = { get: vi.fn(), set: vi.fn() };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);
      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await getSession();

      expect(cookies).toHaveBeenCalled();
      expect(getIronSession).toHaveBeenCalledWith(mockCookieStore, sessionOptions);
    });
  });

  describe('createSession', () => {
    it('should set attendeeId on session', async () => {
      const { cookies } = await import('next/headers');
      const { getIronSession } = await import('iron-session');
      const { createSession } = await import('@/lib/auth/session');

      const mockSession = {
        attendeeId: undefined,
        tripId: undefined,
        role: undefined,
        expiresAt: undefined,
        save: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      await createSession('attendee-123', 'trip-456', 'member');

      expect(mockSession.attendeeId).toBe('attendee-123');
    });

    it('should set tripId on session', async () => {
      const { cookies } = await import('next/headers');
      const { getIronSession } = await import('iron-session');
      const { createSession } = await import('@/lib/auth/session');

      const mockSession = {
        attendeeId: undefined,
        tripId: undefined,
        role: undefined,
        expiresAt: undefined,
        save: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      await createSession('attendee-123', 'trip-456', 'member');

      expect(mockSession.tripId).toBe('trip-456');
    });

    it('should set role on session', async () => {
      const { cookies } = await import('next/headers');
      const { getIronSession } = await import('iron-session');
      const { createSession } = await import('@/lib/auth/session');

      const mockSession = {
        attendeeId: undefined,
        tripId: undefined,
        role: undefined,
        expiresAt: undefined,
        save: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      await createSession('attendee-123', 'trip-456', 'admin');

      expect(mockSession.role).toBe('admin');
    });

    it('should call session.save()', async () => {
      const { cookies } = await import('next/headers');
      const { getIronSession } = await import('iron-session');
      const { createSession } = await import('@/lib/auth/session');

      const mockSession = {
        attendeeId: undefined,
        tripId: undefined,
        role: undefined,
        expiresAt: undefined,
        save: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      await createSession('attendee-123', 'trip-456', 'member');

      expect(mockSession.save).toHaveBeenCalled();
    });

    it('should set expiresAt timestamp', async () => {
      const { cookies } = await import('next/headers');
      const { getIronSession } = await import('iron-session');
      const { createSession } = await import('@/lib/auth/session');

      const mockSession = {
        attendeeId: undefined,
        tripId: undefined,
        role: undefined,
        expiresAt: undefined,
        save: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      const beforeTime = Date.now();
      await createSession('attendee-123', 'trip-456', 'member');
      const afterTime = Date.now();

      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      expect(mockSession.expiresAt).toBeGreaterThanOrEqual(beforeTime + sevenDaysInMs);
      expect(mockSession.expiresAt).toBeLessThanOrEqual(afterTime + sevenDaysInMs);
    });
  });

  describe('destroySession', () => {
    it('should call session.destroy()', async () => {
      const { cookies } = await import('next/headers');
      const { getIronSession } = await import('iron-session');
      const { destroySession } = await import('@/lib/auth/session');

      const mockSession = {
        destroy: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      await destroySession();

      expect(mockSession.destroy).toHaveBeenCalled();
    });
  });
});
