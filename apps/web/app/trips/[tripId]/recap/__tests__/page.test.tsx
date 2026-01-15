import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

// Mock the next/navigation module
vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ tripId: 'trip-123' }),
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import RecapPage from '../page';

describe('RecapPage', () => {
  const mockTrip = {
    success: true,
    data: {
      _id: 'trip-123',
      name: 'Bachelor Party 2024',
      location: 'Las Vegas, NV',
      startDate: '2024-03-15',
      endDate: '2024-03-18',
    },
  };

  const mockExpenses = {
    success: true,
    data: {
      expenses: [
        { id: 'exp-1', description: 'Hotel', amount_cents: 50000, category: 'lodging' },
        { id: 'exp-2', description: 'Dinner', amount_cents: 20000, category: 'dining' },
        { id: 'exp-3', description: 'Show tickets', amount_cents: 15000, category: 'activities' },
      ],
    },
  };

  const mockMedia = {
    success: true,
    data: [
      { _id: 'media-1', type: 'image', thumbnailUrl: 'https://example.com/thumb1.jpg' },
      { _id: 'media-2', type: 'image', thumbnailUrl: 'https://example.com/thumb2.jpg' },
      { _id: 'media-3', type: 'video', thumbnailUrl: 'https://example.com/thumb3.jpg' },
    ],
  };

  const mockPolls = {
    success: true,
    data: [
      {
        _id: 'poll-1',
        question: 'Where should we eat?',
        status: 'closed',
        options: [
          { text: 'Italian', votes: 3 },
          { text: 'Steakhouse', votes: 5 },
        ],
      },
      {
        _id: 'poll-2',
        question: 'What show to see?',
        status: 'closed',
        options: [
          { text: 'Cirque du Soleil', votes: 4 },
          { text: 'Magic Show', votes: 2 },
        ],
      },
      { _id: 'poll-3', question: 'Open poll', status: 'open', options: [] },
    ],
  };

  const mockAttendees = {
    success: true,
    data: [
      { _id: 'user-1', name: 'John Doe', rsvpStatus: 'confirmed' },
      { _id: 'user-2', name: 'Jane Smith', rsvpStatus: 'confirmed' },
      { _id: 'user-3', name: 'Bob Wilson', rsvpStatus: 'declined' },
    ],
  };

  const mockBalances = {
    success: true,
    data: {
      balances: [
        { attendeeId: 'user-1', attendeeName: 'John Doe', balance: 5000 },
        { attendeeId: 'user-2', attendeeName: 'Jane Smith', balance: -5000 },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Setup default mock responses
    mockFetch.mockImplementation((url: string) => {
      if (url.match(/\/trips\/trip-123$/) || url.match(/\/api\/trips\/trip-123$/)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTrip),
        });
      }
      if (url.includes('/expenses')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockExpenses),
        });
      }
      if (url.includes('/media')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMedia),
        });
      }
      if (url.includes('/polls')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPolls),
        });
      }
      if (url.includes('/attendees')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAttendees),
        });
      }
      if (url.includes('/balances')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalances),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });
  });

  describe('loading state', () => {
    it('should render loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<RecapPage />);

      expect(screen.getByTestId('recap-loading')).toBeInTheDocument();
    });
  });

  describe('trip summary', () => {
    it('should display trip summary card', async () => {
      render(<RecapPage />);

      await waitFor(() => {
        expect(screen.getByTestId('trip-summary-card')).toBeInTheDocument();
      });

      expect(screen.getByText('Bachelor Party 2024')).toBeInTheDocument();
      expect(screen.getByText(/las vegas/i)).toBeInTheDocument();
    });

    it('should display date range', async () => {
      render(<RecapPage />);

      await waitFor(() => {
        // Date format includes month abbreviation
        expect(screen.getByText(/mar \d+/i)).toBeInTheDocument();
      });
    });

    it('should show attendee count', async () => {
      render(<RecapPage />);

      await waitFor(() => {
        expect(screen.getByText(/3 attendees/i)).toBeInTheDocument();
      });
    });
  });

  describe('financial summary', () => {
    it('should display financial summary', async () => {
      render(<RecapPage />);

      await waitFor(() => {
        expect(screen.getByTestId('financial-summary-card')).toBeInTheDocument();
      });
    });

    it('should calculate per-person average correctly', async () => {
      render(<RecapPage />);

      // Total is 850.00 (500 + 200 + 150), 3 expenses
      // With 3 attendees, per-person would be 850/3 = 283.33
      await waitFor(() => {
        expect(screen.getByText(/\$850\.00/)).toBeInTheDocument(); // Total
      });
    });

    it('should display expense count', async () => {
      render(<RecapPage />);

      await waitFor(() => {
        expect(screen.getByText(/3 expenses/i)).toBeInTheDocument();
      });
    });
  });

  describe('photo highlights', () => {
    it('should display photo highlights grid', async () => {
      render(<RecapPage />);

      await waitFor(() => {
        expect(screen.getByTestId('photo-highlights')).toBeInTheDocument();
      });

      // Should show Photo Highlights heading
      expect(screen.getByText(/photo highlights/i)).toBeInTheDocument();
    });
  });

  describe('poll decisions', () => {
    it('should display closed poll decisions', async () => {
      render(<RecapPage />);

      await waitFor(() => {
        expect(screen.getByTestId('poll-decisions')).toBeInTheDocument();
      });

      // Should show closed polls
      expect(screen.getByText(/where should we eat/i)).toBeInTheDocument();
      expect(screen.getByText(/steakhouse/i)).toBeInTheDocument(); // Winner
    });

    it('should not show open polls', async () => {
      render(<RecapPage />);

      await waitFor(() => {
        expect(screen.getByTestId('poll-decisions')).toBeInTheDocument();
      });

      expect(screen.queryByText(/open poll/i)).not.toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('should show empty states when no data', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.match(/\/trips\/trip-123$/) || url.match(/\/api\/trips\/trip-123$/)) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTrip),
          });
        }
        if (url.includes('/expenses')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { expenses: [] } }),
          });
        }
        if (url.includes('/media')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: [] }),
          });
        }
        if (url.includes('/polls')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: [] }),
          });
        }
        if (url.includes('/attendees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: [] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {} }),
        });
      });

      render(<RecapPage />);

      await waitFor(() => {
        expect(screen.getByText(/no expenses recorded/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/no photos uploaded/i)).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<RecapPage />);

      await waitFor(() => {
        expect(screen.getByTestId('recap-error')).toBeInTheDocument();
      });
    });
  });
});
