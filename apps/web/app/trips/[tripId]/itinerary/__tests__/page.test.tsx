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
const mockTrip = {
  id: 'trip123',
  name: 'Bachelor Party Vegas',
  startDate: '2024-04-15',
  endDate: '2024-04-18',
};

const mockActivities = [
  {
    id: 'act1',
    title: 'Pool Party',
    description: 'Pool party at the hotel',
    date: '2024-04-15',
    time: '14:00',
    endTime: '17:00',
    location: 'Hotel Pool',
    rsvpCount: { yes: 8, no: 1, maybe: 2 },
    linkedExpenseId: 'exp1',
  },
  {
    id: 'act2',
    title: 'Dinner at Steakhouse',
    description: 'Group dinner at famous steakhouse',
    date: '2024-04-15',
    time: '19:00',
    endTime: '21:00',
    location: 'Prime Steakhouse',
    rsvpCount: { yes: 10, no: 0, maybe: 1 },
  },
  {
    id: 'act3',
    title: 'Ski Day',
    description: 'Hit the slopes',
    date: '2024-04-16',
    time: '09:00',
    endTime: '16:00',
    location: 'Steamboat Resort',
    rsvpCount: { yes: 7, no: 2, maybe: 2 },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/activities')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { activities: mockActivities } }),
      });
    }
    if (url.includes('/api/trips/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTrip }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

// Import after mocking
import ItineraryPage from '../page';

describe('ItineraryPage', () => {
  describe('rendering', () => {
    it('should render the itinerary page', async () => {
      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByTestId('itinerary-page')).toBeInTheDocument();
      });
    });

    it('should render page header', async () => {
      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByText('Itinerary')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<ItineraryPage />);
      expect(screen.getByTestId('itinerary-loading')).toBeInTheDocument();
    });
  });

  describe('day-by-day view', () => {
    it('should render day sections', async () => {
      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByText(/April 15/i)).toBeInTheDocument();
        expect(screen.getByText(/April 16/i)).toBeInTheDocument();
      });
    });

    it('should group activities by date', async () => {
      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByText('Pool Party')).toBeInTheDocument();
        expect(screen.getByText('Dinner at Steakhouse')).toBeInTheDocument();
        expect(screen.getByText('Ski Day')).toBeInTheDocument();
      });
    });

    it('should show activity times', async () => {
      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByText(/2:00 PM/i)).toBeInTheDocument();
        expect(screen.getByText(/7:00 PM/i)).toBeInTheDocument();
      });
    });

    it('should show activity locations', async () => {
      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByText('Hotel Pool')).toBeInTheDocument();
        expect(screen.getByText('Prime Steakhouse')).toBeInTheDocument();
      });
    });
  });

  describe('activity details', () => {
    it('should show RSVP counts', async () => {
      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByText(/8.*yes/i)).toBeInTheDocument();
      });
    });

    it('should navigate to activity details on click', async () => {
      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByText('Pool Party')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Pool Party'));
      expect(mockPush).toHaveBeenCalledWith('/trips/trip123/activities/act1');
    });

    it('should show linked expense indicator', async () => {
      render(<ItineraryPage />);
      await waitFor(() => {
        const poolPartyCard = screen.getByText('Pool Party').closest('[data-testid="activity-card"]');
        expect(poolPartyCard).toHaveAttribute('data-has-expense', 'true');
      });
    });
  });

  describe('add activity', () => {
    it('should render add activity button', async () => {
      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add activity/i })).toBeInTheDocument();
      });
    });

    it('should navigate to add activity page on click', async () => {
      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add activity/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /add activity/i }));
      expect(mockPush).toHaveBeenCalledWith('/trips/trip123/activities/new');
    });
  });

  describe('empty state', () => {
    it('should show empty state when no activities', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/activities')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { activities: [] } }),
          });
        }
        if (url.includes('/api/trips/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockTrip }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByText(/no activities/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error state on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<ItineraryPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });
});
