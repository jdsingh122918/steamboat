import { describe, it, expect } from 'vitest';
import {
  getImageDimensions,
  isValidImageType,
  isValidVideoType,
  getMimeType,
} from '../image-processing';

describe('image-processing', () => {
  describe('getImageDimensions', () => {
    it('should extract dimensions from PNG', () => {
      // Create a minimal PNG header
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      // IHDR chunk at offset 8, with width at 16 and height at 20
      const pngBuffer = new ArrayBuffer(24);
      const view = new DataView(pngBuffer);

      // PNG signature
      view.setUint32(0, 0x89504e47);
      view.setUint32(4, 0x0d0a1a0a);

      // Width and height in IHDR
      view.setUint32(16, 1920); // width
      view.setUint32(20, 1080); // height

      const result = getImageDimensions(pngBuffer);

      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    it('should extract dimensions from JPEG', () => {
      // Create a minimal JPEG with SOF0 marker
      // JPEG starts with FFD8
      // SOF0 marker is FFC0, followed by segment length, then precision, height, width
      const jpegBuffer = new ArrayBuffer(20);
      const view = new DataView(jpegBuffer);

      // JPEG signature
      view.setUint16(0, 0xffd8);

      // SOF0 marker at offset 2
      view.setUint16(2, 0xffc0);
      view.setUint16(4, 11); // segment length

      // Precision (1 byte) at offset 6, then height (2 bytes) at offset 5, width (2 bytes) at offset 7
      view.setUint8(6, 8); // precision
      view.setUint16(7, 1080); // height
      view.setUint16(9, 1920); // width

      const result = getImageDimensions(jpegBuffer);

      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    it('should extract dimensions from GIF', () => {
      // Create a minimal GIF header
      // GIF signature: GIF89a or GIF87a
      // Width at offset 6 (little-endian), height at offset 8 (little-endian)
      const gifBuffer = new ArrayBuffer(10);
      const view = new DataView(gifBuffer);

      // GIF signature "GIF"
      view.setUint8(0, 'G'.charCodeAt(0));
      view.setUint8(1, 'I'.charCodeAt(0));
      view.setUint8(2, 'F'.charCodeAt(0));
      view.setUint8(3, '8'.charCodeAt(0));
      view.setUint8(4, '9'.charCodeAt(0));
      view.setUint8(5, 'a'.charCodeAt(0));

      // Width and height (little-endian)
      view.setUint16(6, 640, true); // width
      view.setUint16(8, 480, true); // height

      const result = getImageDimensions(gifBuffer);

      expect(result).toEqual({ width: 640, height: 480 });
    });

    it('should return null for unsupported format', () => {
      const buffer = new ArrayBuffer(32);
      const view = new DataView(buffer);

      // Random data that doesn't match any format
      view.setUint32(0, 0x12345678);

      const result = getImageDimensions(buffer);

      expect(result).toBeNull();
    });

    it('should return null for empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      const result = getImageDimensions(buffer);

      expect(result).toBeNull();
    });

    it('should return null for buffer too small', () => {
      const buffer = new ArrayBuffer(4);
      const result = getImageDimensions(buffer);

      expect(result).toBeNull();
    });
  });

  describe('isValidImageType', () => {
    it('should accept JPEG', () => {
      const file = new File([''], 'photo.jpg', { type: 'image/jpeg' });
      expect(isValidImageType(file)).toBe(true);
    });

    it('should accept PNG', () => {
      const file = new File([''], 'photo.png', { type: 'image/png' });
      expect(isValidImageType(file)).toBe(true);
    });

    it('should accept GIF', () => {
      const file = new File([''], 'photo.gif', { type: 'image/gif' });
      expect(isValidImageType(file)).toBe(true);
    });

    it('should accept WebP', () => {
      const file = new File([''], 'photo.webp', { type: 'image/webp' });
      expect(isValidImageType(file)).toBe(true);
    });

    it('should accept HEIC', () => {
      const file = new File([''], 'photo.heic', { type: 'image/heic' });
      expect(isValidImageType(file)).toBe(true);
    });

    it('should accept HEIF', () => {
      const file = new File([''], 'photo.heif', { type: 'image/heif' });
      expect(isValidImageType(file)).toBe(true);
    });

    it('should reject PDF', () => {
      const file = new File([''], 'doc.pdf', { type: 'application/pdf' });
      expect(isValidImageType(file)).toBe(false);
    });

    it('should reject video', () => {
      const file = new File([''], 'video.mp4', { type: 'video/mp4' });
      expect(isValidImageType(file)).toBe(false);
    });
  });

  describe('isValidVideoType', () => {
    it('should accept MP4', () => {
      const file = new File([''], 'video.mp4', { type: 'video/mp4' });
      expect(isValidVideoType(file)).toBe(true);
    });

    it('should accept QuickTime', () => {
      const file = new File([''], 'video.mov', { type: 'video/quicktime' });
      expect(isValidVideoType(file)).toBe(true);
    });

    it('should accept WebM', () => {
      const file = new File([''], 'video.webm', { type: 'video/webm' });
      expect(isValidVideoType(file)).toBe(true);
    });

    it('should accept AVI', () => {
      const file = new File([''], 'video.avi', { type: 'video/x-msvideo' });
      expect(isValidVideoType(file)).toBe(true);
    });

    it('should reject image', () => {
      const file = new File([''], 'photo.jpg', { type: 'image/jpeg' });
      expect(isValidVideoType(file)).toBe(false);
    });

    it('should reject PDF', () => {
      const file = new File([''], 'doc.pdf', { type: 'application/pdf' });
      expect(isValidVideoType(file)).toBe(false);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for webp', () => {
      expect(getMimeType('webp')).toBe('image/webp');
    });

    it('should return correct MIME type for jpeg', () => {
      expect(getMimeType('jpeg')).toBe('image/jpeg');
    });

    it('should return correct MIME type for png', () => {
      expect(getMimeType('png')).toBe('image/png');
    });
  });
});
