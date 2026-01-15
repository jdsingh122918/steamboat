import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentMethodSelector } from '../payment-method-selector';

describe('PaymentMethodSelector', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all payment method options', () => {
      render(<PaymentMethodSelector selectedMethod={null} onSelect={mockOnSelect} />);

      expect(screen.getByTestId('payment-method-venmo')).toBeInTheDocument();
      expect(screen.getByTestId('payment-method-paypal')).toBeInTheDocument();
      expect(screen.getByTestId('payment-method-cashapp')).toBeInTheDocument();
      expect(screen.getByTestId('payment-method-zelle')).toBeInTheDocument();
      expect(screen.getByTestId('payment-method-cash')).toBeInTheDocument();
      expect(screen.getByTestId('payment-method-other')).toBeInTheDocument();
    });

    it('should highlight selected method', () => {
      render(<PaymentMethodSelector selectedMethod="venmo" onSelect={mockOnSelect} />);

      const venmoButton = screen.getByTestId('payment-method-venmo');
      expect(venmoButton).toHaveClass('selected');
      expect(venmoButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should display payment handles when available', () => {
      render(
        <PaymentMethodSelector
          selectedMethod={null}
          onSelect={mockOnSelect}
          availableHandles={{ venmo: '@johndoe', paypal: 'john@example.com' }}
        />
      );

      expect(screen.getByText('@johndoe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('availability', () => {
    it('should disable methods without handles', () => {
      render(
        <PaymentMethodSelector
          selectedMethod={null}
          onSelect={mockOnSelect}
          availableHandles={{}}
        />
      );

      expect(screen.getByTestId('payment-method-venmo')).toBeDisabled();
      expect(screen.getByTestId('payment-method-paypal')).toBeDisabled();
      expect(screen.getByTestId('payment-method-cashapp')).toBeDisabled();
      expect(screen.getByTestId('payment-method-zelle')).toBeDisabled();
    });

    it('should always enable cash and other methods', () => {
      render(
        <PaymentMethodSelector
          selectedMethod={null}
          onSelect={mockOnSelect}
          availableHandles={{}}
        />
      );

      expect(screen.getByTestId('payment-method-cash')).not.toBeDisabled();
      expect(screen.getByTestId('payment-method-other')).not.toBeDisabled();
    });

    it('should enable methods with handles', () => {
      render(
        <PaymentMethodSelector
          selectedMethod={null}
          onSelect={mockOnSelect}
          availableHandles={{ venmo: '@test' }}
        />
      );

      expect(screen.getByTestId('payment-method-venmo')).not.toBeDisabled();
    });

    it('should show "Not set up" for unavailable methods', () => {
      render(
        <PaymentMethodSelector
          selectedMethod={null}
          onSelect={mockOnSelect}
          availableHandles={{}}
        />
      );

      const notSetUpTexts = screen.getAllByText('Not set up');
      expect(notSetUpTexts.length).toBeGreaterThan(0);
    });
  });

  describe('selection', () => {
    it('should call onSelect when clicking available method', () => {
      render(
        <PaymentMethodSelector
          selectedMethod={null}
          onSelect={mockOnSelect}
          availableHandles={{ venmo: '@test' }}
        />
      );

      fireEvent.click(screen.getByTestId('payment-method-venmo'));

      expect(mockOnSelect).toHaveBeenCalledWith('venmo');
    });

    it('should not call onSelect when clicking disabled method', () => {
      render(
        <PaymentMethodSelector
          selectedMethod={null}
          onSelect={mockOnSelect}
          availableHandles={{}}
        />
      );

      fireEvent.click(screen.getByTestId('payment-method-venmo'));

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('should call onSelect for cash method', () => {
      render(
        <PaymentMethodSelector
          selectedMethod={null}
          onSelect={mockOnSelect}
          availableHandles={{}}
        />
      );

      fireEvent.click(screen.getByTestId('payment-method-cash'));

      expect(mockOnSelect).toHaveBeenCalledWith('cash');
    });

    it('should call onSelect for other method', () => {
      render(
        <PaymentMethodSelector
          selectedMethod={null}
          onSelect={mockOnSelect}
          availableHandles={{}}
        />
      );

      fireEvent.click(screen.getByTestId('payment-method-other'));

      expect(mockOnSelect).toHaveBeenCalledWith('other');
    });
  });

  describe('accessibility', () => {
    it('should have radiogroup role', () => {
      render(<PaymentMethodSelector selectedMethod={null} onSelect={mockOnSelect} />);

      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should have radio role on options', () => {
      render(<PaymentMethodSelector selectedMethod={null} onSelect={mockOnSelect} />);

      const radios = screen.getAllByRole('radio');
      expect(radios.length).toBe(6);
    });

    it('should have aria-label on selector', () => {
      render(<PaymentMethodSelector selectedMethod={null} onSelect={mockOnSelect} />);

      expect(screen.getByRole('radiogroup')).toHaveAttribute(
        'aria-label',
        'Select payment method'
      );
    });
  });
});
