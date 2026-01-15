import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileUpload } from '../useFileUpload';

// Mock cloudinary-upload module
vi.mock('@/lib/utils/cloudinary-upload', () => ({
  uploadToCloudinary: vi.fn(),
  getCloudinaryThumbnailUrl: vi.fn((url) => `${url}?thumbnail=true`),
  getMediaTypeFromFile: vi.fn((file) =>
    file.type.startsWith('video/') ? 'video' : 'photo'
  ),
  validateUploadFile: vi.fn(() => ({ valid: true })),
  CloudinaryUploadError: class CloudinaryUploadError extends Error {
    constructor(
      message: string,
      public readonly statusCode?: number,
      public readonly cloudinaryError?: unknown
    ) {
      super(message);
      this.name = 'CloudinaryUploadError';
    }
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
Object.defineProperty(window.URL, 'createObjectURL', {
  value: mockCreateObjectURL,
});
Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockFile(name = 'test.jpg', type = 'image/jpeg'): File {
  return new File(['test'], name, { type });
}

function createMockFileList(files: File[]): FileList {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] || null,
    [Symbol.iterator]: function* () {
      for (const file of files) {
        yield file;
      }
    },
  };
  files.forEach((file, index) => {
    (fileList as Record<number, File>)[index] = file;
  });
  return fileList as unknown as FileList;
}

describe('useFileUpload', () => {
  const defaultProps = {
    tripId: 'trip-123',
    onUploaded: vi.fn(),
    onAllComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with empty files array', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));

      expect(result.current.files).toEqual([]);
      expect(result.current.hasFiles).toBe(false);
    });

    it('should start with isDragging false', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));

      expect(result.current.isDragging).toBe(false);
    });

    it('should start with isUploading false', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));

      expect(result.current.isUploading).toBe(false);
    });

    it('should start with pendingCount 0', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));

      expect(result.current.pendingCount).toBe(0);
    });

    it('should start with allComplete false', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));

      expect(result.current.allComplete).toBe(false);
    });
  });

  describe('addFiles', () => {
    it('should add files to the queue', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const file = createMockFile();
      const fileList = createMockFileList([file]);

      act(() => {
        result.current.addFiles(fileList);
      });

      expect(result.current.files).toHaveLength(1);
      expect(result.current.files[0].file).toBe(file);
      expect(result.current.files[0].status).toBe('pending');
      expect(result.current.hasFiles).toBe(true);
    });

    it('should add multiple files', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')];
      const fileList = createMockFileList(files);

      act(() => {
        result.current.addFiles(fileList);
      });

      expect(result.current.files).toHaveLength(2);
      expect(result.current.pendingCount).toBe(2);
    });

    it('should create preview URLs for files', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const file = createMockFile();
      const fileList = createMockFileList([file]);

      act(() => {
        result.current.addFiles(fileList);
      });

      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
      expect(result.current.files[0].preview).toBe('blob:mock-url');
    });

    it('should initialize files with empty caption', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const file = createMockFile();
      const fileList = createMockFileList([file]);

      act(() => {
        result.current.addFiles(fileList);
      });

      expect(result.current.files[0].caption).toBe('');
    });

    it('should initialize files with 0 progress', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const file = createMockFile();
      const fileList = createMockFileList([file]);

      act(() => {
        result.current.addFiles(fileList);
      });

      expect(result.current.files[0].progress).toBe(0);
    });
  });

  describe('removeFile', () => {
    it('should remove a file from the queue', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const file = createMockFile();
      const fileList = createMockFileList([file]);

      act(() => {
        result.current.addFiles(fileList);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.removeFile(fileId);
      });

      expect(result.current.files).toHaveLength(0);
      expect(result.current.hasFiles).toBe(false);
    });

    it('should revoke preview URL when removing file', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const file = createMockFile();
      const fileList = createMockFileList([file]);

      act(() => {
        result.current.addFiles(fileList);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.removeFile(fileId);
      });

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should not affect other files when removing one', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')];
      const fileList = createMockFileList(files);

      act(() => {
        result.current.addFiles(fileList);
      });

      const firstFileId = result.current.files[0].id;

      act(() => {
        result.current.removeFile(firstFileId);
      });

      expect(result.current.files).toHaveLength(1);
      expect(result.current.files[0].file.name).toBe('test2.jpg');
    });
  });

  describe('updateCaption', () => {
    it('should update caption for a file', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const file = createMockFile();
      const fileList = createMockFileList([file]);

      act(() => {
        result.current.addFiles(fileList);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.updateCaption(fileId, 'Test caption');
      });

      expect(result.current.files[0].caption).toBe('Test caption');
    });

    it('should not affect other files when updating caption', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')];
      const fileList = createMockFileList(files);

      act(() => {
        result.current.addFiles(fileList);
      });

      const firstFileId = result.current.files[0].id;

      act(() => {
        result.current.updateCaption(firstFileId, 'Caption 1');
      });

      expect(result.current.files[0].caption).toBe('Caption 1');
      expect(result.current.files[1].caption).toBe('');
    });
  });

  describe('setIsDragging', () => {
    it('should update isDragging state', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));

      act(() => {
        result.current.setIsDragging(true);
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.setIsDragging(false);
      });

      expect(result.current.isDragging).toBe(false);
    });
  });

  describe('handleRetry', () => {
    it('should reset file status to pending', async () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const file = createMockFile();
      const fileList = createMockFileList([file]);

      act(() => {
        result.current.addFiles(fileList);
      });

      // Manually set error state for testing
      const fileId = result.current.files[0].id;

      act(() => {
        result.current.handleRetry(fileId);
      });

      expect(result.current.files[0].status).toBe('pending');
      expect(result.current.files[0].progress).toBe(0);
      expect(result.current.files[0].error).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should clear all files', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')];
      const fileList = createMockFileList(files);

      act(() => {
        result.current.addFiles(fileList);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.files).toHaveLength(0);
      expect(result.current.hasFiles).toBe(false);
    });

    it('should revoke all preview URLs', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')];
      const fileList = createMockFileList(files);

      act(() => {
        result.current.addFiles(fileList);
      });

      act(() => {
        result.current.reset();
      });

      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(2);
    });

    it('should reset isDragging to false', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));

      act(() => {
        result.current.setIsDragging(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isDragging).toBe(false);
    });

    it('should reset isUploading to false', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));

      act(() => {
        result.current.reset();
      });

      expect(result.current.isUploading).toBe(false);
    });
  });

  describe('computed values', () => {
    it('should calculate pendingCount correctly', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const files = [
        createMockFile('test1.jpg'),
        createMockFile('test2.jpg'),
        createMockFile('test3.jpg'),
      ];
      const fileList = createMockFileList(files);

      act(() => {
        result.current.addFiles(fileList);
      });

      expect(result.current.pendingCount).toBe(3);
    });

    it('should return hasFiles true when files exist', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));
      const file = createMockFile();
      const fileList = createMockFileList([file]);

      act(() => {
        result.current.addFiles(fileList);
      });

      expect(result.current.hasFiles).toBe(true);
    });

    it('should return hasFiles false when no files', () => {
      const { result } = renderHook(() => useFileUpload(defaultProps));

      expect(result.current.hasFiles).toBe(false);
    });
  });
});
