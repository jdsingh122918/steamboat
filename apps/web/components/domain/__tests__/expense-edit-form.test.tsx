import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpenseEditForm } from '../expense-edit-form';

describe('ExpenseEditForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const mockAttendees = [
    { id: 'att-1', name: 'John Doe' },
    { id: 'att-2', name: 'Jane Smith' },
    { id: 'att-3', name: 'Bob Wilson' },
  ];

  const mockExpense = {
    id: 'exp-123',
    description: 'Dinner at restaurant',
    amount_cents: 15000,
    category: 'food' as const,
    payerId: 'att-1',
    participants: [
      { attendeeId: 'att-1', optedIn: true },
      { attendeeId: 'att-2', optedIn: true },
      { attendeeId: 'att-3', optedIn: false },
    ],
    status: 'pending' as const,
    receiptUrl: undefined,
  };

  const defaultProps = {
    expense: mockExpense,
    attendees: mockAttendees,
    currentUserId: 'att-1',
    onSave: mockOnSave,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render description input with current value', () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const input = screen.getByLabelText(/description/i);
      expect(input).toHaveValue('Dinner at restaurant');
    });

    it('should render amount input with current value', () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const input = screen.getByLabelText(/amount/i);
      expect(input).toHaveValue('150.00');
    });

    it('should render category selector with current value', () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const select = screen.getByLabelText(/category/i);
      expect(select).toHaveValue('food');
    });

    it('should render payer selector with current value', () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const select = screen.getByLabelText(/paid by/i);
      expect(select).toHaveValue('att-1');
    });

    it('should render participant checkboxes', () => {
      render(<ExpenseEditForm {...defaultProps} />);

      expect(screen.getByLabelText(/john doe/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/jane smith/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/bob wilson/i)).toBeInTheDocument();
    });

    it('should show current participant selections', () => {
      render(<ExpenseEditForm {...defaultProps} />);

      expect(screen.getByLabelText(/john doe/i)).toBeChecked();
      expect(screen.getByLabelText(/jane smith/i)).toBeChecked();
      expect(screen.getByLabelText(/bob wilson/i)).not.toBeChecked();
    });

    it('should render save and cancel buttons', () => {
      render(<ExpenseEditForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('editing', () => {
    it('should update description', async () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const input = screen.getByLabelText(/description/i);
      fireEvent.change(input, { target: { value: 'Lunch at cafe' } });

      expect(input).toHaveValue('Lunch at cafe');
    });

    it('should update amount', async () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const input = screen.getByLabelText(/amount/i);
      fireEvent.change(input, { target: { value: '75.50' } });

      expect(input).toHaveValue('75.50');
    });

    it('should update category', async () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const select = screen.getByLabelText(/category/i);
      fireEvent.change(select, { target: { value: 'drinks' } });

      expect(select).toHaveValue('drinks');
    });

    it('should toggle participant selection', async () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const checkbox = screen.getByLabelText(/bob wilson/i);
      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });
  });

  describe('validation', () => {
    it('should show error for empty description', async () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const input = screen.getByLabelText(/description/i);
      fireEvent.change(input, { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show error for zero amount', async () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const input = screen.getByLabelText(/amount/i);
      fireEvent.change(input, { target: { value: '0' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/amount must be greater than zero/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show error for negative amount', async () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const input = screen.getByLabelText(/amount/i);
      fireEvent.change(input, { target: { value: '-50' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/amount must be greater than zero/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show error when no participants selected', async () => {
      render(<ExpenseEditForm {...defaultProps} />);

      // Deselect all participants
      fireEvent.click(screen.getByLabelText(/john doe/i));
      fireEvent.click(screen.getByLabelText(/jane smith/i));

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/at least one participant is required/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should validate amount format', async () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const input = screen.getByLabelText(/amount/i);
      fireEvent.change(input, { target: { value: 'abc' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid amount format/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('should call onSave with updated expense data', async () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const descInput = screen.getByLabelText(/description/i);
      fireEvent.change(descInput, { target: { value: 'Updated dinner' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          description: 'Updated dinner',
          amount_cents: 15000,
          category: 'food',
          payerId: 'att-1',
          participants: expect.arrayContaining([
            { attendeeId: 'att-1', optedIn: true },
            { attendeeId: 'att-2', optedIn: true },
          ]),
        });
      });
    });

    it('should show loading state while saving', async () => {
      mockOnSave.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ExpenseEditForm {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });
    });

    it('should show error message on save failure', async () => {
      mockOnSave.mockRejectedValue(new Error('Network error'));

      render(<ExpenseEditForm {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should convert amount to cents correctly', async () => {
      render(<ExpenseEditForm {...defaultProps} />);

      const input = screen.getByLabelText(/amount/i);
      fireEvent.change(input, { target: { value: '25.99' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            amount_cents: 2599,
          })
        );
      });
    });
  });

  describe('permissions', () => {
    it('should disable form when user is not expense creator', () => {
      render(
        <ExpenseEditForm
          {...defaultProps}
          currentUserId="att-2"
          expense={{ ...mockExpense, payerId: 'att-1' }}
        />
      );

      expect(screen.getByLabelText(/description/i)).toBeDisabled();
      expect(screen.getByLabelText(/amount/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('should show message when expense is not editable', () => {
      render(
        <ExpenseEditForm
          {...defaultProps}
          currentUserId="att-2"
        />
      );

      expect(screen.getByText(/only the expense creator can edit/i)).toBeInTheDocument();
    });
  });

  describe('settled expense', () => {
    it('should disable form for settled expenses', () => {
      render(
        <ExpenseEditForm
          {...defaultProps}
          expense={{ ...mockExpense, status: 'settled' }}
        />
      );

      expect(screen.getByLabelText(/description/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('should show message for settled expenses', () => {
      render(
        <ExpenseEditForm
          {...defaultProps}
          expense={{ ...mockExpense, status: 'settled' }}
        />
      );

      expect(screen.getByText(/settled expenses cannot be edited/i)).toBeInTheDocument();
    });
  });
});
