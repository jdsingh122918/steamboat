import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PollVotingCard } from '../poll-voting-card';

describe('PollVotingCard', () => {
  const mockOnVote = vi.fn();
  const defaultProps = {
    id: 'poll-123',
    question: 'What is your favorite color?',
    options: [
      { id: 'opt-1', text: 'Red', votes: 3 },
      { id: 'opt-2', text: 'Blue', votes: 5 },
      { id: 'opt-3', text: 'Green', votes: 2 },
    ],
    totalVotes: 10,
    status: 'open' as const,
    onVote: mockOnVote,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnVote.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render poll question', () => {
      render(<PollVotingCard {...defaultProps} />);

      expect(screen.getByText(/what is your favorite color/i)).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(<PollVotingCard {...defaultProps} />);

      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getByText('Blue')).toBeInTheDocument();
      expect(screen.getByText('Green')).toBeInTheDocument();
    });

    it('should highlight user selected option', () => {
      render(<PollVotingCard {...defaultProps} userVote="opt-1" />);

      const selectedOption = screen.getByTestId('poll-option-opt-1');
      expect(selectedOption).toHaveClass('selected');
    });

    it('should show total vote count', () => {
      render(<PollVotingCard {...defaultProps} />);

      expect(screen.getByText(/10 votes/i)).toBeInTheDocument();
    });

    it('should show status badge', () => {
      render(<PollVotingCard {...defaultProps} />);

      expect(screen.getByText(/open/i)).toBeInTheDocument();
    });
  });

  describe('voting', () => {
    it('should call onVote with option id on click', async () => {
      render(<PollVotingCard {...defaultProps} />);

      fireEvent.click(screen.getByTestId('poll-option-opt-2'));

      await waitFor(() => {
        expect(mockOnVote).toHaveBeenCalledWith('opt-2');
      });
    });

    it('should allow changing vote', async () => {
      render(<PollVotingCard {...defaultProps} userVote="opt-1" />);

      // Click a different option
      fireEvent.click(screen.getByTestId('poll-option-opt-3'));

      await waitFor(() => {
        expect(mockOnVote).toHaveBeenCalledWith('opt-3');
      });
    });

    it('should disable voting on closed polls', () => {
      render(<PollVotingCard {...defaultProps} status="closed" />);

      const option = screen.getByTestId('poll-option-opt-1');
      fireEvent.click(option);

      expect(mockOnVote).not.toHaveBeenCalled();
    });

    it('should show loading state while voting', async () => {
      mockOnVote.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<PollVotingCard {...defaultProps} />);

      fireEvent.click(screen.getByTestId('poll-option-opt-1'));

      await waitFor(() => {
        expect(screen.getByText(/voting/i)).toBeInTheDocument();
      });
    });
  });

  describe('multiple votes', () => {
    it('should allow multiple selections when allowMultiple', async () => {
      render(<PollVotingCard {...defaultProps} allowMultiple />);

      fireEvent.click(screen.getByTestId('poll-option-opt-1'));

      await waitFor(() => {
        expect(mockOnVote).toHaveBeenCalledWith(['opt-1']);
      });

      // Wait for the component to re-render with the updated selection
      // by checking that the first option shows the checkmark
      await waitFor(() => {
        expect(screen.getByTestId('poll-option-opt-1')).toHaveClass('selected');
      });

      // Click another option
      fireEvent.click(screen.getByTestId('poll-option-opt-2'));

      // Should include both options
      await waitFor(() => {
        expect(mockOnVote).toHaveBeenLastCalledWith(
          expect.arrayContaining(['opt-1', 'opt-2'])
        );
      });
    });

    it('should toggle selection on click', async () => {
      render(
        <PollVotingCard
          {...defaultProps}
          allowMultiple
          userVotes={['opt-1']}
        />
      );

      // Click to deselect
      fireEvent.click(screen.getByTestId('poll-option-opt-1'));

      await waitFor(() => {
        expect(mockOnVote).toHaveBeenCalledWith([]);
      });
    });
  });

  describe('results display', () => {
    it('should show results after voting', () => {
      render(<PollVotingCard {...defaultProps} userVote="opt-1" showResults />);

      // Should show vote counts
      expect(screen.getByText(/3 votes/i)).toBeInTheDocument();
      expect(screen.getByText(/5 votes/i)).toBeInTheDocument();
    });

    it('should display vote percentage bars', () => {
      render(<PollVotingCard {...defaultProps} userVote="opt-1" showResults />);

      // Check that percentage bars exist
      const bars = screen.getAllByTestId(/option-bar/);
      expect(bars.length).toBeGreaterThan(0);
    });

    it('should highlight winning option', () => {
      render(<PollVotingCard {...defaultProps} status="closed" showResults />);

      // Blue has most votes (5)
      const blueOption = screen.getByTestId('poll-option-opt-2');
      expect(blueOption).toHaveClass('winner');
    });

    it('should show percentages', () => {
      render(<PollVotingCard {...defaultProps} showResults />);

      // 5/10 = 50% for Blue
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
  });

  describe('closed poll', () => {
    it('should show closed status', () => {
      render(<PollVotingCard {...defaultProps} status="closed" />);

      expect(screen.getByText(/closed/i)).toBeInTheDocument();
    });

    it('should always show results when closed', () => {
      render(<PollVotingCard {...defaultProps} status="closed" />);

      // Should show vote counts
      expect(screen.getByText(/3 votes/)).toBeInTheDocument();
    });

    it('should not allow voting', () => {
      render(<PollVotingCard {...defaultProps} status="closed" />);

      const option = screen.getByTestId('poll-option-opt-1');
      expect(option).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
