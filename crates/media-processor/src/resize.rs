//! Image resizing functionality for media processing.
//!
//! This module provides utilities for resizing images while preserving aspect ratio,
//! using high-quality Lanczos3 filtering. Supports multiple output formats including
//! JPEG, PNG, and WebP.

use image::{
    codecs::jpeg::JpegEncoder,
    codecs::png::PngEncoder,
    codecs::webp::WebPEncoder,
    imageops::FilterType,
    load_from_memory,
    DynamicImage,
    GenericImageView,
    ImageEncoder,
    Rgba,
};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

/// Error type for resize operations.
#[derive(Debug)]
pub enum ResizeError {
    /// Failed to decode the input image.
    DecodeError(String),
    /// Failed to encode the output image.
    EncodeError(String),
    /// Invalid dimensions provided (e.g., zero).
    InvalidDimensions,
}

impl std::fmt::Display for ResizeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ResizeError::DecodeError(msg) => write!(f, "Failed to decode image: {}", msg),
            ResizeError::EncodeError(msg) => write!(f, "Failed to encode image: {}", msg),
            ResizeError::InvalidDimensions => write!(f, "Invalid dimensions provided"),
        }
    }
}

impl std::error::Error for ResizeError {}

/// Output format for resized images.
///
/// Specifies the encoding format for the output image. Each format has different
/// characteristics:
/// - `Jpeg`: Lossy compression, no alpha channel support, smaller file sizes
/// - `Png`: Lossless compression, alpha channel support, larger file sizes
/// - `WebP`: Modern format with both lossy and lossless modes, alpha support, good compression
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    /// JPEG format - lossy compression, no alpha channel
    #[default]
    Jpeg,
    /// WebP format - modern format with good compression and alpha support
    WebP,
    /// PNG format - lossless compression with alpha channel support
    Png,
}

/// Detected format from magic bytes.
///
/// Used for identifying the format of input image data by examining
/// the first few bytes (magic bytes) of the file.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DetectedFormat {
    /// JPEG format detected (magic bytes: 0xFF, 0xD8, 0xFF)
    Jpeg,
    /// PNG format detected (magic bytes: 0x89, 0x50, 0x4E, 0x47)
    Png,
    /// WebP format detected (RIFF header: 0x52, 0x49, 0x46, 0x46)
    WebP,
}

/// Detects the image format from magic bytes.
///
/// Examines the first few bytes of the image data to determine the format.
/// This is more reliable than relying on file extensions.
///
/// # Arguments
///
/// * `data` - Raw bytes of the image data
///
/// # Returns
///
/// - `Some(DetectedFormat)` if a known format is detected
/// - `None` if the format is unrecognized or data is too short
///
/// # Examples
///
/// ```
/// use media_processor::resize::{detect_format, DetectedFormat};
///
/// // JPEG magic bytes
/// let jpeg_data = [0xFF, 0xD8, 0xFF, 0xE0];
/// assert_eq!(detect_format(&jpeg_data), Some(DetectedFormat::Jpeg));
///
/// // Unknown format
/// let unknown = [0x00, 0x01, 0x02, 0x03];
/// assert_eq!(detect_format(&unknown), None);
/// ```
pub fn detect_format(data: &[u8]) -> Option<DetectedFormat> {
    if data.len() < 4 {
        return None;
    }

    // JPEG: starts with 0xFF, 0xD8, 0xFF
    if data.len() >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
        return Some(DetectedFormat::Jpeg);
    }

    // PNG: starts with 0x89, 0x50, 0x4E, 0x47 (0x89 P N G)
    if data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
        return Some(DetectedFormat::Png);
    }

    // WebP: starts with RIFF header (0x52, 0x49, 0x46, 0x46 = "RIFF")
    // Full WebP signature is RIFF....WEBP but we check just RIFF for simplicity
    if data.len() >= 12
        && data[0] == 0x52
        && data[1] == 0x49
        && data[2] == 0x46
        && data[3] == 0x46
        && data[8] == 0x57  // W
        && data[9] == 0x45  // E
        && data[10] == 0x42 // B
        && data[11] == 0x50 // P
    {
        return Some(DetectedFormat::WebP);
    }

    None
}

