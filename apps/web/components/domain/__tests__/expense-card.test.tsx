import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseCard } from '../expense-card';

describe('ExpenseCard', () => {
  const mockOnClick = vi.fn();

  const defaultProps = {
    id: 'exp-123',
    title: 'Dinner at Restaurant',
    amount: 150.5,
    paidBy: 'John Doe',
    date: new Date('2024-01-15'),
    category: 'food' as const,
    participantCount: 4,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render expense title', () => {
      render(<ExpenseCard {...defaultProps} />);

      expect(screen.getByText('Dinner at Restaurant')).toBeInTheDocument();
    });

    it('should render formatted amount', () => {
      render(<ExpenseCard {...defaultProps} />);

      expect(screen.getByText('$150.50')).toBeInTheDocument();
    });

    it('should render payer name', () => {
      render(<ExpenseCard {...defaultProps} />);

      expect(screen.getByText(/Paid by John Doe/)).toBeInTheDocument();
    });

    it('should render category', () => {
      render(<ExpenseCard {...defaultProps} />);

      expect(screen.getByText('food')).toBeInTheDocument();
    });

    it('should render participant count', () => {
      render(<ExpenseCard {...defaultProps} />);

      expect(screen.getByText(/4 participants/)).toBeInTheDocument();
    });

    it('should render formatted date', () => {
      render(<ExpenseCard {...defaultProps} />);

      expect(screen.getByText('Jan 15')).toBeInTheDocument();
    });
  });

  describe('status badges', () => {
    it('should show settled badge when settled', () => {
      render(<ExpenseCard {...defaultProps} settled />);

      expect(screen.getByText('Settled')).toBeInTheDocument();
    });

    it('should show disputed badge when disputed', () => {
      render(<ExpenseCard {...defaultProps} disputed />);

      expect(screen.getByText('Disputed')).toBeInTheDocument();
    });

    it('should show both badges when settled and disputed', () => {
      render(<ExpenseCard {...defaultProps} settled disputed />);

      expect(screen.getByText('Settled')).toBeInTheDocument();
      expect(screen.getByText('Disputed')).toBeInTheDocument();
    });

    it('should not show status section when neither settled nor disputed', () => {
      render(<ExpenseCard {...defaultProps} />);

      expect(screen.queryByText('Settled')).not.toBeInTheDocument();
      expect(screen.queryByText('Disputed')).not.toBeInTheDocument();
    });
  });

  describe('user share', () => {
    it('should display positive user share', () => {
      render(<ExpenseCard {...defaultProps} userShare={37.63} />);

      expect(screen.getByText(/Your share: \$37\.63/)).toBeInTheDocument();
    });

    it('should display negative user share as owed', () => {
      render(<ExpenseCard {...defaultProps} userShare={-50.25} />);

      expect(screen.getByText(/You are owed: \$50\.25/)).toBeInTheDocument();
    });

    it('should display zero user share', () => {
      render(<ExpenseCard {...defaultProps} userShare={0} />);

      expect(screen.getByText(/Your share: \$0\.00/)).toBeInTheDocument();
    });

    it('should not display user share section when undefined', () => {
      render(<ExpenseCard {...defaultProps} />);

      expect(screen.queryByText(/Your share/)).not.toBeInTheDocument();
      expect(screen.queryByText(/You are owed/)).not.toBeInTheDocument();
    });
  });

  describe('click handling', () => {
    it('should call onClick when clicked', () => {
      render(<ExpenseCard {...defaultProps} onClick={mockOnClick} />);

      fireEvent.click(screen.getByTestId('expense-card'));

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should have clickable class when onClick provided', () => {
      render(<ExpenseCard {...defaultProps} onClick={mockOnClick} />);

      expect(screen.getByTestId('expense-card')).toHaveClass('expense-card-clickable');
    });

    it('should not have clickable class when onClick not provided', () => {
      render(<ExpenseCard {...defaultProps} />);

      expect(screen.getByTestId('expense-card')).not.toHaveClass('expense-card-clickable');
    });
  });

  describe('styling', () => {
    it('should apply settled class when settled', () => {
      render(<ExpenseCard {...defaultProps} settled />);

      expect(screen.getByTestId('expense-card')).toHaveClass('expense-card-settled');
    });

    it('should apply disputed class when disputed', () => {
      render(<ExpenseCard {...defaultProps} disputed />);

      expect(screen.getByTestId('expense-card')).toHaveClass('expense-card-disputed');
    });

    it('should apply custom className', () => {
      render(<ExpenseCard {...defaultProps} className="custom-class" />);

      expect(screen.getByTestId('expense-card')).toHaveClass('custom-class');
    });
  });
});
