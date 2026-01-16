'use client';

import { useState, useRef, useCallback } from 'react';
import {
  uploadFile,
  getMediaTypeFromFile,
  validateUploadFile,
  type BlobUploadResponse,
  BlobUploadClientError,
} from '@/lib/utils/blob-upload-client';

/**
 * File with upload state tracking.
 */
export interface FileWithState {
  id: string;
  file: File;
  preview: string;
  caption: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  result?: BlobUploadResponse;
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
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number;
}

/**
 * Options for the useFileUpload hook.
 */
interface UseFileUploadOptions {
  tripId: string;
  onUploaded?: (results: MediaUploadResult[]) => void;
  onAllComplete?: () => void;
}

/**
 * Return type for the useFileUpload hook.
 */
export interface UseFileUploadReturn {
  files: FileWithState[];
  isDragging: boolean;
  isUploading: boolean;
  pendingCount: number;
  hasFiles: boolean;
  allComplete: boolean;
  setIsDragging: (dragging: boolean) => void;
  addFiles: (files: FileList | File[]) => void;
  removeFile: (fileId: string) => void;
  updateCaption: (fileId: string, caption: string) => void;
  handleUpload: () => Promise<void>;
  handleRetry: (fileId: string) => void;
  reset: () => void;
  abortUpload: () => void;
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
 * Custom hook for managing file uploads.
 *
 * Handles file state, validation, progress tracking, and Vercel Blob uploads.
 */
export function useFileUpload({
  tripId,
  onUploaded,
  onAllComplete,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [files, setFiles] = useState<FileWithState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Create media record in database.
   */
  const createMediaRecord = async (
    result: BlobUploadResponse,
    mediaType: 'photo' | 'video',
    caption?: string
  ): Promise<void> => {
    const response = await fetch(`/api/trips/${tripId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        type: mediaType,
        fileSize: result.size,
        caption: caption || undefined,
        dimensions: result.dimensions,
        duration: result.duration,
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
  const uploadSingleFile = async (
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
      // Upload to Vercel Blob via API
      const result = await uploadFile(fileState.file, tripId, {
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
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        type: mediaType,
        fileSize: result.size,
        caption: fileState.caption || undefined,
        dimensions: result.dimensions,
        duration: result.duration,
      };
    } catch (error) {
      // Check if cancelled
      if (
        error instanceof BlobUploadClientError &&
        error.message === 'Upload cancelled'
      ) {
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
   * Upload all pending files.
   */
  const handleUpload = useCallback(async () => {
    const pendingFiles = files.filter(
      (f) => f.status === 'pending' || f.status === 'error'
    );
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    abortControllerRef.current = new AbortController();

    const results: MediaUploadResult[] = [];

    // Upload files sequentially to avoid overwhelming the server
    for (const fileState of pendingFiles) {
      if (abortControllerRef.current.signal.aborted) break;

      const result = await uploadSingleFile(
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

    // Check if all uploads succeeded
    const currentFiles = files;
    const allSuccessful = currentFiles.every((f) => f.status === 'success');
    if (allSuccessful && results.length > 0 && onAllComplete) {
      onAllComplete();
    }
  }, [files, onUploaded, onAllComplete, tripId]);

  /**
   * Retry a failed upload.
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

  /**
   * Reset all state.
   */
  const reset = useCallback(() => {
    // Clean up preview URLs
    files.forEach((f) => URL.revokeObjectURL(f.preview));

    setFiles([]);
    setIsDragging(false);
    setIsUploading(false);
  }, [files]);

  /**
   * Abort current uploads.
   */
  const abortUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const pendingCount = files.filter(
    (f) => f.status === 'pending' || f.status === 'error'
  ).length;
  const hasFiles = files.length > 0;
  const allComplete =
    files.length > 0 && files.every((f) => f.status === 'success');

  return {
    files,
    isDragging,
    isUploading,
    pendingCount,
    hasFiles,
    allComplete,
    setIsDragging,
    addFiles,
    removeFile,
    updateCaption,
    handleUpload,
    handleRetry,
    reset,
    abortUpload,
  };
}
