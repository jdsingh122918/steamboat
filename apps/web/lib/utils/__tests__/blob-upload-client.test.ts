import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getMediaTypeFromFile,
  validateUploadFile,
  getThumbnailUrl,
  BlobUploadClientError,
} from '../blob-upload-client';

// Mock video-metadata module
vi.mock('../video-metadata', () => ({
  extractVideoMetadata: vi.fn(),
  generateVideoThumbnail: vi.fn(),
}));

describe('blob-upload-client', () => {
  describe('getMediaTypeFromFile', () => {
    it('should return "photo" for image files', () => {
      const jpegFile = new File([''], 'photo.jpg', { type: 'image/jpeg' });
      const pngFile = new File([''], 'photo.png', { type: 'image/png' });
      const gifFile = new File([''], 'photo.gif', { type: 'image/gif' });

      expect(getMediaTypeFromFile(jpegFile)).toBe('photo');
      expect(getMediaTypeFromFile(pngFile)).toBe('photo');
      expect(getMediaTypeFromFile(gifFile)).toBe('photo');
    });

    it('should return "video" for video files', () => {
      const mp4File = new File([''], 'video.mp4', { type: 'video/mp4' });
      const movFile = new File([''], 'video.mov', { type: 'video/quicktime' });
      const webmFile = new File([''], 'video.webm', { type: 'video/webm' });

      expect(getMediaTypeFromFile(mp4File)).toBe('video');
      expect(getMediaTypeFromFile(movFile)).toBe('video');
      expect(getMediaTypeFromFile(webmFile)).toBe('video');
    });

    it('should return "photo" for unknown types', () => {
      const unknownFile = new File([''], 'file.unknown', {
        type: 'application/octet-stream',
      });

      expect(getMediaTypeFromFile(unknownFile)).toBe('photo');
    });
  });

  describe('validateUploadFile', () => {
    it('should accept valid image files', () => {
      const jpegFile = new File(['x'.repeat(1000)], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const result = validateUploadFile(jpegFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid video files', () => {
      const mp4File = new File(['x'.repeat(1000)], 'video.mp4', {
        type: 'video/mp4',
      });
      const result = validateUploadFile(mp4File);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files exceeding size limit', () => {
      // Create a file that exceeds the 100MB default limit
      const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const result = validateUploadFile(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
      expect(result.error).toContain('100MB');
    });

    it('should use custom size limit', () => {
      const file = new File(['x'.repeat(5 * 1024 * 1024)], 'photo.jpg', {
        type: 'image/jpeg',
      });

      // 1MB limit
      const result = validateUploadFile(file, { maxSizeBytes: 1 * 1024 * 1024 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
      expect(result.error).toContain('1MB');
    });

    it('should reject unsupported file types', () => {
      const pdfFile = new File([''], 'document.pdf', { type: 'application/pdf' });
      const result = validateUploadFile(pdfFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('should accept HEIC/HEIF files', () => {
      const heicFile = new File([''], 'photo.heic', { type: 'image/heic' });
      const heifFile = new File([''], 'photo.heif', { type: 'image/heif' });

      expect(validateUploadFile(heicFile).valid).toBe(true);
      expect(validateUploadFile(heifFile).valid).toBe(true);
    });

    it('should accept WebP files', () => {
      const webpFile = new File([''], 'photo.webp', { type: 'image/webp' });
      const result = validateUploadFile(webpFile);

      expect(result.valid).toBe(true);
    });

    it('should accept QuickTime video files', () => {
      const movFile = new File([''], 'video.mov', { type: 'video/quicktime' });
      const result = validateUploadFile(movFile);

      expect(result.valid).toBe(true);
    });

    it('should use custom allowed types', () => {
      const pngFile = new File([''], 'photo.png', { type: 'image/png' });

      // Only allow JPEG
      const result = validateUploadFile(pngFile, {
        allowedImageTypes: ['image/jpeg'],
        allowedVideoTypes: [],
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });
  });

  describe('getThumbnailUrl', () => {
    it('should return the same URL (passthrough)', () => {
      const url = 'https://example.blob.vercel-storage.com/image.jpg';
      expect(getThumbnailUrl(url)).toBe(url);
    });
  });

  describe('BlobUploadClientError', () => {
    it('should have correct name property', () => {
      const error = new BlobUploadClientError('Test error');

      expect(error.name).toBe('BlobUploadClientError');
    });

    it('should store statusCode', () => {
      const error = new BlobUploadClientError('Test error', 400);

      expect(error.statusCode).toBe(400);
    });

    it('should be instanceof Error', () => {
      const error = new BlobUploadClientError('Test error');

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('uploadFile', () => {
    let xhrMock: {
      open: ReturnType<typeof vi.fn>;
      send: ReturnType<typeof vi.fn>;
      abort: ReturnType<typeof vi.fn>;
      upload: {
        addEventListener: ReturnType<typeof vi.fn>;
      };
      addEventListener: ReturnType<typeof vi.fn>;
      status: number;
      responseText: string;
    };

    const mockUploadResponse = {
      success: true,
      data: {
        url: 'https://example.blob.vercel-storage.com/trips/trip123/photo.jpg',
        thumbnailUrl:
          'https://example.blob.vercel-storage.com/trips/trip123/photo_thumb.webp',
        size: 102400,
        contentType: 'image/jpeg',
        type: 'image' as const,
        dimensions: { width: 1920, height: 1080 },
      },
    };

    beforeEach(() => {
      vi.clearAllMocks();

      // Create XHR mock
      xhrMock = {
        open: vi.fn(),
        send: vi.fn(),
        abort: vi.fn(),
        upload: {
          addEventListener: vi.fn(),
        },
        addEventListener: vi.fn(),
        status: 200,
        responseText: JSON.stringify(mockUploadResponse),
      };

      // Mock XMLHttpRequest
      vi.stubGlobal('XMLHttpRequest', vi.fn(() => xhrMock));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should open connection with correct URL', async () => {
      const { uploadFile } = await import('../blob-upload-client');
      const mockFile = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      });

      xhrMock.send.mockImplementation(() => {
        const loadHandler = xhrMock.addEventListener.mock.calls.find(
          (call) => call[0] === 'load'
        )?.[1];
        if (loadHandler) loadHandler();
      });

      await uploadFile(mockFile, 'trip123');

      expect(xhrMock.open).toHaveBeenCalledWith(
        'POST',
        '/api/trips/trip123/media/upload'
      );
    });

    it('should return upload response on success', async () => {
      const { uploadFile } = await import('../blob-upload-client');
      const mockFile = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      });

      xhrMock.send.mockImplementation(() => {
        const loadHandler = xhrMock.addEventListener.mock.calls.find(
          (call) => call[0] === 'load'
        )?.[1];
        if (loadHandler) loadHandler();
      });

      const result = await uploadFile(mockFile, 'trip123');

      expect(result).toEqual(mockUploadResponse.data);
    });

    it('should call onProgress callback during upload', async () => {
      const { uploadFile } = await import('../blob-upload-client');
      const mockFile = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      });
      const onProgress = vi.fn();

      xhrMock.send.mockImplementation(() => {
        // Simulate progress events
        const progressHandler = xhrMock.upload.addEventListener.mock.calls.find(
          (call) => call[0] === 'progress'
        )?.[1];
        if (progressHandler) {
          progressHandler({ lengthComputable: true, loaded: 50, total: 100 });
          progressHandler({ lengthComputable: true, loaded: 100, total: 100 });
        }

        const loadHandler = xhrMock.addEventListener.mock.calls.find(
          (call) => call[0] === 'load'
        )?.[1];
        if (loadHandler) loadHandler();
      });

      await uploadFile(mockFile, 'trip123', { onProgress });

      expect(onProgress).toHaveBeenCalledWith(50);
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should throw BlobUploadClientError on HTTP error', async () => {
      const { uploadFile } = await import('../blob-upload-client');
      const mockFile = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      });

      xhrMock.status = 400;
      xhrMock.responseText = JSON.stringify({
        success: false,
        error: 'Invalid file type',
      });

      xhrMock.send.mockImplementation(() => {
        const loadHandler = xhrMock.addEventListener.mock.calls.find(
          (call) => call[0] === 'load'
        )?.[1];
        if (loadHandler) loadHandler();
      });

      await expect(uploadFile(mockFile, 'trip123')).rejects.toThrow(
        'Invalid file type'
      );
    });

    it('should throw BlobUploadClientError on network error', async () => {
      const { uploadFile } = await import('../blob-upload-client');
      const mockFile = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      });

      xhrMock.send.mockImplementation(() => {
        const errorHandler = xhrMock.addEventListener.mock.calls.find(
          (call) => call[0] === 'error'
        )?.[1];
        if (errorHandler) errorHandler();
      });

      await expect(uploadFile(mockFile, 'trip123')).rejects.toThrow(
        'Network error during upload'
      );
    });

    it('should throw BlobUploadClientError on timeout', async () => {
      const { uploadFile } = await import('../blob-upload-client');
      const mockFile = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      });

      xhrMock.send.mockImplementation(() => {
        const timeoutHandler = xhrMock.addEventListener.mock.calls.find(
          (call) => call[0] === 'timeout'
        )?.[1];
        if (timeoutHandler) timeoutHandler();
      });

      await expect(uploadFile(mockFile, 'trip123')).rejects.toThrow(
        'Upload timed out'
      );
    });

    it('should abort upload when signal is aborted', async () => {
      const { uploadFile } = await import('../blob-upload-client');
      const mockFile = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      });
      const controller = new AbortController();

      xhrMock.send.mockImplementation(() => {
        // Abort the upload
        controller.abort();
      });

      await expect(
        uploadFile(mockFile, 'trip123', { signal: controller.signal })
      ).rejects.toThrow('Upload cancelled');

      expect(xhrMock.abort).toHaveBeenCalled();
    });
  });
});
