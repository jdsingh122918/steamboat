/**
 * Bulk download utility using JSZip.
 *
 * Downloads multiple photos and packages them into a ZIP file.
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Photo item for bulk download.
 */
export interface PhotoItem {
  /** URL of the photo */
  url: string;
  /** Filename to use in the ZIP */
  filename: string;
}

/**
 * Download progress information.
 */
export interface DownloadProgress {
  /** Number of photos downloaded so far */
  current: number;
  /** Total number of photos */
  total: number;
  /** Progress percentage (0-100) */
  percent: number;
  /** Current filename being processed */
  currentFile: string;
}

/**
 * Download multiple photos and package them into a ZIP file.
 *
 * @param photos - Array of photos to download
 * @param zipName - Name for the ZIP file (without .zip extension)
 * @param onProgress - Optional callback for progress updates
 *
 * @example
 * await downloadPhotosAsZip(
 *   [
 *     { url: 'https://example.com/photo1.jpg', filename: 'photo1.jpg' },
 *     { url: 'https://example.com/photo2.jpg', filename: 'photo2.jpg' },
 *   ],
 *   'vacation-photos',
 *   (progress) => console.log(`${progress.percent}% complete`)
 * );
 */
export async function downloadPhotosAsZip(
  photos: PhotoItem[],
  zipName: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('photos');

  const total = photos.length;
  let downloaded = 0;
  let failedCount = 0;

  // Download each photo and add to ZIP
  for (const photo of photos) {
    try {
      const response = await fetch(photo.url);

      if (!response.ok) {
        console.warn(`Failed to fetch ${photo.filename}: ${response.status}`);
        failedCount++;
        continue;
      }

      const blob = await response.blob();
      folder?.file(photo.filename, blob);
      downloaded++;

      // Report progress
      onProgress?.({
        current: downloaded + failedCount,
        total,
        percent: Math.round(((downloaded + failedCount) / total) * 100),
        currentFile: photo.filename,
      });
    } catch (error) {
      console.warn(`Error downloading ${photo.filename}:`, error);
      failedCount++;

      // Still report progress on failure
      onProgress?.({
        current: downloaded + failedCount,
        total,
        percent: Math.round(((downloaded + failedCount) / total) * 100),
        currentFile: photo.filename,
      });
    }
  }

  // Generate the ZIP file
  const content = await zip.generateAsync({ type: 'blob' });

  // Trigger download
  saveAs(content, `${zipName}.zip`);
}

export default downloadPhotosAsZip;
