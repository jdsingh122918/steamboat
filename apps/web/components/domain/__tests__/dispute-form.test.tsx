import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DisputeForm } from '../dispute-form';

describe('DisputeForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    expenseId: 'exp-123',
    expenseDescription: 'Dinner at fancy restaurant',
    expenseAmount: 15000,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render expense information', () => {
      render(<DisputeForm {...defaultProps} />);

      expect(screen.getByText(/dinner at fancy restaurant/i)).toBeInTheDocument();
      expect(screen.getByText(/\$150\.00/)).toBeInTheDocument();
    });

    it('should render reason textarea', () => {
      render(<DisputeForm {...defaultProps} />);

      expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    });

    it('should render dispute type selector', () => {
      render(<DisputeForm {...defaultProps} />);

      expect(screen.getByLabelText(/type of dispute/i)).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      render(<DisputeForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /submit dispute/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show dispute types options', () => {
      render(<DisputeForm {...defaultProps} />);

      const select = screen.getByLabelText(/type of dispute/i);
      expect(select).toBeInTheDocument();

      // Click to reveal options
      fireEvent.click(select);
      expect(screen.getByText(/incorrect amount/i)).toBeInTheDocument();
      expect(screen.getByText(/not participated/i)).toBeInTheDocument();
      expect(screen.getByText(/other/i)).toBeInTheDocument();
    });
  });

  describe('form input', () => {
    it('should update reason text', () => {
      render(<DisputeForm {...defaultProps} />);

      const textarea = screen.getByLabelText(/reason/i);
      fireEvent.change(textarea, { target: { value: 'I did not attend this dinner' } });

      expect(textarea).toHaveValue('I did not attend this dinner');
    });

    it('should update dispute type', () => {
      render(<DisputeForm {...defaultProps} />);

      const select = screen.getByLabelText(/type of dispute/i);
      fireEvent.change(select, { target: { value: 'incorrect_amount' } });

      expect(select).toHaveValue('incorrect_amount');
    });

    it('should show character count for reason', () => {
      render(<DisputeForm {...defaultProps} />);

      const textarea = screen.getByLabelText(/reason/i);
      fireEvent.change(textarea, { target: { value: 'Test reason' } });

      expect(screen.getByText(/11.*500/)).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('should show error for empty reason', async () => {
      render(<DisputeForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /submit dispute/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/reason is required/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for reason that is too short', async () => {
      render(<DisputeForm {...defaultProps} />);

      const textarea = screen.getByLabelText(/reason/i);
      fireEvent.change(textarea, { target: { value: 'Too short' } });

      const submitButton = screen.getByRole('button', { name: /submit dispute/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/reason must be at least 20 characters/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for reason that is too long', async () => {
      render(<DisputeForm {...defaultProps} />);

      const textarea = screen.getByLabelText(/reason/i);
      const longText = 'a'.repeat(501);
      fireEvent.change(textarea, { target: { value: longText } });

      const submitButton = screen.getByRole('button', { name: /submit dispute/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/reason must not exceed 500 characters/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('should call onSubmit with dispute data', async () => {
      render(<DisputeForm {...defaultProps} />);

      const textarea = screen.getByLabelText(/reason/i);
      fireEvent.change(textarea, {
        target: { value: 'I did not participate in this dinner event at all' },
      });

      const select = screen.getByLabelText(/type of dispute/i);
      fireEvent.change(select, { target: { value: 'not_participated' } });

      const submitButton = screen.getByRole('button', { name: /submit dispute/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          expenseId: 'exp-123',
          reason: 'I did not participate in this dinner event at all',
          disputeType: 'not_participated',
        });
      });
    });

    it('should show loading state while submitting', async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<DisputeForm {...defaultProps} />);

      const textarea = screen.getByLabelText(/reason/i);
      fireEvent.change(textarea, {
        target: { value: 'This is a valid reason for the dispute' },
      });

      const submitButton = screen.getByRole('button', { name: /submit dispute/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/submitting/i)).toBeInTheDocument();
      });
    });

    it('should show error message on submission failure', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Failed to submit dispute'));

      render(<DisputeForm {...defaultProps} />);

      const textarea = screen.getByLabelText(/reason/i);
      fireEvent.change(textarea, {
        target: { value: 'This is a valid reason for the dispute' },
      });

      const submitButton = screen.getByRole('button', { name: /submit dispute/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to submit dispute/i)).toBeInTheDocument();
      });
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(<DisputeForm {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable submit button while submitting', async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<DisputeForm {...defaultProps} />);

      const textarea = screen.getByLabelText(/reason/i);
      fireEvent.change(textarea, {
        target: { value: 'This is a valid reason for the dispute' },
      });

      const submitButton = screen.getByRole('button', { name: /submit dispute/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });
});
