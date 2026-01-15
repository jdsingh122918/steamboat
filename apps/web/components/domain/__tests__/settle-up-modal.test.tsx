import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettleUpModal } from '../settle-up-modal';

// Mock the payment-links module
vi.mock('@/lib/utils/payment-links', () => ({
  openPaymentLink: vi.fn().mockResolvedValue({ opened: true, link: 'https://venmo.com/pay/@janesmith/50.00' }),
  copyToClipboard: vi.fn().mockResolvedValue(true),
  supportsDeepLink: vi.fn().mockImplementation((method: string) => ['venmo', 'paypal', 'cashapp'].includes(method)),
  getPaymentMethodDisplayName: vi.fn().mockImplementation((method: string) => {
    const names: Record<string, string> = { venmo: 'Venmo', paypal: 'PayPal', cashapp: 'Cash App', zelle: 'Zelle', cash: 'Cash', other: 'Other' };
    return names[method] || method;
  }),
}));

import { openPaymentLink } from '@/lib/utils/payment-links';

// Helper to simulate typing
const typeInInput = (input: HTMLElement, text: string) => {
  fireEvent.change(input, { target: { value: text } });
};

describe('SettleUpModal', () => {
  const mockOnClose = vi.fn();
  const mockOnPaymentComplete = vi.fn();
  const mockOpenPaymentLink = vi.mocked(openPaymentLink);

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onPaymentComplete: mockOnPaymentComplete,
    settlement: {
      amount_cents: 5000,
      fromId: 'from-123',
      fromName: 'John Doe',
      toId: 'to-456',
      toName: 'Jane Smith',
      toPaymentHandles: {
        venmo: '@janesmith',
        paypal: 'jane@example.com',
        cashapp: '$janesmith',
      },
    },
    tripId: 'trip-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenPaymentLink.mockResolvedValue({ opened: true, link: 'https://venmo.com/pay/@janesmith/50.00' });
  });

  describe('rendering', () => {
    it('should display settlement amount', () => {
      render(<SettleUpModal {...defaultProps} />);

      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });

    it('should show payer and recipient names', () => {
      render(<SettleUpModal {...defaultProps} />);

      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      expect(screen.getByText(/jane smith/i)).toBeInTheDocument();
    });

    it('should display recipient payment handles', () => {
      render(<SettleUpModal {...defaultProps} />);

      const handlesSection = screen.getByText(/payment handles/i).parentElement!;
      expect(handlesSection).toHaveTextContent('@janesmith');
      expect(handlesSection).toHaveTextContent('jane@example.com');
    });

    it('should show payment method selector', () => {
      render(<SettleUpModal {...defaultProps} />);

      const methodsSection = screen.getByText(/select payment method/i).parentElement!;
      expect(methodsSection).toHaveTextContent(/venmo/i);
      expect(methodsSection).toHaveTextContent(/paypal/i);
      expect(methodsSection).toHaveTextContent(/cashapp/i);
      expect(methodsSection).toHaveTextContent(/cash/i);
    });

    it('should not render when closed', () => {
      render(<SettleUpModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('$50.00')).not.toBeInTheDocument();
    });

    it('should display close button', () => {
      render(<SettleUpModal {...defaultProps} />);

      // There are two ways to close - X button and Cancel button
      const closeButtons = screen.getAllByRole('button', { name: /close|cancel/i });
      expect(closeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('payment method selection', () => {
    it('should allow selecting Venmo', () => {
      render(<SettleUpModal {...defaultProps} />);

      const venmoButton = screen.getByRole('button', { name: /venmo/i });
      fireEvent.click(venmoButton);

      expect(venmoButton).toHaveClass('selected');
    });

    it('should allow selecting PayPal', () => {
      render(<SettleUpModal {...defaultProps} />);

      const paypalButton = screen.getByRole('button', { name: /paypal/i });
      fireEvent.click(paypalButton);

      expect(paypalButton).toHaveClass('selected');
    });

    it('should allow selecting CashApp', () => {
      render(<SettleUpModal {...defaultProps} />);

      const cashappButton = screen.getByRole('button', { name: /cashapp/i });
      fireEvent.click(cashappButton);

      expect(cashappButton).toHaveClass('selected');
    });

    it('should allow selecting Cash', () => {
      render(<SettleUpModal {...defaultProps} />);

      const cashButton = screen.getByRole('button', { name: /^cash$/i });
      fireEvent.click(cashButton);

      expect(cashButton).toHaveClass('selected');
    });

    it('should only have one method selected at a time', () => {
      render(<SettleUpModal {...defaultProps} />);

      const venmoButton = screen.getByRole('button', { name: /venmo/i });
      const paypalButton = screen.getByRole('button', { name: /paypal/i });

      fireEvent.click(venmoButton);
      expect(venmoButton).toHaveClass('selected');

      fireEvent.click(paypalButton);
      expect(paypalButton).toHaveClass('selected');
      expect(venmoButton).not.toHaveClass('selected');
    });
  });

  describe('payment flow', () => {
    it('should show pay button for digital payments', () => {
      render(<SettleUpModal {...defaultProps} />);

      const venmoButton = screen.getByRole('button', { name: /venmo/i });
      fireEvent.click(venmoButton);

      expect(screen.getByRole('button', { name: /pay.*venmo/i })).toBeInTheDocument();
    });

    it('should show confirmation checkbox for cash payments', () => {
      render(<SettleUpModal {...defaultProps} />);

      const cashButton = screen.getByRole('button', { name: /^cash$/i });
      fireEvent.click(cashButton);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByText(/confirm.*paid/i)).toBeInTheDocument();
    });

    it('should disable submit for cash until confirmed', () => {
      render(<SettleUpModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /^cash$/i }));

      const submitButton = screen.getByRole('button', { name: /confirm payment/i });
      expect(submitButton).toBeDisabled();

      fireEvent.click(screen.getByRole('checkbox'));
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('confirmation', () => {
    it('should show confirmation checkbox', async () => {
      render(<SettleUpModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /venmo/i }));

      // Click pay button to proceed to confirmation - wait for async transition
      fireEvent.click(screen.getByRole('button', { name: /pay.*venmo/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });
    });

    it('should call onPaymentComplete after confirmation', async () => {
      render(<SettleUpModal {...defaultProps} />);

      // Select Venmo
      fireEvent.click(screen.getByRole('button', { name: /venmo/i }));

      // Click pay - wait for async transition
      fireEvent.click(screen.getByRole('button', { name: /pay.*venmo/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });

      // Confirm
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(mockOnPaymentComplete).toHaveBeenCalledWith({
          method: 'venmo',
          amount_cents: 5000,
        });
      });
    });

    it('should close modal on successful payment', async () => {
      mockOnPaymentComplete.mockResolvedValue(undefined);
      render(<SettleUpModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /venmo/i }));
      fireEvent.click(screen.getByRole('button', { name: /pay.*venmo/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should display error on failure', async () => {
      mockOnPaymentComplete.mockRejectedValue(new Error('Payment failed'));
      render(<SettleUpModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /venmo/i }));
      fireEvent.click(screen.getByRole('button', { name: /pay.*venmo/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });

    it('should show loading state while processing', async () => {
      mockOnPaymentComplete.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<SettleUpModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /venmo/i }));
      fireEvent.click(screen.getByRole('button', { name: /pay.*venmo/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
    });
  });

  describe('optional note', () => {
    it('should allow adding a payment note', () => {
      render(<SettleUpModal {...defaultProps} />);

      const noteInput = screen.getByPlaceholderText(/note|memo/i);
      typeInInput(noteInput, 'For dinner last night');

      expect(noteInput).toHaveValue('For dinner last night');
    });

    it('should include note in payment', async () => {
      render(<SettleUpModal {...defaultProps} />);

      typeInInput(screen.getByPlaceholderText(/note|memo/i), 'For dinner');

      fireEvent.click(screen.getByRole('button', { name: /venmo/i }));
      fireEvent.click(screen.getByRole('button', { name: /pay.*venmo/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(mockOnPaymentComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            note: 'For dinner',
          })
        );
      });
    });
  });

  describe('cancel functionality', () => {
    it('should call onClose when cancel button clicked', () => {
      render(<SettleUpModal {...defaultProps} />);

      // Use the footer cancel button specifically
      const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset state when modal closes', () => {
      const { rerender } = render(<SettleUpModal {...defaultProps} />);

      // Select a method - get from methods grid
      const methodsGrid = screen.getByText(/select payment method/i).parentElement!;
      const venmoButton = methodsGrid.querySelector('button.method-button')!;
      fireEvent.click(venmoButton);
      expect(venmoButton).toHaveClass('selected');

      // Close and reopen
      rerender(<SettleUpModal {...defaultProps} isOpen={false} />);
      rerender(<SettleUpModal {...defaultProps} isOpen={true} />);

      // Should be reset - get fresh reference
      const newMethodsGrid = screen.getByText(/select payment method/i).parentElement!;
      const newVenmoButton = newMethodsGrid.querySelector('button.method-button')!;
      expect(newVenmoButton).not.toHaveClass('selected');
    });
  });

  describe('amount display', () => {
    it('should format large amounts correctly', () => {
      render(
        <SettleUpModal
          {...defaultProps}
          settlement={{
            ...defaultProps.settlement,
            amount_cents: 123456,
          }}
        />
      );

      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    });

    it('should handle zero cents correctly', () => {
      render(
        <SettleUpModal
          {...defaultProps}
          settlement={{
            ...defaultProps.settlement,
            amount_cents: 10000,
          }}
        />
      );

      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });
  });

  describe('recipient without payment handles', () => {
    it('should only show Cash option when no digital handles', () => {
      render(
        <SettleUpModal
          {...defaultProps}
          settlement={{
            ...defaultProps.settlement,
            toPaymentHandles: {},
          }}
        />
      );

      expect(screen.queryByRole('button', { name: /venmo/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /paypal/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^cash$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /other/i })).toBeInTheDocument();
    });

    it('should show message encouraging recipient to add handles', () => {
      render(
        <SettleUpModal
          {...defaultProps}
          settlement={{
            ...defaultProps.settlement,
            toPaymentHandles: {},
          }}
        />
      );

      expect(screen.getByText(/no digital payment/i)).toBeInTheDocument();
    });
  });
});
