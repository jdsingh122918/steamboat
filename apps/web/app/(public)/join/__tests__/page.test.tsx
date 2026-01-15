import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock useRouter and useSearchParams
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Import after mocking
import JoinPage from '../page';

describe('JoinPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('token');
  });

  describe('rendering', () => {
    it('should render the join page', () => {
      render(<JoinPage />);
      expect(screen.getByRole('heading', { name: /join trip/i })).toBeInTheDocument();
    });

    it('should render invitation input when no token in URL', () => {
      render(<JoinPage />);
      expect(screen.getByLabelText(/invitation code/i)).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<JoinPage />);
      expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
    });

    it('should render name input for attendee name', () => {
      render(<JoinPage />);
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    });
  });

  describe('token handling', () => {
    it('should auto-fill invitation code from URL parameter', () => {
      mockSearchParams.set('token', 'abc123');
      render(<JoinPage />);
      const input = screen.getByLabelText(/invitation code/i) as HTMLInputElement;
      expect(input.value).toBe('abc123');
    });
  });

  describe('form validation', () => {
    it('should show error when invitation code is empty', async () => {
      render(<JoinPage />);
      fireEvent.click(screen.getByRole('button', { name: /join/i }));
      await waitFor(() => {
        expect(screen.getByText(/invitation code is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when name is empty', async () => {
      render(<JoinPage />);
      const codeInput = screen.getByLabelText(/invitation code/i);
      fireEvent.change(codeInput, { target: { value: 'abc123' } });
      fireEvent.click(screen.getByRole('button', { name: /join/i }));
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('submission', () => {
    it('should show loading state while submitting', async () => {
      // Mock the API to be slow
      global.fetch = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 1000))
      );

      render(<JoinPage />);
      fireEvent.change(screen.getByLabelText(/invitation code/i), { target: { value: 'abc123' } });
      fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'John Doe' } });
      fireEvent.click(screen.getByRole('button', { name: /join/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /join/i })).toBeDisabled();
      });
    });

    it('should show error on invalid token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid or expired invitation' }),
      });

      render(<JoinPage />);
      fireEvent.change(screen.getByLabelText(/invitation code/i), { target: { value: 'invalid' } });
      fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'John Doe' } });
      fireEvent.click(screen.getByRole('button', { name: /join/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired invitation/i)).toBeInTheDocument();
      });
    });

    it('should redirect to dashboard on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, tripId: 'trip123' }),
      });

      render(<JoinPage />);
      fireEvent.change(screen.getByLabelText(/invitation code/i), { target: { value: 'abc123' } });
      fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'John Doe' } });
      fireEvent.click(screen.getByRole('button', { name: /join/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/trips/trip123/dashboard');
      });
    });
  });

  describe('payment handles', () => {
    it('should render optional payment handle inputs when expanded', () => {
      render(<JoinPage />);
      // Expand the payment handles section
      fireEvent.click(screen.getByRole('button', { name: /add payment info/i }));
      expect(screen.getByLabelText(/venmo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/paypal/i)).toBeInTheDocument();
    });

    it('should show payment handles section as collapsed by default', () => {
      render(<JoinPage />);
      const section = screen.getByTestId('payment-handles-section');
      expect(section).toHaveAttribute('data-expanded', 'false');
    });

    it('should expand payment handles on click', () => {
      render(<JoinPage />);
      fireEvent.click(screen.getByRole('button', { name: /add payment info/i }));
      const section = screen.getByTestId('payment-handles-section');
      expect(section).toHaveAttribute('data-expanded', 'true');
    });
  });
});
