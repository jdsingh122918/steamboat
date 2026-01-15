import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentStatusActions } from '../payment-status-actions';
import type { PaymentStatus } from '@/lib/db/models/payment';

describe('PaymentStatusActions', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    paymentId: 'payment-123',
    status: 'pending' as PaymentStatus,
    isReceiver: true,
    isSender: false,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('receiver actions', () => {
    it('should show "Mark as Received" button for pending payments', () => {
      render(<PaymentStatusActions {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /mark as received/i })
      ).toBeInTheDocument();
    });

    it('should call confirm API on click', async () => {
      mockOnConfirm.mockResolvedValue(undefined);
      render(<PaymentStatusActions {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /mark as received/i }));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('payment-123');
      });
    });

    it('should show loading text while confirming', async () => {
      // Use act to properly handle the async state updates
      mockOnConfirm.mockResolvedValue(undefined);
      render(<PaymentStatusActions {...defaultProps} />);

      const button = screen.getByRole('button', { name: /mark as received/i });
      expect(button).not.toBeDisabled();

      fireEvent.click(button);

      // After click completes, should show success
      await waitFor(() => {
        expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
      });
    });

    it('should show success state after confirmation', async () => {
      mockOnConfirm.mockResolvedValue(undefined);
      render(<PaymentStatusActions {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /mark as received/i }));

      await waitFor(() => {
        expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
      });
    });

    it('should show error message on failure', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Failed to confirm'));
      render(<PaymentStatusActions {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /mark as received/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });

    it('should not show confirm button when not receiver', () => {
      render(
        <PaymentStatusActions {...defaultProps} isReceiver={false} isSender={true} />
      );

      expect(
        screen.queryByRole('button', { name: /mark as received/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('sender actions', () => {
    it('should show "Cancel Payment" button for sender', () => {
      render(
        <PaymentStatusActions {...defaultProps} isReceiver={false} isSender={true} />
      );

      expect(
        screen.getByRole('button', { name: /cancel payment/i })
      ).toBeInTheDocument();
    });

    it('should show confirmation dialog before canceling', () => {
      render(
        <PaymentStatusActions {...defaultProps} isReceiver={false} isSender={true} />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel payment/i }));

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /yes.*cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /no/i })).toBeInTheDocument();
    });

    it('should call onCancel when confirmed', async () => {
      mockOnCancel.mockResolvedValue(undefined);
      render(
        <PaymentStatusActions {...defaultProps} isReceiver={false} isSender={true} />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel payment/i }));
      fireEvent.click(screen.getByRole('button', { name: /yes.*cancel/i }));

      await waitFor(() => {
        expect(mockOnCancel).toHaveBeenCalledWith('payment-123');
      });
    });

    it('should close dialog when "No" clicked', () => {
      render(
        <PaymentStatusActions {...defaultProps} isReceiver={false} isSender={true} />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel payment/i }));
      fireEvent.click(screen.getByRole('button', { name: /no/i }));

      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    });

    it('should disable cancel for confirmed payments', () => {
      render(
        <PaymentStatusActions
          {...defaultProps}
          status="confirmed"
          isReceiver={false}
          isSender={true}
        />
      );

      expect(
        screen.queryByRole('button', { name: /cancel payment/i })
      ).not.toBeInTheDocument();
    });

    it('should not show cancel button when not sender', () => {
      render(<PaymentStatusActions {...defaultProps} isReceiver={true} isSender={false} />);

      expect(
        screen.queryByRole('button', { name: /cancel payment/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('status display', () => {
    it('should show "Pending" badge for pending payments', () => {
      render(<PaymentStatusActions {...defaultProps} />);

      expect(screen.getByTestId('payment-status-badge')).toHaveTextContent(/pending/i);
    });

    it('should show "Confirmed" badge for confirmed payments', () => {
      render(<PaymentStatusActions {...defaultProps} status="confirmed" />);

      expect(screen.getByTestId('payment-status-badge')).toHaveTextContent(/confirmed/i);
    });

    it('should show "Cancelled" badge for cancelled payments', () => {
      render(<PaymentStatusActions {...defaultProps} status="cancelled" />);

      expect(screen.getByTestId('payment-status-badge')).toHaveTextContent(/cancelled/i);
    });

    it('should apply correct class for pending status', () => {
      render(<PaymentStatusActions {...defaultProps} status="pending" />);

      expect(screen.getByTestId('payment-status-badge')).toHaveClass('status-pending');
    });

    it('should apply correct class for confirmed status', () => {
      render(<PaymentStatusActions {...defaultProps} status="confirmed" />);

      expect(screen.getByTestId('payment-status-badge')).toHaveClass('status-confirmed');
    });

    it('should apply correct class for cancelled status', () => {
      render(<PaymentStatusActions {...defaultProps} status="cancelled" />);

      expect(screen.getByTestId('payment-status-badge')).toHaveClass('status-cancelled');
    });
  });

  describe('no actions available', () => {
    it('should only show status when confirmed and user is receiver', () => {
      render(
        <PaymentStatusActions {...defaultProps} status="confirmed" isReceiver={true} />
      );

      expect(screen.getByTestId('payment-status-badge')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should only show status when cancelled', () => {
      render(<PaymentStatusActions {...defaultProps} status="cancelled" />);

      expect(screen.getByTestId('payment-status-badge')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('should prevent multiple confirm clicks', async () => {
      mockOnConfirm.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<PaymentStatusActions {...defaultProps} />);

      const button = screen.getByRole('button', { name: /mark as received/i });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });
});
