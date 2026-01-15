import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilePreviewItem } from '../FilePreviewItem';
import type { FileWithState } from '../useFileUpload';

function createMockFileState(overrides: Partial<FileWithState> = {}): FileWithState {
  return {
    id: 'file-123',
    file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    preview: 'blob:mock-preview-url',
    caption: '',
    status: 'pending',
    progress: 0,
    ...overrides,
  };
}

describe('FilePreviewItem', () => {
  const mockOnRemove = vi.fn();
  const mockOnCaptionChange = vi.fn();
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render file preview item', () => {
      const file = createMockFileState();

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      expect(screen.getByTestId('upload-file-item-file-123')).toBeInTheDocument();
    });

    it('should render image thumbnail for image files', () => {
      const file = createMockFileState();

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'blob:mock-preview-url');
    });

    it('should render video thumbnail for video files', () => {
      const file = createMockFileState({
        file: new File(['test'], 'test.mp4', { type: 'video/mp4' }),
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', 'blob:mock-preview-url');
    });

    it('should show video badge for video files', () => {
      const file = createMockFileState({
        file: new File(['test'], 'test.mp4', { type: 'video/mp4' }),
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      const videoBadge = document.querySelector('.upload-file-video-badge');
      expect(videoBadge).toBeInTheDocument();
    });
  });

  describe('pending state', () => {
    it('should show caption input for pending files', () => {
      const file = createMockFileState({ status: 'pending' });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      expect(screen.getByPlaceholderText(/add caption/i)).toBeInTheDocument();
    });

    it('should show remove button for pending files', () => {
      const file = createMockFileState({ status: 'pending' });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      expect(screen.getByLabelText(/remove file/i)).toBeInTheDocument();
    });

    it('should call onCaptionChange when caption is edited', () => {
      const file = createMockFileState({ status: 'pending' });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      const input = screen.getByPlaceholderText(/add caption/i);
      fireEvent.change(input, { target: { value: 'New caption' } });

      expect(mockOnCaptionChange).toHaveBeenCalledWith('file-123', 'New caption');
    });

    it('should call onRemove when remove button is clicked', () => {
      const file = createMockFileState({ status: 'pending' });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      const removeButton = screen.getByLabelText(/remove file/i);
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith('file-123');
    });
  });

  describe('uploading state', () => {
    it('should show progress overlay when uploading', () => {
      const file = createMockFileState({
        status: 'uploading',
        progress: 50,
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={true}
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should not show remove button when uploading', () => {
      const file = createMockFileState({
        status: 'uploading',
        progress: 50,
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={true}
        />
      );

      expect(screen.queryByLabelText(/remove file/i)).not.toBeInTheDocument();
    });

    it('should not show caption input when uploading', () => {
      const file = createMockFileState({
        status: 'uploading',
        progress: 50,
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={true}
        />
      );

      expect(screen.queryByPlaceholderText(/add caption/i)).not.toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('should show success overlay when upload completes', () => {
      const file = createMockFileState({
        status: 'success',
        progress: 100,
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      const successOverlay = document.querySelector('.upload-file-success-overlay');
      expect(successOverlay).toBeInTheDocument();
    });

    it('should show caption text for successful uploads with caption', () => {
      const file = createMockFileState({
        status: 'success',
        caption: 'Beach photo',
        progress: 100,
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      expect(screen.getByText('Beach photo')).toBeInTheDocument();
    });

    it('should not show remove button for successful uploads', () => {
      const file = createMockFileState({
        status: 'success',
        progress: 100,
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      expect(screen.queryByLabelText(/remove file/i)).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error overlay when upload fails', () => {
      const file = createMockFileState({
        status: 'error',
        error: 'Upload failed',
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      const errorOverlay = document.querySelector('.upload-file-error-overlay');
      expect(errorOverlay).toBeInTheDocument();
    });

    it('should show error message', () => {
      const file = createMockFileState({
        status: 'error',
        error: 'Network error',
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should show retry button for failed uploads', () => {
      const file = createMockFileState({
        status: 'error',
        error: 'Upload failed',
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const file = createMockFileState({
        status: 'error',
        error: 'Upload failed',
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledWith('file-123');
    });

    it('should show remove button for failed uploads', () => {
      const file = createMockFileState({
        status: 'error',
        error: 'Upload failed',
      });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      expect(screen.getByLabelText(/remove file/i)).toBeInTheDocument();
    });
  });

  describe('css classes', () => {
    it('should have status-specific class', () => {
      const file = createMockFileState({ status: 'pending' });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      const item = screen.getByTestId('upload-file-item-file-123');
      expect(item).toHaveClass('upload-file-item-pending');
    });

    it('should have uploading class when uploading', () => {
      const file = createMockFileState({ status: 'uploading' });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={true}
        />
      );

      const item = screen.getByTestId('upload-file-item-file-123');
      expect(item).toHaveClass('upload-file-item-uploading');
    });

    it('should have success class when successful', () => {
      const file = createMockFileState({ status: 'success' });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      const item = screen.getByTestId('upload-file-item-file-123');
      expect(item).toHaveClass('upload-file-item-success');
    });

    it('should have error class when failed', () => {
      const file = createMockFileState({ status: 'error' });

      render(
        <FilePreviewItem
          file={file}
          onRemove={mockOnRemove}
          onCaptionChange={mockOnCaptionChange}
          onRetry={mockOnRetry}
          isUploading={false}
        />
      );

      const item = screen.getByTestId('upload-file-item-file-123');
      expect(item).toHaveClass('upload-file-item-error');
    });
  });
});
