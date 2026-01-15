'use client';

/**
 * Trip banner upload component.
 *
 * Full-width banner with drag-and-drop upload support.
 */

import * as React from 'react';
import { useRef, useState, useCallback } from 'react';

export interface TripBannerUploadResult {
  url: string;
  thumbnailUrl: string;
}

export interface TripBannerUploadProps {
  /** Trip ID for upload context */
  tripId: string;
  /** Current banner image URL */
  currentBannerUrl?: string;
  /** Callback when upload completes */
  onUpload: (file: File) => Promise<TripBannerUploadResult>;
  /** Callback when banner is removed */
  onRemove?: () => Promise<void>;
  /** Banner aspect ratio (default: 16:9) */
  aspectRatio?: '16:9' | '3:1' | '4:3';
  /** Whether user can edit */
  canEdit?: boolean;
  /** Additional className */
  className?: string;
  /** Max file size in bytes (default: 10MB) */
  maxSizeBytes?: number;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Validate file before upload
 */
function validateFile(
  file: File,
  maxSizeBytes: number
): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Invalid file type. Please select an image.' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please select a JPEG, PNG, GIF, or WebP image.' };
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
    return { valid: false, error: `File too large. Maximum size is ${maxMB}MB.` };
  }

  return { valid: true };
}

/**
 * Get CSS aspect ratio from string format
 */
function getAspectRatioStyle(ratio: '16:9' | '3:1' | '4:3'): string {
  switch (ratio) {
    case '16:9':
      return '16/9';
    case '3:1':
      return '3/1';
    case '4:3':
      return '4/3';
    default:
      return '16/9';
  }
}

/**
 * Upload icon
 */
function UploadIcon() {
  return (
    <svg
      style={{ width: 48, height: 48 }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

/**
 * Spinner component for loading state
 */
function ProgressIndicator() {
  return (
    <div
      data-testid="upload-progress"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <svg
        style={{
          width: 32,
          height: 32,
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
      <span>Uploading...</span>
    </div>
  );
}

/**
 * Trip banner upload component with drag-and-drop support.
 *
 * @example
 * <TripBannerUpload
 *   tripId="trip-123"
 *   currentBannerUrl="https://example.com/banner.jpg"
 *   onUpload={async (file) => {
 *     const result = await uploadToCloudinary(file);
 *     return { url: result.url, thumbnailUrl: result.thumbnailUrl };
 *   }}
 *   onRemove={async () => {
 *     await removeBanner(tripId);
 *   }}
 *   canEdit
 * />
 */
export function TripBannerUpload({
  tripId,
  currentBannerUrl,
  onUpload,
  onRemove,
  aspectRatio = '16:9',
  canEdit = true,
  className,
  maxSizeBytes = DEFAULT_MAX_SIZE,
}: TripBannerUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bannerUrl, setBannerUrl] = useState<string | undefined>(currentBannerUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      // Validate file
      const validationResult = validateFile(file, maxSizeBytes);

      if (!validationResult.valid) {
        setError(validationResult.error || 'Invalid file');
        return;
      }

      setIsUploading(true);

      try {
        const result = await onUpload(file);
        setBannerUrl(result.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload, maxSizeBytes]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      await processFile(file);

      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFile]
  );

  const handleUploadClick = useCallback(() => {
    if (!canEdit || isUploading) return;
    fileInputRef.current?.click();
  }, [canEdit, isUploading]);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (canEdit && !isUploading) {
        setIsDragging(true);
      }
    },
    [canEdit, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (!canEdit || isUploading) return;

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        await processFile(droppedFiles[0]);
      }
    },
    [canEdit, isUploading, processFile]
  );

  const handleRemove = useCallback(async () => {
    if (!onRemove || isRemoving) return;

    setIsRemoving(true);
    setError(null);

    try {
      await onRemove();
      setBannerUrl(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setIsRemoving(false);
    }
  }, [onRemove, isRemoving]);

  const showRemoveButton = bannerUrl && onRemove && canEdit && !isUploading && !isRemoving;

  return (
    <div
      data-testid="trip-banner-upload"
      data-dragging={isDragging ? 'true' : 'false'}
      className={className}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: getAspectRatioStyle(aspectRatio),
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        overflow: 'hidden',
        border: isDragging ? '2px dashed #3b82f6' : '2px dashed transparent',
      }}
    >
      {/* Banner image or placeholder */}
      {bannerUrl ? (
        <img
          data-testid="banner-image"
          src={bannerUrl}
          alt="Trip banner"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          data-testid="banner-placeholder"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
          }}
        >
          {isUploading ? (
            <ProgressIndicator />
          ) : (
            <>
              <UploadIcon />
              <p style={{ marginTop: 8, fontSize: 14 }}>
                {isDragging ? 'Drop image here' : 'No banner image'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Upload overlay for existing banner */}
      {bannerUrl && isUploading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
          }}
        >
          <ProgressIndicator />
        </div>
      )}

      {/* Edit controls */}
      {canEdit && !isUploading && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            display: 'flex',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={handleUploadClick}
            aria-label={bannerUrl ? 'Change banner' : 'Upload banner'}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg
              style={{ width: 16, height: 16 }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {bannerUrl ? 'Change' : 'Upload'}
          </button>

          {showRemoveButton && (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove banner"
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Remove
            </button>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        data-testid="banner-input"
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          opacity: 0,
          overflow: 'hidden',
        }}
        disabled={!canEdit || isUploading}
      />

      {/* Error message */}
      {error && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            padding: '8px 12px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default TripBannerUpload;
