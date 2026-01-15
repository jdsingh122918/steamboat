import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useParams: () => ({
    tripId: 'trip-123',
  }),
}));

// Mock the fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks
import PollsPage from '../page';

describe('PollsPage', () => {
  const mockPolls = [
    {
      id: 'poll-1',
      question: 'Where should we eat dinner?',
      options: [
        { id: 'opt-1', text: 'Italian', votes: 3 },
        { id: 'opt-2', text: 'Mexican', votes: 2 },
      ],
      totalVotes: 5,
      status: 'open',
      createdBy: 'John Doe',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'poll-2',
      question: 'What time should we leave?',
      options: [
        { id: 'opt-3', text: '8am', votes: 4 },
        { id: 'opt-4', text: '10am', votes: 1 },
      ],
      totalVotes: 5,
      status: 'closed',
      createdBy: 'Jane Doe',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockPolls }),
    });
  });

  describe('rendering', () => {
    it('should render loading state initially', () => {
      render(<PollsPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render polls list', async () => {
      render(<PollsPage />);

      await waitFor(() => {
        expect(screen.getByText(/where should we eat dinner/i)).toBeInTheDocument();
        expect(screen.getByText(/what time should we leave/i)).toBeInTheDocument();
      });
    });

    it('should render empty state when no polls', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      render(<PollsPage />);

      await waitFor(() => {
        expect(screen.getByText(/no polls/i)).toBeInTheDocument();
      });
    });

    it('should display poll count', async () => {
      render(<PollsPage />);

      await waitFor(() => {
        expect(screen.getByText(/2 polls/i)).toBeInTheDocument();
      });
    });
  });

  describe('filtering', () => {
    it('should show all polls by default', async () => {
      render(<PollsPage />);

      await waitFor(() => {
        expect(screen.getByText(/where should we eat dinner/i)).toBeInTheDocument();
        expect(screen.getByText(/what time should we leave/i)).toBeInTheDocument();
      });
    });

    it('should filter by open status', async () => {
      render(<PollsPage />);

      await waitFor(() => {
        expect(screen.getByText(/where should we eat dinner/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByText(/where should we eat dinner/i)).toBeInTheDocument();
        expect(screen.queryByText(/what time should we leave/i)).not.toBeInTheDocument();
      });
    });

    it('should filter by closed status', async () => {
      render(<PollsPage />);

      await waitFor(() => {
        expect(screen.getByText(/what time should we leave/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /closed/i }));

      await waitFor(() => {
        expect(screen.queryByText(/where should we eat dinner/i)).not.toBeInTheDocument();
        expect(screen.getByText(/what time should we leave/i)).toBeInTheDocument();
      });
    });
  });

  describe('admin features', () => {
    it('should show Create Poll button for admin', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/attendees/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { role: 'admin' },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPolls }),
        });
      });

      render(<PollsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create poll/i })).toBeInTheDocument();
      });
    });

    it('should hide Create Poll button for non-admin', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/attendees/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { role: 'member' },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPolls }),
        });
      });

      render(<PollsPage />);

      await waitFor(() => {
        expect(screen.getByText(/where should we eat dinner/i)).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /create poll/i })).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should display error message on fetch failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ success: false, error: 'Server error' }),
      });

      render(<PollsPage />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });
});
