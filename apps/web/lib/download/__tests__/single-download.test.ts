import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { downloadFile, getFilenameFromUrl } from '../single-download';
import { saveAs } from 'file-saver';

describe('single-download', () => {
  const mockSaveAs = vi.mocked(saveAs);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['image data'])),
    });
  });

  describe('downloadFile', () => {
    it('should fetch and save file', async () => {
      await downloadFile({
        url: 'https://example.com/photo.jpg',
        filename: 'my-photo.jpg',
      });

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/photo.jpg');
      expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'my-photo.jpg');
    });

    it('should throw error on failed fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        downloadFile({
          url: 'https://example.com/missing.jpg',
          filename: 'photo.jpg',
        })
      ).rejects.toThrow('Failed to download file: 404 Not Found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        downloadFile({
          url: 'https://example.com/photo.jpg',
          filename: 'photo.jpg',
        })
      ).rejects.toThrow('Network error');
    });

    it('should use provided filename', async () => {
      await downloadFile({
        url: 'https://example.com/abc123.jpg',
        filename: 'custom-name.jpg',
      });

      expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'custom-name.jpg');
    });
  });

  describe('getFilenameFromUrl', () => {
    it('should extract filename from URL', () => {
      const filename = getFilenameFromUrl('https://example.com/photos/vacation.jpg');
      expect(filename).toBe('vacation.jpg');
    });

    it('should extract filename with special characters', () => {
      const filename = getFilenameFromUrl('https://example.com/photos/my%20photo.jpg');
      expect(filename).toBe('my photo.jpg');
    });

    it('should return fallback for URL without filename', () => {
      const filename = getFilenameFromUrl('https://example.com/photos/', 'photo.jpg');
      expect(filename).toBe('photo.jpg');
    });

    it('should return fallback for invalid URL', () => {
      const filename = getFilenameFromUrl('not-a-url', 'photo.jpg');
      expect(filename).toBe('photo.jpg');
    });

    it('should use default fallback when not provided', () => {
      const filename = getFilenameFromUrl('https://example.com/');
      expect(filename).toBe('download');
    });

    it('should handle URL with query string', () => {
      const filename = getFilenameFromUrl('https://example.com/photo.jpg?width=800');
      expect(filename).toBe('photo.jpg');
    });

    it('should handle paths without extension', () => {
      const filename = getFilenameFromUrl('https://example.com/photo', 'fallback.jpg');
      expect(filename).toBe('fallback.jpg');
    });
  });
});
