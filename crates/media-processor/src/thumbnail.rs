//! Thumbnail generation module for media processing.
//!
//! This module provides functionality for generating thumbnails at various
//! standard sizes, with optional center-square cropping.

use image::{DynamicImage, GenericImageView, ImageFormat, ImageReader};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

/// Small thumbnail size (150px).
pub const THUMB_SMALL: u32 = 150;

/// Medium thumbnail size (300px).
pub const THUMB_MEDIUM: u32 = 300;

/// Large thumbnail size (600px).
pub const THUMB_LARGE: u32 = 600;

/// JPEG quality for thumbnail encoding (0-100).
pub const THUMB_QUALITY: u8 = 80;

/// Result of generating a single thumbnail.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThumbnailResult {
    /// Raw image data (JPEG encoded).
    pub data: Vec<u8>,
    /// Width of the thumbnail in pixels.
    pub width: u32,
    /// Height of the thumbnail in pixels.
    pub height: u32,
    /// Size of the thumbnail data in bytes.
    pub size_bytes: usize,
}

/// A complete set of thumbnails at all standard sizes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThumbnailSet {
    /// Small thumbnail (150px).
    pub small: ThumbnailResult,
    /// Medium thumbnail (300px).
    pub medium: ThumbnailResult,
    /// Large thumbnail (600px).
    pub large: ThumbnailResult,
}

/// Errors that can occur during thumbnail generation.
#[derive(Debug)]
pub enum ThumbnailError {
    /// Failed to decode the input image.
    DecodeError(String),
    /// Failed to encode the output thumbnail.
    EncodeError(String),
    /// The input image is invalid or empty.
    InvalidImage,
}

impl std::fmt::Display for ThumbnailError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ThumbnailError::DecodeError(msg) => write!(f, "Failed to decode image: {}", msg),
            ThumbnailError::EncodeError(msg) => write!(f, "Failed to encode thumbnail: {}", msg),
            ThumbnailError::InvalidImage => write!(f, "Invalid or empty image"),
        }
    }
}

impl std::error::Error for ThumbnailError {}

/// Crops an image to a center square.
///
/// For landscape (wider) images, this crops the left and right sides equally.
/// For portrait (taller) images, this crops the top and bottom equally.
/// For square images, this returns the image unchanged.
///
/// # Arguments
///
/// * `img` - The source image to crop
///
/// # Returns
///
/// A new `DynamicImage` that is square, containing the center portion of the original.
fn crop_center_square(img: &DynamicImage) -> DynamicImage {
    let (width, height) = img.dimensions();
    let size = width.min(height);

    if width == height {
        // Already square, return a copy
        return img.clone();
    }

    let x = (width - size) / 2;
    let y = (height - size) / 2;

    img.crop_imm(x, y, size, size)
}

/// Generates a thumbnail of the specified size.
///
/// # Arguments
///
/// * `image_data` - Raw bytes of the source image (JPEG, PNG, WebP, etc.)
/// * `size` - Target size in pixels (the larger dimension will be this size)
/// * `crop_to_square` - If true, crop the image to a center square before resizing
///
/// # Returns
///
/// A `ThumbnailResult` containing the JPEG-encoded thumbnail, or an error.
///
/// # Example
///
/// ```ignore
/// let thumbnail = generate_thumbnail(&image_bytes, THUMB_MEDIUM, true)?;
/// println!("Generated {}x{} thumbnail", thumbnail.width, thumbnail.height);
/// ```
pub fn generate_thumbnail(
    image_data: &[u8],
    size: u32,
    crop_to_square: bool,
) -> Result<ThumbnailResult, ThumbnailError> {
    if image_data.is_empty() {
        return Err(ThumbnailError::InvalidImage);
    }

    // Decode the image
    let cursor = Cursor::new(image_data);
    let img = ImageReader::new(cursor)
        .with_guessed_format()
        .map_err(|e| ThumbnailError::DecodeError(e.to_string()))?
        .decode()
        .map_err(|e| ThumbnailError::DecodeError(e.to_string()))?;

    // Optionally crop to square
    let img = if crop_to_square {
        crop_center_square(&img)
    } else {
        img
    };

    // Resize the image, maintaining aspect ratio
    let thumbnail = img.thumbnail(size, size);
    let (width, height) = thumbnail.dimensions();

    // Encode as JPEG
    let mut buffer = Cursor::new(Vec::new());
    thumbnail
        .write_to(&mut buffer, ImageFormat::Jpeg)
        .map_err(|e| ThumbnailError::EncodeError(e.to_string()))?;

    let data = buffer.into_inner();
    let size_bytes = data.len();

    Ok(ThumbnailResult {
        data,
        width,
        height,
        size_bytes,
    })
}

