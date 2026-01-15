'use client';

import { useRef, useState, useCallback } from 'react';
import { Avatar } from '@/components/ui/avatar';

export interface ProfilePictureUploadProps {
  /** Current profile picture URL */
  currentImageUrl?: string;
  /** User name for fallback initials */
  name: string;
  /** Callback when upload completes */
  onUpload: (file: File) => Promise<{ url: string }>;
  /** Callback when image is removed */
  onRemove?: () => Promise<void>;
  /** Avatar size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether upload is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** Max file size in bytes (default: 5MB) */
  maxSizeBytes?: number;
  /** Allowed image types */
  allowedTypes?: string[];
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function validateFile(
  file: File,
  maxSizeBytes: number,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Invalid file type. Please select an image.' };
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please select a valid image format.' };
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
    return { valid: false, error: `File too large. Maximum size is ${maxMB}MB.` };
  }

  return { valid: true };
}

function Spinner(): React.ReactElement {
  return (
    <svg
      data-testid="upload-spinner"
      style={{
        width: 24,
        height: 24,
        animation: 'spin 1s linear infinite',
      }}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        fill="currentColor"
      />
    </svg>
  );
}

function CameraIcon(): React.ReactElement {
  return (
    <svg
      style={{ width: 20, height: 20 }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export function ProfilePictureUpload({
  currentImageUrl,
  name,
  onUpload,
  onRemove,
  size = 'lg',
  disabled = false,
  className,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  allowedTypes,
}: ProfilePictureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(currentImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptTypes = allowedTypes && allowedTypes.length > 0
    ? allowedTypes.join(',')
    : 'image/*';

  const handleClick = useCallback(() => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  }, [disabled, isUploading]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      const validationResult = validateFile(
        file,
        maxSizeBytes,
        allowedTypes || DEFAULT_ALLOWED_TYPES
      );

      if (!validationResult.valid) {
        setError(validationResult.error || 'Invalid file');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setIsUploading(true);

      try {
        const result = await onUpload(file);
        setImageUrl(result.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onUpload, maxSizeBytes, allowedTypes]
  );

  const handleRemove = useCallback(async () => {
    if (!onRemove || isRemoving) return;

    setIsRemoving(true);
    setError(null);

    try {
      await onRemove();
      setImageUrl(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setIsRemoving(false);
    }
  }, [onRemove, isRemoving]);

  const showRemoveButton = imageUrl && onRemove && !isUploading && !isRemoving;

  return (
    <div
      className={className}
      style={{ display: 'inline-block', position: 'relative' }}
    >
      <div
        data-testid="profile-picture-upload"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        tabIndex={0}
        role="button"
        aria-label="Change profile picture"
        aria-disabled={disabled}
        style={{
          position: 'relative',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          borderRadius: '50%',
          overflow: 'visible',
        }}
      >
        <Avatar
          src={imageUrl}
          name={name}
          size={size}
          shape="circle"
        />

        {(isHovered || isUploading) && !disabled && (
          <div
            data-testid="upload-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '50%',
              color: 'white',
            }}
          >
            {isUploading ? <Spinner /> : <CameraIcon />}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          onChange={handleFileChange}
          data-testid="profile-picture-input"
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            opacity: 0,
            overflow: 'hidden',
          }}
          disabled={disabled}
        />
      </div>

      {/* Remove button */}
      {showRemoveButton && (
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove profile picture"
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 'bold',
          }}
        >
          &times;
        </button>
      )}

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 8,
            padding: '8px 12px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            borderRadius: 4,
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default ProfilePictureUpload;
