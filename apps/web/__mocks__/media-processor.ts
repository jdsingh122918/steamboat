// Mock for media-processor WASM module
export default async function init(): Promise<void> {
  // No-op initialization
}

export function init_wasm(): void {
  // No-op
}

export function process_image_wasm(
  data: Uint8Array,
  max_dim: number,
  quality: number
): unknown {
  return {
    data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
  };
}

export function extract_exif_wasm(data: Uint8Array): unknown {
  return {};
}

export function generate_thumbnail_wasm(
  data: Uint8Array,
  size: number,
  crop: boolean
): unknown {
  return {
    data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    width: size,
    height: size,
    size_bytes: 4,
  };
}

export function compute_hashes_wasm(data: Uint8Array): unknown {
  return {
    sha256: '0'.repeat(64),
    perceptual: '0'.repeat(16),
  };
}
