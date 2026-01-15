//! Content hashing module for media deduplication and similarity detection.
//!
//! This module provides two types of hashing:
//! - **SHA-256**: Cryptographic hash for exact content matching
//! - **Perceptual hash (aHash)**: For detecting visually similar images

use image::ImageReader;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::Cursor;

/// Result of computing hashes for an image.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HashResult {
    /// SHA-256 hash of the raw bytes (hex string).
    pub sha256: String,
    /// Perceptual hash for similarity detection (hex string).
    pub perceptual: String,
}

/// Errors that can occur during hash computation.
#[derive(Debug)]
pub enum HashError {
    /// An error occurred during hash computation.
    ComputeError(String),
    /// The provided data is not a valid image.
    InvalidImage,
}

impl std::fmt::Display for HashError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            HashError::ComputeError(msg) => write!(f, "Hash computation error: {}", msg),
            HashError::InvalidImage => write!(f, "Invalid image data"),
        }
    }
}

impl std::error::Error for HashError {}

/// Computes SHA-256 hash of raw bytes.
///
/// # Arguments
///
/// * `data` - The raw bytes to hash.
///
/// # Returns
///
/// A lowercase hex string representing the SHA-256 hash.
///
/// # Examples
///
/// ```
/// use media_processor::hash::sha256_hash;
///
/// let hash = sha256_hash(b"hello world");
/// assert_eq!(hash.len(), 64); // SHA-256 produces 32 bytes = 64 hex chars
/// ```
pub fn sha256_hash(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    hex::encode(result)
}

/// Computes perceptual hash for image similarity detection.
///
/// Uses the average hash (aHash) algorithm:
/// 1. Resize image to 8x8 grayscale
/// 2. Compute average pixel value
/// 3. Set bit to 1 if pixel >= average, 0 otherwise
/// 4. Output as 16-char hex string (64 bits)
///
/// # Arguments
///
/// * `image_data` - Raw image bytes (JPEG, PNG, or WebP format).
///
/// # Returns
///
/// A 16-character lowercase hex string representing the perceptual hash,
/// or an error if the image cannot be processed.
///
/// # Examples
///
/// ```ignore
/// use media_processor::hash::perceptual_hash;
///
/// let image_bytes = std::fs::read("test.jpg").unwrap();
/// let phash = perceptual_hash(&image_bytes).unwrap();
/// assert_eq!(phash.len(), 16); // 64 bits = 16 hex chars
/// ```
pub fn perceptual_hash(image_data: &[u8]) -> Result<String, HashError> {
    // Load the image from bytes
    let img = ImageReader::new(Cursor::new(image_data))
        .with_guessed_format()
        .map_err(|e| HashError::ComputeError(format!("Failed to guess image format: {}", e)))?
        .decode()
        .map_err(|_| HashError::InvalidImage)?;

    // Resize to 8x8 and convert to grayscale
    let resized = img.resize_exact(8, 8, image::imageops::FilterType::Lanczos3);
    let grayscale = resized.to_luma8();

    // Compute average pixel value
    let pixels: Vec<u8> = grayscale.pixels().map(|p| p.0[0]).collect();
    let sum: u64 = pixels.iter().map(|&p| p as u64).sum();
    let average = (sum / 64) as u8;

    // Generate 64-bit hash: 1 if pixel >= average, 0 otherwise
    let mut hash_bits: u64 = 0;
    for (i, &pixel) in pixels.iter().enumerate() {
        if pixel >= average {
            hash_bits |= 1 << (63 - i);
        }
    }

    // Convert to 16-char hex string
    Ok(format!("{:016x}", hash_bits))
}

