import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Resend
const mockSend = vi.fn();
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

// Mock React Email render
vi.mock('@react-email/render', () => ({
  render: vi.fn().mockResolvedValue('<html>rendered email</html>'),
}));

import {
  createEmailClient,
  sendEmail,
  EmailSendOptions,
  EmailResult,
} from '../client';

describe('Email Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 're_test_123',
      EMAIL_FROM: 'test@steamboat.app',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createEmailClient', () => {
    it('should return null when RESEND_API_KEY is missing', () => {
      delete process.env.RESEND_API_KEY;
      const client = createEmailClient();
      expect(client).toBeNull();
    });

    it('should create client when RESEND_API_KEY is set', () => {
      const client = createEmailClient();
      expect(client).not.toBeNull();
    });
  });

  describe('sendEmail', () => {
    it('should send email with required fields', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });

      const result = await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('email-123');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'Test Email',
          html: '<p>Test content</p>',
        })
      );
    });

    it('should use default from address when not specified', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });

      await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@steamboat.app',
        })
      );
    });

    it('should use custom from address when specified', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });

      await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        from: 'custom@steamboat.app',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom@steamboat.app',
        })
      );
    });

    it('should send email to multiple recipients', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });

      await sendEmail({
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Group Email',
        html: '<p>Hello all</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['user1@example.com', 'user2@example.com'],
        })
      );
    });

    it('should handle send failure', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' },
      });

      const result = await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      const result = await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should support reply-to header', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });

      await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        replyTo: 'support@steamboat.app',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'support@steamboat.app',
        })
      );
    });

    it('should return error when API key is missing', async () => {
      delete process.env.RESEND_API_KEY;

      const result = await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should support text-only emails', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });

      await sendEmail({
        to: 'recipient@example.com',
        subject: 'Plain Text Email',
        text: 'This is plain text',
      });

      // When only text is provided, it's used as html (text becomes the primary content)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: 'This is plain text',
        })
      );
    });

    it('should support both html and text', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });

      await sendEmail({
        to: 'recipient@example.com',
        subject: 'Mixed Email',
        html: '<p>HTML content</p>',
        text: 'Plain text fallback',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<p>HTML content</p>',
          text: 'Plain text fallback',
        })
      );
    });
  });

  describe('DEFAULT_FROM_ADDRESS', () => {
    it('should use EMAIL_FROM env var when set', async () => {
      process.env.EMAIL_FROM = 'custom-from@steamboat.app';
      mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });

      await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom-from@steamboat.app',
        })
      );
    });

    it('should use fallback when EMAIL_FROM is not set', async () => {
      delete process.env.EMAIL_FROM;
      mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });

      await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Steamboat <noreply@steamboat.app>',
        })
      );
    });
  });
});
