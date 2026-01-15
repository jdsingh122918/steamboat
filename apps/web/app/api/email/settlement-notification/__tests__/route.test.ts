import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock render
vi.mock('@react-email/render', () => ({
  render: vi.fn().mockResolvedValue('<html>rendered email</html>'),
}));

// Mock email client
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

// Mock auth
vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn(),
}));

import { POST } from '../route';
import * as guards from '@/lib/auth/guards';
import * as emailModule from '@/lib/email';

describe('/api/email/settlement-notification route', () => {
  const mockSendEmail = vi.mocked(emailModule.sendEmail);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(guards.requireAuth).mockResolvedValue({
      attendeeId: 'attendee-123',
      tripId: 'trip-123',
      role: 'member',
    } as any);
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(guards.requireAuth).mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost/api/email/settlement-notification', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'creditor@example.com',
          recipientName: 'John',
          tripName: 'Bachelor Party',
          payerName: 'Mike',
          amount: 150,
          paymentMethod: 'Venmo',
          tripUrl: 'https://steamboat.app/trips/123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/email/settlement-notification', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'creditor@example.com',
          // Missing other required fields
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should send settlement notification email successfully', async () => {
      mockSendEmail.mockResolvedValue({ success: true, id: 'email-123' });

      const request = new NextRequest('http://localhost/api/email/settlement-notification', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'creditor@example.com',
          recipientName: 'John',
          tripName: 'Vegas Bachelor Party',
          payerName: 'Mike',
          amount: 150.5,
          paymentMethod: 'Venmo',
          tripUrl: 'https://steamboat.app/trips/123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.emailId).toBe('email-123');
    });

    it('should include optional fields in email', async () => {
      mockSendEmail.mockResolvedValue({ success: true, id: 'email-123' });

      const request = new NextRequest('http://localhost/api/email/settlement-notification', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'creditor@example.com',
          recipientName: 'John',
          tripName: 'Vegas Bachelor Party',
          payerName: 'Mike',
          amount: 150,
          paymentMethod: 'PayPal',
          tripUrl: 'https://steamboat.app/trips/123',
          currency: 'EUR',
          type: 'confirmed',
          note: 'Thanks for a great trip!',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'creditor@example.com',
          subject: expect.stringContaining('Settlement'),
        })
      );
    });

    it('should handle email send failure', async () => {
      mockSendEmail.mockResolvedValue({ success: false, error: 'Failed to send' });

      const request = new NextRequest('http://localhost/api/email/settlement-notification', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'creditor@example.com',
          recipientName: 'John',
          tripName: 'Bachelor Party',
          payerName: 'Mike',
          amount: 150,
          paymentMethod: 'Cash',
          tripUrl: 'https://steamboat.app/trips/123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should send to both parties when sendToBoth is true', async () => {
      mockSendEmail.mockResolvedValue({ success: true, id: 'email-123' });

      const request = new NextRequest('http://localhost/api/email/settlement-notification', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'creditor@example.com',
          recipientName: 'John',
          tripName: 'Bachelor Party',
          payerName: 'Mike',
          payerEmail: 'payer@example.com',
          amount: 150,
          paymentMethod: 'Venmo',
          tripUrl: 'https://steamboat.app/trips/123',
          sendToBoth: true,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Should be called twice - once for creditor, once for payer
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
    });
  });
});