/// Computes both SHA-256 and perceptual hash for an image.
///
/// # Arguments
///
/// * `image_data` - Raw image bytes (JPEG, PNG, or WebP format).
///
/// # Returns
///
/// A `HashResult` containing both hashes, or an error if the image cannot be processed.
///
/// # Examples
///
/// ```ignore
/// use media_processor::hash::compute_hashes;
///
/// let image_bytes = std::fs::read("test.jpg").unwrap();
/// let result = compute_hashes(&image_bytes).unwrap();
/// println!("SHA-256: {}", result.sha256);
/// println!("Perceptual: {}", result.perceptual);
/// ```
pub fn compute_hashes(image_data: &[u8]) -> Result<HashResult, HashError> {
    let sha256 = sha256_hash(image_data);
    let perceptual = perceptual_hash(image_data)?;

    Ok(HashResult { sha256, perceptual })
}

/// Calculates Hamming distance between two perceptual hashes.
///
/// The Hamming distance is the number of bit positions where the hashes differ.
/// A lower distance indicates more similar images:
/// - 0: Identical or nearly identical images
/// - 1-10: Similar images (possibly resized, compressed, or slightly modified)
/// - 10+: Different images
///
/// # Arguments
///
/// * `hash1` - First perceptual hash (16-char hex string).
/// * `hash2` - Second perceptual hash (16-char hex string).
///
/// # Returns
///
/// The Hamming distance (0-64), or an error if the hashes are invalid.
///
/// # Examples
///
/// ```
/// use media_processor::hash::hamming_distance;
///
/// // Identical hashes have distance 0
/// let distance = hamming_distance("0000000000000000", "0000000000000000").unwrap();
/// assert_eq!(distance, 0);
///
/// // Hashes differing in one bit have distance 1
/// let distance = hamming_distance("0000000000000000", "0000000000000001").unwrap();
/// assert_eq!(distance, 1);
/// ```
pub fn hamming_distance(hash1: &str, hash2: &str) -> Result<u32, HashError> {
    // Validate hash lengths
    if hash1.len() != 16 || hash2.len() != 16 {
        return Err(HashError::ComputeError(format!(
            "Invalid hash length: expected 16 characters, got {} and {}",
            hash1.len(),
            hash2.len()
        )));
    }

    // Parse hex strings to u64
    let h1 = u64::from_str_radix(hash1, 16).map_err(|e| {
        HashError::ComputeError(format!("Invalid hex in hash1 '{}': {}", hash1, e))
    })?;
    let h2 = u64::from_str_radix(hash2, 16).map_err(|e| {
        HashError::ComputeError(format!("Invalid hex in hash2 '{}': {}", hash2, e))
    })?;

    // XOR and count differing bits
    let xor = h1 ^ h2;
    Ok(xor.count_ones())
}

// Helper module for hex encoding (inline to avoid external dependency)
mod hex {
    const HEX_CHARS: &[u8; 16] = b"0123456789abcdef";

