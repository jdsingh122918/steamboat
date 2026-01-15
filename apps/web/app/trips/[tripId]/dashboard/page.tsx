'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Spinner, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { PageHeader } from '@/components/navigation';
import { AttendeeCard, ActivityCard } from '@/components/domain';
import { formatCurrency } from '@/lib/utils/format';

interface Attendee {
  id: string;
  name: string;
  role: 'organizer' | 'attendee';
  avatarUrl?: string;
}

interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  attendees: Attendee[];
}

interface Balance {
  attendeeId: string;
  balance: number;
}

interface BalanceData {
  balances: Balance[];
  summary: {
    totalExpenses: number;
    expenseCount: number;
  };
}

interface Activity {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  rsvpCount: {
    yes: number;
    no: number;
    maybe: number;
  };
}

interface ActivityData {
  activities: Activity[];
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [activities, setActivities] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [tripRes, balancesRes, activitiesRes] = await Promise.all([
          fetch(`/api/trips/${tripId}`),
          fetch(`/api/trips/${tripId}/expenses/balances`),
          fetch(`/api/trips/${tripId}/activities`),
        ]);

        if (!tripRes.ok) {
          throw new Error('Failed to load trip');
        }

        const tripData = await tripRes.json();
        setTrip(tripData.data);

        if (balancesRes.ok) {
          const balanceData = await balancesRes.json();
          setBalances(balanceData.data);
        }

        if (activitiesRes.ok) {
          const activityData = await activitiesRes.json();
          setActivities(activityData.data);
        }
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tripId]);

  if (loading) {
    return (
      <div className="dashboard-loading" data-testid="dashboard-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error" data-testid="dashboard-error">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const attendeeBalanceMap = new Map(
    balances?.balances.map((b) => [b.attendeeId, b.balance]) || []
  );

  return (
    <div className="dashboard-page" data-testid="dashboard-page">
      <PageHeader
        title={trip.name}
        subtitle={`${trip.startDate} - ${trip.endDate}`}
        actions={
          <div className="dashboard-quick-actions">
            <Button variant="outline" size="sm" onClick={() => router.push(`/trips/${tripId}/expenses/new`)}>
              Add Expense
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/trips/${tripId}/activities/new`)}>
              Add Activity
            </Button>
          </div>
        }
      />

      <div className="dashboard-content">
        <div className="dashboard-grid">
          {/* Balance Overview */}
          <Card className="dashboard-card" data-testid="balance-overview">
            <CardHeader>
              <CardTitle>Balance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="balance-summary">
                <div className="balance-stat">
                  <span className="balance-stat-value">
                    {balances ? formatCurrency(balances.summary.totalExpenses) : '$0.00'}
                  </span>
                  <span className="balance-stat-label">Total Expenses</span>
                </div>
                <div className="balance-stat">
                  <span className="balance-stat-value">
                    {balances?.summary.expenseCount || 0} expenses
                  </span>
                  <span className="balance-stat-label">Recorded</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendees Section */}
          <Card className="dashboard-card" data-testid="attendees-section">
            <CardHeader>
              <CardTitle>Attendees ({trip.attendees.length} attendees)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="attendees-list">
                {trip.attendees.map((attendee) => (
                  <AttendeeCard
                    key={attendee.id}
                    id={attendee.id}
                    name={attendee.name}
                    role={attendee.role}
                    avatarUrl={attendee.avatarUrl}
                    balance={attendeeBalanceMap.get(attendee.id)}
                    onClick={() => router.push(`/trips/${tripId}/attendees/${attendee.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Activities */}
          <Card className="dashboard-card" data-testid="activities-section">
            <CardHeader>
              <CardTitle>Upcoming Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {activities?.activities && activities.activities.length > 0 ? (
                <div className="activities-list">
                  {activities.activities.slice(0, 3).map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      id={activity.id}
                      title={activity.title}
                      date={new Date(activity.date)}
                      time={activity.time}
                      location={activity.location || ''}
                      rsvpCount={activity.rsvpCount}
                      onClick={() => router.push(`/trips/${tripId}/activities/${activity.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="no-activities">No upcoming activities</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
