'use client';

import React, { useState, useCallback, useEffect } from 'react';

type DigestFrequency = 'instant' | 'daily' | 'weekly' | 'never';

interface NotificationSettingsData {
  emailNotifications: boolean;
  pushNotifications: boolean;
  tripUpdates: boolean;
  expenseAlerts: boolean;
  pollReminders: boolean;
  activityChanges: boolean;
  newPhotos: boolean;
  digestFrequency: DigestFrequency;
}

interface NotificationSettingsProps {
  settings: NotificationSettingsData;
  onSave: (settings: NotificationSettingsData) => Promise<void>;
  className?: string;
}

export function NotificationSettings({
  settings: initialSettings,
  onSave,
  className = '',
}: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettingsData>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleToggle = useCallback((field: keyof NotificationSettingsData) => {
    setSettings((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  }, []);

  const handleFrequencyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSettings((prev) => ({
        ...prev,
        digestFrequency: e.target.value as DigestFrequency,
      }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSaving(true);

      try {
        await onSave(settings);
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setIsSaving(false);
      }
    },
    [settings, onSave]
  );

  const categoryDisabled = !settings.emailNotifications;

  return (
    <div
      className={`notification-settings ${className}`}
      data-testid="notification-settings"
    >
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-section">
          <h3 className="section-title">Notification Channels</h3>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
                disabled={isSaving}
                className="setting-checkbox"
              />
              <span>Email Notifications</span>
            </label>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.pushNotifications}
                onChange={() => handleToggle('pushNotifications')}
                disabled={isSaving}
                className="setting-checkbox"
              />
              <span>Push Notifications</span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="section-title">Notification Categories</h3>

          {categoryDisabled && (
            <p className="hint-text">
              Enable email notifications to configure these settings.
            </p>
          )}

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.tripUpdates}
                onChange={() => handleToggle('tripUpdates')}
                disabled={isSaving || categoryDisabled}
                className="setting-checkbox"
                aria-label="Trip Updates"
              />
              <span>Trip Updates</span>
            </label>
            <span className="setting-description">
              Get notified about trip changes, new attendees, and announcements
            </span>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.expenseAlerts}
                onChange={() => handleToggle('expenseAlerts')}
                disabled={isSaving || categoryDisabled}
                className="setting-checkbox"
                aria-label="Expense Alerts"
              />
              <span>Expense Alerts</span>
            </label>
            <span className="setting-description">
              Notify when expenses are added, settled, or disputed
            </span>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.pollReminders}
                onChange={() => handleToggle('pollReminders')}
                disabled={isSaving || categoryDisabled}
                className="setting-checkbox"
                aria-label="Poll Reminders"
              />
              <span>Poll Reminders</span>
            </label>
            <span className="setting-description">
              Remind you to vote on open polls
            </span>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.activityChanges}
                onChange={() => handleToggle('activityChanges')}
                disabled={isSaving || categoryDisabled}
                className="setting-checkbox"
                aria-label="Activity Changes"
              />
              <span>Activity Changes</span>
            </label>
            <span className="setting-description">
              Updates about itinerary and activity changes
            </span>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.newPhotos}
                onChange={() => handleToggle('newPhotos')}
                disabled={isSaving || categoryDisabled}
                className="setting-checkbox"
                aria-label="New Photos"
              />
              <span>New Photos</span>
            </label>
            <span className="setting-description">
              Notify when new photos are uploaded
            </span>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="section-title">Email Digest</h3>

          <div className="setting-item">
            <label htmlFor="digestFrequency" className="setting-label">
              Digest Frequency
            </label>
            <select
              id="digestFrequency"
              value={settings.digestFrequency}
              onChange={handleFrequencyChange}
              disabled={isSaving}
              className="setting-select"
            >
              <option value="instant">Instant</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message" role="status">
            Settings saved successfully
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            disabled={isSaving}
            className="save-button"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

export type {
  NotificationSettingsProps,
  NotificationSettingsData,
  DigestFrequency,
};
