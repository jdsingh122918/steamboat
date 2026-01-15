'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PollCreationForm } from '@/components/domain';
import { Spinner } from '@/components/ui';
import { PageHeader } from '@/components/navigation';

interface Attendee {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface PollData {
  question: string;
  options: string[];
  allowMultiple?: boolean;
  closesAt?: string;
}

export default function NewPollPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/trips/${tripId}/me`);
        if (!response.ok) {
          throw new Error('Failed to authenticate');
        }

        const data = await response.json();
        setAttendee(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to authenticate');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [tripId]);

  const handleCreate = useCallback(
    async (data: PollData) => {
      setCreateError(null);

      const response = await fetch(`/api/trips/${tripId}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create poll');
      }

      router.push(`/trips/${tripId}/polls`);
    },
    [tripId, router]
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  if (loading) {
    return (
      <div className="new-poll-loading" data-testid="new-poll-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="new-poll-error" data-testid="new-poll-error">
        <p>{error}</p>
        <button type="button" onClick={() => router.back()}>
          Go Back
        </button>
      </div>
    );
  }

  if (!attendee || attendee.role !== 'admin') {
    return (
      <div className="new-poll-unauthorized" data-testid="new-poll-unauthorized">
        <h2>Unauthorized</h2>
        <p>Only trip admins can create polls.</p>
        <button type="button" onClick={() => router.back()}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="new-poll-page" data-testid="new-poll-page">
      <PageHeader
        title="Create Poll"
        subtitle="Get input from the group"
        showBack
        onBack={handleCancel}
      />

      <div className="new-poll-content">
        {createError && (
          <div className="new-poll-create-error" role="alert">
            {createError}
          </div>
        )}

        <PollCreationForm
          onCreate={handleCreate}
          onCancel={handleCancel}
          className="new-poll-form"
        />
      </div>
    </div>
  );
}
