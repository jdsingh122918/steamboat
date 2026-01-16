/**
 * Video Metadata Utilities
 *
 * Client-side video metadata extraction using HTML5 video element.
 * Works in browser environments only.
 */

/**
 * Video metadata structure
 */
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

/**
 * Extract metadata from a video file using HTML5 video element.
 * This runs in the browser only.
 *
 * @param file - Video file to extract metadata from
 * @returns Promise resolving to video metadata
 * @throws Error if metadata extraction fails
 *
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const metadata = await extractVideoMetadata(file);
 * console.log(`Duration: ${metadata.duration}s`);
 * console.log(`Dimensions: ${metadata.width}x${metadata.height}`);
 * ```
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    // Create a video element
    const video = document.createElement('video');
    video.preload = 'metadata';

    // Create object URL
    const url = URL.createObjectURL(file);
    video.src = url;

    // Set timeout for metadata loading
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout loading video metadata'));
    }, 30000); // 30 second timeout

    function cleanup() {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      video.remove();
    }

    // Handle successful metadata load
    video.onloadedmetadata = () => {
      const metadata: VideoMetadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        hasAudio: hasAudioTrack(video),
      };

      cleanup();
      resolve(metadata);
    };

    // Handle errors
    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };
  });
}

/**
 * Check if video has audio tracks.
 * Note: This is a basic check - some browsers may not expose this info.
 */
function hasAudioTrack(video: HTMLVideoElement): boolean {
  // Try to access audio tracks if available
  // AudioTrackList is not available in all browsers, so we use a type assertion
  if ('audioTracks' in video) {
    const audioTracks = (video as HTMLVideoElement & { audioTracks: { length: number } }).audioTracks;
    return audioTracks.length > 0;
  }

  // Fallback: assume audio exists if we can't detect
  return true;
}

/**
 * Generate a thumbnail from a video file.
 * Captures a frame at the specified time (default: 1 second).
 *
 * @param file - Video file to capture thumbnail from
 * @param timeSeconds - Time in seconds to capture frame (default: 1)
 * @returns Promise resolving to a Blob containing the thumbnail image
 *
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const thumbnailBlob = await generateVideoThumbnail(file);
 * const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
 * ```
 */
export async function generateVideoThumbnail(
  file: File,
  timeSeconds: number = 1
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    const url = URL.createObjectURL(file);
    video.src = url;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout generating video thumbnail'));
    }, 60000); // 60 second timeout

    function cleanup() {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      video.remove();
    }

    video.onloadedmetadata = () => {
      // Seek to the specified time (or near the start if duration is short)
      const seekTime = Math.min(timeSeconds, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      // Create canvas and draw video frame
      const canvas = document.createElement('canvas');

      // Cap thumbnail size at 400x400 while maintaining aspect ratio
      const maxSize = 400;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        },
        'image/webp',
        0.8
      );
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video for thumbnail'));
    };
  });
}

/**
 * Format duration in seconds to human-readable string.
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string like "1:30" or "1:05:30"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if a file is a video.
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}
