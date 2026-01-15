import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MediaUploadModal } from '../MediaUploadModal';
import type { FileWithState, UseFileUploadReturn } from '../useFileUpload';

// Mock the useFileUpload hook
const mockUseFileUpload: UseFileUploadReturn = {
  files: [] as FileWithState[],
  isDragging: false,
  isUploading: false,
  pendingCount: 0,
  hasFiles: false,
  allComplete: false,
  setIsDragging: vi.fn(),
  addFiles: vi.fn(),
  removeFile: vi.fn(),
  updateCaption: vi.fn(),
  handleUpload: vi.fn(),
  handleRetry: vi.fn(),
  reset: vi.fn(),
  abortUpload: vi.fn(),
};

vi.mock('../useFileUpload', () => ({
  useFileUpload: vi.fn(() => mockUseFileUpload),
}));

// Mock URL.createObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:mock-url'),
});

describe('MediaUploadModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUploaded = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    tripId: 'trip-123',
    onUploaded: mockOnUploaded,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock values
    Object.assign(mockUseFileUpload, {
      files: [],
      isDragging: false,
      isUploading: false,
      pendingCount: 0,
      hasFiles: false,
      allComplete: false,
    });
  });

  describe('rendering', () => {
    it('should render modal when open', () => {
      render(<MediaUploadModal {...defaultProps} />);

      expect(screen.getByTestId('media-upload-modal')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<MediaUploadModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('media-upload-modal')).not.toBeInTheDocument();
    });

    it('should render modal header', () => {
      render(<MediaUploadModal {...defaultProps} />);

      expect(screen.getByText('Upload Photos & Videos')).toBeInTheDocument();
    });

    it('should render upload dropzone', () => {
      render(<MediaUploadModal {...defaultProps} />);

      expect(screen.getByTestId('upload-dropzone')).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      render(<MediaUploadModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render upload button', () => {
      render(<MediaUploadModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    });
  });

  describe('file grid', () => {
    it('should not render file grid when no files', () => {
      render(<MediaUploadModal {...defaultProps} />);

      expect(screen.queryByTestId('upload-file-grid')).not.toBeInTheDocument();
    });

    it('should render file grid when files exist', () => {
      mockUseFileUpload.hasFiles = true;
      mockUseFileUpload.files = [
        {
          id: 'file-1',
          file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
          preview: 'blob:preview-1',
          caption: '',
          status: 'pending' as const,
          progress: 0,
        },
      ];

      render(<MediaUploadModal {...defaultProps} />);

      expect(screen.getByTestId('upload-file-grid')).toBeInTheDocument();
    });

    it('should render FilePreviewItem for each file', () => {
      mockUseFileUpload.hasFiles = true;
      mockUseFileUpload.files = [
        {
          id: 'file-1',
          file: new File(['test'], 'test1.jpg', { type: 'image/jpeg' }),
          preview: 'blob:preview-1',
          caption: '',
          status: 'pending' as const,
          progress: 0,
        },
        {
          id: 'file-2',
          file: new File(['test'], 'test2.jpg', { type: 'image/jpeg' }),
          preview: 'blob:preview-2',
          caption: '',
          status: 'pending' as const,
          progress: 0,
        },
      ];

      render(<MediaUploadModal {...defaultProps} />);

      expect(screen.getByTestId('upload-file-item-file-1')).toBeInTheDocument();
      expect(screen.getByTestId('upload-file-item-file-2')).toBeInTheDocument();
    });
  });

  describe('button states', () => {
    it('should disable upload button when no pending files', () => {
      mockUseFileUpload.pendingCount = 0;

      render(<MediaUploadModal {...defaultProps} />);

      const uploadButton = screen.getByRole('button', { name: /upload/i });
      expect(uploadButton).toBeDisabled();
    });

    it('should enable upload button when files are pending', () => {
      mockUseFileUpload.pendingCount = 2;

      render(<MediaUploadModal {...defaultProps} />);

      const uploadButton = screen.getByRole('button', { name: /upload \(2\)/i });
      expect(uploadButton).not.toBeDisabled();
    });

    it('should show "Uploading..." when uploading', () => {
      mockUseFileUpload.isUploading = true;
      mockUseFileUpload.pendingCount = 1;

      render(<MediaUploadModal {...defaultProps} />);

      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });

    it('should disable cancel button when uploading', () => {
      mockUseFileUpload.isUploading = true;

      render(<MediaUploadModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('should show "Close" instead of "Cancel" when all complete', () => {
      mockUseFileUpload.allComplete = true;

      render(<MediaUploadModal {...defaultProps} />);

      // Use getAllByRole since modal has a close button in header too
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      expect(closeButtons.length).toBeGreaterThanOrEqual(1);
      // The footer button should have text "Close"
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call handleUpload when upload button is clicked', () => {
      mockUseFileUpload.pendingCount = 1;

      render(<MediaUploadModal {...defaultProps} />);

      const uploadButton = screen.getByRole('button', { name: /upload/i });
      fireEvent.click(uploadButton);

      expect(mockUseFileUpload.handleUpload).toHaveBeenCalled();
    });

    it('should call reset and onClose when cancel is clicked', () => {
      render(<MediaUploadModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockUseFileUpload.abortUpload).toHaveBeenCalled();
      expect(mockUseFileUpload.reset).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('dropzone compact mode', () => {
    it('should pass compact=false to dropzone when no files', () => {
      mockUseFileUpload.hasFiles = false;

      render(<MediaUploadModal {...defaultProps} />);

      const dropzone = screen.getByTestId('upload-dropzone');
      expect(dropzone).not.toHaveClass('upload-dropzone-compact');
    });

    it('should pass compact=true to dropzone when files exist', () => {
      mockUseFileUpload.hasFiles = true;
      mockUseFileUpload.files = [
        {
          id: 'file-1',
          file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
          preview: 'blob:preview-1',
          caption: '',
          status: 'pending' as const,
          progress: 0,
        },
      ];

      render(<MediaUploadModal {...defaultProps} />);

      const dropzone = screen.getByTestId('upload-dropzone');
      expect(dropzone).toHaveClass('upload-dropzone-compact');
    });
  });

  describe('upload count display', () => {
    it('should show pending count in button', () => {
      mockUseFileUpload.pendingCount = 5;

      render(<MediaUploadModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /upload \(5\)/i })).toBeInTheDocument();
    });

    it('should not show count when no pending files', () => {
      mockUseFileUpload.pendingCount = 0;

      render(<MediaUploadModal {...defaultProps} />);

      const uploadButton = screen.getByRole('button', { name: /upload/i });
      expect(uploadButton).toHaveTextContent('Upload');
      expect(uploadButton).not.toHaveTextContent('(');
    });
  });
});
