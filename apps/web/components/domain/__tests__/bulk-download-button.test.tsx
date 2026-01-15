import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';

// Mock bulk download
vi.mock('@/lib/download/bulk-download', () => ({
  downloadPhotosAsZip: vi.fn().mockResolvedValue(undefined),
}));

import { BulkDownloadButton } from '../bulk-download-button';
import { downloadPhotosAsZip } from '@/lib/download/bulk-download';
import type { PhotoItem } from '@/lib/download/bulk-download';

describe('BulkDownloadButton', () => {
  const mockDownload = vi.mocked(downloadPhotosAsZip);

  const defaultPhotos: PhotoItem[] = [
    { url: 'https://example.com/photo1.jpg', filename: 'photo1.jpg' },
    { url: 'https://example.com/photo2.jpg', filename: 'photo2.jpg' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockDownload.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render download button', () => {
      render(<BulkDownloadButton photos={defaultPhotos} zipName="gallery" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should display photo count', () => {
      render(<BulkDownloadButton photos={defaultPhotos} zipName="gallery" />);

      expect(screen.getByText(/2/)).toBeInTheDocument();
    });

    it('should display custom text when provided', () => {
      render(
        <BulkDownloadButton
          photos={defaultPhotos}
          zipName="gallery"
          buttonText="Download All"
        />
      );

      expect(screen.getByText('Download All')).toBeInTheDocument();
    });
  });

  describe('downloading', () => {
    it('should call downloadPhotosAsZip on click', async () => {
      render(<BulkDownloadButton photos={defaultPhotos} zipName="my-gallery" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockDownload).toHaveBeenCalledWith(
          defaultPhotos,
          'my-gallery',
          expect.any(Function)
        );
      });
    });

    it('should show progress during download', async () => {
      mockDownload.mockImplementation(async (photos, name, onProgress) => {
        // Simulate progress
        onProgress?.({ current: 1, total: 2, percent: 50, currentFile: 'photo1.jpg' });
        await new Promise((r) => setTimeout(r, 50));
        onProgress?.({ current: 2, total: 2, percent: 100, currentFile: 'photo2.jpg' });
      });

      render(<BulkDownloadButton photos={defaultPhotos} zipName="gallery" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should show progress
      await waitFor(() => {
        expect(screen.getByText(/50%|100%/)).toBeInTheDocument();
      });
    });

    it('should disable button during download', async () => {
      mockDownload.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<BulkDownloadButton photos={defaultPhotos} zipName="gallery" />);

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
      render(
        <BulkDownloadButton
          photos={defaultPhotos}
          zipName="gallery"
          onError={onError}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should re-enable button after error', async () => {
      mockDownload.mockRejectedValueOnce(new Error('Download failed'));

      render(<BulkDownloadButton photos={defaultPhotos} zipName="gallery" />);

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
      render(
        <BulkDownloadButton
          photos={defaultPhotos}
          zipName="gallery"
          onSuccess={onSuccess}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('disabled state', () => {
    it('should be disabled when no photos', () => {
      render(<BulkDownloadButton photos={[]} zipName="gallery" />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should respect disabled prop', () => {
      render(<BulkDownloadButton photos={defaultPhotos} zipName="gallery" disabled />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });
});
