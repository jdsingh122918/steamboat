import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityCard } from '../activity-card';

describe('ActivityCard', () => {
  const mockOnClick = vi.fn();

  const defaultProps = {
    id: 'act-123',
    title: 'Beach Trip',
    date: new Date('2024-01-20'),
    time: '10:00 AM',
    location: 'Santa Monica Beach',
    rsvpCount: {
      yes: 5,
      no: 2,
      maybe: 3,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render activity title', () => {
      render(<ActivityCard {...defaultProps} />);

      expect(screen.getByText('Beach Trip')).toBeInTheDocument();
    });

    it('should render formatted date', () => {
      render(<ActivityCard {...defaultProps} />);

      expect(screen.getByText('Jan 20')).toBeInTheDocument();
    });

    it('should render time', () => {
      render(<ActivityCard {...defaultProps} />);

      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    });

    it('should render location', () => {
      render(<ActivityCard {...defaultProps} />);

      expect(screen.getByText('Santa Monica Beach')).toBeInTheDocument();
    });

    it('should render RSVP counts', () => {
      render(<ActivityCard {...defaultProps} />);

      expect(screen.getByText('5 yes')).toBeInTheDocument();
      expect(screen.getByText('2 no')).toBeInTheDocument();
      expect(screen.getByText('3 maybe')).toBeInTheDocument();
    });
  });

  describe('description', () => {
    it('should render description when provided', () => {
      render(<ActivityCard {...defaultProps} description="Fun day at the beach" />);

      expect(screen.getByText('Fun day at the beach')).toBeInTheDocument();
    });

    it('should not render description section when not provided', () => {
      render(<ActivityCard {...defaultProps} />);

      expect(screen.queryByText('Fun day at the beach')).not.toBeInTheDocument();
    });
  });

  describe('user RSVP', () => {
    it('should display Going label for yes RSVP', () => {
      render(<ActivityCard {...defaultProps} userRsvp="yes" />);

      expect(screen.getByTestId('user-rsvp')).toHaveTextContent('Going');
    });

    it('should display Not Going label for no RSVP', () => {
      render(<ActivityCard {...defaultProps} userRsvp="no" />);

      expect(screen.getByTestId('user-rsvp')).toHaveTextContent('Not Going');
    });

    it('should display Maybe label for maybe RSVP', () => {
      render(<ActivityCard {...defaultProps} userRsvp="maybe" />);

      expect(screen.getByTestId('user-rsvp')).toHaveTextContent('Maybe');
    });

    it('should apply correct class for user RSVP', () => {
      render(<ActivityCard {...defaultProps} userRsvp="yes" />);

      expect(screen.getByTestId('user-rsvp')).toHaveClass('activity-card-rsvp-yes');
    });

    it('should not render user RSVP when not provided', () => {
      render(<ActivityCard {...defaultProps} />);

      expect(screen.queryByTestId('user-rsvp')).not.toBeInTheDocument();
    });
  });

  describe('click handling', () => {
    it('should call onClick when clicked', () => {
      render(<ActivityCard {...defaultProps} onClick={mockOnClick} />);

      fireEvent.click(screen.getByTestId('activity-card'));

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should have clickable class when onClick provided', () => {
      render(<ActivityCard {...defaultProps} onClick={mockOnClick} />);

      expect(screen.getByTestId('activity-card')).toHaveClass('activity-card-clickable');
    });

    it('should not have clickable class when onClick not provided', () => {
      render(<ActivityCard {...defaultProps} />);

      expect(screen.getByTestId('activity-card')).not.toHaveClass('activity-card-clickable');
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<ActivityCard {...defaultProps} className="custom-class" />);

      expect(screen.getByTestId('activity-card')).toHaveClass('custom-class');
    });
  });
});
