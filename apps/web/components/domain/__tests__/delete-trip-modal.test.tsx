import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { DeleteTripModal } from '../delete-trip-modal';

describe('DeleteTripModal', () => {
  const mockOnClose = vi.fn();
  const mockOnDeleted = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    tripName: 'Vegas Trip 2024',
    tripId: 'trip-123',
    onDeleted: mockOnDeleted,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('should render modal when open', () => {
      render(<DeleteTripModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<DeleteTripModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display modal title', () => {
      render(<DeleteTripModal {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /delete trip/i })).toBeInTheDocument();
    });

    it('should display trip name in warning', () => {
      render(<DeleteTripModal {...defaultProps} />);

      expect(screen.getByText(/vegas trip 2024/i)).toBeInTheDocument();
    });

    it('should display warning about data deletion', () => {
      render(<DeleteTripModal {...defaultProps} />);

      expect(screen.getByText(/permanently remove all associated data/i)).toBeInTheDocument();
    });

    it('should list data types that will be deleted', () => {
      render(<DeleteTripModal {...defaultProps} />);

      expect(screen.getByText(/expenses and financial records/i)).toBeInTheDocument();
      expect(screen.getByText(/activities and rsvps/i)).toBeInTheDocument();
      expect(screen.getByText(/photos and media/i)).toBeInTheDocument();
      expect(screen.getByText(/polls and votes/i)).toBeInTheDocument();
      expect(screen.getByText(/attendee data/i)).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      render(<DeleteTripModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render continue button on first step', () => {
      render(<DeleteTripModal {...defaultProps} />);

      expect(screen.getByTestId('proceed-button')).toBeInTheDocument();
    });
  });

  describe('confirmation flow', () => {
    describe('step 1: warning confirmation', () => {
      it('should show checkbox for irreversible confirmation', () => {
        render(<DeleteTripModal {...defaultProps} />);

        expect(screen.getByTestId('confirm-checkbox')).toBeInTheDocument();
        expect(screen.getByText(/understand this action is irreversible/i)).toBeInTheDocument();
      });

      it('should disable continue button when checkbox not checked', () => {
        render(<DeleteTripModal {...defaultProps} />);

        expect(screen.getByTestId('proceed-button')).toBeDisabled();
      });

      it('should enable continue button when checkbox is checked', () => {
        render(<DeleteTripModal {...defaultProps} />);

        fireEvent.click(screen.getByTestId('confirm-checkbox'));

        expect(screen.getByTestId('proceed-button')).not.toBeDisabled();
      });

      it('should proceed to step 2 when continue is clicked', () => {
        render(<DeleteTripModal {...defaultProps} />);

        fireEvent.click(screen.getByTestId('confirm-checkbox'));
        fireEvent.click(screen.getByTestId('proceed-button'));

        expect(screen.getByTestId('confirm-name-input')).toBeInTheDocument();
        expect(screen.getByTestId('delete-button')).toBeInTheDocument();
      });
    });

    describe('step 2: name confirmation', () => {
      const proceedToStep2 = () => {
        fireEvent.click(screen.getByTestId('confirm-checkbox'));
        fireEvent.click(screen.getByTestId('proceed-button'));
      };

      it('should display trip name to type', () => {
        render(<DeleteTripModal {...defaultProps} />);
        proceedToStep2();

        expect(screen.getByText(/type the trip name/i)).toBeInTheDocument();
        expect(screen.getByText('Vegas Trip 2024')).toBeInTheDocument();
      });

      it('should disable delete button when name does not match', () => {
        render(<DeleteTripModal {...defaultProps} />);
        proceedToStep2();

        const input = screen.getByTestId('confirm-name-input');
        fireEvent.change(input, { target: { value: 'wrong name' } });

        expect(screen.getByTestId('delete-button')).toBeDisabled();
      });

      it('should enable delete button when name matches exactly', () => {
        render(<DeleteTripModal {...defaultProps} />);
        proceedToStep2();

        const input = screen.getByTestId('confirm-name-input');
        fireEvent.change(input, { target: { value: 'Vegas Trip 2024' } });

        expect(screen.getByTestId('delete-button')).not.toBeDisabled();
      });

      it('should be case sensitive for name match', () => {
        render(<DeleteTripModal {...defaultProps} />);
        proceedToStep2();

        const input = screen.getByTestId('confirm-name-input');
        fireEvent.change(input, { target: { value: 'vegas trip 2024' } });

        expect(screen.getByTestId('delete-button')).toBeDisabled();
      });
    });
  });

  describe('delete action', () => {
    const proceedToDelete = () => {
      fireEvent.click(screen.getByTestId('confirm-checkbox'));
      fireEvent.click(screen.getByTestId('proceed-button'));
      const input = screen.getByTestId('confirm-name-input');
      fireEvent.change(input, { target: { value: 'Vegas Trip 2024' } });
    };

    it('should call DELETE API on confirm', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<DeleteTripModal {...defaultProps} />);
      proceedToDelete();
      fireEvent.click(screen.getByTestId('delete-button'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/trips/trip-123', {
          method: 'DELETE',
        });
      });
    });

    it('should call onDeleted on successful deletion', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<DeleteTripModal {...defaultProps} />);
      proceedToDelete();
      fireEvent.click(screen.getByTestId('delete-button'));

      await waitFor(() => {
        expect(mockOnDeleted).toHaveBeenCalled();
      });
    });

    it('should show loading state while deleting', async () => {
      let resolvePromise: (value: { ok: boolean; json: () => Promise<object> }) => void;
      const fetchPromise = new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
        resolvePromise = resolve;
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(fetchPromise);

      render(<DeleteTripModal {...defaultProps} />);
      proceedToDelete();
      fireEvent.click(screen.getByTestId('delete-button'));

      await waitFor(() => {
        expect(screen.getByText(/deleting/i)).toBeInTheDocument();
      });

      // Complete the request to clean up
      await act(async () => {
        resolvePromise!({ ok: true, json: () => Promise.resolve({}) });
        await fetchPromise;
      });
    });

    it('should disable buttons while deleting', async () => {
      let resolvePromise: (value: { ok: boolean; json: () => Promise<object> }) => void;
      const fetchPromise = new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
        resolvePromise = resolve;
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(fetchPromise);

      render(<DeleteTripModal {...defaultProps} />);
      proceedToDelete();
      fireEvent.click(screen.getByTestId('delete-button'));

      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeDisabled();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      });

      // Complete the request to clean up
      await act(async () => {
        resolvePromise!({ ok: true, json: () => Promise.resolve({}) });
        await fetchPromise;
      });
    });

    it('should disable input while deleting', async () => {
      let resolvePromise: (value: { ok: boolean; json: () => Promise<object> }) => void;
      const fetchPromise = new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
        resolvePromise = resolve;
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(fetchPromise);

      render(<DeleteTripModal {...defaultProps} />);
      proceedToDelete();
      fireEvent.click(screen.getByTestId('delete-button'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-name-input')).toBeDisabled();
      });

      // Complete the request to clean up
      await act(async () => {
        resolvePromise!({ ok: true, json: () => Promise.resolve({}) });
        await fetchPromise;
      });
    });
  });

  describe('error handling', () => {
    const proceedToDelete = () => {
      fireEvent.click(screen.getByTestId('confirm-checkbox'));
      fireEvent.click(screen.getByTestId('proceed-button'));
      const input = screen.getByTestId('confirm-name-input');
      fireEvent.change(input, { target: { value: 'Vegas Trip 2024' } });
    };

    it('should show error on API failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Permission denied' }),
      });

      render(<DeleteTripModal {...defaultProps} />);
      proceedToDelete();
      fireEvent.click(screen.getByTestId('delete-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/permission denied/i);
      });
    });

    it('should show generic error on network failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(<DeleteTripModal {...defaultProps} />);
      proceedToDelete();
      fireEvent.click(screen.getByTestId('delete-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/network error/i);
      });
    });

    it('should not call onDeleted on error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      });

      render(<DeleteTripModal {...defaultProps} />);
      proceedToDelete();
      fireEvent.click(screen.getByTestId('delete-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(mockOnDeleted).not.toHaveBeenCalled();
    });

    it('should re-enable delete button after error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      });

      render(<DeleteTripModal {...defaultProps} />);
      proceedToDelete();
      fireEvent.click(screen.getByTestId('delete-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.getByTestId('delete-button')).not.toBeDisabled();
    });
  });

  describe('close action', () => {
    it('should call onClose when cancel clicked', () => {
      render(<DeleteTripModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking outside modal', () => {
      render(<DeleteTripModal {...defaultProps} />);

      fireEvent.click(screen.getByTestId('modal-overlay'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when clicking inside modal', () => {
      render(<DeleteTripModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('dialog'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not close while deleting', async () => {
      let resolvePromise: (value: { ok: boolean; json: () => Promise<object> }) => void;
      const fetchPromise = new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
        resolvePromise = resolve;
      });
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(fetchPromise);

      render(<DeleteTripModal {...defaultProps} />);

      fireEvent.click(screen.getByTestId('confirm-checkbox'));
      fireEvent.click(screen.getByTestId('proceed-button'));
      const input = screen.getByTestId('confirm-name-input');
      fireEvent.change(input, { target: { value: 'Vegas Trip 2024' } });
      fireEvent.click(screen.getByTestId('delete-button'));

      await waitFor(() => {
        expect(screen.getByText(/deleting/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('modal-overlay'));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).not.toHaveBeenCalled();

      // Complete the request to clean up
      await act(async () => {
        resolvePromise!({ ok: true, json: () => Promise.resolve({}) });
        await fetchPromise;
      });
    });

    it('should reset state when closed and reopened', () => {
      const { rerender } = render(<DeleteTripModal {...defaultProps} />);

      // Progress through step 1
      fireEvent.click(screen.getByTestId('confirm-checkbox'));
      fireEvent.click(screen.getByTestId('proceed-button'));

      // Verify we're on step 2
      expect(screen.getByTestId('confirm-name-input')).toBeInTheDocument();

      // Close and reopen
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      rerender(<DeleteTripModal {...defaultProps} isOpen={false} />);
      rerender(<DeleteTripModal {...defaultProps} isOpen={true} />);

      // Should be back on step 1
      expect(screen.getByTestId('confirm-checkbox')).toBeInTheDocument();
      expect(screen.queryByTestId('confirm-name-input')).not.toBeInTheDocument();
    });
  });
});
