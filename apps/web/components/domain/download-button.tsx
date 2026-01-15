'use client';

/**
 * Download button component.
 *
 * Downloads a single file with loading state indication.
 */

import * as React from 'react';
import { downloadFile } from '@/lib/download/single-download';

export interface DownloadButtonProps {
  /** URL of the file to download */
  url: string;
  /** Filename to use when saving */
  filename: string;
  /** Custom button text */
  buttonText?: string;
  /** Render as icon-only button */
  iconOnly?: boolean;
  /** Callback on successful download */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Button component for downloading a single file.
 *
 * @example
 * <DownloadButton
 *   url="https://example.com/photo.jpg"
 *   filename="vacation-photo.jpg"
 *   onSuccess={() => console.log('Downloaded!')}
 * />
 */
export function DownloadButton({
  url,
  filename,
  buttonText = 'Download',
  iconOnly = false,
  onSuccess,
  onError,
  disabled = false,
  className,
  size = 'md',
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownload = async () => {
    if (isDownloading || disabled) return;

    setIsDownloading(true);

    try {
      await downloadFile({ url, filename });
      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Download failed'));
    } finally {
      setIsDownloading(false);
    }
  };

  const isDisabled = disabled || isDownloading;

  const sizeStyles = {
    sm: { padding: '6px 10px', fontSize: '12px', iconSize: 14 },
    md: { padding: '10px 16px', fontSize: '14px', iconSize: 16 },
    lg: { padding: '12px 20px', fontSize: '16px', iconSize: 18 },
  };

  const { padding, fontSize, iconSize } = sizeStyles[size];

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDisabled}
      className={className}
      aria-label={iconOnly ? buttonText : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: iconOnly ? 0 : '8px',
        padding: iconOnly ? '8px' : padding,
        backgroundColor: isDownloading ? '#94a3b8' : '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        fontSize,
        fontWeight: 500,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 0.2s',
        minWidth: iconOnly ? 'auto' : undefined,
      }}
    >
      {isDownloading ? (
        <svg
          style={{ width: iconSize, height: iconSize, animation: 'spin 1s linear infinite' }}
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
      ) : (
        <svg
          style={{ width: iconSize, height: iconSize }}
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
      )}
      {!iconOnly && buttonText}
    </button>
  );
}

export default DownloadButton;
