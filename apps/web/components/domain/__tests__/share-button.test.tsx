import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';

import { ShareButton } from '../share-button';

// Mock navigator.share and navigator.clipboard
const mockShare = vi.fn();
const mockWriteText = vi.fn();

describe('ShareButton', () => {
  const defaultProps = {
    content: {
      title: 'Check out this trip!',
      text: 'Join us for an amazing adventure',
      url: 'https://example.com/trip/123',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockShare.mockResolvedValue(undefined);
    mockWriteText.mockResolvedValue(undefined);

    // Setup navigator mocks
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  describe('rendering', () => {
    it('should render share button', () => {
      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should display default text "Share"', () => {
      render(<ShareButton {...defaultProps} />);

      expect(screen.getByText(/share/i)).toBeInTheDocument();
    });

    it('should display custom button text', () => {
      render(<ShareButton {...defaultProps} buttonText="Share Trip" />);

      expect(screen.getByText('Share Trip')).toBeInTheDocument();
    });

    it('should render as icon-only when specified', () => {
      render(<ShareButton {...defaultProps} iconOnly />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.queryByText(/share/i)).not.toBeInTheDocument();
    });
  });

  describe('Web Share API', () => {
    it('should call navigator.share when available', async () => {
      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
      });
    });

    it('should pass correct content to navigator.share', async () => {
      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: 'Check out this trip!',
          text: 'Join us for an amazing adventure',
          url: 'https://example.com/trip/123',
        });
      });
    });

    it('should call onShare callback on success', async () => {
      const onShare = vi.fn();
      render(<ShareButton {...defaultProps} onShare={onShare} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onShare).toHaveBeenCalled();
      });
    });

    it('should not call onError when user cancels (AbortError)', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      mockShare.mockRejectedValueOnce(abortError);

      const onError = vi.fn();
      render(<ShareButton {...defaultProps} onError={onError} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await new Promise((r) => setTimeout(r, 50));
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('Clipboard fallback', () => {
    it('should fall back to clipboard when Web Share unavailable', async () => {
      // Remove navigator.share
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('https://example.com/trip/123');
      });
    });

    it('should call onCopyFallback on clipboard copy', async () => {
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const onCopyFallback = vi.fn();
      render(<ShareButton {...defaultProps} onCopyFallback={onCopyFallback} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onCopyFallback).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should call onError on share failure', async () => {
      mockShare.mockRejectedValueOnce(new Error('Share failed'));

      const onError = vi.fn();
      render(<ShareButton {...defaultProps} onError={onError} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<ShareButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });

    it('should have accessible name for icon-only button', () => {
      render(<ShareButton {...defaultProps} iconOnly />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
    });
  });

  describe('disabled state', () => {
    it('should respect disabled prop', () => {
      render(<ShareButton {...defaultProps} disabled />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });
});
