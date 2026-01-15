'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Spinner, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { PageHeader } from '@/components/navigation';
import { formatCurrency } from '@/lib/utils/format';

interface Trip {
  _id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
}

interface Expense {
  id: string;
  description: string;
  amount_cents: number;
  category: string;
}

interface Media {
  _id: string;
  type: 'image' | 'video';
  url?: string;
  thumbnailUrl: string;
}

interface PollOption {
  text: string;
  votes: number;
}

interface Poll {
  _id: string;
  question: string;
  status: 'open' | 'closed';
  options: PollOption[];
}

interface Attendee {
  _id: string;
  name: string;
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const endStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${startStr} - ${endStr}`;
}

function getWinningOption(poll: Poll): string {
  if (!poll.options || poll.options.length === 0) return 'No votes';

  const winner = poll.options.reduce((max, option) =>
    option.votes > max.votes ? option : max
  );

  return winner.text;
}

function getTotalVotes(poll: Poll): number {
  if (!poll.options) return 0;
  return poll.options.reduce((sum, option) => sum + option.votes, 0);
}

export default function RecapPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [tripRes, expensesRes, mediaRes, pollsRes, attendeesRes] = await Promise.all([
          fetch(`/api/trips/${tripId}`),
          fetch(`/api/trips/${tripId}/expenses`),
          fetch(`/api/trips/${tripId}/media`),
          fetch(`/api/trips/${tripId}/polls`),
          fetch(`/api/trips/${tripId}/attendees`),
        ]);

        if (!tripRes.ok) {
          throw new Error('Failed to load trip');
        }

        const tripData = await tripRes.json();
        setTrip(tripData.data);

        if (expensesRes.ok) {
          const expensesData = await expensesRes.json();
          setExpenses(expensesData.data?.expenses || []);
        }

        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          setMedia(mediaData.data || []);
        }

        if (pollsRes.ok) {
          const pollsData = await pollsRes.json();
          setPolls(pollsData.data || []);
        }

        if (attendeesRes.ok) {
          const attendeesData = await attendeesRes.json();
          setAttendees(attendeesData.data || []);
        }
      } catch (err) {
        setError('Failed to load trip recap');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tripId]);

  const summary = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount_cents, 0);
    return {
      totalExpenses,
      expenseCount: expenses.length,
      attendeeCount: attendees.length,
      photoCount: media.filter((m) => m.type === 'image').length,
      closedPollCount: polls.filter((p) => p.status === 'closed').length,
      perPersonAverage: Math.round(totalExpenses / Math.max(attendees.length, 1)),
    };
  }, [expenses, attendees, media, polls]);

  const featuredPhotos = useMemo(() => {
    return media.filter((m) => m.type === 'image').slice(0, 12);
  }, [media]);

  const closedPolls = useMemo(() => {
    return polls
      .filter((p) => p.status === 'closed')
      .map((p) => ({
        question: p.question,
        winningOption: getWinningOption(p),
        totalVotes: getTotalVotes(p),
      }));
  }, [polls]);

  if (loading) {
    return (
      <div className="recap-loading" data-testid="recap-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="recap-error" data-testid="recap-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="recap-page" data-testid="recap-page">
      <PageHeader title="Trip Recap" subtitle="Your trip memories" />

      <div className="recap-content" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 16 }}>
        {/* Trip Summary Card */}
        <Card data-testid="trip-summary-card">
          <CardHeader>
            <CardTitle>{trip?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trip?.startDate && trip?.endDate && (
                <p style={{ color: '#666' }}>{formatDateRange(trip.startDate, trip.endDate)}</p>
              )}
              {trip?.location && <p style={{ color: '#666' }}>{trip.location}</p>}
              <p style={{ color: '#666' }}>{summary.attendeeCount} attendees</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card data-testid="financial-summary-card">
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.expenseCount > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p>
                  <strong>Total:</strong> {formatCurrency(summary.totalExpenses / 100)}
                </p>
                <p>
                  <strong>Per person:</strong> {formatCurrency(summary.perPersonAverage / 100)}
                </p>
                <p style={{ color: '#666' }}>{summary.expenseCount} expenses tracked</p>
              </div>
            ) : (
              <p style={{ color: '#666' }}>No expenses recorded</p>
            )}
          </CardContent>
        </Card>

        {/* Photo Highlights */}
        <div data-testid="photo-highlights">
          <h2 style={{ marginBottom: 16 }}>Photo Highlights</h2>
          {featuredPhotos.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 12,
              }}
            >
              {featuredPhotos.map((photo) => (
                <img
                  key={photo._id}
                  src={photo.thumbnailUrl}
                  alt=""
                  style={{
                    width: '100%',
                    aspectRatio: '1/1',
                    objectFit: 'cover',
                    borderRadius: 8,
                  }}
                />
              ))}
            </div>
          ) : (
            <p style={{ color: '#666' }}>No photos uploaded</p>
          )}
        </div>

        {/* Poll Decisions */}
        <div data-testid="poll-decisions">
          <h2 style={{ marginBottom: 16 }}>Decisions Made</h2>
          {closedPolls.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {closedPolls.map((poll, i) => (
                <Card key={i}>
                  <CardContent style={{ padding: 16 }}>
                    <p style={{ fontWeight: 500 }}>{poll.question}</p>
                    <p style={{ color: '#666', marginTop: 4 }}>
                      Decided: <strong>{poll.winningOption}</strong> ({poll.totalVotes} votes)
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666' }}>No polls closed yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
