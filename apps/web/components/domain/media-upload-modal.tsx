'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Spinner,
} from '@/components/ui';
import {
  uploadToCloudinary,
  getCloudinaryThumbnailUrl,
  getMediaTypeFromFile,
  validateUploadFile,
  type UploadUrlData,
  type CloudinaryUploadResponse,
  CloudinaryUploadError,
} from '@/lib/utils/cloudinary-upload';

/**
 * File with upload state tracking.
 */
interface FileWithState {
  id: string;
  file: File;
  preview: string;
  caption: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  result?: CloudinaryUploadResponse;
}

/**
 * Media upload result to pass back to parent.
 */
export interface MediaUploadResult {
  url: string;
  thumbnailUrl: string;
  type: 'photo' | 'video';
  fileSize: number;
  caption?: string;
}

/**
 * Props for MediaUploadModal.
 */
export interface MediaUploadModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal closes */
  onClose: () => void;
  /** Trip ID for upload context */
  tripId: string;
  /** Callback when uploads complete successfully */
  onUploaded?: (results: MediaUploadResult[]) => void;
}

/**
 * Generate a unique ID for file tracking.
 */
function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a preview URL for a file.
 */
function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * MediaUploadModal component for uploading photos and videos.
 *
 * Features:
 * - Multiple file selection
 * - Drag and drop support
 * - Preview thumbnails
 * - Per-file progress tracking
 * - Caption input per file
 * - Error handling
 */
