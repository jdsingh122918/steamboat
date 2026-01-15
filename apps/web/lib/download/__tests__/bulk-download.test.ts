import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock JSZip
const mockFile = vi.fn();
const mockFolder = vi.fn().mockReturnValue({ file: mockFile });
const mockGenerateAsync = vi.fn().mockResolvedValue(new Blob(['zip content']));

vi.mock('jszip', () => ({
  default: vi.fn().mockImplementation(() => ({
    folder: mockFolder,
    generateAsync: mockGenerateAsync,
  })),
}));

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { downloadPhotosAsZip, DownloadProgress, PhotoItem } from '../bulk-download';
import { saveAs } from 'file-saver';

describe('bulk-download', () => {
  const mockSaveAs = vi.mocked(saveAs);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['image data'])),
    });
  });

  describe('downloadPhotosAsZip', () => {
    const defaultPhotos: PhotoItem[] = [
      { url: 'https://example.com/photo1.jpg', filename: 'photo1.jpg' },
      { url: 'https://example.com/photo2.jpg', filename: 'photo2.jpg' },
      { url: 'https://example.com/photo3.jpg', filename: 'photo3.jpg' },
    ];

    it('should download photos and create zip', async () => {
      await downloadPhotosAsZip(defaultPhotos, 'test-gallery');

      expect(mockFolder).toHaveBeenCalledWith('photos');
      expect(mockFile).toHaveBeenCalledTimes(3);
      expect(mockGenerateAsync).toHaveBeenCalledWith({ type: 'blob' });
      expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'test-gallery.zip');
    });

    it('should fetch each photo URL', async () => {
      await downloadPhotosAsZip(defaultPhotos, 'test-gallery');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/photo1.jpg');
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/photo2.jpg');
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/photo3.jpg');
    });

    it('should add each photo to the zip', async () => {
      await downloadPhotosAsZip(defaultPhotos, 'test-gallery');

      expect(mockFile).toHaveBeenCalledWith('photo1.jpg', expect.any(Blob));
      expect(mockFile).toHaveBeenCalledWith('photo2.jpg', expect.any(Blob));
      expect(mockFile).toHaveBeenCalledWith('photo3.jpg', expect.any(Blob));
    });

    it('should call progress callback', async () => {
      const onProgress = vi.fn();

      await downloadPhotosAsZip(defaultPhotos, 'test-gallery', onProgress);

      // Should be called for each photo
      expect(onProgress).toHaveBeenCalled();
      // Final call should be 100%
      expect(onProgress).toHaveBeenLastCalledWith(
        expect.objectContaining({
          percent: 100,
        })
      );
    });

    it('should report progress correctly', async () => {
      const progressUpdates: DownloadProgress[] = [];
      const onProgress = (progress: DownloadProgress) => {
        progressUpdates.push({ ...progress });
      };

      await downloadPhotosAsZip(defaultPhotos, 'test-gallery', onProgress);

      // Check progress updates
      expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
      expect(progressUpdates[0].current).toBe(1);
      expect(progressUpdates[progressUpdates.length - 1].percent).toBe(100);
    });

    it('should use custom zip filename', async () => {
      await downloadPhotosAsZip(defaultPhotos, 'my-custom-name');

      expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'my-custom-name.zip');
    });

    it('should handle empty photo list', async () => {
      await downloadPhotosAsZip([], 'empty-gallery');

      expect(mockFile).not.toHaveBeenCalled();
      expect(mockGenerateAsync).toHaveBeenCalled();
      expect(mockSaveAs).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(['image data'])),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(['image data'])),
        });

      // Should not throw, should continue with other photos
      await expect(
        downloadPhotosAsZip(defaultPhotos, 'test-gallery')
      ).resolves.not.toThrow();

      // Should still create zip with successful downloads
      expect(mockFile).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw for a single failure
      await expect(
        downloadPhotosAsZip([defaultPhotos[0]], 'test-gallery')
      ).resolves.not.toThrow();
    });
  });
});
