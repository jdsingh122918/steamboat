import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock useParams and useRouter
const mockParams = { tripId: 'trip123' };
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockParams,
}));

// Mock data
const mockMedia = [
  {
    id: 'med1',
    type: 'image',
    url: 'https://example.com/photo1.jpg',
    thumbnailUrl: 'https://example.com/photo1-thumb.jpg',
    uploadedBy: { id: 'att1', name: 'John Doe' },
    uploadedAt: '2024-04-15T14:30:00Z',
    date: '2024-04-15',
    caption: 'Pool party fun',
  },
  {
    id: 'med2',
    type: 'video',
    url: 'https://example.com/video1.mp4',
    thumbnailUrl: 'https://example.com/video1-thumb.jpg',
    uploadedBy: { id: 'att2', name: 'Jane Smith' },
    uploadedAt: '2024-04-15T18:00:00Z',
    date: '2024-04-15',
    caption: 'Group dinner toast',
  },
  {
    id: 'med3',
    type: 'image',
    url: 'https://example.com/photo2.jpg',
    thumbnailUrl: 'https://example.com/photo2-thumb.jpg',
    uploadedBy: { id: 'att1', name: 'John Doe' },
    uploadedAt: '2024-04-16T10:00:00Z',
    date: '2024-04-16',
  },
];

const mockAttendees = [
  { id: 'att1', name: 'John Doe' },
  { id: 'att2', name: 'Jane Smith' },
];

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/media')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { media: mockMedia } }),
      });
    }
    if (url.includes('/attendees')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { attendees: mockAttendees } }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

// Import after mocking
import GalleryPage from '../page';

describe('GalleryPage', () => {
  describe('rendering', () => {
    it('should render the gallery page', async () => {
      render(<GalleryPage />);
      await waitFor(() => {
        expect(screen.getByTestId('gallery-page')).toBeInTheDocument();
      });
    });

    it('should render page header', async () => {
      render(<GalleryPage />);
      await waitFor(() => {
        expect(screen.getByText('Gallery')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<GalleryPage />);
      expect(screen.getByTestId('gallery-loading')).toBeInTheDocument();
    });
  });

  describe('media grid', () => {
    it('should render media grid', async () => {
      render(<GalleryPage />);
      await waitFor(() => {
        expect(screen.getByTestId('media-grid')).toBeInTheDocument();
      });
    });

    it('should display media items', async () => {
      render(<GalleryPage />);
      await waitFor(() => {
        const mediaCards = screen.getAllByTestId('media-card');
        expect(mediaCards.length).toBe(3);
      });
    });

    it('should show video indicator for videos', async () => {
      render(<GalleryPage />);
      await waitFor(() => {
        expect(screen.getByTestId('video-indicator')).toBeInTheDocument();
      });
    });
  });

  describe('filters', () => {
    it('should render filter by date', async () => {
      render(<GalleryPage />);
      await waitFor(() => {
        expect(screen.getByLabelText(/day/i)).toBeInTheDocument();
      });
    });

    it('should render filter by person', async () => {
      render(<GalleryPage />);
      await waitFor(() => {
        expect(screen.getByLabelText(/person/i)).toBeInTheDocument();
      });
    });

    it('should filter by date', async () => {
      render(<GalleryPage />);
      await waitFor(() => {
        expect(screen.getByTestId('media-grid')).toBeInTheDocument();
      });

      const dateFilter = screen.getByLabelText(/day/i);
      fireEvent.change(dateFilter, { target: { value: '2024-04-16' } });

      await waitFor(() => {
        const mediaCards = screen.getAllByTestId('media-card');
        expect(mediaCards.length).toBe(1);
      });
    });

    it('should filter by person', async () => {
      render(<GalleryPage />);
      await waitFor(() => {
        expect(screen.getByTestId('media-grid')).toBeInTheDocument();
      });

      const personFilter = screen.getByLabelText(/person/i);
      fireEvent.change(personFilter, { target: { value: 'att2' } });

      await waitFor(() => {
        const mediaCards = screen.getAllByTestId('media-card');
        expect(mediaCards.length).toBe(1);
      });
    });
  });

  describe('upload', () => {
    it('should render upload button', async () => {
      render(<GalleryPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
      });
    });

    it('should open upload modal on click', async () => {
      render(<GalleryPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /upload/i }));
      await waitFor(() => {
        expect(screen.getByTestId('media-upload-modal')).toBeInTheDocument();
      });
    });
  });

  describe('media viewer', () => {
    it('should open media viewer on click', async () => {
      render(<GalleryPage />);
      await waitFor(() => {
        const mediaCards = screen.getAllByTestId('media-card');
        expect(mediaCards.length).toBeGreaterThan(0);
      });

      const firstMedia = screen.getAllByTestId('media-card')[0];
      fireEvent.click(firstMedia);

      await waitFor(() => {
        expect(screen.getByTestId('media-viewer')).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('should show empty state when no media', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/media')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { media: [] } }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<GalleryPage />);
      await waitFor(() => {
        expect(screen.getByText(/no photos or videos/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error state on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<GalleryPage />);
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });
});