/// Composites an RGBA image onto a white background.
///
/// This is used when converting images with alpha channels (like PNG) to formats
/// that don't support transparency (like JPEG).
fn composite_on_white(img: &DynamicImage) -> DynamicImage {
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    let mut result = image::RgbaImage::new(width, height);

    for (x, y, pixel) in rgba.enumerate_pixels() {
        let Rgba([r, g, b, a]) = *pixel;
        let alpha = a as f32 / 255.0;
        let inv_alpha = 1.0 - alpha;

        // Composite onto white (255, 255, 255)
        let new_r = (r as f32 * alpha + 255.0 * inv_alpha) as u8;
        let new_g = (g as f32 * alpha + 255.0 * inv_alpha) as u8;
        let new_b = (b as f32 * alpha + 255.0 * inv_alpha) as u8;

        result.put_pixel(x, y, Rgba([new_r, new_g, new_b, 255]));
    }

    DynamicImage::ImageRgba8(result)
}

/// Calculates new dimensions while preserving aspect ratio.
///
/// Given the original dimensions of an image and a maximum dimension constraint,
/// this function calculates the new dimensions that:
/// - Preserve the original aspect ratio
/// - Fit within the max_dimension constraint (both width and height will be <= max_dimension)
/// - Don't upscale if the original is already smaller than max_dimension
///
/// # Arguments
///
/// * `original_width` - The original width of the image in pixels.
/// * `original_height` - The original height of the image in pixels.
/// * `max_dimension` - The maximum allowed dimension for either width or height.
///
/// # Returns
///
/// A tuple `(new_width, new_height)` representing the calculated dimensions.
///
/// # Examples
///
/// ```
/// use media_processor::resize::calculate_dimensions;
///
/// // Landscape image: 4000x3000, max 2048
/// let (w, h) = calculate_dimensions(4000, 3000, 2048);
/// assert_eq!((w, h), (2048, 1536));
///
/// // No resize needed: 1920x1080, max 2048
/// let (w, h) = calculate_dimensions(1920, 1080, 2048);
/// assert_eq!((w, h), (1920, 1080));
/// ```
pub fn calculate_dimensions(
    original_width: u32,
    original_height: u32,
    max_dimension: u32,
) -> (u32, u32) {
    // If both dimensions are already within bounds, no resize needed
    if original_width <= max_dimension && original_height <= max_dimension {
        return (original_width, original_height);
    }

    // Calculate scaling factor based on the larger dimension
    let scale = if original_width >= original_height {
        max_dimension as f64 / original_width as f64
    } else {
        max_dimension as f64 / original_height as f64
    };

    // Calculate new dimensions, preserving aspect ratio
    let new_width = (original_width as f64 * scale).round() as u32;
    let new_height = (original_height as f64 * scale).round() as u32;

    (new_width, new_height)
}

/// Resizes an image to fit within max dimensions while preserving aspect ratio.
///
/// This function decodes the input image data, calculates the appropriate dimensions
/// to fit within the max_dimension constraint while preserving aspect ratio, resizes
/// the image using high-quality Lanczos3 filtering, and encodes the result as JPEG.
///
/// # Arguments
///
/// * `image_data` - Raw bytes of the input image (supports JPEG, PNG, GIF, WebP, etc.).
/// * `max_dimension` - The maximum allowed dimension for either width or height.
/// * `quality` - JPEG quality for the output (1-100, where 100 is highest quality).
///
/// # Returns
///
/// A `Result` containing either:
/// - `Ok(Vec<u8>)` - The resized image as JPEG bytes.
/// - `Err(ResizeError)` - An error if decoding, resizing, or encoding failed.
///
/// # Errors
///
/// - `ResizeError::InvalidDimensions` - If max_dimension is 0.
/// - `ResizeError::DecodeError` - If the input image data cannot be decoded.
/// - `ResizeError::EncodeError` - If the resized image cannot be encoded as JPEG.
pub fn resize_image(
    image_data: &[u8],
    max_dimension: u32,
    quality: u8,
) -> Result<Vec<u8>, ResizeError> {
    resize_image_with_format(image_data, max_dimension, quality, OutputFormat::Jpeg)
}

