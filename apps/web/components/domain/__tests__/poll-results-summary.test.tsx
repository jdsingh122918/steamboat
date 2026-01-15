import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PollResultsSummary } from '../poll-results-summary';

const mockResults = [
  { optionId: 'opt-1', optionText: 'Italian', votes: 5 },
  { optionId: 'opt-2', optionText: 'Mexican', votes: 3 },
  { optionId: 'opt-3', optionText: 'Thai', votes: 2 },
];

describe('PollResultsSummary', () => {
  describe('rendering', () => {
    it('should render all options', () => {
      render(<PollResultsSummary results={mockResults} totalVotes={10} />);

      expect(screen.getByText('Italian')).toBeInTheDocument();
      expect(screen.getByText('Mexican')).toBeInTheDocument();
      expect(screen.getByText('Thai')).toBeInTheDocument();
    });

    it('should display vote counts for each option', () => {
      render(<PollResultsSummary results={mockResults} totalVotes={10} />);

      expect(screen.getByText(/5 votes/i)).toBeInTheDocument();
      expect(screen.getByText(/3 votes/i)).toBeInTheDocument();
      expect(screen.getByText(/2 votes/i)).toBeInTheDocument();
    });

    it('should display percentages for each option', () => {
      render(<PollResultsSummary results={mockResults} totalVotes={10} />);

      expect(screen.getByText(/50%/)).toBeInTheDocument();
      expect(screen.getByText(/30%/)).toBeInTheDocument();
      expect(screen.getByText(/20%/)).toBeInTheDocument();
    });

    it('should display total votes', () => {
      render(<PollResultsSummary results={mockResults} totalVotes={10} />);

      expect(screen.getByText(/10 total votes/i)).toBeInTheDocument();
    });
  });

  describe('winner highlighting', () => {
    it('should highlight the winning option', () => {
      render(<PollResultsSummary results={mockResults} totalVotes={10} />);

      const winnerElement = screen.getByTestId('result-opt-1');
      expect(winnerElement).toHaveClass('winner');
    });

    it('should show winner badge on highest vote option', () => {
      render(<PollResultsSummary results={mockResults} totalVotes={10} />);

      expect(screen.getByText(/winner/i)).toBeInTheDocument();
    });

    it('should handle tie for winner', () => {
      const tieResults = [
        { optionId: 'opt-1', optionText: 'Italian', votes: 5 },
        { optionId: 'opt-2', optionText: 'Mexican', votes: 5 },
        { optionId: 'opt-3', optionText: 'Thai', votes: 2 },
      ];

      render(<PollResultsSummary results={tieResults} totalVotes={12} />);

      // Both tied options should have winner class
      const italianElement = screen.getByTestId('result-opt-1');
      const mexicanElement = screen.getByTestId('result-opt-2');

      expect(italianElement).toHaveClass('winner');
      expect(mexicanElement).toHaveClass('winner');
    });
  });

  describe('progress bars', () => {
    it('should render progress bars for each option', () => {
      render(<PollResultsSummary results={mockResults} totalVotes={10} />);

      const progressBars = screen.getAllByTestId(/progress-bar/);
      expect(progressBars).toHaveLength(3);
    });

    it('should set progress bar width based on percentage', () => {
      render(<PollResultsSummary results={mockResults} totalVotes={10} />);

      const italianBar = screen.getByTestId('progress-bar-opt-1');
      expect(italianBar).toHaveStyle({ width: '50%' });
    });
  });

  describe('empty state', () => {
    it('should handle zero total votes', () => {
      const emptyResults = [
        { optionId: 'opt-1', optionText: 'Italian', votes: 0 },
        { optionId: 'opt-2', optionText: 'Mexican', votes: 0 },
      ];

      render(<PollResultsSummary results={emptyResults} totalVotes={0} />);

      expect(screen.getByText(/0 total votes/i)).toBeInTheDocument();
      expect(screen.getAllByText(/0%/)).toHaveLength(2);
    });

    it('should render empty results message when no options', () => {
      render(<PollResultsSummary results={[]} totalVotes={0} />);

      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('should display results sorted by votes (highest first)', () => {
      const unsortedResults = [
        { optionId: 'opt-3', optionText: 'Thai', votes: 2 },
        { optionId: 'opt-1', optionText: 'Italian', votes: 5 },
        { optionId: 'opt-2', optionText: 'Mexican', votes: 3 },
      ];

      render(<PollResultsSummary results={unsortedResults} totalVotes={10} />);

      const items = screen.getAllByTestId(/result-opt/);
      expect(items[0]).toHaveAttribute('data-testid', 'result-opt-1'); // Italian (5)
      expect(items[1]).toHaveAttribute('data-testid', 'result-opt-2'); // Mexican (3)
      expect(items[2]).toHaveAttribute('data-testid', 'result-opt-3'); // Thai (2)
    });
  });

  describe('question display', () => {
    it('should display question when provided', () => {
      render(
        <PollResultsSummary
          results={mockResults}
          totalVotes={10}
          question="Where should we eat?"
        />
      );

      expect(screen.getByText('Where should we eat?')).toBeInTheDocument();
    });
  });

  describe('status display', () => {
    it('should show closed badge when status is closed', () => {
      render(
        <PollResultsSummary
          results={mockResults}
          totalVotes={10}
          status="closed"
        />
      );

      expect(screen.getByText(/closed/i)).toBeInTheDocument();
    });

    it('should show open badge when status is open', () => {
      render(
        <PollResultsSummary
          results={mockResults}
          totalVotes={10}
          status="open"
        />
      );

      expect(screen.getByText(/open/i)).toBeInTheDocument();
    });
  });
});
