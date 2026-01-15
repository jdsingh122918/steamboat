'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Spinner, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { PageHeader } from '@/components/navigation';
import { ActivityCard } from '@/components/domain';
import { formatDate } from '@/lib/utils/format';

interface Activity {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  endTime?: string;
  location?: string;
  rsvpCount: { yes: number; no: number; maybe: number };
  linkedExpenseId?: string;
}

interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface ActivityData {
  activities: Activity[];
}

// Format time from 24h to 12h format
const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Format date for display (uses formatDate with custom options for headers)
const formatDateHeader = (dateStr: string): string => {
  return formatDate(dateStr, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

// Group activities by date
const groupActivitiesByDate = (activities: Activity[]): Map<string, Activity[]> => {
  const grouped = new Map<string, Activity[]>();

  activities.forEach((activity) => {
    const date = activity.date;
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(activity);
  });

  // Sort activities within each day by time
  grouped.forEach((dayActivities) => {
    dayActivities.sort((a, b) => a.time.localeCompare(b.time));
  });

  // Sort dates
  return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])));
};

export default function ItineraryPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [tripRes, activitiesRes] = await Promise.all([
          fetch(`/api/trips/${tripId}`),
          fetch(`/api/trips/${tripId}/activities`),
        ]);

        if (!tripRes.ok) {
          throw new Error('Failed to load trip');
        }

        const tripData = await tripRes.json();
        setTrip(tripData.data);

        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          setActivities(activitiesData.data);
        }
      } catch (err) {
        setError('Failed to load itinerary data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tripId]);

  const groupedActivities = useMemo(() => {
    if (!activities?.activities) return new Map();
    return groupActivitiesByDate(activities.activities);
  }, [activities]);

  if (loading) {
    return (
      <div className="itinerary-loading" data-testid="itinerary-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="itinerary-error" data-testid="itinerary-error">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="itinerary-page" data-testid="itinerary-page">
      <PageHeader
        title="Itinerary"
        subtitle={trip ? `${trip.name}` : 'Trip Schedule'}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/trips/${tripId}/activities/new`)}
          >
            Add Activity
          </Button>
        }
      />

      <div className="itinerary-content">
        {groupedActivities.size > 0 ? (
          <div className="itinerary-days">
            {Array.from(groupedActivities.entries()).map(([date, dayActivities]) => (
              <div key={date} className="itinerary-day">
                <h2 className="itinerary-day-header">{formatDateHeader(date)}</h2>
                <div className="itinerary-day-activities">
                  {dayActivities.map((activity: Activity) => (
                    <ActivityCard
                      key={activity.id}
                      id={activity.id}
                      title={activity.title}
                      date={new Date(activity.date + 'T12:00:00')}
                      time={formatTime(activity.time)}
                      location={activity.location || ''}
                      rsvpCount={activity.rsvpCount}
                      onClick={() => router.push(`/trips/${tripId}/activities/${activity.id}`)}
                      data-has-expense={activity.linkedExpenseId ? 'true' : 'false'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="itinerary-empty">
            <CardContent>
              <div className="itinerary-empty-content">
                <p className="itinerary-empty-text">No activities planned yet</p>
                <Button
                  variant="primary"
                  onClick={() => router.push(`/trips/${tripId}/activities/new`)}
                >
                  Add First Activity
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
