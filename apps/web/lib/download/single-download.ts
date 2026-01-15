/**
 * Single file download utility.
 *
 * Downloads a single file (photo, document, etc.) with proper filename handling.
 */

import { saveAs } from 'file-saver';

/**
 * Download options for single file.
 */
export interface DownloadOptions {
  /** URL of the file to download */
  url: string;
  /** Filename to use when saving */
  filename: string;
}

/**
 * Download a single file from a URL.
 *
 * @param options - Download options with URL and filename
 * @throws Error if the fetch fails
 *
 * @example
 * await downloadFile({
 *   url: 'https://example.com/photo.jpg',
 *   filename: 'my-photo.jpg'
 * });
 */
export async function downloadFile(options: DownloadOptions): Promise<void> {
  const { url, filename } = options;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  saveAs(blob, filename);
}

/**
 * Extract filename from a URL, with fallback to provided name.
 *
 * @param url - The URL to extract filename from
 * @param fallbackName - Fallback name if extraction fails
 * @returns The extracted or fallback filename
 *
 * @example
 * getFilenameFromUrl('https://example.com/photos/vacation.jpg', 'photo.jpg')
 * // Returns: 'vacation.jpg'
 */
export function getFilenameFromUrl(url: string, fallbackName: string = 'download'): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/');
    const lastSegment = segments[segments.length - 1];

    // Check if it looks like a valid filename (has extension)
    if (lastSegment && lastSegment.includes('.')) {
      return decodeURIComponent(lastSegment);
    }

    return fallbackName;
  } catch {
    return fallbackName;
  }
}

export default downloadFile;
