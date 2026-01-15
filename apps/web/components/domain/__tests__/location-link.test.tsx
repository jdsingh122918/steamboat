import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';

import { LocationLink } from '../location-link';

// Mock user agent detection
const mockUserAgent = vi.fn();
Object.defineProperty(navigator, 'userAgent', {
  get: mockUserAgent,
  configurable: true,
});

describe('LocationLink', () => {
  const defaultProps = {
    location: '123 Main Street, New York, NY',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to non-Apple device
    mockUserAgent.mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
  });

  describe('rendering', () => {
    it('should render location text', () => {
      render(<LocationLink {...defaultProps} />);

      expect(screen.getByText('123 Main Street, New York, NY')).toBeInTheDocument();
    });

    it('should render as anchor link', () => {
      render(<LocationLink {...defaultProps} />);

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    it('should show location icon when showIcon is true', () => {
      render(<LocationLink {...defaultProps} showIcon />);

      const icon = screen.getByTestId('location-icon');
      expect(icon).toBeInTheDocument();
    });

    it('should not show icon by default', () => {
      render(<LocationLink {...defaultProps} />);

      const icon = screen.queryByTestId('location-icon');
      expect(icon).not.toBeInTheDocument();
    });

    it('should truncate long locations', () => {
      const longLocation = 'A very long address that should be truncated because it is too long to display properly';
      render(<LocationLink location={longLocation} truncate maxLength={20} />);

      expect(screen.getByText(/A very long address/)).toBeInTheDocument();
    });

    it('should use displayText when provided', () => {
      render(
        <LocationLink {...defaultProps} displayText="View on Map" />
      );

      expect(screen.getByText('View on Map')).toBeInTheDocument();
      expect(screen.queryByText('123 Main Street, New York, NY')).not.toBeInTheDocument();
    });
  });

  describe('URL generation', () => {
    it('should generate Google Maps URL by default', () => {
      render(<LocationLink {...defaultProps} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute(
        'href',
        'https://www.google.com/maps/search/?api=1&query=123%20Main%20Street%2C%20New%20York%2C%20NY'
      );
    });

    it('should generate Apple Maps URL when specified', () => {
      render(<LocationLink {...defaultProps} provider="apple" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute(
        'href',
        'https://maps.apple.com/?q=123%20Main%20Street%2C%20New%20York%2C%20NY'
      );
    });

    it('should auto-detect Apple device and use Apple Maps', () => {
      mockUserAgent.mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');

      render(<LocationLink {...defaultProps} provider="auto" />);

      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toContain('maps.apple.com');
    });

    it('should include coordinates in URL when provided', () => {
      render(
        <LocationLink
          {...defaultProps}
          coordinates={{ lat: 40.7128, lng: -74.0060 }}
        />
      );

      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toContain('40.7128');
      expect(link.getAttribute('href')).toContain('-74.006');
    });

    it('should properly encode location string', () => {
      render(<LocationLink location="Café & Restaurant #1" />);

      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toContain('Caf%C3%A9%20%26%20Restaurant%20%231');
    });
  });

  describe('link behavior', () => {
    it('should open in new tab by default', () => {
      render(<LocationLink {...defaultProps} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('should not open in new tab when openInNewTab is false', () => {
      render(<LocationLink {...defaultProps} openInNewTab={false} />);

      const link = screen.getByRole('link');
      expect(link).not.toHaveAttribute('target', '_blank');
    });

    it('should have proper rel attributes for external link', () => {
      render(<LocationLink {...defaultProps} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<LocationLink {...defaultProps} className="custom-class" />);

      const link = screen.getByRole('link');
      expect(link).toHaveClass('custom-class');
    });
  });
});
