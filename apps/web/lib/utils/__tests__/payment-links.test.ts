import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

// Mock clipboard API
const mockClipboardWriteText = vi.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockClipboardWriteText,
  },
  writable: true,
});

import {
  openPaymentLink,
  copyToClipboard,
  supportsDeepLink,
  getPaymentMethodDisplayName,
  DEEP_LINK_METHODS,
} from '../payment-links';

describe('payment-links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockWindowOpen.mockReset();
    mockClipboardWriteText.mockReset();
  });

  describe('supportsDeepLink', () => {
    it('should return true for venmo', () => {
      expect(supportsDeepLink('venmo')).toBe(true);
    });

    it('should return true for paypal', () => {
      expect(supportsDeepLink('paypal')).toBe(true);
    });

    it('should return true for cashapp', () => {
      expect(supportsDeepLink('cashapp')).toBe(true);
    });

    it('should return false for zelle', () => {
      expect(supportsDeepLink('zelle')).toBe(false);
    });

    it('should return false for cash', () => {
      expect(supportsDeepLink('cash')).toBe(false);
    });

    it('should return false for other', () => {
      expect(supportsDeepLink('other')).toBe(false);
    });
  });

  describe('getPaymentMethodDisplayName', () => {
    it('should return correct display name for venmo', () => {
      expect(getPaymentMethodDisplayName('venmo')).toBe('Venmo');
    });

    it('should return correct display name for paypal', () => {
      expect(getPaymentMethodDisplayName('paypal')).toBe('PayPal');
    });

    it('should return correct display name for cashapp', () => {
      expect(getPaymentMethodDisplayName('cashapp')).toBe('Cash App');
    });

    it('should return correct display name for zelle', () => {
      expect(getPaymentMethodDisplayName('zelle')).toBe('Zelle');
    });

    it('should return correct display name for cash', () => {
      expect(getPaymentMethodDisplayName('cash')).toBe('Cash');
    });

    it('should return correct display name for other', () => {
      expect(getPaymentMethodDisplayName('other')).toBe('Other');
    });
  });

  describe('openPaymentLink', () => {
    const tripId = '507f1f77bcf86cd799439011';
    const toId = '507f1f77bcf86cd799439012';
    const amount_cents = 5000;

    describe('with zelle', () => {
      it('should return fallback text without making API call', async () => {
        const result = await openPaymentLink(tripId, toId, amount_cents, 'zelle');

        expect(mockFetch).not.toHaveBeenCalled();
        expect(mockWindowOpen).not.toHaveBeenCalled();
        expect(result.opened).toBe(false);
        expect(result.fallbackText).toContain('Zelle does not support payment links');
      });
    });

    describe('with cash', () => {
      it('should return error for cash method', async () => {
        const result = await openPaymentLink(tripId, toId, amount_cents, 'cash');

        expect(mockFetch).not.toHaveBeenCalled();
        expect(result.opened).toBe(false);
        expect(result.error).toContain('does not support payment links');
      });
    });

    describe('with other', () => {
      it('should return error for other method', async () => {
        const result = await openPaymentLink(tripId, toId, amount_cents, 'other');

        expect(mockFetch).not.toHaveBeenCalled();
        expect(result.opened).toBe(false);
        expect(result.error).toContain('does not support payment links');
      });
    });

    describe('with venmo', () => {
      it('should call API and open payment link in new tab', async () => {
        const mockLink = 'venmo://paycharge?txn=pay&recipients=%40johndoe&amount=50.00&note=Payment';
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              method: 'venmo',
              link: mockLink,
              receiverName: 'John Doe',
              amount: '50.00',
            },
          }),
        });
        mockWindowOpen.mockReturnValueOnce({});

        const result = await openPaymentLink(tripId, toId, amount_cents, 'venmo');

        expect(mockFetch).toHaveBeenCalledWith(
          `/api/trips/${tripId}/payments/links`,
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toId, amount_cents, method: 'venmo' }),
          })
        );
        expect(mockWindowOpen).toHaveBeenCalledWith(mockLink, '_blank');
        expect(result.opened).toBe(true);
        expect(result.link).toBe(mockLink);
        expect(result.receiverName).toBe('John Doe');
        expect(result.amount).toBe('50.00');
      });

      it('should handle popup blocker', async () => {
        const mockLink = 'venmo://paycharge?txn=pay&recipients=%40johndoe&amount=50.00&note=Payment';
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              method: 'venmo',
              link: mockLink,
              receiverName: 'John Doe',
              amount: '50.00',
            },
          }),
        });
        // Simulate popup blocker
        mockWindowOpen.mockReturnValueOnce(null);

        const result = await openPaymentLink(tripId, toId, amount_cents, 'venmo');

        expect(result.opened).toBe(false);
        expect(result.error).toContain('popup');
      });
    });

    describe('with paypal', () => {
      it('should call API and open PayPal link in new tab', async () => {
        const mockLink = 'https://paypal.me/johndoe/50.00';
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              method: 'paypal',
              link: mockLink,
              receiverName: 'John Doe',
              amount: '50.00',
            },
          }),
        });
        mockWindowOpen.mockReturnValueOnce({});

        const result = await openPaymentLink(tripId, toId, amount_cents, 'paypal');

        expect(mockFetch).toHaveBeenCalledWith(
          `/api/trips/${tripId}/payments/links`,
          expect.objectContaining({
            body: JSON.stringify({ toId, amount_cents, method: 'paypal' }),
          })
        );
        expect(mockWindowOpen).toHaveBeenCalledWith(mockLink, '_blank');
        expect(result.opened).toBe(true);
      });
    });

    describe('with cashapp', () => {
      it('should call API and open CashApp link in new tab', async () => {
        const mockLink = 'https://cash.app/%24johndoe/50.00';
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              method: 'cashapp',
              link: mockLink,
              receiverName: 'John Doe',
              amount: '50.00',
            },
          }),
        });
        mockWindowOpen.mockReturnValueOnce({});

        const result = await openPaymentLink(tripId, toId, amount_cents, 'cashapp');

        expect(mockFetch).toHaveBeenCalledWith(
          `/api/trips/${tripId}/payments/links`,
          expect.objectContaining({
            body: JSON.stringify({ toId, amount_cents, method: 'cashapp' }),
          })
        );
        expect(mockWindowOpen).toHaveBeenCalledWith(mockLink, '_blank');
        expect(result.opened).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should handle API errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({
            success: false,
            error: 'Receiver has not set up a venmo payment handle',
          }),
        });

        const result = await openPaymentLink(tripId, toId, amount_cents, 'venmo');

        expect(result.opened).toBe(false);
        expect(result.error).toBe('Receiver has not set up a venmo payment handle');
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await openPaymentLink(tripId, toId, amount_cents, 'venmo');

        expect(result.opened).toBe(false);
        expect(result.error).toBe('Network error');
      });

      it('should handle missing link in response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              method: 'venmo',
              receiverName: 'John Doe',
              amount: '50.00',
              // Missing link field
            },
          }),
        });

        const result = await openPaymentLink(tripId, toId, amount_cents, 'venmo');

        expect(result.opened).toBe(false);
        expect(result.error).toBe('No payment link returned');
      });
    });
  });

  describe('copyToClipboard', () => {
    it('should copy text to clipboard using navigator.clipboard', async () => {
      mockClipboardWriteText.mockResolvedValueOnce(undefined);

      const result = await copyToClipboard('test@example.com');

      expect(mockClipboardWriteText).toHaveBeenCalledWith('test@example.com');
      expect(result).toBe(true);
    });

    it('should return false if clipboard API fails', async () => {
      mockClipboardWriteText.mockRejectedValueOnce(new Error('Clipboard error'));

      // Mock document.execCommand for fallback
      const mockExecCommand = vi.fn().mockReturnValue(false);
      document.execCommand = mockExecCommand;

      const result = await copyToClipboard('test@example.com');

      expect(result).toBe(false);
    });

    it('should use fallback method when clipboard API fails', async () => {
      mockClipboardWriteText.mockRejectedValueOnce(new Error('Clipboard error'));

      // Mock document.execCommand for fallback
      const mockExecCommand = vi.fn().mockReturnValue(true);
      document.execCommand = mockExecCommand;

      // Mock createElement and appendChild
      const mockTextArea = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockTextArea as unknown as HTMLElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockTextArea as unknown as Node);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockTextArea as unknown as Node);

      const result = await copyToClipboard('test@example.com');

      expect(mockExecCommand).toHaveBeenCalledWith('copy');
      expect(result).toBe(true);
    });
  });

  describe('DEEP_LINK_METHODS', () => {
    it('should contain exactly venmo, paypal, and cashapp', () => {
      expect(DEEP_LINK_METHODS).toEqual(['venmo', 'paypal', 'cashapp']);
    });
  });
});