export function MediaUploadModal({
  isOpen,
  onClose,
  tripId,
  onUploaded,
}: MediaUploadModalProps) {
  const [files, setFiles] = useState<FileWithState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Add files to the upload queue.
   */
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: FileWithState[] = [];

    for (const file of fileArray) {
      const validation = validateUploadFile(file);
      if (validation.valid) {
        validFiles.push({
          id: generateFileId(),
          file,
          preview: createPreviewUrl(file),
          caption: '',
          status: 'pending',
          progress: 0,
        });
      }
    }

    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  /**
   * Remove a file from the queue.
   */
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  /**
   * Update caption for a file.
   */
  const updateCaption = useCallback((fileId: string, caption: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, caption } : f))
    );
  }, []);

  /**
   * Handle file input change.
   */
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputFiles = event.target.files;
      if (inputFiles && inputFiles.length > 0) {
        addFiles(inputFiles);
      }
      // Reset input so same file can be selected again
      event.target.value = '';
    },
    [addFiles]
  );

  /**
   * Handle drag enter.
   */
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  /**
   * Handle drag leave.
   */
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * Handle drag over.
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  /**
   * Handle drop.
   */
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const droppedFiles = event.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        addFiles(droppedFiles);
      }
    },
    [addFiles]
  );

  /**
   * Trigger file input click.
   */
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Get signed upload URL from server.
   */
  const getUploadUrl = async (
    mediaType: 'photo' | 'video'
  ): Promise<UploadUrlData> => {
    const response = await fetch(`/api/trips/${tripId}/media/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: mediaType }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to get upload URL');
    }

    const data = await response.json();
    return data.data;
  };

  /**
   * Create media record in database.
   */
  const createMediaRecord = async (
    result: CloudinaryUploadResponse,
    mediaType: 'photo' | 'video',
    caption?: string
  ): Promise<void> => {
    const response = await fetch(`/api/trips/${tripId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: result.secure_url,
        thumbnailUrl: getCloudinaryThumbnailUrl(result.secure_url),
        type: mediaType,
        fileSize: result.bytes,
        caption: caption || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to create media record');
    }
  };

  /**
   * Upload a single file.
   */
  const uploadFile = async (
    fileState: FileWithState,
    abortSignal: AbortSignal
  ): Promise<MediaUploadResult | null> => {
    const mediaType = getMediaTypeFromFile(fileState.file);

    // Update status to uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileState.id ? { ...f, status: 'uploading' as const } : f
      )
    );

    try {
      // Get signed upload URL
      const uploadData = await getUploadUrl(mediaType);

      // Upload to Cloudinary
      const result = await uploadToCloudinary(fileState.file, uploadData, {
        onProgress: (progress) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileState.id ? { ...f, progress } : f))
          );
        },
        signal: abortSignal,
      });

      // Create media record in database
      await createMediaRecord(result, mediaType, fileState.caption);

      // Update status to success
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileState.id
            ? { ...f, status: 'success' as const, progress: 100, result }
            : f
        )
      );

      return {
        url: result.secure_url,
        thumbnailUrl: getCloudinaryThumbnailUrl(result.secure_url),
        type: mediaType,
        fileSize: result.bytes,
        caption: fileState.caption || undefined,
      };
    } catch (error) {
      // Check if cancelled
      if (error instanceof CloudinaryUploadError && error.message === 'Upload cancelled') {
        return null;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Upload failed';

      // Update status to error
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileState.id
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      );

      return null;
    }
  };

  /**
   * Upload all pending files.
   */
  const handleUpload = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    abortControllerRef.current = new AbortController();

    const results: MediaUploadResult[] = [];

    // Upload files sequentially to avoid overwhelming the server
    for (const fileState of pendingFiles) {
      if (abortControllerRef.current.signal.aborted) break;

      const result = await uploadFile(
        fileState,
        abortControllerRef.current.signal
      );
      if (result) {
        results.push(result);
      }
    }

    setIsUploading(false);
    abortControllerRef.current = null;

    // Notify parent of successful uploads
    if (results.length > 0 && onUploaded) {
      onUploaded(results);
    }

    // Close modal if all uploads succeeded
    const allSuccessful = files.every(
      (f) => f.status === 'success'
    );
    if (allSuccessful && results.length > 0) {
      handleClose();
    }
  }, [files, onUploaded, tripId]);

  /**
   * Cancel uploads and close modal.
   */
  const handleClose = useCallback(() => {
    // Cancel any in-progress uploads
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clean up preview URLs
    files.forEach((f) => URL.revokeObjectURL(f.preview));

    // Reset state
    setFiles([]);
    setIsDragging(false);
    setIsUploading(false);

    onClose();
  }, [files, onClose]);

  /**
   * Retry failed uploads.
   */
  const handleRetry = useCallback((fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: 'pending' as const, progress: 0, error: undefined }
          : f
      )
    );
  }, []);

  const pendingCount = files.filter(
    (f) => f.status === 'pending' || f.status === 'error'
  ).length;
  const hasFiles = files.length > 0;
  const allComplete = files.length > 0 && files.every((f) => f.status === 'success');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalContent data-testid="media-upload-modal">
        <ModalHeader>Upload Photos & Videos</ModalHeader>
        <ModalBody>
          {/* Drag and Drop Zone */}
          <div
            className={`upload-dropzone ${isDragging ? 'upload-dropzone-active' : ''} ${hasFiles ? 'upload-dropzone-compact' : ''}`}
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

          {/* File Preview Grid */}
          {hasFiles && (
            <div className="upload-file-grid" data-testid="upload-file-grid">
              {files.map((fileState) => (
                <div
                  key={fileState.id}
                  className={`upload-file-item upload-file-item-${fileState.status}`}
                  data-testid={`upload-file-item-${fileState.id}`}
                >
                  {/* Thumbnail */}
                  <div className="upload-file-thumbnail">
                    {fileState.file.type.startsWith('video/') ? (
                      <video src={fileState.preview} muted />
                    ) : (
                      <img
                        src={fileState.preview}
                        alt={fileState.file.name}
                      />
                    )}
                    {fileState.file.type.startsWith('video/') && (
                      <div className="upload-file-video-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}

                    {/* Progress overlay */}
                    {fileState.status === 'uploading' && (
                      <div className="upload-file-progress-overlay">
                        <Spinner size="sm" color="white" />
                        <span className="upload-file-progress-text">
                          {fileState.progress}%
                        </span>
                      </div>
                    )}

                    {/* Success overlay */}
                    {fileState.status === 'success' && (
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
                    {fileState.status === 'error' && (
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
                    {(fileState.status === 'pending' || fileState.status === 'error') && (
                      <button
                        type="button"
                        className="upload-file-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(fileState.id);
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
                  {fileState.status === 'pending' && (
                    <Input
                      size="sm"
                      placeholder="Add caption (optional)"
                      value={fileState.caption}
                      onChange={(e) =>
                        updateCaption(fileState.id, e.target.value)
                      }
                      className="upload-file-caption"
                    />
                  )}

                  {/* Caption display for uploaded files */}
                  {fileState.status === 'success' && fileState.caption && (
                    <p className="upload-file-caption-text">{fileState.caption}</p>
                  )}

                  {/* Error message */}
                  {fileState.status === 'error' && (
                    <div className="upload-file-error-info">
                      <p className="upload-file-error-message">
                        {fileState.error}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRetry(fileState.id)}
                      >
                        Retry
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {allComplete ? 'Close' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={pendingCount === 0}
            loading={isUploading}
          >
            {isUploading
              ? 'Uploading...'
              : `Upload ${pendingCount > 0 ? `(${pendingCount})` : ''}`}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

MediaUploadModal.displayName = 'MediaUploadModal';
