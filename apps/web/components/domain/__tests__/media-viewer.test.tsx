import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MediaViewer } from '../media-viewer';

describe('MediaViewer', () => {
  const mockOnClose = vi.fn();
  const mockOnDownload = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnNavigate = vi.fn();

  const defaultMedia = [
    {
      id: 'media-1',
      url: 'https://example.com/photo1.jpg',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      type: 'image' as const,
      caption: 'Beach sunset',
      uploadedBy: { id: 'user-1', name: 'John Doe' },
      uploadedAt: new Date('2024-01-15T10:30:00Z'),
      tags: ['sunset', 'beach'],
    },
    {
      id: 'media-2',
      url: 'https://example.com/photo2.jpg',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      type: 'image' as const,
      caption: 'Group photo',
      uploadedBy: { id: 'user-2', name: 'Jane Smith' },
      uploadedAt: new Date('2024-01-16T14:00:00Z'),
      tags: ['group'],
    },
    {
      id: 'media-3',
      url: 'https://example.com/video.mp4',
      thumbnailUrl: 'https://example.com/vidthumb.jpg',
      type: 'video' as const,
      caption: 'Fun moment',
      uploadedBy: { id: 'user-1', name: 'John Doe' },
      uploadedAt: new Date('2024-01-17T18:00:00Z'),
      tags: [],
    },
  ];

  const defaultProps = {
    media: defaultMedia,
    initialIndex: 0,
    isOpen: true,
    onClose: mockOnClose,
    onDownload: mockOnDownload,
    onDelete: mockOnDelete,
    onNavigate: mockOnNavigate,
    canDelete: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnDownload.mockResolvedValue(undefined);
    mockOnDelete.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render viewer when open', () => {
      render(<MediaViewer {...defaultProps} />);

      expect(screen.getByTestId('media-viewer')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<MediaViewer {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('media-viewer')).not.toBeInTheDocument();
    });

    it('should render current image', () => {
      render(<MediaViewer {...defaultProps} />);

      const img = screen.getByAltText(/beach sunset/i);
      expect(img).toHaveAttribute('src', 'https://example.com/photo1.jpg');
    });

    it('should render caption', () => {
      render(<MediaViewer {...defaultProps} />);

      expect(screen.getByText('Beach sunset')).toBeInTheDocument();
    });

    it('should render uploader name', () => {
      render(<MediaViewer {...defaultProps} />);

      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    it('should render upload date', () => {
      render(<MediaViewer {...defaultProps} />);

      expect(screen.getByText(/jan.*15.*2024/i)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<MediaViewer {...defaultProps} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should render navigation indicator', () => {
      render(<MediaViewer {...defaultProps} />);

      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should render next button when not at end', () => {
      render(<MediaViewer {...defaultProps} />);

      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('should render previous button when not at start', () => {
      render(<MediaViewer {...defaultProps} initialIndex={1} />);

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    });

    it('should hide previous button at start', () => {
      render(<MediaViewer {...defaultProps} initialIndex={0} />);

      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    });

    it('should hide next button at end', () => {
      render(<MediaViewer {...defaultProps} initialIndex={2} />);

      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('should navigate to next on button click', () => {
      render(<MediaViewer {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      expect(mockOnNavigate).toHaveBeenCalledWith(1);
    });

    it('should navigate to previous on button click', () => {
      render(<MediaViewer {...defaultProps} initialIndex={1} />);

      fireEvent.click(screen.getByRole('button', { name: /previous/i }));

      expect(mockOnNavigate).toHaveBeenCalledWith(0);
    });

    it('should navigate with arrow keys', () => {
      render(<MediaViewer {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'ArrowRight' });

      expect(mockOnNavigate).toHaveBeenCalledWith(1);
    });

    it('should update display on index change', () => {
      render(<MediaViewer {...defaultProps} initialIndex={1} />);

      expect(screen.getByText('Group photo')).toBeInTheDocument();
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });
  });

  describe('media types', () => {
    it('should render image for image type', () => {
      render(<MediaViewer {...defaultProps} />);

      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should render video for video type', () => {
      render(<MediaViewer {...defaultProps} initialIndex={2} />);

      expect(screen.getByTestId('video-player')).toBeInTheDocument();
    });

    it('should show video controls', () => {
      render(<MediaViewer {...defaultProps} initialIndex={2} />);

      const video = screen.getByTestId('video-player');
      expect(video).toHaveAttribute('controls');
    });
  });

  describe('actions', () => {
    it('should render download button', () => {
      render(<MediaViewer {...defaultProps} />);

      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    });

    it('should call onDownload when clicked', async () => {
      render(<MediaViewer {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /download/i }));

      await waitFor(() => {
        expect(mockOnDownload).toHaveBeenCalledWith('media-1');
      });
    });

    it('should render delete button when canDelete', () => {
      render(<MediaViewer {...defaultProps} />);

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should hide delete button when canDelete is false', () => {
      render(<MediaViewer {...defaultProps} canDelete={false} />);

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('should show delete confirmation on click', () => {
      render(<MediaViewer {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      expect(screen.getByText(/confirm delete/i)).toBeInTheDocument();
    });

    it('should call onDelete when confirmed', async () => {
      render(<MediaViewer {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      fireEvent.click(screen.getByRole('button', { name: /yes.*delete/i }));

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith('media-1');
      });
    });

    it('should cancel delete on cancel click', () => {
      render(<MediaViewer {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByText(/confirm delete/i)).not.toBeInTheDocument();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe('close behavior', () => {
    it('should call onClose when close button clicked', () => {
      render(<MediaViewer {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose on escape key', () => {
      render(<MediaViewer {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking overlay', () => {
      render(<MediaViewer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('viewer-overlay'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('tags', () => {
    it('should display media tags', () => {
      render(<MediaViewer {...defaultProps} />);

      expect(screen.getByText('sunset')).toBeInTheDocument();
      expect(screen.getByText('beach')).toBeInTheDocument();
    });

    it('should hide tags section when no tags', () => {
      render(<MediaViewer {...defaultProps} initialIndex={2} />);

      expect(screen.queryByTestId('media-tags')).not.toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('should show loading state for image', () => {
      render(<MediaViewer {...defaultProps} />);

      expect(screen.getByTestId('media-loading')).toBeInTheDocument();
    });

    it('should hide loading after image loads', () => {
      render(<MediaViewer {...defaultProps} />);

      const img = screen.getByRole('img');
      fireEvent.load(img);

      expect(screen.queryByTestId('media-loading')).not.toBeInTheDocument();
    });
  });
});
