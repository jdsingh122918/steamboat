'use client';

import React, { useRef, useCallback } from 'react';

/**
 * Props for UploadDropzone component.
 */
export interface UploadDropzoneProps {
  onFilesAdded: (files: FileList | File[]) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * UploadDropzone provides a drag-and-drop area for file uploads.
 *
 * Supports drag events, file input, and visual feedback for drag state.
 */
export function UploadDropzone({
  onFilesAdded,
  isDragging,
  setIsDragging,
  disabled = false,
  compact = false,
}: UploadDropzoneProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled, setIsDragging]
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
    },
    [setIsDragging]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const droppedFiles = event.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        onFilesAdded(droppedFiles);
      }
    },
    [disabled, onFilesAdded, setIsDragging]
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputFiles = event.target.files;
      if (inputFiles && inputFiles.length > 0) {
        onFilesAdded(inputFiles);
      }
      // Reset input so same file can be selected again
      event.target.value = '';
    },
    [onFilesAdded]
  );

  const handleBrowseClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const classNames = [
    'upload-dropzone',
    isDragging ? 'upload-dropzone-active' : '',
    compact ? 'upload-dropzone-compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleBrowseClick}
      data-testid="upload-dropzone"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileInputChange}
        className="upload-input-hidden"
        data-testid="upload-file-input"
        disabled={disabled}
      />
      <div className="upload-dropzone-content">
        <svg
          className="upload-dropzone-icon"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="upload-dropzone-text">
          {isDragging
            ? 'Drop files here'
            : 'Drag & drop files here or click to browse'}
        </p>
        <p className="upload-dropzone-hint">
          Supports JPEG, PNG, GIF, WebP, HEIC, MP4, MOV, WebM
        </p>
      </div>
    </div>
  );
}

UploadDropzone.displayName = 'UploadDropzone';
