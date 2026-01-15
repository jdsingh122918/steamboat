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

describe('/api/email/send-invite route', () => {
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

      const request = new NextRequest('http://localhost/api/email/send-invite', {
        method: 'POST',
        body: JSON.stringify({
          tripId: 'trip-123',
          recipientEmail: 'guest@example.com',
          inviterName: 'John',
          tripName: 'Bachelor Party',
          inviteUrl: 'https://steamboat.app/invite/abc123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/email/send-invite', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'guest@example.com',
          // Missing inviterName, tripName, inviteUrl
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.toLowerCase()).toContain('required');
    });

    it('should return 400 for invalid email format', async () => {
      const request = new NextRequest('http://localhost/api/email/send-invite', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: 'invalid-email',
          inviterName: 'John',
          tripName: 'Bachelor Party',
          inviteUrl: 'https://steamboat.app/invite/abc123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('email');
    });

    it('should send invite email successfully', async () => {
      mockSendEmail.mockResolvedValue({ success: true, id: 'email-123' });

      const request = new NextRequest('http://localhost/api/email/send-invite', {
        method: 'POST',
        body: JSON.stringify({
          tripId: 'trip-123',
          recipientEmail: 'guest@example.com',
          inviterName: 'John Doe',
          tripName: 'Vegas Bachelor Party',
          inviteUrl: 'https://steamboat.app/invite/abc123',
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

      const request = new NextRequest('http://localhost/api/email/send-invite', {
        method: 'POST',
        body: JSON.stringify({
          tripId: 'trip-123',
          recipientEmail: 'guest@example.com',
          inviterName: 'John Doe',
          tripName: 'Vegas Bachelor Party',
          inviteUrl: 'https://steamboat.app/invite/abc123',
          tripLocation: 'Las Vegas, NV',
          tripDates: 'June 15-18, 2025',
          personalMessage: 'Cannot wait to see you!',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'guest@example.com',
          subject: expect.stringContaining('Vegas Bachelor Party'),
        })
      );
    });

    it('should handle email send failure', async () => {
      mockSendEmail.mockResolvedValue({ success: false, error: 'Rate limit exceeded' });

      const request = new NextRequest('http://localhost/api/email/send-invite', {
        method: 'POST',
        body: JSON.stringify({
          tripId: 'trip-123',
          recipientEmail: 'guest@example.com',
          inviterName: 'John',
          tripName: 'Bachelor Party',
          inviteUrl: 'https://steamboat.app/invite/abc123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Rate limit');
    });

    it('should send to multiple recipients', async () => {
      mockSendEmail.mockResolvedValue({ success: true, id: 'email-123' });

      const request = new NextRequest('http://localhost/api/email/send-invite', {
        method: 'POST',
        body: JSON.stringify({
          tripId: 'trip-123',
          recipientEmail: ['guest1@example.com', 'guest2@example.com'],
          inviterName: 'John',
          tripName: 'Bachelor Party',
          inviteUrl: 'https://steamboat.app/invite/abc123',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['guest1@example.com', 'guest2@example.com'],
        })
      );
    });
  });
});
