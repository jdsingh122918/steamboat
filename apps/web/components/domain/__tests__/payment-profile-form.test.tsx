import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentProfileForm } from '../payment-profile-form';
import type { PaymentHandles } from '@/lib/db/models/attendee';

// Helper to simulate typing
const typeInInput = (input: HTMLElement, text: string) => {
  fireEvent.change(input, { target: { value: text } });
};

const clearInput = (input: HTMLElement) => {
  fireEvent.change(input, { target: { value: '' } });
};

describe('PaymentProfileForm', () => {
  const mockOnSave = vi.fn();
  const defaultHandles: PaymentHandles = {
    venmo: '@johndoe',
    paypal: 'john@example.com',
    cashapp: '$johndoe',
    zelle: 'john@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render input fields for all payment methods', () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      expect(screen.getByLabelText(/venmo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/paypal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cashapp/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zelle/i)).toBeInTheDocument();
    });

    it('should display current payment handles', () => {
      render(
        <PaymentProfileForm
          initialHandles={defaultHandles}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByDisplayValue('@johndoe')).toBeInTheDocument();
      // Both paypal and zelle have same value, use getAllBy
      const emailInputs = screen.getAllByDisplayValue('john@example.com');
      expect(emailInputs).toHaveLength(2);
      expect(screen.getByDisplayValue('$johndoe')).toBeInTheDocument();
    });

    it('should show save button', () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      expect(
        screen.getByRole('button', { name: /save/i })
      ).toBeInTheDocument();
    });

    it('should display placeholder text for each field', () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      expect(screen.getByPlaceholderText('@username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('$cashtag')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('email or phone')).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('should validate Venmo username format', async () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      const venmoInput = screen.getByLabelText(/venmo/i);
      typeInInput(venmoInput, 'invalid username!');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid venmo/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should accept valid Venmo username with @', async () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      const venmoInput = screen.getByLabelText(/venmo/i);
      typeInInput(venmoInput, '@validuser');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('should validate PayPal email format', async () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      const paypalInput = screen.getByLabelText(/paypal/i);
      typeInInput(paypalInput, 'not-an-email');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid.*email/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should accept valid PayPal email', async () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      const paypalInput = screen.getByLabelText(/paypal/i);
      typeInInput(paypalInput, 'valid@example.com');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('should validate CashApp cashtag format ($username)', async () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      const cashappInput = screen.getByLabelText(/cashapp/i);
      typeInInput(cashappInput, 'no-dollar-sign');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid cashapp/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should accept valid CashApp cashtag with $', async () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      const cashappInput = screen.getByLabelText(/cashapp/i);
      typeInInput(cashappInput, '$validcashtag');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('should validate Zelle email or phone format', async () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      const zelleInput = screen.getByLabelText(/zelle/i);
      typeInInput(zelleInput, 'invalid');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid zelle/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show error for invalid formats', async () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      const venmoInput = screen.getByLabelText(/venmo/i);
      typeInInput(venmoInput, 'bad!@#format');

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
      });
    });

    it('should allow empty fields', async () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({});
      });
    });
  });

  describe('submission', () => {
    it('should call onSave with updated handles', async () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      typeInInput(screen.getByLabelText(/venmo/i), '@newvenmo');
      typeInInput(screen.getByLabelText(/paypal/i), 'new@paypal.com');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            venmo: '@newvenmo',
            paypal: 'new@paypal.com',
          })
        );
      });
    });

    it('should show loading state while saving', async () => {
      mockOnSave.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<PaymentProfileForm onSave={mockOnSave} />);

      typeInInput(screen.getByLabelText(/venmo/i), '@testuser');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save/i })
        ).not.toBeDisabled();
      });
    });

    it('should display success message on save', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(<PaymentProfileForm onSave={mockOnSave} />);

      typeInInput(screen.getByLabelText(/venmo/i), '@testuser');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument();
      });
    });

    it('should display error message on failure', async () => {
      mockOnSave.mockRejectedValue(new Error('Failed to save'));

      render(<PaymentProfileForm onSave={mockOnSave} />);

      typeInInput(screen.getByLabelText(/venmo/i), '@testuser');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });

    it('should not submit while already saving', async () => {
      let resolvePromise: () => void;
      mockOnSave.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );

      render(<PaymentProfileForm onSave={mockOnSave} />);

      typeInInput(screen.getByLabelText(/venmo/i), '@testuser');

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledTimes(1);

      // Clean up
      resolvePromise!();
    });

    it('should only include non-empty handles', async () => {
      render(<PaymentProfileForm onSave={mockOnSave} />);

      typeInInput(screen.getByLabelText(/venmo/i), '@onlyvenmo');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          venmo: '@onlyvenmo',
        });
      });
    });
  });

  describe('editing existing handles', () => {
    it('should update existing values', async () => {
      render(
        <PaymentProfileForm
          initialHandles={{ venmo: '@oldvenmo' }}
          onSave={mockOnSave}
        />
      );

      const venmoInput = screen.getByLabelText(/venmo/i);
      clearInput(venmoInput);
      typeInInput(venmoInput, '@newvenmo');
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            venmo: '@newvenmo',
          })
        );
      });
    });

    it('should remove handles when cleared', async () => {
      render(
        <PaymentProfileForm
          initialHandles={{ venmo: '@oldvenmo', paypal: 'old@email.com' }}
          onSave={mockOnSave}
        />
      );

      const venmoInput = screen.getByLabelText(/venmo/i);
      clearInput(venmoInput);
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          paypal: 'old@email.com',
        });
      });
    });
  });
});
