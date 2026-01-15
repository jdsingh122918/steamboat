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
  requireAdmin: vi.fn(),
}));

import { POST } from '../route';
import * as guards from '@/lib/auth/guards';
import * as emailModule from '@/lib/email';

describe('/api/email/payment-reminder route', () => {
  const mockSendEmail = vi.mocked(emailModule.sendEmail);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(guards.requireAdmin).mockResolvedValue({
      attendeeId: 'attendee-123',
      tripId: 'trip-123',
      role: 'admin',
    } as any);
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(guards.requireAdmin).mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost/api/email/payment-reminder', {
        method: 'POST',
        body: JSON.stringify({
          tripId: 'trip-123',
          recipientEmail: 'debtor@example.com',
          recipientName: 'Mike',
          tripName: 'Bachelor Party',
          amountOwed: 150,
          creditorName: 'John',
          paymentUrl: 'https://steamboat.app/trips/123/finances',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/email/payment-reminder', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'debtor@example.com',
          // Missing other required fields
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should send payment reminder email successfully', async () => {
      mockSendEmail.mockResolvedValue({ success: true, id: 'email-123' });

      const request = new NextRequest('http://localhost/api/email/payment-reminder', {
        method: 'POST',
        body: JSON.stringify({
          tripId: 'trip-123',
          recipientEmail: 'debtor@example.com',
          recipientName: 'Mike',
          tripName: 'Vegas Bachelor Party',
          amountOwed: 150.5,
          creditorName: 'John',
          paymentUrl: 'https://steamboat.app/trips/123/finances',
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

      const request = new NextRequest('http://localhost/api/email/payment-reminder', {
        method: 'POST',
        body: JSON.stringify({
          tripId: 'trip-123',
          recipientEmail: 'debtor@example.com',
          recipientName: 'Mike',
          tripName: 'Vegas Bachelor Party',
          amountOwed: 150,
          creditorName: 'John',
          paymentUrl: 'https://steamboat.app/trips/123/finances',
          currency: 'EUR',
          dueDate: 'January 15, 2026',
          expenseBreakdown: [
            { description: 'Dinner', amount: 100 },
            { description: 'Drinks', amount: 50 },
          ],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'debtor@example.com',
          subject: expect.stringContaining('Payment Reminder'),
        })
      );
    });

    it('should handle email send failure', async () => {
      mockSendEmail.mockResolvedValue({ success: false, error: 'Failed to send' });

      const request = new NextRequest('http://localhost/api/email/payment-reminder', {
        method: 'POST',
        body: JSON.stringify({
          tripId: 'trip-123',
          recipientEmail: 'debtor@example.com',
          recipientName: 'Mike',
          tripName: 'Bachelor Party',
          amountOwed: 150,
          creditorName: 'John',
          paymentUrl: 'https://steamboat.app/trips/123/finances',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should validate amount is positive', async () => {
      const request = new NextRequest('http://localhost/api/email/payment-reminder', {
        method: 'POST',
        body: JSON.stringify({
          tripId: 'trip-123',
          recipientEmail: 'debtor@example.com',
          recipientName: 'Mike',
          tripName: 'Bachelor Party',
          amountOwed: -50,
          creditorName: 'John',
          paymentUrl: 'https://steamboat.app/trips/123/finances',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
