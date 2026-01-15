'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface Profile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phoneNumber?: string;
  venmoHandle?: string;
}

interface ProfileUpdateData {
  name: string;
  phoneNumber?: string;
  venmoHandle?: string;
}

interface ProfileEditorProps {
  profile: Profile;
  onSave: (data: ProfileUpdateData) => Promise<void>;
  onAvatarUpload: (file: File) => Promise<{ url: string }>;
  className?: string;
}

interface FormErrors {
  name?: string;
  venmoHandle?: string;
}

export function ProfileEditor({
  profile,
  onSave,
  onAvatarUpload,
  className = '',
}: ProfileEditorProps) {
  const [name, setName] = useState(profile.name);
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || '');
  const [venmoHandle, setVenmoHandle] = useState(profile.venmoHandle || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (venmoHandle && !venmoHandle.startsWith('@')) {
      newErrors.venmoHandle = 'Venmo handle must start with @';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!validateForm()) {
        return;
      }

      setIsSaving(true);

      try {
        await onSave({
          name: name.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          venmoHandle: venmoHandle.trim() || undefined,
        });
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setIsSaving(false);
      }
    },
    [name, phoneNumber, venmoHandle, onSave]
  );

  const handleAvatarButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setError(null);

      try {
        const result = await onAvatarUpload(file);
        setAvatarUrl(result.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
        // Reset input so same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onAvatarUpload]
  );

  return (
    <div className={`profile-editor ${className}`} data-testid="profile-editor">
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="avatar-section">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile avatar"
              className="profile-avatar"
            />
          ) : (
            <div className="default-avatar" data-testid="default-avatar">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={handleAvatarButtonClick}
            disabled={isUploading}
            className="avatar-button"
          >
            {isUploading ? 'Uploading...' : 'Change Avatar'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            data-testid="avatar-input"
            className="hidden-input"
          />
        </div>

        <div className="form-field">
          <label htmlFor="name" className="field-label">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
            className={`field-input ${errors.name ? 'input-error' : ''}`}
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={profile.email}
            readOnly
            className="field-input readonly"
          />
          <span className="field-hint">Email cannot be changed</span>
        </div>

        <div className="form-field">
          <label htmlFor="phone" className="field-label">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={isSaving}
            className="field-input"
            placeholder="+1 555-1234"
          />
        </div>

        <div className="form-field">
          <label htmlFor="venmo" className="field-label">
            Venmo Handle
          </label>
          <input
            id="venmo"
            type="text"
            value={venmoHandle}
            onChange={(e) => setVenmoHandle(e.target.value)}
            disabled={isSaving}
            className={`field-input ${errors.venmoHandle ? 'input-error' : ''}`}
            placeholder="@username"
          />
          {errors.venmoHandle && (
            <span className="error-text">{errors.venmoHandle}</span>
          )}
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message" role="status">
            Profile saved successfully
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            disabled={isSaving}
            className="save-button"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export type { ProfileEditorProps, Profile, ProfileUpdateData };
