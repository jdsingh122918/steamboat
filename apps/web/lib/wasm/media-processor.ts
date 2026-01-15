/**
 * Media Processor WASM Wrapper
 *
 * Provides lazy loading and TypeScript-safe access to the media-processor
 * WASM module for client-side image processing.
 *
 * Features:
 * - Lazy loading: Module not loaded until explicitly requested
 * - Singleton pattern: Same instance returned on multiple load() calls
 * - Preloading: Can preload on hover for better UX
 * - Graceful error handling: Returns typed errors
 */

import type {
  ProcessResult,
  ExifData,
  ThumbnailResult,
  HashResult,
  LoadingState,
  MediaProcessorError,
} from './types';

// Type definition for the WASM module exports
type MediaProcessorWasm = typeof import('media-processor');

// Singleton state
let wasmModule: MediaProcessorWasm | null = null;
let loadPromise: Promise<void> | null = null;
let loadingState: LoadingState = 'idle';

/**
 * Get the current loading state of the WASM module.
 */
export function getLoadingState(): LoadingState {
  return loadingState;
}

/**
 * Check if the WASM module is currently loaded and ready.
 */
export function isLoaded(): boolean {
  return loadingState === 'loaded' && wasmModule !== null;
}

/**
 * Preload the media processor WASM module without blocking.
 * Called on Gallery tab hover for prefetching.
 *
 * This creates a <link rel="modulepreload"> tag to hint the browser
 * to start fetching the WASM file.
 */
export function preload(): void {
  // SSR guard
  if (typeof window === 'undefined') return;

  // Don't preload if already loading or loaded
  if (loadingState !== 'idle') return;

  // Check if preload link already exists
  const existingLink = document.head.querySelector(
    'link[href*="media_processor"]'
  );
  if (existingLink) return;

  // Create modulepreload link
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = '/wasm/media_processor_bg.wasm';
  document.head.appendChild(link);
}

/**
 * Load the media processor WASM module.
 * Returns the same promise if already loading (singleton pattern).
 *
 * @throws Error if loading fails
 */
export async function load(): Promise<void> {
  // Return immediately if already loaded
  if (loadingState === 'loaded' && wasmModule !== null) {
    return;
  }

  // Return existing promise if currently loading (singleton)
  if (loadPromise !== null) {
    return loadPromise;
  }

  // SSR guard
  if (typeof window === 'undefined') {
    throw new Error('Media processor can only be loaded in browser environment');
  }

  loadingState = 'loading';

  loadPromise = (async () => {
    try {
      // Dynamic import for lazy loading (not included in main bundle)
      const wasm = (await import('media-processor')) as MediaProcessorWasm;

      // Initialize WASM module
      await wasm.default();

      wasmModule = wasm;
      loadingState = 'loaded';
    } catch (error) {
      loadingState = 'error';
      loadPromise = null; // Allow retry
      throw error instanceof Error ? error : new Error(String(error));
    }
  })();

  return loadPromise;
}

/**
 * Create a typed error for WASM operations.
 */
function createError(
  type: MediaProcessorError['type'],
  message: string
): MediaProcessorError {
  return { type, message };
}

/**
 * Extract error message from unknown error type.
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}

/**
 * Process an image by resizing it to fit within maximum dimensions.
 *
 * @param data - Raw image bytes (JPEG, PNG, WebP, etc.)
 * @param maxDim - Maximum dimension for width or height (default: 2048)
 * @param quality - JPEG quality 1-100 (default: 85)
 * @returns ProcessResult with resized image data
 * @throws MediaProcessorError if processing fails
 */
export async function processImage(
  data: Uint8Array,
  maxDim: number = 2048,
  quality: number = 85
): Promise<ProcessResult> {
  await load();

  if (!wasmModule) {
    throw createError('not_loaded', 'WASM module not available');
  }

  try {
    const result = wasmModule.process_image_wasm(data, maxDim, quality);
    return result as ProcessResult;
  } catch (error) {
    throw createError('wasm_error', extractErrorMessage(error));
  }
}

/**
 * Extract EXIF metadata from an image.
 *
 * @param data - Raw image bytes (JPEG, PNG, or other EXIF-compatible format)
 * @returns ExifData with extracted metadata (fields may be undefined)
 * @throws MediaProcessorError if extraction fails critically
 */
export async function extractExif(data: Uint8Array): Promise<ExifData> {
  await load();

  if (!wasmModule) {
    throw createError('not_loaded', 'WASM module not available');
  }

  try {
    const result = wasmModule.extract_exif_wasm(data);
    return result as ExifData;
  } catch (error) {
    // EXIF extraction may fail gracefully - return empty object
    console.warn('EXIF extraction failed:', extractErrorMessage(error));
    return {};
  }
}

/**
 * Generate a thumbnail from an image.
 *
 * @param data - Raw image bytes (JPEG, PNG, WebP, etc.)
 * @param size - Target size in pixels (default: 300)
 * @param crop - If true, crop to center square before resizing (default: false)
 * @returns ThumbnailResult with thumbnail data and dimensions
 * @throws MediaProcessorError if generation fails
 */
export async function generateThumbnail(
  data: Uint8Array,
  size: number = 300,
  crop: boolean = false
): Promise<ThumbnailResult> {
  await load();

  if (!wasmModule) {
    throw createError('not_loaded', 'WASM module not available');
  }

  try {
    const result = wasmModule.generate_thumbnail_wasm(data, size, crop);
    return result as ThumbnailResult;
  } catch (error) {
    throw createError('wasm_error', extractErrorMessage(error));
  }
}

/**
 * Compute content hashes for duplicate detection.
 *
 * @param data - Raw image bytes (JPEG, PNG, WebP, etc.)
 * @returns HashResult with SHA-256 and perceptual hashes
 * @throws MediaProcessorError if hashing fails
 */
export async function computeHashes(data: Uint8Array): Promise<HashResult> {
  await load();

  if (!wasmModule) {
    throw createError('not_loaded', 'WASM module not available');
  }

  try {
    const result = wasmModule.compute_hashes_wasm(data);
    return result as HashResult;
  } catch (error) {
    throw createError('wasm_error', extractErrorMessage(error));
  }
}

/**
 * Reset the module state (for testing purposes only).
 * @internal
 */
export function __resetForTesting(): void {
  wasmModule = null;
  loadPromise = null;
  loadingState = 'idle';
}
