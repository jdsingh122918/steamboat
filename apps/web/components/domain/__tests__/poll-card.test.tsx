import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PollCard } from '../poll-card';

describe('PollCard', () => {
  const mockOnVote = vi.fn();

  const defaultProps = {
    id: 'poll-123',
    question: 'Where should we go for dinner?',
    options: [
      { id: 'opt-1', text: 'Italian', votes: 3 },
      { id: 'opt-2', text: 'Japanese', votes: 5 },
      { id: 'opt-3', text: 'Mexican', votes: 2 },
    ],
    totalVotes: 10,
    createdBy: 'Alice',
    createdAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render poll question', () => {
      render(<PollCard {...defaultProps} />);

      expect(screen.getByText('Where should we go for dinner?')).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(<PollCard {...defaultProps} />);

      expect(screen.getByText('Italian')).toBeInTheDocument();
      expect(screen.getByText('Japanese')).toBeInTheDocument();
      expect(screen.getByText('Mexican')).toBeInTheDocument();
    });

    it('should render total votes', () => {
      render(<PollCard {...defaultProps} />);

      expect(screen.getByText('10 votes')).toBeInTheDocument();
    });

    it('should render creator name', () => {
      render(<PollCard {...defaultProps} />);

      expect(screen.getByText('By Alice')).toBeInTheDocument();
    });
  });

  describe('status', () => {
    it('should display Open status by default', () => {
      render(<PollCard {...defaultProps} />);

      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('should display Closed status when closed', () => {
      render(<PollCard {...defaultProps} status="closed" />);

      expect(screen.getByText('Closed')).toBeInTheDocument();
    });

    it('should apply closed class when status is closed', () => {
      render(<PollCard {...defaultProps} status="closed" />);

      expect(screen.getByTestId('poll-card')).toHaveClass('poll-card-closed');
    });
  });

  describe('user vote', () => {
    it('should highlight selected option', () => {
      render(<PollCard {...defaultProps} userVote="opt-1" />);

      const selectedOption = screen.getByTestId('poll-option-opt-1');
      expect(selectedOption).toHaveClass('poll-option-selected');
    });

    it('should not highlight non-selected options', () => {
      render(<PollCard {...defaultProps} userVote="opt-1" />);

      const otherOption = screen.getByTestId('poll-option-opt-2');
      expect(otherOption).not.toHaveClass('poll-option-selected');
    });
  });

  describe('results', () => {
    it('should show results when showResults is true', () => {
      render(<PollCard {...defaultProps} showResults />);

      expect(screen.getByText('3 votes')).toBeInTheDocument();
      expect(screen.getByText('5 votes')).toBeInTheDocument();
      expect(screen.getByText('2 votes')).toBeInTheDocument();
    });

    it('should show percentages when showResults is true', () => {
      render(<PollCard {...defaultProps} showResults />);

      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('should not show results when showResults is false', () => {
      render(<PollCard {...defaultProps} showResults={false} />);

      expect(screen.queryByText('30%')).not.toBeInTheDocument();
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should handle zero total votes', () => {
      render(
        <PollCard
          {...defaultProps}
          options={[
            { id: 'opt-1', text: 'Option A', votes: 0 },
            { id: 'opt-2', text: 'Option B', votes: 0 },
          ]}
          totalVotes={0}
          showResults
        />
      );

      expect(screen.getAllByText('0%')).toHaveLength(2);
    });
  });

  describe('voting', () => {
    it('should call onVote when option clicked on open poll', () => {
      render(<PollCard {...defaultProps} onVote={mockOnVote} />);

      fireEvent.click(screen.getByTestId('poll-option-opt-2'));

      expect(mockOnVote).toHaveBeenCalledWith('opt-2');
    });

    it('should not call onVote when option clicked on closed poll', () => {
      render(<PollCard {...defaultProps} status="closed" onVote={mockOnVote} />);

      fireEvent.click(screen.getByTestId('poll-option-opt-2'));

      expect(mockOnVote).not.toHaveBeenCalled();
    });

    it('should not call onVote when onVote is not provided', () => {
      render(<PollCard {...defaultProps} />);

      fireEvent.click(screen.getByTestId('poll-option-opt-2'));

      expect(mockOnVote).not.toHaveBeenCalled();
    });

    it('should apply disabled class to options when poll is closed', () => {
      render(<PollCard {...defaultProps} status="closed" />);

      expect(screen.getByTestId('poll-option-opt-1')).toHaveClass('poll-option-disabled');
      expect(screen.getByTestId('poll-option-opt-2')).toHaveClass('poll-option-disabled');
      expect(screen.getByTestId('poll-option-opt-3')).toHaveClass('poll-option-disabled');
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<PollCard {...defaultProps} className="custom-class" />);

      expect(screen.getByTestId('poll-card')).toHaveClass('custom-class');
    });
  });
});
