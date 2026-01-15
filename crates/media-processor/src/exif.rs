//! EXIF metadata extraction module.
//!
//! This module provides functionality for extracting EXIF metadata from image files,
//! including camera information, GPS coordinates, and image dimensions.

use exif::{In, Reader, Tag, Value};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

/// EXIF metadata extracted from an image.
///
/// Contains common EXIF fields such as camera information, GPS coordinates,
/// and image dimensions. All fields are optional since not all images
/// contain complete EXIF data.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExifData {
    /// Date and time the photo was taken (e.g., "2024-01-15 14:30:00").
    pub date_taken: Option<String>,
    /// Camera manufacturer (e.g., "Canon", "Nikon", "Apple").
    pub camera_make: Option<String>,
    /// Camera model (e.g., "iPhone 15 Pro", "EOS R5").
    pub camera_model: Option<String>,
    /// GPS latitude coordinate in decimal degrees.
    /// Positive values indicate North, negative values indicate South.
    pub gps_latitude: Option<f64>,
    /// GPS longitude coordinate in decimal degrees.
    /// Positive values indicate East, negative values indicate West.
    pub gps_longitude: Option<f64>,
    /// Image orientation value (1-8) per EXIF specification.
    /// 1 = normal, 3 = rotated 180, 6 = rotated 90 CW, 8 = rotated 90 CCW.
    pub orientation: Option<u32>,
    /// Image width in pixels.
    pub width: Option<u32>,
    /// Image height in pixels.
    pub height: Option<u32>,
}

/// Errors that can occur during EXIF extraction.
#[derive(Debug)]
pub enum ExifError {
    /// Failed to parse EXIF data from the image.
    ParseError(String),
    /// The image does not contain EXIF data.
    NoExifData,
}

impl std::fmt::Display for ExifError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExifError::ParseError(msg) => write!(f, "EXIF parse error: {}", msg),
            ExifError::NoExifData => write!(f, "No EXIF data found in image"),
        }
    }
}

impl std::error::Error for ExifError {}

/// Converts GPS coordinates from degrees/minutes/seconds (DMS) to decimal degrees.
///
/// # Arguments
///
/// * `degrees` - The degrees component of the coordinate.
/// * `minutes` - The minutes component of the coordinate.
/// * `seconds` - The seconds component of the coordinate.
/// * `direction` - The direction character: 'N', 'S', 'E', or 'W'.
///
/// # Returns
///
/// The coordinate in decimal degrees format. North and East are positive,
/// South and West are negative.
///
/// # Example
///
/// ```
/// use media_processor::exif::dms_to_decimal;
///
/// // 40 degrees, 26 minutes, 46 seconds North
/// let lat = dms_to_decimal(40.0, 26.0, 46.0, 'N');
/// assert!((lat - 40.446111).abs() < 0.0001);
///
/// // 74 degrees, 0 minutes, 21 seconds West
/// let lon = dms_to_decimal(74.0, 0.0, 21.0, 'W');
/// assert!((lon - (-74.005833)).abs() < 0.0001);
/// ```
pub fn dms_to_decimal(degrees: f64, minutes: f64, seconds: f64, direction: char) -> f64 {
    let decimal = degrees + (minutes / 60.0) + (seconds / 3600.0);

    match direction.to_ascii_uppercase() {
        'S' | 'W' => -decimal,
        _ => decimal, // 'N' or 'E' are positive
    }
}

