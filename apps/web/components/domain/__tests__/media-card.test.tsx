import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaCard } from '../media-card';

describe('MediaCard', () => {
  const mockOnClick = vi.fn();
  const mockOnSelect = vi.fn();

  const defaultProps = {
    id: 'media-123',
    type: 'image' as const,
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    uploadedBy: 'Jane Smith',
    uploadedAt: new Date('2024-01-18'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render thumbnail image', () => {
      render(<MediaCard {...defaultProps} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/thumbnail.jpg');
    });

    it('should render uploader name', () => {
      render(<MediaCard {...defaultProps} />);

      expect(screen.getByText(/By Jane Smith/)).toBeInTheDocument();
    });

    it('should render formatted date', () => {
      render(<MediaCard {...defaultProps} />);

      expect(screen.getByText('Jan 18')).toBeInTheDocument();
    });

    it('should use caption as alt text when provided', () => {
      render(<MediaCard {...defaultProps} caption="Beautiful sunset" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Beautiful sunset');
    });

    it('should use default alt text when no caption', () => {
      render(<MediaCard {...defaultProps} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Media');
    });
  });

  describe('caption', () => {
    it('should render caption when provided', () => {
      render(<MediaCard {...defaultProps} caption="Beach day memories" />);

      expect(screen.getByText('Beach day memories')).toBeInTheDocument();
    });

    it('should not render caption section when not provided', () => {
      render(<MediaCard {...defaultProps} />);

      expect(screen.queryByText('Beach day memories')).not.toBeInTheDocument();
    });
  });

  describe('video indicator', () => {
    it('should show video indicator for video type', () => {
      render(<MediaCard {...defaultProps} type="video" />);

      expect(screen.getByTestId('video-indicator')).toBeInTheDocument();
    });

    it('should not show video indicator for image type', () => {
      render(<MediaCard {...defaultProps} type="image" />);

      expect(screen.queryByTestId('video-indicator')).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('should show checkbox when selectable', () => {
      render(<MediaCard {...defaultProps} selectable />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should not show checkbox when not selectable', () => {
      render(<MediaCard {...defaultProps} />);

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should have checkbox checked when selected', () => {
      render(<MediaCard {...defaultProps} selectable selected />);

      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('should have checkbox unchecked when not selected', () => {
      render(<MediaCard {...defaultProps} selectable selected={false} />);

      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('should call onSelect when checkbox changed', () => {
      render(<MediaCard {...defaultProps} selectable onSelect={mockOnSelect} />);

      fireEvent.click(screen.getByRole('checkbox'));

      expect(mockOnSelect).toHaveBeenCalledWith(true);
    });

    it('should call onSelect with false when unchecking', () => {
      render(<MediaCard {...defaultProps} selectable selected onSelect={mockOnSelect} />);

      fireEvent.click(screen.getByRole('checkbox'));

      expect(mockOnSelect).toHaveBeenCalledWith(false);
    });

    it('should stop propagation when clicking checkbox', () => {
      render(
        <MediaCard {...defaultProps} selectable onSelect={mockOnSelect} onClick={mockOnClick} />
      );

      fireEvent.click(screen.getByRole('checkbox'));

      expect(mockOnSelect).toHaveBeenCalled();
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('click handling', () => {
    it('should call onClick when clicked', () => {
      render(<MediaCard {...defaultProps} onClick={mockOnClick} />);

      fireEvent.click(screen.getByTestId('media-card'));

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should have clickable class when onClick provided', () => {
      render(<MediaCard {...defaultProps} onClick={mockOnClick} />);

      expect(screen.getByTestId('media-card')).toHaveClass('media-card-clickable');
    });

    it('should not have clickable class when onClick not provided', () => {
      render(<MediaCard {...defaultProps} />);

      expect(screen.getByTestId('media-card')).not.toHaveClass('media-card-clickable');
    });
  });

  describe('styling', () => {
    it('should apply selected class when selected', () => {
      render(<MediaCard {...defaultProps} selectable selected />);

      expect(screen.getByTestId('media-card')).toHaveClass('media-card-selected');
    });

    it('should not apply selected class when not selected', () => {
      render(<MediaCard {...defaultProps} selectable selected={false} />);

      expect(screen.getByTestId('media-card')).not.toHaveClass('media-card-selected');
    });

    it('should apply custom className', () => {
      render(<MediaCard {...defaultProps} className="custom-class" />);

      expect(screen.getByTestId('media-card')).toHaveClass('custom-class');
    });
  });
});
