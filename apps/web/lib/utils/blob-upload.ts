/**
 * Server-side Vercel Blob Upload Utilities
 *
 * Handles direct uploads to Vercel Blob storage with thumbnail generation.
 * Uses @vercel/blob for storage operations.
 */

import { put, del } from '@vercel/blob';
import { getImageDimensions, extractExifData, type ExifData } from './image-processing';

/**
 * Upload result with URLs and metadata.
 */
export interface BlobUploadResult {
  /** Full URL to the uploaded file */
  url: string;
  /** URL to the thumbnail (for images/videos) */
  thumbnailUrl: string;
  /** File size in bytes */
  size: number;
  /** Content type of the file */
  contentType: string;
  /** Original filename */
  filename: string;
  /** Resource type */
  type: 'image' | 'video';
  /** Image dimensions (if applicable) */
  dimensions?: {
    width: number;
    height: number;
  };
  /** EXIF data (for JPEG images) */
  exif?: ExifData;
  /** Video duration in seconds (if applicable) */
  duration?: number;
}

/**
 * Options for blob upload.
 */
export interface BlobUploadOptions {
  /** Trip ID for path organization */
  tripId: string;
  /** Media type */
  type: 'photo' | 'video';
  /** Optional metadata to store */
  metadata?: Record<string, string>;
  /** Video duration (passed from client for videos) */
  videoDuration?: number;
  /** Video dimensions (passed from client for videos) */
  videoDimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Error thrown when blob upload fails.
 */
export class BlobUploadError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'BlobUploadError';
  }
}

/**
 * Generate a unique pathname for blob storage.
 */
function generatePathname(tripId: string, filename: string, suffix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = filename.split('.').pop() || '';
  const baseName = suffix ? `${timestamp}_${random}_${suffix}` : `${timestamp}_${random}`;
  return `trips/${tripId}/${baseName}.${ext}`;
}

/**
 * Generate a thumbnail pathname.
 */
function generateThumbnailPathname(tripId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `trips/${tripId}/${timestamp}_${random}_thumb.webp`;
}

/**
 * Upload a file to Vercel Blob storage.
 *
 * @param file - Buffer or Blob to upload
 * @param filename - Original filename
 * @param options - Upload options
 * @returns Promise resolving to upload result
 * @throws BlobUploadError if upload fails
 *
 * @example
 * ```typescript
 * const result = await uploadToBlob(
 *   fileBuffer,
 *   'photo.jpg',
 *   { tripId: 'trip123', type: 'photo' }
 * );
 * console.log(result.url);
 * ```
 */
export async function uploadToBlob(
  file: Buffer | Blob,
  filename: string,
  options: BlobUploadOptions
): Promise<BlobUploadResult> {
  const { tripId, type, videoDuration, videoDimensions } = options;

  try {
    // Determine content type
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const contentType = getContentType(extension, type);
    const resourceType = type === 'photo' ? 'image' : 'video';

    // Generate pathname
    const pathname = generatePathname(tripId, filename);

    // Upload main file
    const blob = await put(pathname, file, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });

    // Extract metadata for images
    let dimensions: { width: number; height: number } | undefined;
    let exif: ExifData | undefined;

    if (type === 'photo' && file instanceof Buffer) {
      // Get image dimensions - create a proper ArrayBuffer from the Buffer
      const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
      const dims = getImageDimensions(arrayBuffer);
      if (dims) {
        dimensions = dims;
      }

      // Extract EXIF data for JPEG
      if (extension === 'jpg' || extension === 'jpeg') {
        const exifData = extractExifData(arrayBuffer);
        if (exifData) {
          exif = exifData;
        }
      }
    }

    // For videos, use client-provided dimensions
    if (type === 'video' && videoDimensions) {
      dimensions = videoDimensions;
    }

    // Generate thumbnail URL (same as main URL for now - thumbnail generation is client-side)
    // In production, you might use a separate thumbnail generation service
    const thumbnailUrl = blob.url;

    const fileSize = file instanceof Buffer ? file.length : (file as Blob).size;

    return {
      url: blob.url,
      thumbnailUrl,
      size: fileSize,
      contentType,
      filename,
      type: resourceType,
      dimensions,
      exif,
      duration: videoDuration,
    };
  } catch (error) {
    console.error('Blob upload error:', error);
    throw new BlobUploadError(
      error instanceof Error ? error.message : 'Failed to upload to blob storage',
      error instanceof Error ? error.name : 'UNKNOWN'
    );
  }
}

/**
 * Upload a thumbnail to Vercel Blob storage.
 *
 * @param thumbnail - Thumbnail buffer (WebP format)
 * @param tripId - Trip ID for path organization
 * @returns Promise resolving to thumbnail URL
 */
export async function uploadThumbnail(
  thumbnail: Buffer | Blob,
  tripId: string
): Promise<string> {
  try {
    const pathname = generateThumbnailPathname(tripId);

    const blob = await put(pathname, thumbnail, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
    });

    return blob.url;
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    throw new BlobUploadError(
      error instanceof Error ? error.message : 'Failed to upload thumbnail',
      error instanceof Error ? error.name : 'UNKNOWN'
    );
  }
}

/**
 * Delete a blob from storage.
 *
 * @param url - URL of the blob to delete
 */
export async function deleteBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error('Blob delete error:', error);
    throw new BlobUploadError(
      error instanceof Error ? error.message : 'Failed to delete blob',
      error instanceof Error ? error.name : 'UNKNOWN'
    );
  }
}

/**
 * Get content type from file extension.
 */
function getContentType(extension: string, type: 'photo' | 'video'): string {
  const imageTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };

  const videoTypes: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
  };

  if (type === 'photo') {
    return imageTypes[extension] || 'image/jpeg';
  }

  return videoTypes[extension] || 'video/mp4';
}

/**
 * Validate file for upload.
 */
export function validateBlobUpload(
  file: { size: number; type?: string },
  options: {
    maxSizeBytes?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSizeBytes = 100 * 1024 * 1024, // 100MB default
    allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
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

  // Check file type if provided
  if (file.type && !allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not supported` };
  }

  return { valid: true };
}
