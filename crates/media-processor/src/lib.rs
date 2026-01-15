//! Media Processor - Client-side image processing pipeline
//!
//! This crate provides functionality for processing images in web browsers
//! via WebAssembly. It includes:
//!
//! - **Image resizing**: Resize images while preserving aspect ratio
//! - **EXIF extraction**: Extract metadata from photos
//! - **Thumbnail generation**: Generate thumbnails at standard sizes
//! - **Content hashing**: SHA-256 and perceptual hashing for deduplication

pub mod exif;
pub mod hash;
pub mod resize;
pub mod thumbnail;

#[cfg(feature = "wasm")]
pub mod wasm;

// Re-export main types and functions from resize module
pub use resize::{
    calculate_dimensions, detect_format, resize_image, resize_image_with_format,
    DetectedFormat, OutputFormat, ResizeError,
};

// Re-export main types and functions from exif module
pub use exif::{extract_exif, ExifData, ExifError};

// Re-export main types and functions from thumbnail module
pub use thumbnail::{
    generate_thumbnail, generate_thumbnail_set, ThumbnailError, ThumbnailResult, ThumbnailSet,
};

// Re-export main types and functions from hash module
pub use hash::{compute_hashes, hamming_distance, perceptual_hash, sha256_hash, HashError, HashResult};

// Re-export WASM init function when wasm feature is enabled
#[cfg(feature = "wasm")]
pub use wasm::init;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_public_api_available() {
        // Verify that all public types and functions are accessible
        let _ = std::any::type_name::<ExifData>();
        let _ = std::any::type_name::<ExifError>();
        let _ = std::any::type_name::<ResizeError>();
        let _ = std::any::type_name::<OutputFormat>();
        let _ = std::any::type_name::<DetectedFormat>();
        let _ = std::any::type_name::<ThumbnailResult>();
        let _ = std::any::type_name::<ThumbnailSet>();
        let _ = std::any::type_name::<ThumbnailError>();
        let _ = std::any::type_name::<HashResult>();
        let _ = std::any::type_name::<HashError>();
    }

    #[test]
    fn test_hash_functions_accessible() {
        // Test that hash functions are accessible through the public API
        let hash = sha256_hash(b"test");
        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn test_calculate_dimensions_accessible() {
        // Test that resize functions are accessible through the public API
        let (w, h) = calculate_dimensions(1000, 800, 500);
        assert_eq!(w, 500);
        assert_eq!(h, 400);
    }
}
