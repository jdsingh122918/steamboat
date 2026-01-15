import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the payment-links WASM/logic
vi.mock('@/lib/mcp/payment-links', () => ({
  generatePaymentLink: vi.fn(),
}));

import { POST, GET } from '@/app/api/mcp/payment-links/route';

describe('payment-links API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/mcp/payment-links', () => {
    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/payment-links',
        {
          method: 'POST',
          body: JSON.stringify({ platform: 'venmo' }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });

    it('should return 400 for invalid platform', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/payment-links',
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'bitcoin',
            recipient: 'user123',
            amount_cents: 5000,
            memo: 'Test payment',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid platform');
    });

    it('should return 400 for negative amount', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/payment-links',
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'venmo',
            recipient: 'user123',
            amount_cents: -100,
            memo: 'Test',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('positive');
    });

    it('should return 400 for empty recipient', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/payment-links',
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'venmo',
            recipient: '   ',
            amount_cents: 5000,
            memo: 'Test',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('recipient');
    });

    it('should generate Venmo link successfully', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/payment-links',
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'venmo',
            recipient: '@mike_j',
            amount_cents: 15000,
            memo: 'Trip expenses',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.platform).toBe('venmo');
      expect(data.data.link).toContain('venmo://');
      expect(data.data.link).toContain('mike_j');
      expect(data.data.link).toContain('150.00');
      expect(data.data.fallback_text).toBeDefined();
    });

    it('should handle Venmo recipient without @ sign', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/payment-links',
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'venmo',
            recipient: 'mike_j',
            amount_cents: 15000,
            memo: 'Trip expenses',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // @ is URL encoded as %40
      expect(data.data.link).toContain('%40mike_j');
    });

    it('should generate PayPal link successfully', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/payment-links',
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'paypal',
            recipient: 'mike@email.com',
            amount_cents: 15000,
            memo: 'Trip expenses',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.platform).toBe('paypal');
      expect(data.data.link).toContain('paypal.me');
      // @ is URL encoded as %40
      expect(data.data.link).toContain('mike%40email.com');
      expect(data.data.link).toContain('150.00');
    });

    it('should generate CashApp link successfully', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/payment-links',
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'cashapp',
            recipient: '$TomB',
            amount_cents: 8550,
            memo: 'Dinner',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.platform).toBe('cashapp');
      expect(data.data.link).toContain('cash.app');
      // $ is URL encoded as %24
      expect(data.data.link).toContain('%24TomB');
      expect(data.data.link).toContain('85.50');
    });

    it('should add $ prefix to CashApp recipient if missing', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/payment-links',
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'cashapp',
            recipient: 'TomB',
            amount_cents: 8550,
            memo: 'Dinner',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // $ is URL encoded as %24
      expect(data.data.link).toContain('%24TomB');
    });

    it('should return fallback-only for Zelle', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/payment-links',
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'zelle',
            recipient: '555-123-4567',
            amount_cents: 6500,
            memo: 'Settlement',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.platform).toBe('zelle');
      expect(data.data.link).toBeNull();
      expect(data.data.fallback_text).toContain('Zelle');
      expect(data.data.fallback_text).toContain('555-123-4567');
      expect(data.data.fallback_text).toContain('65.00');
    });

    it('should URL encode special characters in memo', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/payment-links',
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'venmo',
            recipient: '@mike',
            amount_cents: 1000,
            memo: 'Trip & expenses (2024)',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // URL should have encoded characters
      expect(data.data.link).toContain('%26'); // &
      // Note: parentheses are not always encoded by encodeURIComponent
      // They are in the "safe" characters range, so check the memo is present
      expect(data.data.link).toContain('2024');
    });

    it('should include timing metadata', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/payment-links',
        {
          method: 'POST',
          body: JSON.stringify({
            platform: 'venmo',
            recipient: '@user',
            amount_cents: 1000,
            memo: 'Test',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(data.meta).toBeDefined();
      expect(typeof data.meta.duration_ms).toBe('number');
    });
  });

  describe('GET /api/mcp/payment-links', () => {
    it('should return health check with supported platforms', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.service).toBe('payment-links-mcp');
      expect(data.status).toBe('healthy');
      expect(data.supported_platforms).toEqual([
        'venmo',
        'paypal',
        'cashapp',
        'zelle',
      ]);
    });
  });
});
