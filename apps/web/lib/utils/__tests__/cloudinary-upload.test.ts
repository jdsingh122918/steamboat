import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  uploadToCloudinary,
  getCloudinaryThumbnailUrl,
  getMediaTypeFromFile,
  validateUploadFile,
  CloudinaryUploadError,
  type UploadUrlData,
  type CloudinaryUploadResponse,
} from '../cloudinary-upload';

describe('cloudinary-upload', () => {
  describe('uploadToCloudinary', () => {
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

    const mockUploadData: UploadUrlData = {
      uploadUrl: 'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
      publicId: 'trips/test-trip/12345_abc',
      signature: 'mock-signature',
      timestamp: 1234567890,
      apiKey: 'mock-api-key',
      cloudName: 'test-cloud',
      folder: 'trips/test-trip',
      resourceType: 'image',
    };

    const mockCloudinaryResponse: CloudinaryUploadResponse = {
      public_id: 'trips/test-trip/12345_abc',
      version: 1234567890,
      signature: 'response-signature',
      width: 1920,
      height: 1080,
      format: 'jpg',
      resource_type: 'image',
      created_at: '2024-01-15T10:00:00Z',
      tags: [],
      bytes: 102400,
      type: 'upload',
      etag: 'abc123',
      placeholder: false,
      url: 'http://res.cloudinary.com/test-cloud/image/upload/trips/test-trip/12345_abc.jpg',
      secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/trips/test-trip/12345_abc.jpg',
      folder: 'trips/test-trip',
      original_filename: 'test-photo',
    };

    beforeEach(() => {
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
        responseText: JSON.stringify(mockCloudinaryResponse),
      };

      // Mock XMLHttpRequest
      vi.stubGlobal('XMLHttpRequest', vi.fn(() => xhrMock));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should create FormData with correct parameters', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      let capturedFormData: FormData | null = null;

      xhrMock.send.mockImplementation((formData: FormData) => {
        capturedFormData = formData;
        // Simulate successful response
        const loadHandler = xhrMock.addEventListener.mock.calls.find(
          (call) => call[0] === 'load'
        )?.[1];
        if (loadHandler) loadHandler();
      });

      await uploadToCloudinary(mockFile, mockUploadData);

      expect(capturedFormData).not.toBeNull();
      expect(capturedFormData!.get('file')).toBe(mockFile);
      expect(capturedFormData!.get('public_id')).toBe(mockUploadData.publicId);
      expect(capturedFormData!.get('signature')).toBe(mockUploadData.signature);
      expect(capturedFormData!.get('timestamp')).toBe(mockUploadData.timestamp.toString());
      expect(capturedFormData!.get('api_key')).toBe(mockUploadData.apiKey);
      expect(capturedFormData!.get('folder')).toBe(mockUploadData.folder);
    });

    it('should open connection with correct URL', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      xhrMock.send.mockImplementation(() => {
        const loadHandler = xhrMock.addEventListener.mock.calls.find(
          (call) => call[0] === 'load'
        )?.[1];
        if (loadHandler) loadHandler();
      });

      await uploadToCloudinary(mockFile, mockUploadData);

      expect(xhrMock.open).toHaveBeenCalledWith('POST', mockUploadData.uploadUrl);
    });

    it('should return CloudinaryUploadResponse on success', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      xhrMock.send.mockImplementation(() => {
        const loadHandler = xhrMock.addEventListener.mock.calls.find(
          (call) => call[0] === 'load'
        )?.[1];
        if (loadHandler) loadHandler();
      });

      const result = await uploadToCloudinary(mockFile, mockUploadData);

      expect(result).toEqual(mockCloudinaryResponse);
    });

    it('should call onProgress callback during upload', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
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

      await uploadToCloudinary(mockFile, mockUploadData, { onProgress });

      expect(onProgress).toHaveBeenCalledWith(50);
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should throw CloudinaryUploadError on HTTP error', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      xhrMock.status = 400;
      xhrMock.responseText = JSON.stringify({ error: { message: 'Invalid signature' } });

      xhrMock.send.mockImplementation(() => {
        const loadHandler = xhrMock.addEventListener.mock.calls.find(
          (call) => call[0] === 'load'
        )?.[1];
        if (loadHandler) loadHandler();
      });

      try {
        await uploadToCloudinary(mockFile, mockUploadData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(CloudinaryUploadError);
        expect((error as CloudinaryUploadError).message).toBe('Invalid signature');
        expect((error as CloudinaryUploadError).statusCode).toBe(400);
      }
    });

    it('should throw CloudinaryUploadError on network error', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      xhrMock.send.mockImplementation(() => {
        const errorHandler = xhrMock.addEventListener.mock.calls.find(
          (call) => call[0] === 'error'
        )?.[1];
        if (errorHandler) errorHandler();
      });

      try {
        await uploadToCloudinary(mockFile, mockUploadData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(CloudinaryUploadError);
        expect((error as CloudinaryUploadError).message).toBe('Network error during upload');
      }
    });

    it('should throw CloudinaryUploadError on timeout', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      xhrMock.send.mockImplementation(() => {
        const timeoutHandler = xhrMock.addEventListener.mock.calls.find(
          (call) => call[0] === 'timeout'
        )?.[1];
        if (timeoutHandler) timeoutHandler();
      });

      try {
        await uploadToCloudinary(mockFile, mockUploadData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(CloudinaryUploadError);
        expect((error as CloudinaryUploadError).message).toBe('Upload timed out');
      }
    });

    it('should abort upload when signal is aborted', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const controller = new AbortController();

      xhrMock.send.mockImplementation(() => {
        // Abort the upload
        controller.abort();
      });

      await expect(
        uploadToCloudinary(mockFile, mockUploadData, { signal: controller.signal })
      ).rejects.toThrow('Upload cancelled');

      expect(xhrMock.abort).toHaveBeenCalled();
    });
  });

  describe('getCloudinaryThumbnailUrl', () => {
    it('should insert transformation into Cloudinary URL', () => {
      const originalUrl =
        'https://res.cloudinary.com/test-cloud/image/upload/trips/abc/photo.jpg';
      const thumbnailUrl = getCloudinaryThumbnailUrl(originalUrl);

      expect(thumbnailUrl).toBe(
        'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_400,h_400,f_auto,q_auto/trips/abc/photo.jpg'
      );
    });

    it('should use custom dimensions', () => {
      const originalUrl =
        'https://res.cloudinary.com/test-cloud/image/upload/trips/abc/photo.jpg';
      const thumbnailUrl = getCloudinaryThumbnailUrl(originalUrl, {
        width: 200,
        height: 300,
      });

      expect(thumbnailUrl).toBe(
        'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_200,h_300,f_auto,q_auto/trips/abc/photo.jpg'
      );
    });

    it('should return original URL if no upload segment found', () => {
      const originalUrl = 'https://example.com/photo.jpg';
      const result = getCloudinaryThumbnailUrl(originalUrl);

      expect(result).toBe(originalUrl);
    });

    it('should handle video URLs', () => {
      const originalUrl =
        'https://res.cloudinary.com/test-cloud/video/upload/trips/abc/video.mp4';
      const thumbnailUrl = getCloudinaryThumbnailUrl(originalUrl, {
        width: 320,
        height: 240,
      });

      expect(thumbnailUrl).toBe(
        'https://res.cloudinary.com/test-cloud/video/upload/c_fill,w_320,h_240,f_auto,q_auto/trips/abc/video.mp4'
      );
    });
  });

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
      const unknownFile = new File([''], 'file.unknown', { type: 'application/octet-stream' });

      expect(getMediaTypeFromFile(unknownFile)).toBe('photo');
    });
  });

  describe('validateUploadFile', () => {
    it('should accept valid image files', () => {
      const jpegFile = new File(['x'.repeat(1000)], 'photo.jpg', { type: 'image/jpeg' });
      const result = validateUploadFile(jpegFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid video files', () => {
      const mp4File = new File(['x'.repeat(1000)], 'video.mp4', { type: 'video/mp4' });
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

  describe('CloudinaryUploadError', () => {
    it('should have correct name property', () => {
      const error = new CloudinaryUploadError('Test error');

      expect(error.name).toBe('CloudinaryUploadError');
    });

    it('should store statusCode', () => {
      const error = new CloudinaryUploadError('Test error', 400);

      expect(error.statusCode).toBe(400);
    });

    it('should store cloudinaryError', () => {
      const cloudinaryError = { error: { message: 'Invalid signature' } };
      const error = new CloudinaryUploadError('Test error', 400, cloudinaryError);

      expect(error.cloudinaryError).toEqual(cloudinaryError);
    });

    it('should be instanceof Error', () => {
      const error = new CloudinaryUploadError('Test error');

      expect(error).toBeInstanceOf(Error);
    });
  });
});