/// Resizes an image to fit within max dimensions with configurable output format.
///
/// This function decodes the input image data, calculates the appropriate dimensions
/// to fit within the max_dimension constraint while preserving aspect ratio, resizes
/// the image using high-quality Lanczos3 filtering, and encodes the result in the
/// specified output format.
///
/// # Arguments
///
/// * `image_data` - Raw bytes of the input image (supports JPEG, PNG, GIF, WebP, etc.).
/// * `max_dimension` - The maximum allowed dimension for either width or height.
/// * `quality` - Quality for the output (1-100). Used for JPEG and WebP lossy compression.
/// * `output_format` - The desired output format (JPEG, PNG, or WebP).
///
/// # Returns
///
/// A `Result` containing either:
/// - `Ok(Vec<u8>)` - The resized image in the specified format.
/// - `Err(ResizeError)` - An error if decoding, resizing, or encoding failed.
///
/// # Errors
///
/// - `ResizeError::InvalidDimensions` - If max_dimension is 0.
/// - `ResizeError::DecodeError` - If the input image data cannot be decoded.
/// - `ResizeError::EncodeError` - If the resized image cannot be encoded.
///
/// # Notes
///
/// When converting an image with alpha channel (e.g., PNG with transparency) to JPEG,
/// the alpha channel is composited onto a white background since JPEG doesn't support
/// transparency.
///
/// # Examples
///
/// ```ignore
/// use media_processor::resize::{resize_image_with_format, OutputFormat};
///
/// let image_data = include_bytes!("test.png");
/// let result = resize_image_with_format(image_data, 1024, 85, OutputFormat::WebP)?;
/// ```
pub fn resize_image_with_format(
    image_data: &[u8],
    max_dimension: u32,
    quality: u8,
    output_format: OutputFormat,
) -> Result<Vec<u8>, ResizeError> {
    // Validate dimensions
    if max_dimension == 0 {
        return Err(ResizeError::InvalidDimensions);
    }

    // Decode the input image
    let img: DynamicImage =
        load_from_memory(image_data).map_err(|e| ResizeError::DecodeError(e.to_string()))?;

    // Get original dimensions
    let (original_width, original_height) = img.dimensions();

    // Calculate new dimensions
    let (new_width, new_height) =
        calculate_dimensions(original_width, original_height, max_dimension);

    // Resize the image using Lanczos3 filter for high quality
    let resized = img.resize_exact(new_width, new_height, FilterType::Lanczos3);

    // Encode in the specified format
    let mut output_buffer = Cursor::new(Vec::new());

    match output_format {
        OutputFormat::Jpeg => {
            // JPEG doesn't support alpha, composite on white background if needed
            let composited = composite_on_white(&resized);
            let encoder = JpegEncoder::new_with_quality(&mut output_buffer, quality);
            encoder
                .write_image(
                    composited.to_rgb8().as_raw(),
                    new_width,
                    new_height,
                    image::ExtendedColorType::Rgb8,
                )
                .map_err(|e| ResizeError::EncodeError(e.to_string()))?;
        }
        OutputFormat::Png => {
            // PNG supports alpha, preserve it
            let encoder = PngEncoder::new(&mut output_buffer);
            encoder
                .write_image(
                    resized.to_rgba8().as_raw(),
                    new_width,
                    new_height,
                    image::ExtendedColorType::Rgba8,
                )
                .map_err(|e| ResizeError::EncodeError(e.to_string()))?;
        }
        OutputFormat::WebP => {
            // WebP supports alpha, preserve it
            let encoder = WebPEncoder::new_lossless(&mut output_buffer);
            encoder
                .write_image(
                    resized.to_rgba8().as_raw(),
                    new_width,
                    new_height,
                    image::ExtendedColorType::Rgba8,
                )
                .map_err(|e| ResizeError::EncodeError(e.to_string()))?;
        }
    }

    Ok(output_buffer.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_dimensions_landscape() {
        // Landscape image: 4000x3000, max 2048
        let (w, h) = calculate_dimensions(4000, 3000, 2048);
        assert_eq!((w, h), (2048, 1536));
    }

    #[test]
    fn test_calculate_dimensions_portrait() {
        // Portrait image: 3000x4000, max 2048
        let (w, h) = calculate_dimensions(3000, 4000, 2048);
        assert_eq!((w, h), (1536, 2048));
    }

    #[test]
    fn test_calculate_dimensions_square() {
        // Square image: 5000x5000, max 2048
        let (w, h) = calculate_dimensions(5000, 5000, 2048);
        assert_eq!((w, h), (2048, 2048));
    }

    #[test]
    fn test_calculate_dimensions_no_resize_needed() {
        // Image already within bounds: 1920x1080, max 2048
        let (w, h) = calculate_dimensions(1920, 1080, 2048);
        assert_eq!((w, h), (1920, 1080));
    }

    #[test]
    fn test_calculate_dimensions_exact_max() {
        // Image exactly at max dimension
        let (w, h) = calculate_dimensions(2048, 1536, 2048);
        assert_eq!((w, h), (2048, 1536));
    }

    #[test]
    fn test_calculate_dimensions_small_image() {
        // Very small image should not be upscaled
        let (w, h) = calculate_dimensions(100, 50, 2048);
        assert_eq!((w, h), (100, 50));
    }

    #[test]
    fn test_resize_error_invalid_dimensions() {
        let result = resize_image(&[], 0, 85);
        assert!(matches!(result, Err(ResizeError::InvalidDimensions)));
    }

    #[test]
    fn test_resize_error_decode() {
        // Invalid image data should produce decode error
        let result = resize_image(&[0, 1, 2, 3], 2048, 85);
        assert!(matches!(result, Err(ResizeError::DecodeError(_))));
    }

    #[test]
    fn test_resize_error_display() {
        let err = ResizeError::DecodeError("test error".to_string());
        assert_eq!(format!("{}", err), "Failed to decode image: test error");

        let err = ResizeError::EncodeError("encode failed".to_string());
        assert_eq!(format!("{}", err), "Failed to encode image: encode failed");

        let err = ResizeError::InvalidDimensions;
        assert_eq!(format!("{}", err), "Invalid dimensions provided");
    }

    // ============================================================
    // Format Detection Tests (MEDIA-002)
    // ============================================================

    #[test]
    fn test_format_detected_from_magic_bytes_jpeg() {
        // JPEG magic bytes: 0xFF, 0xD8, 0xFF followed by marker
        let jpeg_data = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46];
        assert_eq!(detect_format(&jpeg_data), Some(DetectedFormat::Jpeg));

        // Another JPEG variant (JFIF)
        let jpeg_data2 = [0xFF, 0xD8, 0xFF, 0xE1];
        assert_eq!(detect_format(&jpeg_data2), Some(DetectedFormat::Jpeg));
    }

    #[test]
    fn test_format_detected_from_magic_bytes_png() {
        // PNG magic bytes: 0x89 P N G (0x89, 0x50, 0x4E, 0x47)
        let png_data = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        assert_eq!(detect_format(&png_data), Some(DetectedFormat::Png));
    }

    #[test]
    fn test_format_detected_from_magic_bytes_webp() {
        // WebP: RIFF....WEBP (bytes at positions 0-3 and 8-11)
        let webp_data = [
            0x52, 0x49, 0x46, 0x46, // RIFF
            0x00, 0x00, 0x00, 0x00, // file size (placeholder)
            0x57, 0x45, 0x42, 0x50, // WEBP
        ];
        assert_eq!(detect_format(&webp_data), Some(DetectedFormat::WebP));
    }

    #[test]
    fn test_unsupported_format_returns_none() {
        // Random bytes should return None
        let random_data = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07];
        assert_eq!(detect_format(&random_data), None);

        // GIF magic bytes (not supported by detect_format)
        let gif_data = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]; // GIF89a
        assert_eq!(detect_format(&gif_data), None);

        // Too short data
        let short_data = [0xFF, 0xD8];
        assert_eq!(detect_format(&short_data), None);

        // Empty data
        let empty_data: [u8; 0] = [];
        assert_eq!(detect_format(&empty_data), None);
    }

    #[test]
    fn test_riff_without_webp_returns_none() {
        // RIFF header but not WebP (e.g., WAV file)
        let wav_data = [
            0x52, 0x49, 0x46, 0x46, // RIFF
            0x00, 0x00, 0x00, 0x00, // file size
            0x57, 0x41, 0x56, 0x45, // WAVE (not WEBP)
        ];
        assert_eq!(detect_format(&wav_data), None);
    }

    // ============================================================
    // Format Conversion Tests (MEDIA-002)
    // ============================================================

    /// Helper function to create a simple test JPEG image
    fn create_test_jpeg(width: u32, height: u32) -> Vec<u8> {
        let img = DynamicImage::new_rgb8(width, height);
        let mut buffer = Cursor::new(Vec::new());
        let encoder = JpegEncoder::new_with_quality(&mut buffer, 85);
        encoder
            .write_image(
                img.to_rgb8().as_raw(),
                width,
                height,
                image::ExtendedColorType::Rgb8,
            )
            .unwrap();
        buffer.into_inner()
    }

    /// Helper function to create a simple test PNG image with alpha
    fn create_test_png_with_alpha(width: u32, height: u32) -> Vec<u8> {
        let mut img = image::RgbaImage::new(width, height);
        // Create a semi-transparent red pixel pattern
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            let alpha = if (x + y) % 2 == 0 { 128 } else { 255 };
            *pixel = Rgba([255, 0, 0, alpha]);
        }
        let dynamic_img = DynamicImage::ImageRgba8(img);
        let mut buffer = Cursor::new(Vec::new());
        let encoder = PngEncoder::new(&mut buffer);
        encoder
            .write_image(
                dynamic_img.to_rgba8().as_raw(),
                width,
                height,
                image::ExtendedColorType::Rgba8,
            )
            .unwrap();
        buffer.into_inner()
    }

    #[test]
    fn test_jpeg_to_webp_produces_valid_output() {
        let jpeg_data = create_test_jpeg(100, 100);

        // Convert to WebP
        let result = resize_image_with_format(&jpeg_data, 100, 85, OutputFormat::WebP);
        assert!(result.is_ok());

        let webp_data = result.unwrap();

        // Verify output is valid WebP by checking magic bytes
        assert_eq!(detect_format(&webp_data), Some(DetectedFormat::WebP));

        // Verify we can decode it back
        let decoded = load_from_memory(&webp_data);
        assert!(decoded.is_ok());
    }

    #[test]
    fn test_jpeg_to_png_produces_valid_output() {
        let jpeg_data = create_test_jpeg(100, 100);

        // Convert to PNG
        let result = resize_image_with_format(&jpeg_data, 100, 85, OutputFormat::Png);
        assert!(result.is_ok());

        let png_data = result.unwrap();

        // Verify output is valid PNG by checking magic bytes
        assert_eq!(detect_format(&png_data), Some(DetectedFormat::Png));

        // Verify we can decode it back
        let decoded = load_from_memory(&png_data);
        assert!(decoded.is_ok());
    }

    #[test]
    fn test_png_to_jpeg_produces_valid_output() {
        let png_data = create_test_png_with_alpha(100, 100);

        // Convert to JPEG
        let result = resize_image_with_format(&png_data, 100, 85, OutputFormat::Jpeg);
        assert!(result.is_ok());

        let jpeg_data = result.unwrap();

        // Verify output is valid JPEG by checking magic bytes
        assert_eq!(detect_format(&jpeg_data), Some(DetectedFormat::Jpeg));

        // Verify we can decode it back
        let decoded = load_from_memory(&jpeg_data);
        assert!(decoded.is_ok());
    }

    #[test]
    fn test_png_with_alpha_to_jpeg_composites_on_white() {
        // Create a PNG with a semi-transparent red pixel
        let mut img = image::RgbaImage::new(1, 1);
        img.put_pixel(0, 0, Rgba([255, 0, 0, 128])); // 50% transparent red
        let dynamic_img = DynamicImage::ImageRgba8(img);
        let mut buffer = Cursor::new(Vec::new());
        let encoder = PngEncoder::new(&mut buffer);
        encoder
            .write_image(
                dynamic_img.to_rgba8().as_raw(),
                1,
                1,
                image::ExtendedColorType::Rgba8,
            )
            .unwrap();
        let png_data = buffer.into_inner();

        // Convert to JPEG
        let result = resize_image_with_format(&png_data, 1, 100, OutputFormat::Jpeg);
        assert!(result.is_ok());

        let jpeg_data = result.unwrap();

        // Decode the result and check the pixel
        let decoded = load_from_memory(&jpeg_data).unwrap();
        let rgb = decoded.to_rgb8();
        let pixel = rgb.get_pixel(0, 0);

        // With 50% alpha on white, red channel should be around 255*0.5 + 255*0.5 = 255
        // But the red component should be reduced due to alpha blending
        // Expected: R = 255*0.5 + 255*0.5 = 255 (white adds 127.5, red adds 127.5)
        // G = 0*0.5 + 255*0.5 = 127.5
        // B = 0*0.5 + 255*0.5 = 127.5
        // JPEG compression may alter values slightly
        assert!(pixel[0] > 200, "Red channel should be high");
        assert!(pixel[1] > 100 && pixel[1] < 180, "Green channel should be medium");
        assert!(pixel[2] > 100 && pixel[2] < 180, "Blue channel should be medium");
    }

    #[test]
    fn test_round_trip_encoding_maintains_dimensions() {
        let original_width = 200;
        let original_height = 150;
        let jpeg_data = create_test_jpeg(original_width, original_height);

        // Test all output formats
        for format in [OutputFormat::Jpeg, OutputFormat::Png, OutputFormat::WebP] {
            let result = resize_image_with_format(&jpeg_data, 2048, 85, format);
            assert!(result.is_ok(), "Failed for format {:?}", format);

            let output_data = result.unwrap();
            let decoded = load_from_memory(&output_data).unwrap();
            let (width, height) = decoded.dimensions();

            assert_eq!(
                width, original_width,
                "Width mismatch for format {:?}",
                format
            );
            assert_eq!(
                height, original_height,
                "Height mismatch for format {:?}",
                format
            );
        }
    }

    #[test]
    fn test_resize_with_format_respects_max_dimension() {
        let jpeg_data = create_test_jpeg(400, 300);

        for format in [OutputFormat::Jpeg, OutputFormat::Png, OutputFormat::WebP] {
            let result = resize_image_with_format(&jpeg_data, 200, 85, format);
            assert!(result.is_ok());

            let output_data = result.unwrap();
            let decoded = load_from_memory(&output_data).unwrap();
            let (width, height) = decoded.dimensions();

            assert!(
                width <= 200 && height <= 200,
                "Dimensions exceed max for format {:?}: {}x{}",
                format,
                width,
                height
            );
            // Should be 200x150 (preserving aspect ratio)
            assert_eq!((width, height), (200, 150));
        }
    }

    #[test]
    fn test_output_format_default() {
        assert_eq!(OutputFormat::default(), OutputFormat::Jpeg);
    }

    #[test]
    fn test_output_format_serde() {
        // Test serialization
        let jpeg = OutputFormat::Jpeg;
        let serialized = serde_json::to_string(&jpeg).unwrap();
        assert_eq!(serialized, "\"jpeg\"");

        let png = OutputFormat::Png;
        let serialized = serde_json::to_string(&png).unwrap();
        assert_eq!(serialized, "\"png\"");

        let webp = OutputFormat::WebP;
        let serialized = serde_json::to_string(&webp).unwrap();
        assert_eq!(serialized, "\"webp\"");

        // Test deserialization
        let deserialized: OutputFormat = serde_json::from_str("\"jpeg\"").unwrap();
        assert_eq!(deserialized, OutputFormat::Jpeg);

        let deserialized: OutputFormat = serde_json::from_str("\"png\"").unwrap();
        assert_eq!(deserialized, OutputFormat::Png);

        let deserialized: OutputFormat = serde_json::from_str("\"webp\"").unwrap();
        assert_eq!(deserialized, OutputFormat::WebP);
    }

    #[test]
    fn test_detected_format_serde() {
        // Test serialization
        let jpeg = DetectedFormat::Jpeg;
        let serialized = serde_json::to_string(&jpeg).unwrap();
        assert_eq!(serialized, "\"jpeg\"");

        // Test deserialization
        let deserialized: DetectedFormat = serde_json::from_str("\"png\"").unwrap();
        assert_eq!(deserialized, DetectedFormat::Png);
    }

    #[test]
    fn test_backward_compatibility_resize_image() {
        // Ensure the original resize_image function still works and outputs JPEG
        let jpeg_data = create_test_jpeg(100, 100);

        let result = resize_image(&jpeg_data, 100, 85);
        assert!(result.is_ok());

        let output = result.unwrap();

        // Should produce valid JPEG
        assert_eq!(detect_format(&output), Some(DetectedFormat::Jpeg));
    }
}
