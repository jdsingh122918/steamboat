'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PollCard } from '@/components/domain';
import type { PollOption, PollStatus } from '@/components/domain';

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  status: PollStatus;
  createdBy: string;
  createdAt: string;
  userVote?: string;
}

type FilterStatus = 'all' | 'open' | 'closed';

export default function PollsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchPolls = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/polls`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch polls');
      }

      setPolls(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load polls');
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  const fetchUserRole = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/attendees/me`);
      const data = await response.json();

      if (response.ok && data.success) {
        setIsAdmin(data.data.role === 'admin');
      }
    } catch {
      // Silently fail - user just won't see admin features
    }
  }, [tripId]);

  useEffect(() => {
    fetchPolls();
    fetchUserRole();
  }, [fetchPolls, fetchUserRole]);

  const handleVote = useCallback(
    async (pollId: string, optionId: string) => {
      try {
        const response = await fetch(`/api/trips/${tripId}/polls/${pollId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optionId }),
        });

        if (!response.ok) {
          throw new Error('Failed to vote');
        }

        // Refresh polls to get updated vote counts
        await fetchPolls();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit vote');
      }
    },
    [tripId, fetchPolls]
  );

  const handleCreatePoll = useCallback(() => {
    router.push(`/trips/${tripId}/polls/new`);
  }, [router, tripId]);

  const filteredPolls = polls.filter((poll) => {
    if (filter === 'all') return true;
    return poll.status === filter;
  });

  const openCount = polls.filter((p) => p.status === 'open').length;
  const closedCount = polls.filter((p) => p.status === 'closed').length;

  if (isLoading) {
    return (
      <div className="polls-page" data-testid="polls-page">
        <div className="polls-loading">Loading polls...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="polls-page" data-testid="polls-page">
        <div className="polls-error" role="alert">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="polls-page" data-testid="polls-page">
      <div className="polls-header">
        <div className="polls-title-section">
          <h1 className="polls-title">Polls</h1>
          <span className="polls-count">{polls.length} polls</span>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleCreatePoll}
            className="create-poll-button"
          >
            Create Poll
          </button>
        )}
      </div>

      <div className="polls-filters">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
        >
          All ({polls.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('open')}
          className={`filter-button ${filter === 'open' ? 'active' : ''}`}
        >
          Open ({openCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('closed')}
          className={`filter-button ${filter === 'closed' ? 'active' : ''}`}
        >
          Closed ({closedCount})
        </button>
      </div>

      {filteredPolls.length === 0 ? (
        <div className="polls-empty">
          <p>No polls found</p>
          {isAdmin && filter === 'all' && (
            <p>Create a poll to get input from the group!</p>
          )}
        </div>
      ) : (
        <div className="polls-list">
          {filteredPolls.map((poll) => (
            <PollCard
              key={poll.id}
              id={poll.id}
              question={poll.question}
              options={poll.options}
              totalVotes={poll.totalVotes}
              status={poll.status}
              createdBy={poll.createdBy}
              createdAt={new Date(poll.createdAt)}
              showResults={poll.status === 'closed' || !!poll.userVote}
              userVote={poll.userVote}
              onVote={(optionId) => handleVote(poll.id, optionId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
