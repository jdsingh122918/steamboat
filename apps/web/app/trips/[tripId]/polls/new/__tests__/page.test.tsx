import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NewPollPage from '../page';

// Mock next/navigation
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ tripId: 'test-trip-id' }),
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: mockBack,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockAttendee = {
  _id: 'attendee-123',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
};

describe('NewPollPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      render(<NewPollPage />);
      expect(screen.getByTestId('new-poll-loading')).toBeInTheDocument();
    });

    it('should render poll creation form for admin', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAttendee }),
      });

      render(<NewPollPage />);

      await waitFor(() => {
        expect(screen.getByTestId('new-poll-page')).toBeInTheDocument();
      });

      expect(screen.getByTestId('poll-creation-form')).toBeInTheDocument();
    });

    it('should render page header with title', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAttendee }),
      });

      render(<NewPollPage />);

      await waitFor(() => {
        // "Create Poll" appears in both header and button - verify at least one exists
        expect(screen.getAllByText('Create Poll').length).toBeGreaterThan(0);
      });
    });
  });

  describe('authorization', () => {
    it('should show unauthorized message for non-admin', async () => {
      const nonAdminAttendee = { ...mockAttendee, role: 'member' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: nonAdminAttendee }),
      });

      render(<NewPollPage />);

      await waitFor(() => {
        expect(screen.getByTestId('new-poll-unauthorized')).toBeInTheDocument();
      });
    });

    it('should show back button for unauthorized users', async () => {
      const nonAdminAttendee = { ...mockAttendee, role: 'member' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: nonAdminAttendee }),
      });

      render(<NewPollPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
      });
    });
  });

  describe('poll creation', () => {
    it('should call API when form is submitted', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { _id: 'new-poll-id', question: 'Test question' },
            }),
        });

      render(<NewPollPage />);

      await waitFor(() => {
        expect(screen.getByTestId('poll-creation-form')).toBeInTheDocument();
      });

      // Fill in the form
      const questionInput = screen.getByLabelText(/question/i);
      fireEvent.change(questionInput, { target: { value: 'Where should we eat?' } });

      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Pizza' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Tacos' } });

      const submitButton = screen.getByRole('button', { name: /create poll/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/trips/test-trip-id/polls',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Where should we eat?'),
          })
        );
      });
    });

    it('should redirect to polls page on successful creation', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { _id: 'new-poll-id', question: 'Test question' },
            }),
        });

      render(<NewPollPage />);

      await waitFor(() => {
        expect(screen.getByTestId('poll-creation-form')).toBeInTheDocument();
      });

      // Fill in the form
      const questionInput = screen.getByLabelText(/question/i);
      fireEvent.change(questionInput, { target: { value: 'Where should we eat?' } });

      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Pizza' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Tacos' } });

      const submitButton = screen.getByRole('button', { name: /create poll/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/trips/test-trip-id/polls');
      });
    });

    it('should show error message on creation failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockAttendee }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Failed to create poll' }),
        });

      render(<NewPollPage />);

      await waitFor(() => {
        expect(screen.getByTestId('poll-creation-form')).toBeInTheDocument();
      });

      // Fill in the form
      const questionInput = screen.getByLabelText(/question/i);
      fireEvent.change(questionInput, { target: { value: 'Where should we eat?' } });

      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Pizza' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Tacos' } });

      const submitButton = screen.getByRole('button', { name: /create poll/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('should navigate back when cancel is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAttendee }),
      });

      render(<NewPollPage />);

      await waitFor(() => {
        expect(screen.getByTestId('poll-creation-form')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should show error when auth check fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to authenticate' }),
      });

      render(<NewPollPage />);

      await waitFor(() => {
        expect(screen.getByTestId('new-poll-error')).toBeInTheDocument();
      });
    });
  });
});
