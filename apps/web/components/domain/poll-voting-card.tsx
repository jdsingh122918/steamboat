'use client';

import React, { useState, useCallback } from 'react';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

type PollStatus = 'open' | 'closed';

interface PollVotingCardProps {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  status: PollStatus;
  showResults?: boolean;
  userVote?: string;
  userVotes?: string[];
  allowMultiple?: boolean;
  onVote: (optionId: string | string[]) => Promise<void>;
  className?: string;
}

export function PollVotingCard({
  id,
  question,
  options,
  totalVotes,
  status,
  showResults = false,
  userVote,
  userVotes = [],
  allowMultiple = false,
  onVote,
  className = '',
}: PollVotingCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    userVote ? [userVote] : userVotes
  );
  const [isVoting, setIsVoting] = useState(false);

  const isOpen = status === 'open';
  const shouldShowResults = showResults || !isOpen || selectedOptions.length > 0;

  const getPercentage = (votes: number): number => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const getWinningOptionId = (): string | null => {
    if (options.length === 0) return null;
    const maxVotes = Math.max(...options.map((o) => o.votes));
    const winner = options.find((o) => o.votes === maxVotes);
    return winner?.id || null;
  };

  const isSelected = (optionId: string): boolean => {
    return selectedOptions.includes(optionId);
  };

  const handleOptionClick = useCallback(
    async (optionId: string) => {
      if (!isOpen || isVoting) return;

      setIsVoting(true);

      try {
        if (allowMultiple) {
          let newSelection: string[];
          if (selectedOptions.includes(optionId)) {
            newSelection = selectedOptions.filter((id) => id !== optionId);
          } else {
            newSelection = [...selectedOptions, optionId];
          }
          setSelectedOptions(newSelection);
          await onVote(newSelection);
        } else {
          setSelectedOptions([optionId]);
          await onVote(optionId);
        }
      } catch {
        // Revert on error
        if (allowMultiple) {
          setSelectedOptions(userVotes);
        } else {
          setSelectedOptions(userVote ? [userVote] : []);
        }
      } finally {
        setIsVoting(false);
      }
    },
    [isOpen, isVoting, allowMultiple, selectedOptions, userVote, userVotes, onVote]
  );

  const winningOptionId = getWinningOptionId();

  return (
    <div
      className={`poll-voting-card ${!isOpen ? 'poll-closed' : ''} ${className}`}
      data-testid="poll-voting-card"
    >
      <div className="poll-header">
        <h3 className="poll-question">{question}</h3>
        <span className={`poll-status poll-status-${status}`}>
          {status === 'open' ? 'Open' : 'Closed'}
        </span>
      </div>

      <div className="poll-options">
        {options.map((option) => {
          const selected = isSelected(option.id);
          const percentage = getPercentage(option.votes);
          const isWinner = !isOpen && option.id === winningOptionId;

          return (
            <div
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              className={`poll-option ${selected ? 'selected' : ''} ${!isOpen ? 'disabled' : ''} ${isWinner ? 'winner' : ''}`}
              data-testid={`poll-option-${option.id}`}
              role="button"
              tabIndex={isOpen ? 0 : -1}
              aria-disabled={!isOpen}
              aria-selected={selected}
            >
              <div className="option-content">
                <span className="option-text">{option.text}</span>
                {selected && <span className="option-check">✓</span>}
              </div>

              {shouldShowResults && (
                <div className="option-results">
                  <div
                    className="option-bar"
                    style={{ width: `${percentage}%` }}
                    data-testid={`option-bar-${option.id}`}
                  />
                  <span className="option-votes">{option.votes} votes</span>
                  <span className="option-percentage">{percentage}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="poll-footer">
        <span className="poll-total">{totalVotes} votes</span>
        {isVoting && <span className="poll-voting-indicator">Voting...</span>}
      </div>
    </div>
  );
}

export type { PollVotingCardProps, PollOption, PollStatus };
