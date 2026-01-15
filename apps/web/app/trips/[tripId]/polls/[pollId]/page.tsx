'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PollVotingCard, PollAdminActions } from '@/components/domain';
import { Spinner, Button } from '@/components/ui';
import { PageHeader } from '@/components/navigation';

interface PollOption {
  id: string;
  text: string;
}

interface VoteCount {
  optionId: string;
  optionText: string;
  votes: number;
}

interface Poll {
  _id: string;
  tripId: string;
  question: string;
  options: PollOption[];
  voteCounts: VoteCount[];
  status: 'open' | 'closed';
  myVote: { optionId: string } | null;
  allowMultiple?: boolean;
  closesAt?: string;
  createdAt: string;
}

interface Attendee {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const pollId = params.pollId as string;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const fetchPoll = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/polls/${pollId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load poll');
      }

      setPoll(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load poll');
    }
  }, [tripId, pollId]);

  const fetchAttendee = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/me`);
      const data = await response.json();

      if (response.ok) {
        setAttendee(data.data);
      }
    } catch {
      // Silently fail - user just won't see admin features
    }
  }, [tripId]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      await Promise.all([fetchPoll(), fetchAttendee()]);

      setLoading(false);
    }

    loadData();
  }, [fetchPoll, fetchAttendee]);

  const handleVote = useCallback(
    async (optionId: string | string[]) => {
      if (isVoting || !poll) return;

      setIsVoting(true);

      try {
        const response = await fetch(`/api/trips/${tripId}/polls/${pollId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            optionId: Array.isArray(optionId) ? optionId[0] : optionId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to vote');
        }

        // Refresh poll data
        await fetchPoll();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to vote');
      } finally {
        setIsVoting(false);
      }
    },
    [tripId, pollId, poll, isVoting, fetchPoll]
  );

  const handleClose = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/polls/${pollId}/close`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to close poll');
      }

      // Refresh poll data
      await fetchPoll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close poll');
    }
  }, [tripId, pollId, fetchPoll]);

  const handleDelete = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/polls/${pollId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete poll');
      }

      router.push(`/trips/${tripId}/polls`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete poll');
    }
  }, [tripId, pollId, router]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    Promise.all([fetchPoll(), fetchAttendee()]).finally(() => setLoading(false));
  }, [fetchPoll, fetchAttendee]);

  if (loading) {
    return (
      <div className="poll-detail-loading" data-testid="poll-detail-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="poll-detail-error" data-testid="poll-detail-error">
        <p>{error || 'Poll not found'}</p>
        <Button onClick={handleRetry}>Retry</Button>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  // Transform poll data for PollVotingCard
  const pollOptions = poll.voteCounts.map((vc) => ({
    id: vc.optionId,
    text: vc.optionText,
    votes: vc.votes,
  }));

  const totalVotes = poll.voteCounts.reduce((sum, vc) => sum + vc.votes, 0);
  const isAdmin = attendee?.role === 'admin';

  return (
    <div className="poll-detail-page" data-testid="poll-detail-page">
      <PageHeader
        title="Poll"
        subtitle={poll.question}
        showBack
        onBack={() => router.back()}
      />

      <div className="poll-detail-content">
        <PollVotingCard
          id={poll._id}
          question={poll.question}
          options={pollOptions}
          totalVotes={totalVotes}
          status={poll.status}
          showResults={poll.status === 'closed' || !!poll.myVote}
          userVote={poll.myVote?.optionId}
          allowMultiple={poll.allowMultiple}
          onVote={handleVote}
          className="poll-detail-voting-card"
        />

        <div className="poll-detail-meta">
          <span className="poll-votes-count">{totalVotes} votes</span>
          <span className={`poll-status poll-status-${poll.status}`}>
            {poll.status === 'open' ? 'Open' : 'Closed'}
          </span>
        </div>

        {isAdmin && (
          <PollAdminActions
            pollId={poll._id}
            status={poll.status}
            isAdmin={isAdmin}
            onClose={handleClose}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
