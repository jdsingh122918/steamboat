import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';

// Mock single download
vi.mock('@/lib/download/single-download', () => ({
  downloadFile: vi.fn().mockResolvedValue(undefined),
  getFilenameFromUrl: vi.fn().mockReturnValue('photo.jpg'),
}));

import { DownloadButton } from '../download-button';
import { downloadFile } from '@/lib/download/single-download';

describe('DownloadButton', () => {
  const mockDownload = vi.mocked(downloadFile);

  const defaultProps = {
    url: 'https://example.com/photo.jpg',
    filename: 'vacation-photo.jpg',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDownload.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render download button', () => {
      render(<DownloadButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should display default text', () => {
      render(<DownloadButton {...defaultProps} />);

      expect(screen.getByText(/download/i)).toBeInTheDocument();
    });

    it('should display custom text when provided', () => {
      render(<DownloadButton {...defaultProps} buttonText="Save Photo" />);

      expect(screen.getByText('Save Photo')).toBeInTheDocument();
    });

    it('should render as icon-only button', () => {
      render(<DownloadButton {...defaultProps} iconOnly />);

      // Should have a button but no visible text
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('downloading', () => {
    it('should call downloadFile on click', async () => {
      render(<DownloadButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockDownload).toHaveBeenCalledWith({
          url: 'https://example.com/photo.jpg',
          filename: 'vacation-photo.jpg',
        });
      });
    });

    it('should disable button during download', async () => {
      mockDownload.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<DownloadButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(button).toBeDisabled();

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle download errors gracefully', async () => {
      mockDownload.mockRejectedValueOnce(new Error('Download failed'));

      const onError = vi.fn();
      render(<DownloadButton {...defaultProps} onError={onError} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it('should re-enable button after error', async () => {
      mockDownload.mockRejectedValueOnce(new Error('Download failed'));

      render(<DownloadButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('callbacks', () => {
    it('should call onSuccess after successful download', async () => {
      const onSuccess = vi.fn();
      render(<DownloadButton {...defaultProps} onSuccess={onSuccess} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('disabled state', () => {
    it('should respect disabled prop', () => {
      render(<DownloadButton {...defaultProps} disabled />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not trigger download when disabled', async () => {
      render(<DownloadButton {...defaultProps} disabled />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await new Promise((r) => setTimeout(r, 50));
      expect(mockDownload).not.toHaveBeenCalled();
    });
  });
});
