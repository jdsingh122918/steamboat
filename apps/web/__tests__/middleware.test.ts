import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock iron-session
vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
}));

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const createRequest = (pathname: string): NextRequest => {
    const url = new URL(`http://localhost:3000${pathname}`);
    return new NextRequest(url, {
      method: 'GET',
    });
  };

  describe('Public routes', () => {
    it('should allow access to root path', async () => {
      const { middleware } = await import('@/middleware');
      const req = createRequest('/');

      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });

    it('should allow access to /join', async () => {
      const { middleware } = await import('@/middleware');
      const req = createRequest('/join');

      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });

    it('should allow access to /invite', async () => {
      const { middleware } = await import('@/middleware');
      const req = createRequest('/invite');

      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });

    it('should allow access to /invite/token-here', async () => {
      const { middleware } = await import('@/middleware');
      const req = createRequest('/invite/abc123');

      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });
  });

  describe('Protected routes without session', () => {
    it('should redirect /dashboard to /join when no session', async () => {
      const { getIronSession } = await import('iron-session');
      const { middleware } = await import('@/middleware');

      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: undefined,
      });

      const req = createRequest('/dashboard');
      const response = await middleware(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/join');
    });

    it('should redirect /trips to /join when no session', async () => {
      const { getIronSession } = await import('iron-session');
      const { middleware } = await import('@/middleware');

      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: undefined,
      });

      const req = createRequest('/trips');
      const response = await middleware(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/join');
    });

    it('should redirect /trips/123/expenses to /join when no session', async () => {
      const { getIronSession } = await import('iron-session');
      const { middleware } = await import('@/middleware');

      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: undefined,
      });

      const req = createRequest('/trips/123/expenses');
      const response = await middleware(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/join');
    });
  });

  describe('Protected routes with valid session', () => {
    it('should allow /dashboard with valid session', async () => {
      const { getIronSession } = await import('iron-session');
      const { middleware } = await import('@/middleware');

      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: '507f1f77bcf86cd799439011',
        tripId: '507f1f77bcf86cd799439012',
      });

      const req = createRequest('/dashboard');
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });

    it('should allow /trips with valid session', async () => {
      const { getIronSession } = await import('iron-session');
      const { middleware } = await import('@/middleware');

      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: '507f1f77bcf86cd799439011',
        tripId: '507f1f77bcf86cd799439012',
      });

      const req = createRequest('/trips');
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });

    it('should allow /trips/123/expenses with valid session', async () => {
      const { getIronSession } = await import('iron-session');
      const { middleware } = await import('@/middleware');

      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: '507f1f77bcf86cd799439011',
        tripId: '507f1f77bcf86cd799439012',
      });

      const req = createRequest('/trips/123/expenses');
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });
  });

  describe('Static assets and API routes (skipped by matcher)', () => {
    it('should have correct matcher config', async () => {
      const { config } = await import('@/middleware');

      expect(config).toBeDefined();
      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);

      // The matcher should exclude API routes, static files, etc.
      const matcher = config.matcher[0];
      expect(matcher).toContain('(?!api');
      expect(matcher).toContain('_next/static');
      expect(matcher).toContain('_next/image');
      expect(matcher).toContain('favicon.ico');
    });
  });

  describe('Edge cases', () => {
    it('should handle null attendeeId as unauthenticated', async () => {
      const { getIronSession } = await import('iron-session');
      const { middleware } = await import('@/middleware');

      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: null,
      });

      const req = createRequest('/dashboard');
      const response = await middleware(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/join');
    });

    it('should handle empty string attendeeId as unauthenticated', async () => {
      const { getIronSession } = await import('iron-session');
      const { middleware } = await import('@/middleware');

      (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        attendeeId: '',
      });

      const req = createRequest('/dashboard');
      const response = await middleware(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/join');
    });
  });
});