/// Extracts EXIF metadata from image bytes.
///
/// Parses the provided image data and extracts available EXIF metadata
/// including camera information, GPS coordinates, orientation, and dimensions.
///
/// # Arguments
///
/// * `image_data` - Raw image bytes (JPEG, TIFF, or other EXIF-compatible format).
///
/// # Returns
///
/// * `Ok(ExifData)` - Successfully extracted EXIF data (fields may be None if not present).
/// * `Err(ExifError)` - Failed to parse EXIF data or no EXIF data found.
///
/// # Example
///
/// ```ignore
/// use media_processor::exif::extract_exif;
///
/// let image_bytes = std::fs::read("photo.jpg")?;
/// match extract_exif(&image_bytes) {
///     Ok(exif) => {
///         if let Some(date) = exif.date_taken {
///             println!("Photo taken: {}", date);
///         }
///     }
///     Err(e) => eprintln!("Failed to extract EXIF: {}", e),
/// }
/// ```
pub fn extract_exif(image_data: &[u8]) -> Result<ExifData, ExifError> {
    if image_data.is_empty() {
        return Err(ExifError::ParseError("Empty image data".to_string()));
    }

    // Parse EXIF data from the image bytes
    let mut cursor = Cursor::new(image_data);
    let exif = Reader::new()
        .read_from_container(&mut cursor)
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("No Exif data found") || msg.contains("no Exif data") {
                ExifError::NoExifData
            } else {
                ExifError::ParseError(msg)
            }
        })?;

    let mut data = ExifData::default();

    // Extract date taken (DateTimeOriginal or DateTime)
    if let Some(field) = exif
        .get_field(Tag::DateTimeOriginal, In::PRIMARY)
        .or_else(|| exif.get_field(Tag::DateTime, In::PRIMARY))
    {
        data.date_taken = Some(field.display_value().to_string());
    }

    // Extract camera make
    if let Some(field) = exif.get_field(Tag::Make, In::PRIMARY) {
        data.camera_make = Some(clean_string_value(&field.display_value().to_string()));
    }

    // Extract camera model
    if let Some(field) = exif.get_field(Tag::Model, In::PRIMARY) {
        data.camera_model = Some(clean_string_value(&field.display_value().to_string()));
    }

    // Extract GPS coordinates
    let (lat, lon) = extract_gps_coordinates(&exif);
    data.gps_latitude = lat;
    data.gps_longitude = lon;

    // Extract orientation
    if let Some(field) = exif.get_field(Tag::Orientation, In::PRIMARY) {
        if let Some(val) = field.value.get_uint(0) {
            data.orientation = Some(val);
        }
    }

    // Extract dimensions (PixelXDimension, PixelYDimension from EXIF)
    if let Some(field) = exif.get_field(Tag::PixelXDimension, In::PRIMARY) {
        if let Some(val) = field.value.get_uint(0) {
            data.width = Some(val);
        }
    }
    if let Some(field) = exif.get_field(Tag::PixelYDimension, In::PRIMARY) {
        if let Some(val) = field.value.get_uint(0) {
            data.height = Some(val);
        }
    }

    Ok(data)
}

/// Clean a string value by removing surrounding quotes and trimming whitespace.
fn clean_string_value(s: &str) -> String {
    s.trim().trim_matches('"').to_string()
}

/// Extract GPS coordinates from EXIF data, converting DMS to decimal degrees.
fn extract_gps_coordinates(exif: &exif::Exif) -> (Option<f64>, Option<f64>) {
    let lat = extract_gps_component(exif, Tag::GPSLatitude, Tag::GPSLatitudeRef);
    let lon = extract_gps_component(exif, Tag::GPSLongitude, Tag::GPSLongitudeRef);
    (lat, lon)
}