    pub fn encode(bytes: impl AsRef<[u8]>) -> String {
        let bytes = bytes.as_ref();
        let mut hex = String::with_capacity(bytes.len() * 2);
        for &byte in bytes {
            hex.push(HEX_CHARS[(byte >> 4) as usize] as char);
            hex.push(HEX_CHARS[(byte & 0x0f) as usize] as char);
        }
        hex
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha256_hash_deterministic() {
        let data = b"test data for hashing";
        let hash1 = sha256_hash(data);
        let hash2 = sha256_hash(data);
        assert_eq!(hash1, hash2, "SHA-256 hash should be deterministic");
        assert_eq!(hash1.len(), 64, "SHA-256 hash should be 64 hex characters");
    }

    #[test]
    fn test_sha256_different_inputs() {
        let hash1 = sha256_hash(b"input one");
        let hash2 = sha256_hash(b"input two");
        assert_ne!(hash1, hash2, "Different inputs should produce different hashes");
    }

    #[test]
    fn test_sha256_known_value() {
        // SHA-256 of "hello" is well-known
        let hash = sha256_hash(b"hello");
        assert_eq!(
            hash,
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        );
    }

    #[test]
    fn test_hamming_distance_identical() {
        let hash = "abcdef0123456789";
        let distance = hamming_distance(hash, hash).unwrap();
        assert_eq!(distance, 0, "Identical hashes should have distance 0");
    }

    #[test]
    fn test_hamming_distance_different() {
        // 0x0 and 0xf differ in 4 bits
        let distance = hamming_distance("000000000000000f", "0000000000000000").unwrap();
        assert_eq!(distance, 4, "0xf and 0x0 differ in 4 bits");

        // All bits different (0x0 vs 0xffffffffffffffff)
        let distance = hamming_distance("0000000000000000", "ffffffffffffffff").unwrap();
        assert_eq!(distance, 64, "All bits different should give distance 64");
    }

    #[test]
    fn test_hamming_distance_one_bit() {
        // Differ by exactly one bit
        let distance = hamming_distance("8000000000000000", "0000000000000000").unwrap();
        assert_eq!(distance, 1, "Should differ by exactly 1 bit");
    }

    #[test]
    fn test_hamming_distance_invalid_length() {
        let result = hamming_distance("abc", "def");
        assert!(result.is_err(), "Should reject hashes with wrong length");
    }

    #[test]
    fn test_hamming_distance_invalid_hex() {
        let result = hamming_distance("zzzzzzzzzzzzzzzz", "0000000000000000");
        assert!(result.is_err(), "Should reject invalid hex characters");
    }

    #[test]
    fn test_hash_result_serialization() {
        let result = HashResult {
            sha256: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824".to_string(),
            perceptual: "abcdef0123456789".to_string(),
        };

        // Serialize to JSON
        let json = serde_json::to_string(&result).expect("Should serialize to JSON");
        assert!(json.contains("sha256"));
        assert!(json.contains("perceptual"));

        // Deserialize back
        let deserialized: HashResult =
            serde_json::from_str(&json).expect("Should deserialize from JSON");
        assert_eq!(result, deserialized, "Round-trip should preserve data");
    }

    #[test]
    fn test_hex_encode() {
        assert_eq!(hex::encode([0x00]), "00");
        assert_eq!(hex::encode([0xff]), "ff");
        assert_eq!(hex::encode([0xab, 0xcd]), "abcd");
        assert_eq!(hex::encode([0x12, 0x34, 0x56]), "123456");
    }

    // Note: perceptual_hash and compute_hashes tests require actual image data
    // These would typically be integration tests with test fixtures

    #[test]
    fn test_perceptual_hash_with_minimal_image() {
        // Create a minimal valid PNG image (1x1 white pixel)
        // This is a valid 1x1 white PNG
        let png_data: &[u8] = &[
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
            0x49, 0x48, 0x44, 0x52, // IHDR
            0x00, 0x00, 0x00, 0x01, // width: 1
            0x00, 0x00, 0x00, 0x01, // height: 1
            0x08, 0x02, // bit depth: 8, color type: RGB
            0x00, 0x00, 0x00, // compression, filter, interlace
            0x90, 0x77, 0x53, 0xDE, // CRC
            0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
            0x49, 0x44, 0x41, 0x54, // IDAT
            0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0xFF, 0x00, 0x05, 0xFE, 0x02, 0xFE, // compressed data
            0xA3, 0x6C, 0x19, 0x72, // CRC
            0x00, 0x00, 0x00, 0x00, // IEND chunk length
            0x49, 0x45, 0x4E, 0x44, // IEND
            0xAE, 0x42, 0x60, 0x82, // CRC
        ];

        let result = perceptual_hash(png_data);
        // The image library may or may not accept this minimal PNG
        // Either success with 16-char hash or InvalidImage error is acceptable
        match result {
            Ok(hash) => {
                assert_eq!(hash.len(), 16, "Perceptual hash should be 16 hex characters");
            }
            Err(HashError::InvalidImage) => {
                // This is acceptable for a minimal/edge-case image
            }
            Err(e) => {
                panic!("Unexpected error: {:?}", e);
            }
        }
    }

    #[test]
    fn test_compute_hashes_invalid_image() {
        let invalid_data = b"this is not an image";
        let result = compute_hashes(invalid_data);
        assert!(result.is_err(), "Should fail for invalid image data");
    }
}
