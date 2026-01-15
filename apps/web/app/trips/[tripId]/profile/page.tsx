'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button, Spinner, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { PageHeader } from '@/components/navigation';
import { PaymentProfileForm } from '@/components/domain';
import type { PaymentHandles } from '@/lib/db/models/attendee';

interface Attendee {
  _id: string;
  name: string;
  email: string;
  paymentHandles?: PaymentHandles;
}

export default function ProfilePage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/trips/${tripId}/me`);
        if (!response.ok) {
          throw new Error('Failed to load profile');
        }

        const data = await response.json();
        setAttendee(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [tripId]);

  const handleSavePaymentHandles = useCallback(
    async (handles: Partial<PaymentHandles>) => {
      if (!attendee) return;

      const response = await fetch(`/api/trips/${tripId}/attendees/${attendee._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentHandles: handles }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save payment handles');
      }

      const data = await response.json();
      setAttendee(data.data);
    },
    [tripId, attendee]
  );

  if (loading) {
    return (
      <div className="profile-loading" data-testid="profile-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-error" data-testid="profile-error">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!attendee) {
    return (
      <div className="profile-not-found" data-testid="profile-not-found">
        <p>Profile not found</p>
      </div>
    );
  }

  return (
    <div className="profile-page" data-testid="profile-page">
      <PageHeader title="My Profile" subtitle="Manage your profile and payment information" />

      <div className="profile-content">
        {/* Basic Info */}
        <Card className="profile-card">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="profile-info">
              <div className="profile-info-item">
                <span className="profile-info-label">Name</span>
                <span className="profile-info-value">{attendee.name}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Email</span>
                <span className="profile-info-value">{attendee.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Handles */}
        <Card className="profile-card">
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="profile-description">
              Add your payment handles so others can easily pay you back for expenses.
            </p>
            <PaymentProfileForm
              initialHandles={attendee.paymentHandles}
              onSave={handleSavePaymentHandles}
              className="profile-payment-form"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
