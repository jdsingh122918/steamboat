//! WASM bindings for media processing functions.
//!
//! This module provides WebAssembly-compatible wrappers around the core
//! media processing functionality, enabling client-side image processing
//! in web browsers.

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::exif::{extract_exif, ExifData};
use crate::hash::{compute_hashes, HashResult};
use crate::resize::resize_image;
use crate::thumbnail::{generate_thumbnail, ThumbnailResult};

use serde::{Deserialize, Serialize};

/// Result of processing an image.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedImageResult {
    /// Raw image data (JPEG encoded).
    pub data: Vec<u8>,
}

/// Initialize the WASM module.
///
/// Sets up panic hook for better error messages in the browser console.
/// This function is automatically called when the WASM module is loaded.
#[cfg(feature = "wasm")]
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Process an image by resizing it to fit within maximum dimensions.
///
/// # Arguments
///
/// * `data` - Raw image bytes (JPEG, PNG, WebP, etc.)
/// * `max_dim` - Maximum dimension for either width or height
/// * `quality` - JPEG quality for output (1-100)
///
/// # Returns
///
/// A JavaScript object containing:
/// - `data`: Array of the processed image bytes
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn process_image_wasm(data: &[u8], max_dim: u32, quality: u8) -> Result<JsValue, JsValue> {
    let result =
        resize_image(data, max_dim, quality).map_err(|e| JsValue::from_str(&e.to_string()))?;

    let processed = ProcessedImageResult { data: result };

    serde_wasm_bindgen::to_value(&processed).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Extract EXIF metadata from an image.
///
/// # Arguments
///
/// * `data` - Raw image bytes (JPEG, PNG, or other EXIF-compatible format)
///
/// # Returns
///
/// A JavaScript object containing EXIF metadata fields:
/// - `date_taken`: Optional string with date/time the photo was taken
/// - `camera_make`: Optional string with camera manufacturer
/// - `camera_model`: Optional string with camera model
/// - `gps_latitude`: Optional number with GPS latitude (decimal degrees)
/// - `gps_longitude`: Optional number with GPS longitude (decimal degrees)
/// - `orientation`: Optional number with EXIF orientation value (1-8)
/// - `width`: Optional number with image width in pixels
/// - `height`: Optional number with image height in pixels
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn extract_exif_wasm(data: &[u8]) -> Result<JsValue, JsValue> {
    let exif_data: ExifData =
        extract_exif(data).map_err(|e| JsValue::from_str(&e.to_string()))?;

    serde_wasm_bindgen::to_value(&exif_data).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Generate a thumbnail from an image.
///
/// # Arguments
///
/// * `data` - Raw image bytes (JPEG, PNG, WebP, etc.)
/// * `size` - Target size in pixels (the larger dimension will be this size)
/// * `crop` - If true, crop the image to a center square before resizing
///
/// # Returns
///
/// A JavaScript object containing:
/// - `data`: Array of the thumbnail bytes (JPEG encoded)
/// - `width`: Width of the thumbnail in pixels
/// - `height`: Height of the thumbnail in pixels
/// - `size_bytes`: Size of the thumbnail data in bytes
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn generate_thumbnail_wasm(data: &[u8], size: u32, crop: bool) -> Result<JsValue, JsValue> {
    let thumbnail: ThumbnailResult =
        generate_thumbnail(data, size, crop).map_err(|e| JsValue::from_str(&e.to_string()))?;

    serde_wasm_bindgen::to_value(&thumbnail).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Compute content hashes for an image.
///
/// Computes both SHA-256 (for exact matching) and perceptual hash (for
/// similarity detection).
///
/// # Arguments
///
/// * `data` - Raw image bytes (JPEG, PNG, WebP, etc.)
///
/// # Returns
///
/// A JavaScript object containing:
/// - `sha256`: 64-character hex string of the SHA-256 hash
/// - `perceptual`: 16-character hex string of the perceptual hash
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn compute_hashes_wasm(data: &[u8]) -> Result<JsValue, JsValue> {
    let hashes: HashResult =
        compute_hashes(data).map_err(|e| JsValue::from_str(&e.to_string()))?;

    serde_wasm_bindgen::to_value(&hashes).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_module_compiles() {
        // This test verifies that the module compiles correctly
        // WASM-specific tests would require wasm-bindgen-test
        assert!(true);
    }
}
