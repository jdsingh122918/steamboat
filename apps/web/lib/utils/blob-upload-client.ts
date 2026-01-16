/**
 * Client-side Vercel Blob Upload Utilities
 *
 * Handles uploads to Vercel Blob storage via API proxy.
 * Works in browser environments only.
 */

import { extractVideoMetadata, generateVideoThumbnail, type VideoMetadata } from './video-metadata';

/**
 * Upload response from the server.
 */
export interface BlobUploadResponse {
  /** Full URL to the uploaded file */
  url: string;
  /** URL to the thumbnail */
  thumbnailUrl: string;
  /** File size in bytes */
  size: number;
  /** Content type */
  contentType: string;
  /** Resource type */
  type: 'image' | 'video';
  /** Dimensions if available */
  dimensions?: {
    width: number;
    height: number;
  };
  /** Video duration if applicable */
  duration?: number;
}

/**
 * Error thrown when client-side upload fails.
 */
export class BlobUploadClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'BlobUploadClientError';
  }
}

/**
 * Options for client-side upload.
 */
export interface ClientUploadOptions {
  /** Callback for upload progress (0-100) */
  onProgress?: (progress: number) => void;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Upload a file to Vercel Blob via the API proxy.
 *
 * @param file - The file to upload
 * @param tripId - Trip ID for organization
 * @param options - Optional configuration including progress callback
 * @returns Promise resolving to upload response
 * @throws BlobUploadClientError if upload fails
 *
 * @example
 * ```typescript
 * const result = await uploadFile(file, tripId, {
 *   onProgress: (progress) => console.log(`${progress}% uploaded`),
 * });
 * console.log(result.url);
 * ```
 */
export async function uploadFile(
  file: File,
  tripId: string,
  options?: ClientUploadOptions
): Promise<BlobUploadResponse> {
  const { onProgress, signal } = options || {};

  // Determine media type
  const isVideo = file.type.startsWith('video/');
  const mediaType = isVideo ? 'video' : 'photo';

  // For videos, extract metadata client-side
  let videoMetadata: VideoMetadata | undefined;
  let thumbnailBlob: Blob | undefined;

  if (isVideo) {
    try {
      videoMetadata = await extractVideoMetadata(file);
      thumbnailBlob = await generateVideoThumbnail(file);
    } catch (error) {
      console.warn('Failed to extract video metadata:', error);
      // Continue without metadata - server will handle gracefully
    }
  }

  // Build FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', mediaType);

  // Add video metadata if available
  if (videoMetadata) {
    formData.append('videoDuration', videoMetadata.duration.toString());
    formData.append('videoWidth', videoMetadata.width.toString());
    formData.append('videoHeight', videoMetadata.height.toString());
  }

  // Add thumbnail if generated
  if (thumbnailBlob) {
    formData.append('thumbnail', thumbnailBlob, 'thumbnail.webp');
  }

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new BlobUploadClientError('Upload cancelled'));
      });
    }

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
    }

    // Handle successful upload
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success && response.data) {
            resolve(response.data as BlobUploadResponse);
          } else {
            reject(
              new BlobUploadClientError(
                response.error || 'Upload failed',
                xhr.status
              )
            );
          }
        } catch (parseError) {
          reject(
            new BlobUploadClientError(
              'Failed to parse upload response',
              xhr.status
            )
          );
        }
      } else {
        let errorMessage = 'Upload failed';

        try {
          const errorResponse = JSON.parse(xhr.responseText);
          errorMessage = errorResponse.error || errorMessage;
        } catch {
          errorMessage = xhr.statusText || errorMessage;
        }

        reject(new BlobUploadClientError(errorMessage, xhr.status));
      }
    });

    // Handle network errors
    xhr.addEventListener('error', () => {
      reject(new BlobUploadClientError('Network error during upload'));
    });

    // Handle timeout
    xhr.addEventListener('timeout', () => {
      reject(new BlobUploadClientError('Upload timed out'));
    });

    // Handle abort
    xhr.addEventListener('abort', () => {
      reject(new BlobUploadClientError('Upload cancelled'));
    });

    // Open connection and send
    xhr.open('POST', `/api/trips/${tripId}/media/upload`);
    xhr.send(formData);
  });
}

/**
 * Determine media type from file MIME type.
 */
export function getMediaTypeFromFile(file: File): 'photo' | 'video' {
  return file.type.startsWith('video/') ? 'video' : 'photo';
}

/**
 * Validate file for upload.
 *
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result with error message if invalid
 */
export function validateUploadFile(
  file: File,
  options: {
    maxSizeBytes?: number;
    allowedImageTypes?: string[];
    allowedVideoTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSizeBytes = 100 * 1024 * 1024, // 100MB default
    allowedImageTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
    ],
    allowedVideoTypes = [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-msvideo',
    ],
  } = options;

  // Check file size
  if (file.size > maxSizeBytes) {
    const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  // Check file type
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not supported` };
  }

  return { valid: true };
}

/**
 * Generate a thumbnail URL from a blob URL.
 * For Vercel Blob, we use a separate thumbnail file.
 * This is a passthrough since thumbnails are uploaded separately.
 */
export function getThumbnailUrl(url: string): string {
  return url;
}
