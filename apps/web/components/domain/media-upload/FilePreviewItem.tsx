'use client';

import React from 'react';
import { Input, Spinner, Button } from '@/components/ui';
import type { FileWithState } from './useFileUpload';

/**
 * Props for FilePreviewItem component.
 */
export interface FilePreviewItemProps {
  file: FileWithState;
  onRemove: (fileId: string) => void;
  onCaptionChange: (fileId: string, caption: string) => void;
  onRetry: (fileId: string) => void;
  isUploading: boolean;
}

/**
 * FilePreviewItem displays a single file in the upload queue.
 *
 * Shows thumbnail, progress overlay, caption input, and error states.
 */
export function FilePreviewItem({
  file,
  onRemove,
  onCaptionChange,
  onRetry,
  isUploading,
}: FilePreviewItemProps): React.ReactElement {
  const isVideo = file.file.type.startsWith('video/');
  const canRemove = file.status === 'pending' || file.status === 'error';

  return (
    <div
      className={`upload-file-item upload-file-item-${file.status}`}
      data-testid={`upload-file-item-${file.id}`}
    >
      {/* Thumbnail */}
      <div className="upload-file-thumbnail">
        {isVideo ? (
          <video src={file.preview} muted />
        ) : (
          <img src={file.preview} alt={file.file.name} />
        )}

        {isVideo && (
          <div className="upload-file-video-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}

        {/* Progress overlay */}
        {file.status === 'uploading' && (
          <div className="upload-file-progress-overlay">
            <Spinner size="sm" color="white" />
            <span className="upload-file-progress-text">{file.progress}%</span>
          </div>
        )}

        {/* Success overlay */}
        {file.status === 'success' && (
          <div className="upload-file-success-overlay">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}

        {/* Error overlay */}
        {file.status === 'error' && (
          <div className="upload-file-error-overlay">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        )}

        {/* Remove button */}
        {canRemove && (
          <button
            type="button"
            className="upload-file-remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(file.id);
            }}
            aria-label="Remove file"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Caption input */}
      {file.status === 'pending' && (
        <Input
          size="sm"
          placeholder="Add caption (optional)"
          value={file.caption}
          onChange={(e) => onCaptionChange(file.id, e.target.value)}
          className="upload-file-caption"
        />
      )}

      {/* Caption display for uploaded files */}
      {file.status === 'success' && file.caption && (
        <p className="upload-file-caption-text">{file.caption}</p>
      )}

      {/* Error message */}
      {file.status === 'error' && (
        <div className="upload-file-error-info">
          <p className="upload-file-error-message">{file.error}</p>
          <Button size="sm" variant="ghost" onClick={() => onRetry(file.id)}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

FilePreviewItem.displayName = 'FilePreviewItem';
