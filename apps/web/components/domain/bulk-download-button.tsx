'use client';

/**
 * Bulk download button component.
 *
 * Downloads multiple photos as a ZIP file with progress indication.
 */

import * as React from 'react';
import {
  downloadPhotosAsZip,
  type PhotoItem,
  type DownloadProgress,
} from '@/lib/download/bulk-download';

export interface BulkDownloadButtonProps {
  /** Photos to download */
  photos: PhotoItem[];
  /** Name for the ZIP file (without .zip extension) */
  zipName: string;
  /** Custom button text */
  buttonText?: string;
  /** Callback on successful download */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Button component for bulk downloading photos as a ZIP file.
 *
 * @example
 * <BulkDownloadButton
 *   photos={[
 *     { url: 'https://example.com/photo1.jpg', filename: 'photo1.jpg' },
 *     { url: 'https://example.com/photo2.jpg', filename: 'photo2.jpg' },
 *   ]}
 *   zipName="vacation-photos"
 *   onSuccess={() => console.log('Download complete!')}
 * />
 */
export function BulkDownloadButton({
  photos,
  zipName,
  buttonText,
  onSuccess,
  onError,
  disabled = false,
  className,
}: BulkDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [progress, setProgress] = React.useState<DownloadProgress | null>(null);

  const handleDownload = async () => {
    if (isDownloading || photos.length === 0) return;

    setIsDownloading(true);
    setProgress(null);

    try {
      await downloadPhotosAsZip(photos, zipName, (progressUpdate) => {
        setProgress(progressUpdate);
      });
      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Download failed'));
    } finally {
      setIsDownloading(false);
      setProgress(null);
    }
  };

  const isDisabled = disabled || photos.length === 0 || isDownloading;

  const displayText = React.useMemo(() => {
    if (progress) {
      return `${progress.percent}%`;
    }
    if (buttonText) {
      return buttonText;
    }
    return `Download ${photos.length} photos`;
  }, [progress, buttonText, photos.length]);

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDisabled}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: isDownloading ? '#94a3b8' : '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 0.2s',
      }}
    >
      {isDownloading ? (
        <>
          <svg
            style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              style={{ opacity: 0.25 }}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              style={{ opacity: 0.75 }}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {displayText}
        </>
      ) : (
        <>
          <svg
            style={{ width: 16, height: 16 }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          {displayText}
        </>
      )}
    </button>
  );
}

export default BulkDownloadButton;
