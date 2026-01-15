import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseCard, ActivityCard, AttendeeCard, MediaCard, PollCard } from '../domain';

describe('ExpenseCard', () => {
  const defaultProps = {
    id: 'expense1',
    title: 'Dinner at Restaurant',
    amount: 150.00,
    paidBy: 'John Doe',
    date: new Date('2024-03-15'),
    category: 'food' as const,
    participantCount: 5,
  };

  describe('rendering', () => {
    it('should render expense title', () => {
      render(<ExpenseCard {...defaultProps} />);
      expect(screen.getByText('Dinner at Restaurant')).toBeInTheDocument();
    });

    it('should render formatted amount', () => {
      render(<ExpenseCard {...defaultProps} />);
      expect(screen.getByText('$150.00')).toBeInTheDocument();
    });

    it('should render payer name', () => {
      render(<ExpenseCard {...defaultProps} />);
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it('should render formatted date', () => {
      render(<ExpenseCard {...defaultProps} />);
      // Date formatting depends on locale/timezone, so check for presence of date element
      expect(screen.getByText(/Mar \d+/i)).toBeInTheDocument();
    });

    it('should render participant count', () => {
      render(<ExpenseCard {...defaultProps} />);
      expect(screen.getByText(/5 participants/i)).toBeInTheDocument();
    });

    it('should render category badge', () => {
      render(<ExpenseCard {...defaultProps} />);
      expect(screen.getByText('food')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should render settled state', () => {
      render(<ExpenseCard {...defaultProps} settled />);
      expect(screen.getByTestId('expense-card')).toHaveClass('expense-card-settled');
      expect(screen.getByText('Settled')).toBeInTheDocument();
    });

    it('should render disputed state', () => {
      render(<ExpenseCard {...defaultProps} disputed />);
      expect(screen.getByTestId('expense-card')).toHaveClass('expense-card-disputed');
      expect(screen.getByText('Disputed')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<ExpenseCard {...defaultProps} onClick={handleClick} />);
      fireEvent.click(screen.getByTestId('expense-card'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be clickable when onClick is provided', () => {
      render(<ExpenseCard {...defaultProps} onClick={() => {}} />);
      expect(screen.getByTestId('expense-card')).toHaveClass('expense-card-clickable');
    });
  });

  describe('user share', () => {
    it('should render user share when provided', () => {
      render(<ExpenseCard {...defaultProps} userShare={30.00} />);
      expect(screen.getByText('Your share: $30.00')).toBeInTheDocument();
    });

    it('should render user owed when user is payer', () => {
      render(<ExpenseCard {...defaultProps} userShare={-120.00} />);
      expect(screen.getByText('You are owed: $120.00')).toBeInTheDocument();
    });
  });
});

describe('ActivityCard', () => {
  const defaultProps = {
    id: 'activity1',
    title: 'Hiking Trip',
    date: new Date('2024-03-16'),
    time: '09:00 AM',
    location: 'Mountain Trail',
    rsvpCount: { yes: 4, no: 1, maybe: 2 },
  };

  describe('rendering', () => {
    it('should render activity title', () => {
      render(<ActivityCard {...defaultProps} />);
      expect(screen.getByText('Hiking Trip')).toBeInTheDocument();
    });

    it('should render date', () => {
      render(<ActivityCard {...defaultProps} />);
      // Date formatting depends on locale/timezone, so check for presence of date element
      expect(screen.getByText(/Mar \d+/i)).toBeInTheDocument();
    });

    it('should render time', () => {
      render(<ActivityCard {...defaultProps} />);
      expect(screen.getByText('09:00 AM')).toBeInTheDocument();
    });

    it('should render location', () => {
      render(<ActivityCard {...defaultProps} />);
      expect(screen.getByText('Mountain Trail')).toBeInTheDocument();
    });

    it('should render RSVP counts', () => {
      render(<ActivityCard {...defaultProps} />);
      expect(screen.getByText('4 yes')).toBeInTheDocument();
      expect(screen.getByText('1 no')).toBeInTheDocument();
      expect(screen.getByText('2 maybe')).toBeInTheDocument();
    });
  });

  describe('description', () => {
    it('should render description when provided', () => {
      render(<ActivityCard {...defaultProps} description="A fun day out hiking!" />);
      expect(screen.getByText('A fun day out hiking!')).toBeInTheDocument();
    });
  });

  describe('user RSVP status', () => {
    it('should show user RSVP status when provided', () => {
      render(<ActivityCard {...defaultProps} userRsvp="yes" />);
      expect(screen.getByTestId('user-rsvp')).toHaveTextContent('Going');
    });

    it('should show not going status', () => {
      render(<ActivityCard {...defaultProps} userRsvp="no" />);
      expect(screen.getByTestId('user-rsvp')).toHaveTextContent('Not Going');
    });

    it('should show maybe status', () => {
      render(<ActivityCard {...defaultProps} userRsvp="maybe" />);
      expect(screen.getByTestId('user-rsvp')).toHaveTextContent('Maybe');
    });
  });

  describe('interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<ActivityCard {...defaultProps} onClick={handleClick} />);
      fireEvent.click(screen.getByTestId('activity-card'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AttendeeCard', () => {
  const defaultProps = {
    id: 'attendee1',
    name: 'John Doe',
    role: 'organizer' as const,
  };

  describe('rendering', () => {
    it('should render attendee name', () => {
      render(<AttendeeCard {...defaultProps} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render role badge', () => {
      render(<AttendeeCard {...defaultProps} />);
      expect(screen.getByText('organizer')).toBeInTheDocument();
    });

    it('should render avatar with initials', () => {
      render(<AttendeeCard {...defaultProps} />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('avatar', () => {
    it('should render avatar image when provided', () => {
      render(<AttendeeCard {...defaultProps} avatarUrl="https://example.com/avatar.jpg" />);
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });
  });

  describe('balance', () => {
    it('should show positive balance', () => {
      render(<AttendeeCard {...defaultProps} balance={50.00} />);
      expect(screen.getByText('+$50.00')).toBeInTheDocument();
      expect(screen.getByTestId('balance')).toHaveClass('balance-positive');
    });

    it('should show negative balance', () => {
      render(<AttendeeCard {...defaultProps} balance={-30.00} />);
      expect(screen.getByText('-$30.00')).toBeInTheDocument();
      expect(screen.getByTestId('balance')).toHaveClass('balance-negative');
    });

    it('should show zero balance', () => {
      render(<AttendeeCard {...defaultProps} balance={0} />);
      expect(screen.getByText('$0.00')).toBeInTheDocument();
      expect(screen.getByTestId('balance')).toHaveClass('balance-zero');
    });
  });

  describe('payment handles', () => {
    it('should render payment handles when provided', () => {
      render(
        <AttendeeCard
          {...defaultProps}
          paymentHandles={{ venmo: '@johndoe', paypal: 'john@example.com' }}
        />
      );
      expect(screen.getByText('@johndoe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<AttendeeCard {...defaultProps} onClick={handleClick} />);
      fireEvent.click(screen.getByTestId('attendee-card'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});

describe('MediaCard', () => {
  const defaultProps = {
    id: 'media1',
    type: 'image' as const,
    thumbnailUrl: 'https://example.com/thumb.jpg',
    uploadedBy: 'John Doe',
    uploadedAt: new Date('2024-03-15'),
  };

  describe('rendering', () => {
    it('should render thumbnail image', () => {
      render(<MediaCard {...defaultProps} />);
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/thumb.jpg');
    });

    it('should render uploader name', () => {
      render(<MediaCard {...defaultProps} />);
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it('should render upload date', () => {
      render(<MediaCard {...defaultProps} />);
      // Date formatting depends on locale/timezone, so check for presence of date element
      expect(screen.getByText(/Mar \d+/i)).toBeInTheDocument();
    });
  });

  describe('media types', () => {
    it('should show video indicator for video type', () => {
      render(<MediaCard {...defaultProps} type="video" />);
      expect(screen.getByTestId('video-indicator')).toBeInTheDocument();
    });

    it('should not show video indicator for image type', () => {
      render(<MediaCard {...defaultProps} type="image" />);
      expect(screen.queryByTestId('video-indicator')).not.toBeInTheDocument();
    });
  });

  describe('caption', () => {
    it('should render caption when provided', () => {
      render(<MediaCard {...defaultProps} caption="Great view from the top!" />);
      expect(screen.getByText('Great view from the top!')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<MediaCard {...defaultProps} onClick={handleClick} />);
      fireEvent.click(screen.getByTestId('media-card'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('selection', () => {
    it('should show selection checkbox when selectable', () => {
      render(<MediaCard {...defaultProps} selectable />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should be checked when selected', () => {
      render(<MediaCard {...defaultProps} selectable selected />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('should call onSelect when checkbox changes', () => {
      const handleSelect = vi.fn();
      render(<MediaCard {...defaultProps} selectable onSelect={handleSelect} />);
      fireEvent.click(screen.getByRole('checkbox'));
      expect(handleSelect).toHaveBeenCalledWith(true);
    });
  });
});

describe('PollCard', () => {
  const defaultProps = {
    id: 'poll1',
    question: 'Where should we go for dinner?',
    options: [
      { id: 'opt1', text: 'Italian Restaurant', votes: 3 },
      { id: 'opt2', text: 'Steakhouse', votes: 2 },
      { id: 'opt3', text: 'Sushi Bar', votes: 4 },
    ],
    totalVotes: 9,
    createdBy: 'John Doe',
    createdAt: new Date('2024-03-15'),
  };

  describe('rendering', () => {
    it('should render poll question', () => {
      render(<PollCard {...defaultProps} />);
      expect(screen.getByText('Where should we go for dinner?')).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(<PollCard {...defaultProps} />);
      expect(screen.getByText('Italian Restaurant')).toBeInTheDocument();
      expect(screen.getByText('Steakhouse')).toBeInTheDocument();
      expect(screen.getByText('Sushi Bar')).toBeInTheDocument();
    });

    it('should render total votes', () => {
      render(<PollCard {...defaultProps} />);
      expect(screen.getByText('9 votes')).toBeInTheDocument();
    });

    it('should render creator name', () => {
      render(<PollCard {...defaultProps} />);
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });
  });

  describe('voting', () => {
    it('should show vote counts when showResults is true', () => {
      render(<PollCard {...defaultProps} showResults />);
      expect(screen.getByText('3 votes')).toBeInTheDocument();
      expect(screen.getByText('2 votes')).toBeInTheDocument();
      expect(screen.getByText('4 votes')).toBeInTheDocument();
    });

    it('should show vote percentages when showResults is true', () => {
      render(<PollCard {...defaultProps} showResults />);
      expect(screen.getByText('33%')).toBeInTheDocument(); // 3/9
      expect(screen.getByText('22%')).toBeInTheDocument(); // 2/9
      expect(screen.getByText('44%')).toBeInTheDocument(); // 4/9
    });

    it('should highlight user selected option', () => {
      render(<PollCard {...defaultProps} userVote="opt2" showResults />);
      const selectedOption = screen.getByTestId('poll-option-opt2');
      expect(selectedOption).toHaveClass('poll-option-selected');
    });
  });

  describe('status', () => {
    it('should show open status', () => {
      render(<PollCard {...defaultProps} status="open" />);
      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('should show closed status', () => {
      render(<PollCard {...defaultProps} status="closed" />);
      expect(screen.getByText('Closed')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onVote when option is clicked', () => {
      const handleVote = vi.fn();
      render(<PollCard {...defaultProps} onVote={handleVote} />);
      fireEvent.click(screen.getByText('Steakhouse'));
      expect(handleVote).toHaveBeenCalledWith('opt2');
    });

    it('should not call onVote when poll is closed', () => {
      const handleVote = vi.fn();
      render(<PollCard {...defaultProps} status="closed" onVote={handleVote} />);
      fireEvent.click(screen.getByText('Steakhouse'));
      expect(handleVote).not.toHaveBeenCalled();
    });
  });
});
