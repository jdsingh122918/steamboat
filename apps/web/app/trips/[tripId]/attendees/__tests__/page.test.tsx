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
const mockAttendees = [
  {
    id: 'att1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'organizer',
    avatarUrl: 'https://example.com/john.jpg',
    paymentHandles: {
      venmo: '@johndoe',
      paypal: 'john@example.com',
    },
    status: 'active',
    joinedAt: '2024-03-01T10:00:00Z',
  },
  {
    id: 'att2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'attendee',
    paymentHandles: {
      venmo: '@janesmith',
    },
    status: 'active',
    joinedAt: '2024-03-05T14:00:00Z',
  },
  {
    id: 'att3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    role: 'attendee',
    paymentHandles: {},
    status: 'active',
    joinedAt: '2024-03-10T09:00:00Z',
  },
];

const mockBalances = {
  balances: [
    { attendeeId: 'att1', balance: 150.00 },
    { attendeeId: 'att2', balance: -75.00 },
    { attendeeId: 'att3', balance: -75.00 },
  ],
};

const mockCurrentUser = { id: 'att1', role: 'organizer' };

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/attendees')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { attendees: mockAttendees } }),
      });
    }
    if (url.includes('/balances')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockBalances }),
      });
    }
    if (url.includes('/me')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockCurrentUser }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

// Import after mocking
import AttendeesPage from '../page';

describe('AttendeesPage', () => {
  describe('rendering', () => {
    it('should render the attendees page', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('attendees-page')).toBeInTheDocument();
      });
    });

    it('should render page header', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByText('Attendees')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<AttendeesPage />);
      expect(screen.getByTestId('attendees-loading')).toBeInTheDocument();
    });

    it('should display attendee count', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByText(/3 attendees/i)).toBeInTheDocument();
      });
    });
  });

  describe('attendee list', () => {
    it('should render all attendees', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });
    });

    it('should show organizer badge', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByText(/organizer/i)).toBeInTheDocument();
      });
    });

    it('should show attendee balances', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByText(/\+\$150\.00/)).toBeInTheDocument();
      });
    });
  });

  describe('payment handles', () => {
    it('should show payment handles when available', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByText('@johndoe')).toBeInTheDocument();
      });
    });

    it('should show Venmo handle', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        const venmoHandle = screen.getByText('@janesmith');
        expect(venmoHandle).toBeInTheDocument();
      });
    });
  });

  describe('invite button', () => {
    it('should render invite button for organizer', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
      });
    });

    it('should open invite modal on click', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /invite/i }));
      await waitFor(() => {
        expect(screen.getByTestId('invite-modal')).toBeInTheDocument();
      });
    });
  });

  describe('attendee details', () => {
    it('should navigate to attendee details on click', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const johnCard = screen.getByText('John Doe').closest('[data-testid="attendee-card"]');
      fireEvent.click(johnCard!);
      expect(mockPush).toHaveBeenCalledWith('/trips/trip123/attendees/att1');
    });
  });

  describe('search', () => {
    it('should render search input', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search attendees/i)).toBeInTheDocument();
      });
    });

    it('should filter attendees by search', async () => {
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('attendees-page')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search attendees/i);
      fireEvent.change(searchInput, { target: { value: 'john' } });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error state on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<AttendeesPage />);
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });
});
