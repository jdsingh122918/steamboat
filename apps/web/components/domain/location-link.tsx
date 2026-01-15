'use client';

/**
 * Location link component.
 *
 * Generates links to maps apps with the provided location.
 */

import * as React from 'react';

export interface LocationLinkProps {
  /** Location address or place name */
  location: string;
  /** Optional coordinates for precise location */
  coordinates?: { lat: number; lng: number };
  /** Maps provider preference */
  provider?: 'google' | 'apple' | 'auto';
  /** Display text (defaults to location) */
  displayText?: string;
  /** Show location pin icon */
  showIcon?: boolean;
  /** Open in new tab */
  openInNewTab?: boolean;
  /** Truncate display text */
  truncate?: boolean;
  /** Max characters before truncation */
  maxLength?: number;
  /** Additional className */
  className?: string;
}

/**
 * Check if the current device is an Apple device
 */
function isAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Mac/i.test(navigator.userAgent);
}

/**
 * Generate maps URL based on provider and location
 */
function getMapsUrl(
  location: string,
  coordinates: { lat: number; lng: number } | undefined,
  provider: 'google' | 'apple' | 'auto'
): string {
  const encoded = encodeURIComponent(location);
  const useApple = provider === 'apple' || (provider === 'auto' && isAppleDevice());

  if (useApple) {
    return coordinates
      ? `https://maps.apple.com/?ll=${coordinates.lat},${coordinates.lng}&q=${encoded}`
      : `https://maps.apple.com/?q=${encoded}`;
  }

  // Google Maps (default)
  return coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Location link component that opens the location in a maps app.
 *
 * @example
 * <LocationLink
 *   location="1600 Amphitheatre Parkway, Mountain View, CA"
 *   showIcon
 *   provider="auto"
 * />
 *
 * @example
 * // With coordinates for precise location
 * <LocationLink
 *   location="Golden Gate Bridge"
 *   coordinates={{ lat: 37.8199, lng: -122.4783 }}
 *   displayText="View Bridge Location"
 * />
 */
export function LocationLink({
  location,
  coordinates,
  provider = 'google',
  displayText,
  showIcon = false,
  openInNewTab = true,
  truncate = false,
  maxLength = 50,
  className,
}: LocationLinkProps) {
  const url = getMapsUrl(location, coordinates, provider);

  let text = displayText || location;
  if (truncate) {
    text = truncateText(text, maxLength);
  }

  return (
    <a
      href={url}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: showIcon ? '6px' : 0,
        color: '#3b82f6',
        textDecoration: 'none',
      }}
    >
      {showIcon && (
        <svg
          data-testid="location-icon"
          style={{ width: 16, height: 16, flexShrink: 0 }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      )}
      {text}
    </a>
  );
}

export default LocationLink;
