/**
 * Image Processing Utilities
 *
 * Server-side image processing using the canvas API for thumbnail generation
 * and EXIF metadata extraction. Compatible with Vercel Edge runtime.
 */

/**
 * EXIF data structure
 */
export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  orientation?: number;
}

/**
 * Thumbnail options
 */
export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

/**
 * Default thumbnail options
 */
const DEFAULT_THUMBNAIL_OPTIONS: Required<ThumbnailOptions> = {
  width: 400,
  height: 400,
  quality: 80,
  format: 'webp',
};

/**
 * Extract basic image dimensions from an image buffer.
 * Works with PNG, JPEG, GIF, and WebP.
 */
export function getImageDimensions(
  buffer: ArrayBuffer
): { width: number; height: number } | null {
  // Handle empty or too-small buffers
  if (buffer.byteLength < 10) {
    return null;
  }

  const view = new DataView(buffer);

  // Check PNG signature
  if (
    buffer.byteLength >= 24 &&
    view.getUint32(0) === 0x89504e47 &&
    view.getUint32(4) === 0x0d0a1a0a
  ) {
    // PNG: width at offset 16, height at offset 20
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  }

  // Check JPEG signature
  if (view.getUint16(0) === 0xffd8) {
    // JPEG: find SOF0/SOF2 marker for dimensions
    let offset = 2;
    while (offset < buffer.byteLength - 8) {
      const marker = view.getUint16(offset);
      if (marker === 0xffc0 || marker === 0xffc2) {
        // SOF0 or SOF2
        return {
          height: view.getUint16(offset + 5),
          width: view.getUint16(offset + 7),
        };
      }
      // Move to next marker
      const segmentLength = view.getUint16(offset + 2);
      offset += 2 + segmentLength;
    }
  }

  // Check GIF signature
  if (
    buffer.byteLength >= 10 &&
    String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2)) ===
      'GIF'
  ) {
    return {
      width: view.getUint16(6, true),
      height: view.getUint16(8, true),
    };
  }

  // Check WebP signature
  if (
    buffer.byteLength >= 30 &&
    view.getUint32(0) === 0x52494646 && // 'RIFF'
    view.getUint32(8) === 0x57454250 // 'WEBP'
  ) {
    // Check for VP8 chunk
    const chunkType = view.getUint32(12);
    if (chunkType === 0x56503820) {
      // 'VP8 '
      // VP8 bitstream header at offset 23
      return {
        width: (view.getUint16(26, true) & 0x3fff) | 0,
        height: (view.getUint16(28, true) & 0x3fff) | 0,
      };
    }
    // VP8L lossless
    if (chunkType === 0x5650384c) {
      // 'VP8L'
      const signature = view.getUint8(21);
      if (signature === 0x2f) {
        const bits = view.getUint32(22, true);
        return {
          width: ((bits & 0x3fff) | 0) + 1,
          height: (((bits >> 14) & 0x3fff) | 0) + 1,
        };
      }
    }
  }

  return null;
}

/**
 * Extract EXIF data from JPEG image buffer.
 * Returns null if no EXIF data found or image is not JPEG.
 */
export function extractExifData(buffer: ArrayBuffer): ExifData | null {
  const view = new DataView(buffer);

  // Check JPEG signature
  if (view.getUint16(0) !== 0xffd8) {
    return null;
  }

  // Find APP1 marker (EXIF)
  let offset = 2;
  while (offset < buffer.byteLength - 4) {
    const marker = view.getUint16(offset);

    // APP1 marker
    if (marker === 0xffe1) {
      const segmentLength = view.getUint16(offset + 2);
      const exifOffset = offset + 4;

      // Check EXIF header
      const exifHeader =
        String.fromCharCode(
          view.getUint8(exifOffset),
          view.getUint8(exifOffset + 1),
          view.getUint8(exifOffset + 2),
          view.getUint8(exifOffset + 3)
        ) + String.fromCharCode(view.getUint8(exifOffset + 4));

      if (exifHeader === 'Exif\0') {
        return parseExifData(buffer, exifOffset + 6);
      }
    }

    // Move to next marker
    if (marker === 0xffda) {
      // Start of Scan - no more metadata
      break;
    }

    const segmentLength = view.getUint16(offset + 2);
    offset += 2 + segmentLength;
  }

  return null;
}

/**
 * Parse EXIF IFD data.
 */
function parseExifData(buffer: ArrayBuffer, tiffStart: number): ExifData {
  const view = new DataView(buffer);
  const exif: ExifData = {};

  // Determine byte order
  const byteOrder = view.getUint16(tiffStart);
  const littleEndian = byteOrder === 0x4949; // 'II' for little-endian

  // Get IFD0 offset
  const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
  const ifd0Start = tiffStart + ifdOffset;

  // Parse IFD0 entries
  const entryCount = view.getUint16(ifd0Start, littleEndian);

  for (let i = 0; i < entryCount; i++) {
    const entryStart = ifd0Start + 2 + i * 12;
    const tag = view.getUint16(entryStart, littleEndian);

    switch (tag) {
      case 0x010f: // Make
        exif.make = readExifString(view, entryStart, tiffStart, littleEndian);
        break;
      case 0x0110: // Model
        exif.model = readExifString(view, entryStart, tiffStart, littleEndian);
        break;
      case 0x0132: // DateTime
        exif.dateTime = readExifString(
          view,
          entryStart,
          tiffStart,
          littleEndian
        );
        break;
      case 0x0112: // Orientation
        exif.orientation = view.getUint16(entryStart + 8, littleEndian);
        break;
    }
  }

  return exif;
}

/**
 * Read string from EXIF data.
 */
function readExifString(
  view: DataView,
  entryStart: number,
  tiffStart: number,
  littleEndian: boolean
): string {
  const count = view.getUint32(entryStart + 4, littleEndian);

  if (count <= 4) {
    // Value is inline
    let str = '';
    for (let i = 0; i < count - 1; i++) {
      const char = view.getUint8(entryStart + 8 + i);
      if (char === 0) break;
      str += String.fromCharCode(char);
    }
    return str;
  }

  // Value is at offset
  const valueOffset = view.getUint32(entryStart + 8, littleEndian);
  const start = tiffStart + valueOffset;

  let str = '';
  for (let i = 0; i < count - 1; i++) {
    const char = view.getUint8(start + i);
    if (char === 0) break;
    str += String.fromCharCode(char);
  }
  return str;
}

/**
 * Validate image file type.
 */
export function isValidImageType(file: File): boolean {
  const validTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
  ];
  return validTypes.includes(file.type);
}

/**
 * Validate video file type.
 */
export function isValidVideoType(file: File): boolean {
  const validTypes = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
  ];
  return validTypes.includes(file.type);
}

/**
 * Get MIME type for format.
 */
export function getMimeType(
  format: 'webp' | 'jpeg' | 'png'
): 'image/webp' | 'image/jpeg' | 'image/png' {
  return `image/${format}`;
}
