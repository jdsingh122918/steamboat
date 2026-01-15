import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProfilePage from '../page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ tripId: 'test-trip-id' }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockAttendee = {
  _id: 'attendee-123',
  name: 'John Doe',
  email: 'john@example.com',
  paymentHandles: {
    venmo: '@johndoe',
    paypal: 'john@example.com',
  },
};

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading spinner initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      render(<ProfilePage />);
      expect(screen.getByTestId('profile-loading')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to load' }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-error')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to load' }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('profile display', () => {
    it('should display attendee name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAttendee }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should display attendee email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAttendee }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('should display payment profile form', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAttendee }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-profile-form')).toBeInTheDocument();
      });
    });

    it('should pre-fill payment handles in form', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAttendee }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('@johndoe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('updating payment handles', () => {
    it('should call API when saving payment handles', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                ...mockAttendee,
                paymentHandles: { venmo: '@johndoe-updated' },
              },
            }),
        });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });

      const venmoInput = screen.getByLabelText(/venmo/i);
      fireEvent.change(venmoInput, { target: { value: '@johndoe-updated' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/trips/test-trip-id/attendees/${mockAttendee._id}`,
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('paymentHandles'),
          })
        );
      });
    });

    it('should show success message after successful save', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error message when save fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Failed to save' }),
        });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('not found state', () => {
    it('should show not found message when attendee is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-not-found')).toBeInTheDocument();
      });
    });
  });
});
