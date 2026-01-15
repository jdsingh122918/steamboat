import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock useParams
const mockParams = { tripId: 'trip123' };

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useParams: () => mockParams,
}));

// Mock fetch
const mockTripData = {
  id: 'trip123',
  name: 'Bachelor Party Vegas',
  startDate: '2024-04-15',
  endDate: '2024-04-18',
  attendees: [
    { id: 'att1', name: 'John Doe', role: 'organizer' },
    { id: 'att2', name: 'Jane Smith', role: 'attendee' },
    { id: 'att3', name: 'Bob Wilson', role: 'attendee' },
  ],
};

const mockBalances = {
  balances: [
    { attendeeId: 'att1', balance: 150.00 },
    { attendeeId: 'att2', balance: -75.00 },
    { attendeeId: 'att3', balance: -75.00 },
  ],
  summary: {
    totalExpenses: 300.00,
    expenseCount: 5,
  },
};

const mockActivities = {
  activities: [
    {
      id: 'act1',
      title: 'Pool Party',
      date: '2024-04-16',
      time: '2:00 PM',
      rsvpCount: { yes: 3, no: 0, maybe: 0 },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockImplementation((url: string) => {
    // Order matters - more specific patterns first
    if (url.includes('/expenses/balances')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockBalances }),
      });
    }
    if (url.includes('/activities')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockActivities }),
      });
    }
    if (url.includes('/api/trips/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTripData }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

// Import after mocking
import DashboardPage from '../page';

describe('DashboardPage', () => {
  describe('rendering', () => {
    it('should render the dashboard', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    it('should render trip name', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Bachelor Party Vegas')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<DashboardPage />);
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });
  });

  describe('balance overview', () => {
    it('should render balance summary card', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByTestId('balance-overview')).toBeInTheDocument();
      });
    });

    it('should display total expenses', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('$300.00')).toBeInTheDocument();
      });
    });

    it('should display expense count', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('5 expenses')).toBeInTheDocument();
      });
    });
  });

  describe('attendees section', () => {
    it('should render attendee list', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByTestId('attendees-section')).toBeInTheDocument();
      });
    });

    it('should display attendee count', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText(/3 attendees/i)).toBeInTheDocument();
      });
    });

    it('should show attendee balances', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText(/\+\$150\.00/)).toBeInTheDocument();
        expect(screen.getAllByText(/-\$75\.00/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('upcoming activities', () => {
    it('should render activities section', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByTestId('activities-section')).toBeInTheDocument();
      });
    });

    it('should display upcoming activity', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Pool Party')).toBeInTheDocument();
      });
    });
  });

  describe('quick actions', () => {
    it('should render quick action buttons', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add activity/i })).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error state on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });
});
