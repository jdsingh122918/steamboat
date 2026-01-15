import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttendeeCard } from '../attendee-card';

describe('AttendeeCard', () => {
  const mockOnClick = vi.fn();

  const defaultProps = {
    id: 'att-123',
    name: 'John Doe',
    role: 'attendee' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render attendee name', () => {
      render(<AttendeeCard {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render role', () => {
      render(<AttendeeCard {...defaultProps} />);

      expect(screen.getByText('attendee')).toBeInTheDocument();
    });

    it('should render organizer role', () => {
      render(<AttendeeCard {...defaultProps} role="organizer" />);

      expect(screen.getByText('organizer')).toBeInTheDocument();
    });
  });

  describe('avatar', () => {
    it('should display avatar image when avatarUrl provided', () => {
      render(<AttendeeCard {...defaultProps} avatarUrl="https://example.com/avatar.jpg" />);

      const img = screen.getByRole('img', { name: 'John Doe' });
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should display initials when avatarUrl not provided', () => {
      render(<AttendeeCard {...defaultProps} />);

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should display single initial for single name', () => {
      render(<AttendeeCard {...defaultProps} name="Alice" />);

      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should display first and last initials for multi-word names', () => {
      render(<AttendeeCard {...defaultProps} name="Mary Jane Watson" />);

      expect(screen.getByText('MW')).toBeInTheDocument();
    });
  });

  describe('balance', () => {
    it('should display positive balance with plus sign', () => {
      render(<AttendeeCard {...defaultProps} balance={50.25} />);

      expect(screen.getByTestId('balance')).toHaveTextContent('+$50.25');
    });

    it('should display negative balance with minus sign', () => {
      render(<AttendeeCard {...defaultProps} balance={-75.5} />);

      expect(screen.getByTestId('balance')).toHaveTextContent('-$75.50');
    });

    it('should display zero balance', () => {
      render(<AttendeeCard {...defaultProps} balance={0} />);

      expect(screen.getByTestId('balance')).toHaveTextContent('$0.00');
    });

    it('should apply positive class for positive balance', () => {
      render(<AttendeeCard {...defaultProps} balance={50} />);

      expect(screen.getByTestId('balance')).toHaveClass('balance-positive');
    });

    it('should apply negative class for negative balance', () => {
      render(<AttendeeCard {...defaultProps} balance={-50} />);

      expect(screen.getByTestId('balance')).toHaveClass('balance-negative');
    });

    it('should apply zero class for zero balance', () => {
      render(<AttendeeCard {...defaultProps} balance={0} />);

      expect(screen.getByTestId('balance')).toHaveClass('balance-zero');
    });

    it('should not render balance section when undefined', () => {
      render(<AttendeeCard {...defaultProps} />);

      expect(screen.queryByTestId('balance')).not.toBeInTheDocument();
    });
  });

  describe('payment handles', () => {
    it('should display Venmo handle', () => {
      render(<AttendeeCard {...defaultProps} paymentHandles={{ venmo: '@johndoe' }} />);

      expect(screen.getByText('@johndoe')).toBeInTheDocument();
    });

    it('should display PayPal handle', () => {
      render(<AttendeeCard {...defaultProps} paymentHandles={{ paypal: 'john@email.com' }} />);

      expect(screen.getByText('john@email.com')).toBeInTheDocument();
    });

    it('should display CashApp handle', () => {
      render(<AttendeeCard {...defaultProps} paymentHandles={{ cashapp: '$johndoe' }} />);

      expect(screen.getByText('$johndoe')).toBeInTheDocument();
    });

    it('should display multiple payment handles', () => {
      render(
        <AttendeeCard
          {...defaultProps}
          paymentHandles={{
            venmo: '@johndoe',
            paypal: 'john@email.com',
            cashapp: '$johndoe',
          }}
        />
      );

      expect(screen.getByText('@johndoe')).toBeInTheDocument();
      expect(screen.getByText('john@email.com')).toBeInTheDocument();
      expect(screen.getByText('$johndoe')).toBeInTheDocument();
    });

    it('should not render payment handles section when empty', () => {
      render(<AttendeeCard {...defaultProps} paymentHandles={{}} />);

      expect(screen.queryByText('@johndoe')).not.toBeInTheDocument();
    });

    it('should not render payment handles section when undefined', () => {
      render(<AttendeeCard {...defaultProps} />);

      expect(screen.queryByText('@johndoe')).not.toBeInTheDocument();
    });
  });

  describe('click handling', () => {
    it('should call onClick when clicked', () => {
      render(<AttendeeCard {...defaultProps} onClick={mockOnClick} />);

      fireEvent.click(screen.getByTestId('attendee-card'));

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should have clickable class when onClick provided', () => {
      render(<AttendeeCard {...defaultProps} onClick={mockOnClick} />);

      expect(screen.getByTestId('attendee-card')).toHaveClass('attendee-card-clickable');
    });

    it('should not have clickable class when onClick not provided', () => {
      render(<AttendeeCard {...defaultProps} />);

      expect(screen.getByTestId('attendee-card')).not.toHaveClass('attendee-card-clickable');
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<AttendeeCard {...defaultProps} className="custom-class" />);

      expect(screen.getByTestId('attendee-card')).toHaveClass('custom-class');
    });
  });
});
