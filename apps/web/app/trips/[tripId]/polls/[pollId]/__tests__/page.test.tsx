import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PollDetailPage from '../page';

// Mock next/navigation
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ tripId: 'test-trip-id', pollId: 'test-poll-id' }),
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: mockBack,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPoll = {
  _id: 'test-poll-id',
  tripId: 'test-trip-id',
  question: 'Where should we go for dinner?',
  options: [
    { id: 'opt-1', text: 'Italian' },
    { id: 'opt-2', text: 'Mexican' },
    { id: 'opt-3', text: 'Thai' },
  ],
  voteCounts: [
    { optionId: 'opt-1', optionText: 'Italian', votes: 3 },
    { optionId: 'opt-2', optionText: 'Mexican', votes: 2 },
    { optionId: 'opt-3', optionText: 'Thai', votes: 1 },
  ],
  votes: [],
  status: 'open',
  myVote: null,
  createdAt: '2026-01-10T00:00:00Z',
};

const mockAttendee = {
  _id: 'attendee-123',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
};

describe('PollDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      render(<PollDetailPage />);
      expect(screen.getByTestId('poll-detail-loading')).toBeInTheDocument();
    });

    it('should render poll question', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPoll }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        // Question appears in both header subtitle and voting card - just verify one exists
        expect(screen.getAllByText('Where should we go for dinner?').length).toBeGreaterThan(0);
      });
    });

    it('should render all poll options', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPoll }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Italian')).toBeInTheDocument();
        expect(screen.getByText('Mexican')).toBeInTheDocument();
        expect(screen.getByText('Thai')).toBeInTheDocument();
      });
    });

    it('should show total vote count', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPoll }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        // Vote count appears in multiple places - just verify one exists
        expect(screen.getAllByText(/6 votes/i).length).toBeGreaterThan(0);
      });
    });

    it('should show poll status', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPoll }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        // Status appears in both voting card and meta section - just verify one exists
        expect(screen.getAllByText(/open/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('voting', () => {
    it('should call vote API when option is clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPoll }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { ...mockPoll, myVote: { optionId: 'opt-1' } },
            }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('poll-detail-page')).toBeInTheDocument();
      });

      const italianOption = screen.getByTestId('poll-option-opt-1');
      fireEvent.click(italianOption);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/trips/test-trip-id/polls/test-poll-id/vote',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('opt-1'),
          })
        );
      });
    });

    it('should highlight user vote after voting', async () => {
      const pollWithVote = {
        ...mockPoll,
        myVote: { optionId: 'opt-2' },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: pollWithVote }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        const mexicanOption = screen.getByTestId('poll-option-opt-2');
        expect(mexicanOption).toHaveClass('selected');
      });
    });

    it('should disable voting on closed polls', async () => {
      const closedPoll = { ...mockPoll, status: 'closed' };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: closedPoll }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        const option = screen.getByTestId('poll-option-opt-1');
        expect(option).toHaveAttribute('aria-disabled', 'true');
      });
    });
  });

  describe('admin actions', () => {
    it('should show admin actions for admin users', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPoll }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('poll-admin-actions')).toBeInTheDocument();
      });
    });

    it('should hide admin actions for non-admin users', async () => {
      const nonAdminAttendee = { ...mockAttendee, role: 'member' };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPoll }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: nonAdminAttendee }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('poll-detail-page')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('poll-admin-actions')).not.toBeInTheDocument();
    });

    it('should call close API when close button is clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPoll }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { ...mockPoll, status: 'closed' },
            }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('poll-admin-actions')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close poll/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/trips/test-trip-id/polls/test-poll-id/close',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('error handling', () => {
    it('should show error when poll not found', async () => {
      // Need to mock both fetch calls (poll and attendee)
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ success: false, error: 'Poll not found' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('poll-detail-error')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      // Need to mock both fetch calls (poll and attendee)
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ success: false, error: 'Failed to load poll' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('should navigate back when back button is clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPoll }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        });

      render(<PollDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('poll-detail-page')).toBeInTheDocument();
      });

      const backButton = screen.getByLabelText(/go back/i);
      fireEvent.click(backButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });
});
