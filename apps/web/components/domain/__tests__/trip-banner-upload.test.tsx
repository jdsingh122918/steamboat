import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';

import { TripBannerUpload } from '../trip-banner-upload';

describe('TripBannerUpload', () => {
  const defaultProps = {
    tripId: 'trip-123',
    onUpload: vi.fn().mockResolvedValue({ url: 'https://example.com/banner.jpg', thumbnailUrl: 'https://example.com/banner-thumb.jpg' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render placeholder when no banner', () => {
      render(<TripBannerUpload {...defaultProps} />);

      expect(screen.getByTestId('banner-placeholder')).toBeInTheDocument();
    });

    it('should render current banner image', () => {
      render(
        <TripBannerUpload
          {...defaultProps}
          currentBannerUrl="https://example.com/current-banner.jpg"
        />
      );

      const banner = screen.getByTestId('banner-image');
      expect(banner).toHaveAttribute('src', 'https://example.com/current-banner.jpg');
    });

    it('should show edit button when canEdit is true', () => {
      render(<TripBannerUpload {...defaultProps} canEdit />);

      expect(screen.getByRole('button', { name: /upload|change/i })).toBeInTheDocument();
    });

    it('should hide edit button when canEdit is false', () => {
      render(<TripBannerUpload {...defaultProps} canEdit={false} />);

      expect(screen.queryByRole('button', { name: /upload|change/i })).not.toBeInTheDocument();
    });

    it('should enforce aspect ratio via CSS', () => {
      const { rerender } = render(<TripBannerUpload {...defaultProps} aspectRatio="16:9" />);

      let container = screen.getByTestId('trip-banner-upload');
      expect(container).toHaveStyle({ aspectRatio: '16/9' });

      rerender(<TripBannerUpload {...defaultProps} aspectRatio="3:1" />);
      container = screen.getByTestId('trip-banner-upload');
      expect(container).toHaveStyle({ aspectRatio: '3/1' });
    });
  });

  describe('file selection', () => {
    it('should open file picker on click', () => {
      render(<TripBannerUpload {...defaultProps} canEdit />);

      const input = screen.getByTestId('banner-input');
      const clickSpy = vi.spyOn(input, 'click');

      const button = screen.getByRole('button', { name: /upload|change/i });
      fireEvent.click(button);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should validate image files only', async () => {
      render(<TripBannerUpload {...defaultProps} canEdit />);

      const input = screen.getByTestId('banner-input');
      const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });

      fireEvent.change(input, { target: { files: [textFile] } });

      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });

      expect(defaultProps.onUpload).not.toHaveBeenCalled();
    });

    it('should validate file size', async () => {
      render(<TripBannerUpload {...defaultProps} canEdit maxSizeBytes={1024} />);

      const input = screen.getByTestId('banner-input');
      const largeFile = new File(['x'.repeat(2048)], 'large.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });

      expect(defaultProps.onUpload).not.toHaveBeenCalled();
    });
  });

  describe('drag and drop', () => {
    it('should support drag and drop', async () => {
      render(<TripBannerUpload {...defaultProps} canEdit />);

      const dropzone = screen.getByTestId('trip-banner-upload');
      const validFile = new File(['image data'], 'banner.jpg', { type: 'image/jpeg' });

      const dataTransfer = {
        files: [validFile],
        types: ['Files'],
      };

      fireEvent.dragEnter(dropzone, { dataTransfer });
      expect(screen.getByTestId('trip-banner-upload')).toHaveAttribute('data-dragging', 'true');

      fireEvent.drop(dropzone, { dataTransfer });

      await waitFor(() => {
        expect(defaultProps.onUpload).toHaveBeenCalled();
      });
    });

    it('should show visual feedback on drag', () => {
      render(<TripBannerUpload {...defaultProps} canEdit />);

      const dropzone = screen.getByTestId('trip-banner-upload');

      fireEvent.dragEnter(dropzone, {
        dataTransfer: { files: [], types: ['Files'] },
      });

      expect(dropzone).toHaveAttribute('data-dragging', 'true');

      fireEvent.dragLeave(dropzone);

      expect(dropzone).toHaveAttribute('data-dragging', 'false');
    });
  });

  describe('upload', () => {
    it('should show upload progress', async () => {
      const slowUpload = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ url: 'https://example.com/banner.jpg', thumbnailUrl: 'https://example.com/thumb.jpg' }), 100))
      );

      render(<TripBannerUpload {...defaultProps} onUpload={slowUpload} canEdit />);

      const input = screen.getByTestId('banner-input');
      const validFile = new File(['image data'], 'banner.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
      });
    });

    it('should call onUpload with result URLs', async () => {
      const onUpload = vi.fn().mockResolvedValue({
        url: 'https://example.com/new-banner.jpg',
        thumbnailUrl: 'https://example.com/new-thumb.jpg',
      });

      render(<TripBannerUpload {...defaultProps} onUpload={onUpload} canEdit />);

      const input = screen.getByTestId('banner-input');
      const validFile = new File(['image data'], 'banner.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(onUpload).toHaveBeenCalledWith(validFile);
      });
    });

    it('should handle upload errors', async () => {
      const onUpload = vi.fn().mockRejectedValue(new Error('Upload failed'));

      render(<TripBannerUpload {...defaultProps} onUpload={onUpload} canEdit />);

      const input = screen.getByTestId('banner-input');
      const validFile = new File(['image data'], 'banner.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });
    });

    it('should update banner on successful upload', async () => {
      const onUpload = vi.fn().mockResolvedValue({
        url: 'https://example.com/new-banner.jpg',
        thumbnailUrl: 'https://example.com/new-thumb.jpg',
      });

      render(<TripBannerUpload {...defaultProps} onUpload={onUpload} canEdit />);

      const input = screen.getByTestId('banner-input');
      const validFile = new File(['image data'], 'banner.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        const banner = screen.getByTestId('banner-image');
        expect(banner).toHaveAttribute('src', 'https://example.com/new-banner.jpg');
      });
    });
  });

  describe('remove', () => {
    it('should show remove option when banner exists', () => {
      const onRemove = vi.fn();
      render(
        <TripBannerUpload
          {...defaultProps}
          currentBannerUrl="https://example.com/banner.jpg"
          onRemove={onRemove}
          canEdit
        />
      );

      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('should not show remove when no banner', () => {
      const onRemove = vi.fn();
      render(<TripBannerUpload {...defaultProps} onRemove={onRemove} canEdit />);

      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });

    it('should call onRemove when banner deleted', async () => {
      const onRemove = vi.fn().mockResolvedValue(undefined);
      render(
        <TripBannerUpload
          {...defaultProps}
          currentBannerUrl="https://example.com/banner.jpg"
          onRemove={onRemove}
          canEdit
        />
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(onRemove).toHaveBeenCalled();
      });
    });
  });

  describe('accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<TripBannerUpload {...defaultProps} canEdit />);

      const button = screen.getByRole('button', { name: /upload|change/i });
      expect(button).not.toHaveAttribute('tabIndex', '-1');
    });

    it('should have proper aria labels', () => {
      render(<TripBannerUpload {...defaultProps} canEdit />);

      const button = screen.getByRole('button', { name: /upload|change/i });
      expect(button).toHaveAccessibleName();
    });
  });
});
