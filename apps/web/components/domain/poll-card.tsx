'use client';

import React, { forwardRef } from 'react';

export type PollStatus = 'open' | 'closed';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  createdBy: string;
  createdAt: Date;
  status?: PollStatus;
  showResults?: boolean;
  userVote?: string;
  onVote?: (optionId: string) => void;
}

export const PollCard = forwardRef<HTMLDivElement, PollCardProps>(
  function PollCard(
    {
      id,
      question,
      options,
      totalVotes,
      createdBy,
      createdAt,
      status = 'open',
      showResults = false,
      userVote,
      onVote,
      className = '',
      ...props
    },
    ref
  ) {
    function getPercentage(votes: number): number {
      if (totalVotes === 0) return 0;
      return Math.round((votes / totalVotes) * 100);
    }

    function handleOptionClick(optionId: string): void {
      if (status === 'open' && onVote) {
        onVote(optionId);
      }
    }

    return (
      <div
        ref={ref}
        className={`poll-card ${status === 'closed' ? 'poll-card-closed' : ''} ${className}`}
        data-testid="poll-card"
        {...props}
      >
        <div className="poll-card-header">
          <h3 className="poll-card-question">{question}</h3>
          <span className={`poll-card-status poll-card-status-${status}`}>
            {status === 'open' ? 'Open' : 'Closed'}
          </span>
        </div>

        <div className="poll-card-options">
          {options.map((option) => (
            <div
              key={option.id}
              className={`poll-option ${userVote === option.id ? 'poll-option-selected' : ''} ${status === 'closed' ? 'poll-option-disabled' : ''}`}
              data-testid={`poll-option-${option.id}`}
              onClick={() => handleOptionClick(option.id)}
            >
              <span className="poll-option-text">{option.text}</span>
              {showResults && (
                <div className="poll-option-results">
                  <span className="poll-option-votes">{option.votes} votes</span>
                  <span className="poll-option-percentage">{getPercentage(option.votes)}%</span>
                  <div
                    className="poll-option-bar"
                    style={{ width: `${getPercentage(option.votes)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="poll-card-footer">
          <span className="poll-card-total">{totalVotes} votes</span>
          <span className="poll-card-separator">•</span>
          <span className="poll-card-creator">By {createdBy}</span>
        </div>
      </div>
    );
  }
);
