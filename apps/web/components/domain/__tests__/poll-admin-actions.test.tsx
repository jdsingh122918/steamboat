import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PollAdminActions } from '../poll-admin-actions';

describe('PollAdminActions', () => {
  const mockOnClose = vi.fn();
  const mockOnDelete = vi.fn();

  const defaultProps = {
    pollId: 'poll-123',
    status: 'open' as const,
    isAdmin: true,
    onClose: mockOnClose,
    onDelete: mockOnDelete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnClose.mockResolvedValue(undefined);
    mockOnDelete.mockResolvedValue(undefined);
  });

  describe('close button', () => {
    it('should show close button for open polls', () => {
      render(<PollAdminActions {...defaultProps} />);

      expect(screen.getByRole('button', { name: /close poll/i })).toBeInTheDocument();
    });

    it('should hide close button for closed polls', () => {
      render(<PollAdminActions {...defaultProps} status="closed" />);

      expect(screen.queryByRole('button', { name: /close poll/i })).not.toBeInTheDocument();
    });

    it('should call onClose when clicked', async () => {
      render(<PollAdminActions {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /close poll/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledWith('poll-123');
      });
    });

    it('should show loading state while closing', async () => {
      mockOnClose.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<PollAdminActions {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /close poll/i }));

      await waitFor(() => {
        expect(screen.getByText(/closing/i)).toBeInTheDocument();
      });
    });

    it('should show error on failure', async () => {
      mockOnClose.mockRejectedValue(new Error('Failed to close poll'));

      render(<PollAdminActions {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /close poll/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('delete button', () => {
    it('should show delete button', () => {
      render(<PollAdminActions {...defaultProps} />);

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should show confirmation dialog before deleting', () => {
      render(<PollAdminActions {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it('should call onDelete when confirmed', async () => {
      render(<PollAdminActions {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      fireEvent.click(screen.getByRole('button', { name: /yes.*delete/i }));

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith('poll-123');
      });
    });

    it('should close dialog when cancelled', () => {
      render(<PollAdminActions {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      fireEvent.click(screen.getByRole('button', { name: /no/i }));

      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    });
  });

  describe('non-admin', () => {
    it('should hide all actions for non-admin', () => {
      render(<PollAdminActions {...defaultProps} isAdmin={false} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
