#!/usr/bin/env python3
"""
Generate test JPEG images with known EXIF data for testing.
Requires: pip install Pillow piexif
"""

import io
import struct
from PIL import Image
import piexif

def decimal_to_dms_rational(decimal):
    """Convert decimal degrees to (degrees, minutes, seconds) as rationals."""
    degrees = int(abs(decimal))
    minutes_float = (abs(decimal) - degrees) * 60
    minutes = int(minutes_float)
    seconds = (minutes_float - minutes) * 60
    # Rationals are tuples of (numerator, denominator)
    return (
        (degrees, 1),
        (minutes, 1),
        (int(seconds * 1000000), 1000000)  # High precision for seconds
    )


def create_test_image_with_exif():
    """Create a minimal JPEG with full EXIF data."""
    # Create a small 100x100 red image
    img = Image.new('RGB', (100, 100), color='red')

    # GPS coordinates for NYC: 40.7128 N, 74.0060 W
    lat_dms = decimal_to_dms_rational(40.7128)
    lon_dms = decimal_to_dms_rational(74.0060)

    # Create EXIF data - only include IFDs that have data
    exif_dict = {
        "0th": {
            piexif.ImageIFD.Make: "TestCamera",
            piexif.ImageIFD.Model: "TestModel 2024",
            piexif.ImageIFD.Orientation: 1,
            piexif.ImageIFD.XResolution: (72, 1),
            piexif.ImageIFD.YResolution: (72, 1),
            piexif.ImageIFD.ResolutionUnit: 2,
        },
        "Exif": {
            piexif.ExifIFD.DateTimeOriginal: "2024:06:15 14:30:45",
            piexif.ExifIFD.PixelXDimension: 100,
            piexif.ExifIFD.PixelYDimension: 100,
        },
        "GPS": {
            piexif.GPSIFD.GPSLatitudeRef: "N",
            piexif.GPSIFD.GPSLatitude: lat_dms,
            piexif.GPSIFD.GPSLongitudeRef: "W",
            piexif.GPSIFD.GPSLongitude: lon_dms,
        },
    }

    exif_bytes = piexif.dump(exif_dict)

    # Save to bytes
    output = io.BytesIO()
    img.save(output, format='JPEG', exif=exif_bytes, quality=85)
    return output.getvalue()


def create_test_image_no_exif():
    """Create a minimal JPEG without EXIF data."""
    img = Image.new('RGB', (50, 50), color='blue')
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=85)
    return output.getvalue()


def create_test_image_gps_only():
    """Create a JPEG with only GPS data."""
    img = Image.new('RGB', (50, 50), color='green')

    # GPS coordinates for Sydney: 33.8688 S, 151.2093 E
    lat_dms = decimal_to_dms_rational(33.8688)
    lon_dms = decimal_to_dms_rational(151.2093)

    # Only include GPS IFD - minimal 0th IFD required for valid EXIF
    exif_dict = {
        "0th": {
            piexif.ImageIFD.XResolution: (72, 1),
            piexif.ImageIFD.YResolution: (72, 1),
            piexif.ImageIFD.ResolutionUnit: 2,
        },
        "GPS": {
            piexif.GPSIFD.GPSLatitudeRef: "S",
            piexif.GPSIFD.GPSLatitude: lat_dms,
            piexif.GPSIFD.GPSLongitudeRef: "E",
            piexif.GPSIFD.GPSLongitude: lon_dms,
        },
    }

    exif_bytes = piexif.dump(exif_dict)
    output = io.BytesIO()
    img.save(output, format='JPEG', exif=exif_bytes, quality=85)
    return output.getvalue()


def create_test_image_rotated():
    """Create a JPEG with orientation=6 (90 CW rotation)."""
    img = Image.new('RGB', (50, 75), color='yellow')

    exif_dict = {
        "0th": {
            piexif.ImageIFD.Orientation: 6,  # 90 CW
            piexif.ImageIFD.XResolution: (72, 1),
            piexif.ImageIFD.YResolution: (72, 1),
            piexif.ImageIFD.ResolutionUnit: 2,
        },
    }

    exif_bytes = piexif.dump(exif_dict)
    output = io.BytesIO()
    img.save(output, format='JPEG', exif=exif_bytes, quality=85)
    return output.getvalue()


if __name__ == "__main__":
    import os

    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Generate test images
    images = {
        "with_exif.jpg": create_test_image_with_exif(),
        "no_exif.jpg": create_test_image_no_exif(),
        "gps_only.jpg": create_test_image_gps_only(),
        "rotated.jpg": create_test_image_rotated(),
    }

    for filename, data in images.items():
        filepath = os.path.join(script_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(data)
        print(f"Created {filename} ({len(data)} bytes)")

    print("\nTest images generated successfully!")
