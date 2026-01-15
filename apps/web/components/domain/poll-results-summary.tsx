'use client';

import React, { useMemo } from 'react';

interface ResultOption {
  optionId: string;
  optionText: string;
  votes: number;
}

type PollStatus = 'open' | 'closed';

interface PollResultsSummaryProps {
  results: ResultOption[];
  totalVotes: number;
  question?: string;
  status?: PollStatus;
  className?: string;
}

export function PollResultsSummary({
  results,
  totalVotes,
  question,
  status,
  className = '',
}: PollResultsSummaryProps) {
  // Sort results by votes (highest first) and find winners
  const { sortedResults, maxVotes } = useMemo(() => {
    const sorted = [...results].sort((a, b) => b.votes - a.votes);
    const max = sorted.length > 0 ? sorted[0].votes : 0;
    return { sortedResults: sorted, maxVotes: max };
  }, [results]);

  const getPercentage = (votes: number): number => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const isWinner = (votes: number): boolean => {
    return votes > 0 && votes === maxVotes;
  };

  if (results.length === 0) {
    return (
      <div
        className={`poll-results-summary poll-results-empty ${className}`}
        data-testid="poll-results-summary"
      >
        <p className="no-results-message">No results available</p>
      </div>
    );
  }

  return (
    <div
      className={`poll-results-summary ${className}`}
      data-testid="poll-results-summary"
    >
      {question && <h3 className="results-question">{question}</h3>}

      {status && (
        <span className={`results-status results-status-${status}`}>
          {status === 'open' ? 'Open' : 'Closed'}
        </span>
      )}

      <div className="results-list">
        {sortedResults.map((result) => {
          const percentage = getPercentage(result.votes);
          const isOptionWinner = isWinner(result.votes);

          return (
            <div
              key={result.optionId}
              className={`result-item ${isOptionWinner ? 'winner' : ''}`}
              data-testid={`result-${result.optionId}`}
            >
              <div className="result-header">
                <span className="result-text">{result.optionText}</span>
                {isOptionWinner && (
                  <span className="winner-badge">Winner</span>
                )}
              </div>

              <div className="result-bar-container">
                <div
                  className="result-progress-bar"
                  data-testid={`progress-bar-${result.optionId}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="result-stats">
                <span className="result-votes">{result.votes} votes</span>
                <span className="result-percentage">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="results-footer">
        <span className="results-total">{totalVotes} total votes</span>
      </div>
    </div>
  );
}

export type { PollResultsSummaryProps, ResultOption, PollStatus };
