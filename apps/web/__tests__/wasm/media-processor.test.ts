import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mock the WASM module before importing the wrapper
vi.mock('media-processor', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  init: vi.fn(),
  process_image_wasm: vi.fn(),
  extract_exif_wasm: vi.fn(),
  generate_thumbnail_wasm: vi.fn(),
  compute_hashes_wasm: vi.fn(),
}));

import {
  load,
  isLoaded,
  getLoadingState,
  preload,
  processImage,
  extractExif,
  generateThumbnail,
  computeHashes,
  __resetForTesting,
} from '@/lib/wasm/media-processor';
import * as wasmModule from 'media-processor';

describe('Media Processor WASM Wrapper', () => {
  beforeEach(() => {
    __resetForTesting();
    vi.clearAllMocks();
  });

  // =========================================================================
  // Requirement 1: Module NOT loaded on initial page load
  // =========================================================================
  describe('Lazy Loading', () => {
    it('should not load module until explicitly requested', () => {
      expect(isLoaded()).toBe(false);
      expect(getLoadingState()).toBe('idle');
      expect(wasmModule.default).not.toHaveBeenCalled();
    });

    // Requirement 2: Module loads on Gallery upload trigger
    it('should load module when load() is called', async () => {
      await load();
      expect(wasmModule.default).toHaveBeenCalledTimes(1);
      expect(isLoaded()).toBe(true);
      expect(getLoadingState()).toBe('loaded');
    });

    // Requirement 4: Second load returns same instance (singleton)
    it('should only initialize once on concurrent load calls (singleton pattern)', async () => {
      const promise1 = load();
      const promise2 = load();

      // Both should resolve successfully
      await Promise.all([promise1, promise2]);

      // Most importantly: WASM init should only be called once
      expect(wasmModule.default).toHaveBeenCalledTimes(1);
    });

    it('should allow multiple concurrent load calls without duplicate initialization', async () => {
      const promises = Array(5)
        .fill(null)
        .map(() => load());
      await Promise.all(promises);
      expect(wasmModule.default).toHaveBeenCalledTimes(1);
    });

    it('should return immediately if already loaded', async () => {
      await load();
      expect(wasmModule.default).toHaveBeenCalledTimes(1);

      await load();
      expect(wasmModule.default).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Requirement 3: Module preloads on Gallery tab hover
  // =========================================================================
  describe('Preloading', () => {
    it('should create modulepreload link when preload() is called', () => {
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');

      preload();

      expect(appendChildSpy).toHaveBeenCalled();
      const link = appendChildSpy.mock.calls[0][0] as HTMLLinkElement;
      expect(link.rel).toBe('modulepreload');
      expect(link.href).toContain('media_processor');
    });

    it('should not create duplicate preload links', () => {
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');
      vi.spyOn(document.head, 'querySelector').mockReturnValue({} as Element);

      preload();

      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('should not preload if already loading', async () => {
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');

      // Start loading
      const loadPromise = load();
      preload(); // This should be a no-op

      await loadPromise;
      expect(appendChildSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Requirement 5: processImage() returns valid ProcessResult
  // =========================================================================
  describe('processImage()', () => {
    const mockImageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const mockResult = { data: new Uint8Array([0xff, 0xd8, 0xff, 0xe1]) };

    beforeEach(() => {
      (wasmModule.process_image_wasm as Mock).mockReturnValue(mockResult);
    });

    it('should return ProcessResult with data as Uint8Array', async () => {
      const result = await processImage(mockImageData, 2048, 85);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeInstanceOf(Uint8Array);
    });

    it('should call WASM function with correct parameters', async () => {
      await processImage(mockImageData, 1024, 75);

      expect(wasmModule.process_image_wasm).toHaveBeenCalledWith(
        mockImageData,
        1024,
        75
      );
    });

    it('should use default values when parameters omitted', async () => {
      await processImage(mockImageData);

      expect(wasmModule.process_image_wasm).toHaveBeenCalledWith(
        mockImageData,
        2048,
        85
      );
    });

    it('should auto-load module if not loaded', async () => {
      expect(isLoaded()).toBe(false);
      await processImage(mockImageData);
      expect(isLoaded()).toBe(true);
    });
  });

  // =========================================================================
  // Requirement 6: extractExif() returns valid ExifData
  // =========================================================================
  describe('extractExif()', () => {
    const mockImageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe1]);

    it('should return ExifData with all optional fields', async () => {
      const mockExif = {
        date_taken: '2024-01-15 14:30:00',
        camera_make: 'Apple',
        camera_model: 'iPhone 15 Pro',
        gps_latitude: 40.446111,
        gps_longitude: -74.005833,
        orientation: 1,
        width: 4032,
        height: 3024,
      };
      (wasmModule.extract_exif_wasm as Mock).mockReturnValue(mockExif);

      const result = await extractExif(mockImageData);

      expect(result.date_taken).toBe('2024-01-15 14:30:00');
      expect(result.camera_make).toBe('Apple');
      expect(result.camera_model).toBe('iPhone 15 Pro');
      expect(result.gps_latitude).toBe(40.446111);
      expect(result.gps_longitude).toBe(-74.005833);
      expect(result.orientation).toBe(1);
      expect(result.width).toBe(4032);
      expect(result.height).toBe(3024);
    });

    it('should return empty object when EXIF extraction fails gracefully', async () => {
      (wasmModule.extract_exif_wasm as Mock).mockImplementation(() => {
        throw new Error('No EXIF data found');
      });

      const result = await extractExif(mockImageData);
      expect(result).toEqual({});
    });

    it('should handle partial EXIF data', async () => {
      const partialExif = {
        camera_make: 'Canon',
        width: 1920,
      };
      (wasmModule.extract_exif_wasm as Mock).mockReturnValue(partialExif);

      const result = await extractExif(mockImageData);

      expect(result.camera_make).toBe('Canon');
      expect(result.width).toBe(1920);
      expect(result.date_taken).toBeUndefined();
      expect(result.gps_latitude).toBeUndefined();
    });
  });

  // =========================================================================
  // Requirement 7: generateThumbnail() returns Uint8Array
  // =========================================================================
  describe('generateThumbnail()', () => {
    const mockImageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const mockResult = {
      data: new Uint8Array([0xff, 0xd8, 0xff, 0xe1]),
      width: 300,
      height: 200,
      size_bytes: 4,
    };

    beforeEach(() => {
      (wasmModule.generate_thumbnail_wasm as Mock).mockReturnValue(mockResult);
    });

    it('should return ThumbnailResult with data as Uint8Array', async () => {
      const result = await generateThumbnail(mockImageData, 300, false);

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.width).toBe(300);
      expect(result.height).toBe(200);
      expect(result.size_bytes).toBe(4);
    });

    it('should pass crop parameter correctly', async () => {
      await generateThumbnail(mockImageData, 150, true);

      expect(wasmModule.generate_thumbnail_wasm).toHaveBeenCalledWith(
        mockImageData,
        150,
        true
      );
    });

    it('should use default values when parameters omitted', async () => {
      await generateThumbnail(mockImageData);

      expect(wasmModule.generate_thumbnail_wasm).toHaveBeenCalledWith(
        mockImageData,
        300,
        false
      );
    });
  });

  // =========================================================================
  // computeHashes() tests
  // =========================================================================
  describe('computeHashes()', () => {
    const mockImageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

    it('should return HashResult with sha256 and perceptual hashes', async () => {
      const mockHashes = {
        sha256:
          '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
        perceptual: 'abcdef0123456789',
      };
      (wasmModule.compute_hashes_wasm as Mock).mockReturnValue(mockHashes);

      const result = await computeHashes(mockImageData);

      expect(result.sha256).toBe(mockHashes.sha256);
      expect(result.sha256.length).toBe(64);
      expect(result.perceptual).toBe(mockHashes.perceptual);
      expect(result.perceptual.length).toBe(16);
    });

    it('should throw error when hashing fails', async () => {
      (wasmModule.compute_hashes_wasm as Mock).mockImplementation(() => {
        throw new Error('Invalid image data');
      });

      await expect(computeHashes(mockImageData)).rejects.toEqual({
        type: 'wasm_error',
        message: 'Invalid image data',
      });
    });
  });

  // =========================================================================
  // Requirement 8: WASM unavailable -> graceful error handling
  // =========================================================================
  describe('Error Handling', () => {
    it('should throw MediaProcessorError when WASM load fails', async () => {
      (wasmModule.default as Mock).mockRejectedValueOnce(
        new Error('Failed to compile WebAssembly module')
      );

      await expect(load()).rejects.toThrow(
        'Failed to compile WebAssembly module'
      );
      expect(getLoadingState()).toBe('error');
    });

    it('should allow retry after load failure', async () => {
      (wasmModule.default as Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      await expect(load()).rejects.toThrow('Network error');

      // Reset and retry
      __resetForTesting();
      await expect(load()).resolves.toBeUndefined();
      expect(isLoaded()).toBe(true);
    });

    it('should throw error with type when processImage fails', async () => {
      (wasmModule.process_image_wasm as Mock).mockImplementation(() => {
        throw new Error('Failed to decode image');
      });

      await expect(processImage(new Uint8Array([0, 1, 2]))).rejects.toEqual({
        type: 'wasm_error',
        message: 'Failed to decode image',
      });
    });

    it('should throw error with type when generateThumbnail fails', async () => {
      (wasmModule.generate_thumbnail_wasm as Mock).mockImplementation(() => {
        throw new Error('Image too small for thumbnail');
      });

      await expect(
        generateThumbnail(new Uint8Array([0, 1, 2]), 300, false)
      ).rejects.toEqual({
        type: 'wasm_error',
        message: 'Image too small for thumbnail',
      });
    });
  });

  // =========================================================================
  // Loading state tracking
  // =========================================================================
  describe('Loading State', () => {
    it('should transition through loading states correctly', async () => {
      expect(getLoadingState()).toBe('idle');

      const loadPromise = load();
      // Note: State transitions to 'loading' synchronously
      expect(getLoadingState()).toBe('loading');

      await loadPromise;
      expect(getLoadingState()).toBe('loaded');
    });

    it('should set error state on failure', async () => {
      (wasmModule.default as Mock).mockRejectedValueOnce(new Error('Failed'));

      await expect(load()).rejects.toThrow();
      expect(getLoadingState()).toBe('error');
    });
  });
});