/// Generates all three standard thumbnail sizes.
///
/// This creates thumbnails at small (150px), medium (300px), and large (600px) sizes.
///
/// # Arguments
///
/// * `image_data` - Raw bytes of the source image (JPEG, PNG, WebP, etc.)
/// * `crop_to_square` - If true, crop the image to a center square before resizing
///
/// # Returns
///
/// A `ThumbnailSet` containing all three thumbnails, or an error.
///
/// # Example
///
/// ```ignore
/// let thumbs = generate_thumbnail_set(&image_bytes, false)?;
/// println!("Small: {}x{}", thumbs.small.width, thumbs.small.height);
/// println!("Medium: {}x{}", thumbs.medium.width, thumbs.medium.height);
/// println!("Large: {}x{}", thumbs.large.width, thumbs.large.height);
/// ```
pub fn generate_thumbnail_set(
    image_data: &[u8],
    crop_to_square: bool,
) -> Result<ThumbnailSet, ThumbnailError> {
    let small = generate_thumbnail(image_data, THUMB_SMALL, crop_to_square)?;
    let medium = generate_thumbnail(image_data, THUMB_MEDIUM, crop_to_square)?;
    let large = generate_thumbnail(image_data, THUMB_LARGE, crop_to_square)?;

    Ok(ThumbnailSet {
        small,
        medium,
        large,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_thumbnail_constants() {
        assert_eq!(THUMB_SMALL, 150);
        assert_eq!(THUMB_MEDIUM, 300);
        assert_eq!(THUMB_LARGE, 600);
        assert_eq!(THUMB_QUALITY, 80);
    }

    #[test]
    fn test_thumbnail_result_serialization() {
        let result = ThumbnailResult {
            data: vec![0xFF, 0xD8, 0xFF, 0xE0], // JPEG magic bytes
            width: 150,
            height: 150,
            size_bytes: 4,
        };

        // Serialize to JSON
        let json = serde_json::to_string(&result).expect("Failed to serialize");
        assert!(json.contains("\"width\":150"));
        assert!(json.contains("\"height\":150"));
        assert!(json.contains("\"size_bytes\":4"));

        // Deserialize back
        let deserialized: ThumbnailResult =
            serde_json::from_str(&json).expect("Failed to deserialize");
        assert_eq!(deserialized.width, 150);
        assert_eq!(deserialized.height, 150);
        assert_eq!(deserialized.size_bytes, 4);
    }

    #[test]
    fn test_crop_center_square_landscape() {
        // Create a landscape image (wider than tall): 400x200
        let img = DynamicImage::new_rgb8(400, 200);

        let cropped = crop_center_square(&img);
        let (width, height) = cropped.dimensions();

        // Should be square, using the smaller dimension (200)
        assert_eq!(width, 200);
        assert_eq!(height, 200);
    }

    #[test]
    fn test_crop_center_square_portrait() {
        // Create a portrait image (taller than wide): 200x400
        let img = DynamicImage::new_rgb8(200, 400);

        let cropped = crop_center_square(&img);
        let (width, height) = cropped.dimensions();

        // Should be square, using the smaller dimension (200)
        assert_eq!(width, 200);
        assert_eq!(height, 200);
    }

    #[test]
    fn test_crop_center_square_already_square() {
        // Create a square image: 300x300
        let img = DynamicImage::new_rgb8(300, 300);

        let cropped = crop_center_square(&img);
        let (width, height) = cropped.dimensions();

        // Should remain the same
        assert_eq!(width, 300);
        assert_eq!(height, 300);
    }

    #[test]
    fn test_generate_thumbnail_empty_data() {
        let result = generate_thumbnail(&[], THUMB_SMALL, false);
        assert!(matches!(result, Err(ThumbnailError::InvalidImage)));
    }

    #[test]
    fn test_generate_thumbnail_invalid_data() {
        let invalid_data = vec![0x00, 0x01, 0x02, 0x03];
        let result = generate_thumbnail(&invalid_data, THUMB_SMALL, false);
        assert!(matches!(result, Err(ThumbnailError::DecodeError(_))));
    }
}
