'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Spinner, Card, CardHeader, CardTitle, CardContent, Input, Checkbox } from '@/components/ui';
import { PageHeader } from '@/components/navigation';
import { DeleteTripModal } from '@/components/domain';

interface TripSettings {
  groomExemptCategories: string[];
  defaultInviteExpiration: number;
}

interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  settings?: TripSettings;
}

interface CurrentUser {
  id: string;
  role: 'organizer' | 'attendee';
}

const EXPENSE_CATEGORIES = [
  { value: 'lodging', label: 'Lodging' },
  { value: 'transport', label: 'Transport' },
  { value: 'dining', label: 'Dining' },
  { value: 'activities', label: 'Activities' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'other', label: 'Other' },
];

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    groomExemptCategories: [] as string[],
    defaultInviteExpiration: 14,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [tripRes, meRes] = await Promise.all([
          fetch(`/api/trips/${tripId}`),
          fetch(`/api/trips/${tripId}/me`),
        ]);

        if (!tripRes.ok) {
          throw new Error('Failed to load trip');
        }

        const tripData = await tripRes.json();
        setTrip(tripData.data);
        setFormData({
          name: tripData.data.name,
          location: tripData.data.location,
          startDate: tripData.data.startDate,
          endDate: tripData.data.endDate,
          groomExemptCategories: tripData.data.settings?.groomExemptCategories || [],
          defaultInviteExpiration: tripData.data.settings?.defaultInviteExpiration || 14,
        });

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.data);
        }
      } catch (err) {
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tripId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          startDate: formData.startDate,
          endDate: formData.endDate,
          settings: {
            groomExemptCategories: formData.groomExemptCategories,
            defaultInviteExpiration: formData.defaultInviteExpiration,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      groomExemptCategories: prev.groomExemptCategories.includes(category)
        ? prev.groomExemptCategories.filter((c) => c !== category)
        : [...prev.groomExemptCategories, category],
    }));
  };

  const isOrganizer = currentUser?.role === 'organizer';

  const handleTripDeleted = () => {
    setShowDeleteModal(false);
    router.push('/trips');
  };

  if (loading) {
    return (
      <div className="settings-loading" data-testid="settings-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-error" data-testid="settings-error">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="settings-page" data-testid="settings-page">
      <PageHeader
        title="Settings"
        subtitle="Manage trip settings"
      />

      <div className="settings-content">
        {/* Trip Info */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle>Trip Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-form">
              <Input
                label="Trip Name"
                id="trip-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                label="Location"
                id="trip-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
              <div className="settings-dates">
                <Input
                  label="Start Date"
                  id="start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
                <Input
                  label="End Date"
                  id="end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Groom Exemption */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle>Groom Exempt Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="settings-description">
              Select expense categories the groom is automatically exempt from.
            </p>
            <div className="settings-categories">
              {EXPENSE_CATEGORIES.map((category) => (
                <Checkbox
                  key={category.value}
                  id={`exempt-${category.value}`}
                  label={category.label}
                  checked={formData.groomExemptCategories.includes(category.value)}
                  onChange={() => toggleCategory(category.value)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invite Settings */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle>Invite Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              label="Default Invite Expiration (days)"
              id="invite-expiration"
              type="number"
              min={1}
              max={90}
              value={formData.defaultInviteExpiration}
              onChange={(e) =>
                setFormData({ ...formData, defaultInviteExpiration: parseInt(e.target.value, 10) })
              }
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="settings-actions">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
          >
            Save Changes
          </Button>
        </div>

        {/* Danger Zone */}
        {isOrganizer && (
          <Card className="settings-card settings-danger-zone">
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="settings-danger-description">
                Deleting this trip will permanently remove all associated data including expenses, activities, and media.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteModal(true)}
                data-testid="delete-trip-button"
              >
                Delete Trip
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Trip Modal */}
      {trip && (
        <DeleteTripModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          tripName={trip.name}
          tripId={tripId}
          onDeleted={handleTripDeleted}
        />
      )}
    </div>
  );
}