/// Extract a single GPS component (latitude or longitude) from EXIF data.
fn extract_gps_component(exif: &exif::Exif, coord_tag: Tag, ref_tag: Tag) -> Option<f64> {
    let coord_field = exif.get_field(coord_tag, In::PRIMARY)?;
    let ref_field = exif.get_field(ref_tag, In::PRIMARY)?;

    // GPS coordinates are stored as three Rational values: degrees, minutes, seconds
    if let Value::Rational(ref rationals) = coord_field.value {
        if rationals.len() >= 3 {
            let degrees = rationals[0].to_f64();
            let minutes = rationals[1].to_f64();
            let seconds = rationals[2].to_f64();

            // Get direction character (N/S/E/W) from the reference field
            let direction = ref_field
                .display_value()
                .to_string()
                .chars()
                .next()
                .unwrap_or('N');

            return Some(dms_to_decimal(degrees, minutes, seconds, direction));
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dms_to_decimal_north() {
        // 40 degrees, 26 minutes, 46 seconds North
        // Expected: 40 + 26/60 + 46/3600 = 40.446111...
        let result = dms_to_decimal(40.0, 26.0, 46.0, 'N');
        assert!((result - 40.446111).abs() < 0.0001);

        // Also test lowercase
        let result_lower = dms_to_decimal(40.0, 26.0, 46.0, 'n');
        assert!((result_lower - 40.446111).abs() < 0.0001);
    }

    #[test]
    fn test_dms_to_decimal_south() {
        // 33 degrees, 51 minutes, 54 seconds South (Sydney, Australia)
        // Expected: -(33 + 51/60 + 54/3600) = -33.865
        let result = dms_to_decimal(33.0, 51.0, 54.0, 'S');
        assert!((result - (-33.865)).abs() < 0.0001);

        // Also test lowercase
        let result_lower = dms_to_decimal(33.0, 51.0, 54.0, 's');
        assert!((result_lower - (-33.865)).abs() < 0.0001);
    }

    #[test]
    fn test_dms_to_decimal_east() {
        // 151 degrees, 12 minutes, 36 seconds East (Sydney, Australia)
        // Expected: 151 + 12/60 + 36/3600 = 151.21
        let result = dms_to_decimal(151.0, 12.0, 36.0, 'E');
        assert!((result - 151.21).abs() < 0.0001);
    }

    #[test]
    fn test_dms_to_decimal_west() {
        // 74 degrees, 0 minutes, 21 seconds West (near New York)
        // Expected: -(74 + 0/60 + 21/3600) = -74.005833...
        let result = dms_to_decimal(74.0, 0.0, 21.0, 'W');
        assert!((result - (-74.005833)).abs() < 0.0001);

        // Also test lowercase
        let result_lower = dms_to_decimal(74.0, 0.0, 21.0, 'w');
        assert!((result_lower - (-74.005833)).abs() < 0.0001);
    }

    #[test]
    fn test_exif_data_default() {
        let exif = ExifData::default();

        assert!(exif.date_taken.is_none());
        assert!(exif.camera_make.is_none());
        assert!(exif.camera_model.is_none());
        assert!(exif.gps_latitude.is_none());
        assert!(exif.gps_longitude.is_none());
        assert!(exif.orientation.is_none());
        assert!(exif.width.is_none());
        assert!(exif.height.is_none());
    }

    #[test]
    fn test_exif_data_serialization() {
        let exif = ExifData {
            date_taken: Some("2024-01-15 14:30:00".to_string()),
            camera_make: Some("Apple".to_string()),
            camera_model: Some("iPhone 15 Pro".to_string()),
            gps_latitude: Some(40.446111),
            gps_longitude: Some(-74.005833),
            orientation: Some(1),
            width: Some(4032),
            height: Some(3024),
        };

        // Serialize to JSON
        let json = serde_json::to_string(&exif).expect("Failed to serialize ExifData");

        // Deserialize back
        let deserialized: ExifData =
            serde_json::from_str(&json).expect("Failed to deserialize ExifData");

        assert_eq!(exif.date_taken, deserialized.date_taken);
        assert_eq!(exif.camera_make, deserialized.camera_make);
        assert_eq!(exif.camera_model, deserialized.camera_model);
        assert_eq!(exif.gps_latitude, deserialized.gps_latitude);
        assert_eq!(exif.gps_longitude, deserialized.gps_longitude);
        assert_eq!(exif.orientation, deserialized.orientation);
        assert_eq!(exif.width, deserialized.width);
        assert_eq!(exif.height, deserialized.height);
    }

    #[test]
    fn test_exif_data_partial_serialization() {
        // Test with only some fields set
        let exif = ExifData {
            date_taken: Some("2024-01-15".to_string()),
            camera_make: None,
            camera_model: Some("Test Camera".to_string()),
            gps_latitude: None,
            gps_longitude: None,
            orientation: Some(6),
            width: None,
            height: None,
        };

        let json = serde_json::to_string(&exif).expect("Failed to serialize");
        let deserialized: ExifData = serde_json::from_str(&json).expect("Failed to deserialize");

        assert_eq!(exif.date_taken, deserialized.date_taken);
        assert!(deserialized.camera_make.is_none());
        assert_eq!(exif.camera_model, deserialized.camera_model);
        assert!(deserialized.gps_latitude.is_none());
        assert!(deserialized.gps_longitude.is_none());
        assert_eq!(exif.orientation, deserialized.orientation);
    }

    #[test]
    fn test_extract_exif_empty_data() {
        let result = extract_exif(&[]);
        assert!(matches!(result, Err(ExifError::ParseError(_))));
    }

    #[test]
    fn test_extract_exif_invalid_data() {
        // Non-empty but not valid image data (all zeros) should return an error
        let result = extract_exif(&[0u8; 100]);
        // Invalid data returns ParseError since it's not a recognizable format
        assert!(result.is_err(), "Invalid data should return an error");
    }

    #[test]
    fn test_exif_error_display() {
        let parse_error = ExifError::ParseError("test error".to_string());
        assert_eq!(format!("{}", parse_error), "EXIF parse error: test error");

        let no_data_error = ExifError::NoExifData;
        assert_eq!(format!("{}", no_data_error), "No EXIF data found in image");
    }

    // ========================================================================
    // TDD Tests - These test real EXIF extraction from fixture images
    // ========================================================================

    #[test]
    fn test_extract_exif_from_jpeg_with_exif() {
        // Test fixture: with_exif.jpg contains full EXIF metadata
        let image_data = include_bytes!("../tests/fixtures/with_exif.jpg");
        let result = extract_exif(image_data);

        assert!(result.is_ok(), "Should successfully extract EXIF from valid JPEG with EXIF data");
        let exif = result.unwrap();

        // Should have at least some data populated
        assert!(
            exif.date_taken.is_some()
                || exif.camera_make.is_some()
                || exif.camera_model.is_some(),
            "Should extract at least one EXIF field"
        );
    }

    #[test]
    fn test_extract_exif_date_taken() {
        // Test fixture has DateTimeOriginal: "2024:06:15 14:30:45"
        let image_data = include_bytes!("../tests/fixtures/with_exif.jpg");
        let result = extract_exif(image_data).expect("Should parse EXIF");

        assert!(result.date_taken.is_some(), "Should have date_taken");
        let date = result.date_taken.unwrap();
        assert!(
            date.contains("2024") && date.contains("06") && date.contains("15"),
            "Date should contain 2024, 06, 15. Got: {}",
            date
        );
    }

    #[test]
    fn test_extract_exif_camera_make() {
        // Test fixture has Make: "TestCamera"
        let image_data = include_bytes!("../tests/fixtures/with_exif.jpg");
        let result = extract_exif(image_data).expect("Should parse EXIF");

        assert!(result.camera_make.is_some(), "Should have camera_make");
        let make = result.camera_make.unwrap();
        assert_eq!(make, "TestCamera", "Camera make should be TestCamera");
    }

    #[test]
    fn test_extract_exif_camera_model() {
        // Test fixture has Model: "TestModel 2024"
        let image_data = include_bytes!("../tests/fixtures/with_exif.jpg");
        let result = extract_exif(image_data).expect("Should parse EXIF");

        assert!(result.camera_model.is_some(), "Should have camera_model");
        let model = result.camera_model.unwrap();
        assert_eq!(model, "TestModel 2024", "Camera model should be TestModel 2024");
    }

    #[test]
    fn test_extract_exif_gps_coordinates() {
        // Test fixture has GPS: 40.7128 N, 74.0060 W (NYC)
        let image_data = include_bytes!("../tests/fixtures/with_exif.jpg");
        let result = extract_exif(image_data).expect("Should parse EXIF");

        assert!(result.gps_latitude.is_some(), "Should have GPS latitude");
        assert!(result.gps_longitude.is_some(), "Should have GPS longitude");

        let lat = result.gps_latitude.unwrap();
        let lon = result.gps_longitude.unwrap();

        // Verify latitude is ~40.7128 (within tolerance for DMS conversion)
        assert!(
            (lat - 40.7128).abs() < 0.001,
            "Latitude should be ~40.7128, got {}",
            lat
        );

        // Verify longitude is ~-74.0060 (West = negative)
        assert!(
            (lon - (-74.0060)).abs() < 0.001,
            "Longitude should be ~-74.0060, got {}",
            lon
        );

        // Verify valid ranges
        assert!(lat >= -90.0 && lat <= 90.0, "Latitude must be in [-90, 90]");
        assert!(
            lon >= -180.0 && lon <= 180.0,
            "Longitude must be in [-180, 180]"
        );
    }

    #[test]
    fn test_extract_exif_gps_southern_hemisphere() {
        // Test fixture: gps_only.jpg has GPS: 33.8688 S, 151.2093 E (Sydney)
        let image_data = include_bytes!("../tests/fixtures/gps_only.jpg");
        let result = extract_exif(image_data).expect("Should parse EXIF");

        assert!(result.gps_latitude.is_some(), "Should have GPS latitude");
        assert!(result.gps_longitude.is_some(), "Should have GPS longitude");

        let lat = result.gps_latitude.unwrap();
        let lon = result.gps_longitude.unwrap();

        // Sydney is in southern hemisphere (negative latitude)
        assert!(
            (lat - (-33.8688)).abs() < 0.001,
            "Latitude should be ~-33.8688 (South), got {}",
            lat
        );

        // Sydney is in eastern hemisphere (positive longitude)
        assert!(
            (lon - 151.2093).abs() < 0.001,
            "Longitude should be ~151.2093 (East), got {}",
            lon
        );
    }

    #[test]
    fn test_extract_exif_orientation() {
        // Test fixture: rotated.jpg has Orientation: 6 (90 CW)
        let image_data = include_bytes!("../tests/fixtures/rotated.jpg");
        let result = extract_exif(image_data).expect("Should parse EXIF");

        assert!(result.orientation.is_some(), "Should have orientation");
        let orientation = result.orientation.unwrap();
        assert_eq!(orientation, 6, "Orientation should be 6 (90 CW rotation)");
        assert!(
            orientation >= 1 && orientation <= 8,
            "Orientation must be 1-8"
        );
    }

    #[test]
    fn test_extract_exif_orientation_normal() {
        // Test fixture: with_exif.jpg has Orientation: 1 (normal)
        let image_data = include_bytes!("../tests/fixtures/with_exif.jpg");
        let result = extract_exif(image_data).expect("Should parse EXIF");

        assert!(result.orientation.is_some(), "Should have orientation");
        assert_eq!(
            result.orientation.unwrap(),
            1,
            "Orientation should be 1 (normal)"
        );
    }

    #[test]
    fn test_extract_exif_dimensions() {
        // Test fixture: with_exif.jpg has PixelXDimension: 100, PixelYDimension: 100
        let image_data = include_bytes!("../tests/fixtures/with_exif.jpg");
        let result = extract_exif(image_data).expect("Should parse EXIF");

        assert!(result.width.is_some(), "Should have width");
        assert!(result.height.is_some(), "Should have height");

        assert_eq!(result.width.unwrap(), 100, "Width should be 100");
        assert_eq!(result.height.unwrap(), 100, "Height should be 100");
    }

    #[test]
    fn test_extract_exif_jpeg_without_exif() {
        // Test fixture: no_exif.jpg has no EXIF data
        let image_data = include_bytes!("../tests/fixtures/no_exif.jpg");
        let result = extract_exif(image_data);

        // Should return NoExifData error for JPEG without EXIF
        assert!(
            matches!(result, Err(ExifError::NoExifData)),
            "Should return NoExifData for JPEG without EXIF metadata"
        );
    }

    #[test]
    fn test_extract_exif_corrupted_data() {
        // Random bytes that are not a valid image
        let corrupted = b"This is not a valid JPEG file at all!";
        let result = extract_exif(corrupted);

        // Should return an error (either ParseError or NoExifData)
        assert!(result.is_err(), "Should fail on corrupted data");
    }

    #[test]
    fn test_extract_exif_partial_data_gps_only() {
        // Test fixture: gps_only.jpg has only GPS, no camera info
        let image_data = include_bytes!("../tests/fixtures/gps_only.jpg");
        let result = extract_exif(image_data).expect("Should parse EXIF");

        // Should have GPS but not camera info
        assert!(result.gps_latitude.is_some(), "Should have GPS latitude");
        assert!(result.gps_longitude.is_some(), "Should have GPS longitude");
        // Camera info may or may not be present depending on fixture
    }
}
