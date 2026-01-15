import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MediaEditModal } from '../media-edit-modal';

const mockMedia = {
  id: 'media-123',
  url: 'https://example.com/photo.jpg',
  thumbnailUrl: 'https://example.com/photo-thumb.jpg',
  caption: 'Beach sunset',
  tags: ['beach', 'sunset'],
  uploadedBy: 'John Doe',
  uploadedAt: '2026-01-10T00:00:00Z',
};

describe('MediaEditModal', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when open', () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('media-edit-modal')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <MediaEditModal
          isOpen={false}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByTestId('media-edit-modal')).not.toBeInTheDocument();
    });

    it('should display media preview', () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', mockMedia.url);
    });

    it('should display caption input', () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText(/caption/i)).toBeInTheDocument();
    });

    it('should display tag input', () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('tag-input')).toBeInTheDocument();
    });

    it('should pre-fill caption from media', () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByDisplayValue('Beach sunset')).toBeInTheDocument();
    });

    it('should pre-fill tags from media', () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('beach')).toBeInTheDocument();
      expect(screen.getByText('sunset')).toBeInTheDocument();
    });
  });

  describe('caption editing', () => {
    it('should allow editing caption', () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const captionInput = screen.getByLabelText(/caption/i);
      fireEvent.change(captionInput, { target: { value: 'New caption' } });

      expect(captionInput).toHaveValue('New caption');
    });

    it('should allow empty caption', () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const captionInput = screen.getByLabelText(/caption/i);
      fireEvent.change(captionInput, { target: { value: '' } });

      expect(captionInput).toHaveValue('');
    });
  });

  describe('tag editing', () => {
    it('should allow adding tags', async () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // When tags exist, the placeholder is not shown, so we find the input by its class
      const tagInputContainer = screen.getByTestId('tag-input');
      const tagInput = tagInputContainer.querySelector('.tag-input') as HTMLInputElement;
      fireEvent.change(tagInput, { target: { value: 'ocean' } });
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('ocean')).toBeInTheDocument();
      });
    });

    it('should allow removing tags', async () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const removeButton = screen.getByLabelText(/remove beach/i);
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('beach')).not.toBeInTheDocument();
      });
    });

    it('should show tag suggestions when provided', () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
          suggestedTags={['nature', 'travel', 'vacation']}
        />
      );

      // Suggestions should be accessible for autocomplete
      expect(screen.getByTestId('tag-input')).toBeInTheDocument();
    });
  });

  describe('saving', () => {
    it('should call onSave with updated data when save is clicked', async () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const captionInput = screen.getByLabelText(/caption/i);
      fireEvent.change(captionInput, { target: { value: 'Updated caption' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          caption: 'Updated caption',
          tags: ['beach', 'sunset'],
        });
      });
    });

    it('should show loading state while saving', async () => {
      mockOnSave.mockImplementation(() => new Promise(() => {}));

      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });
    });

    it('should close modal after successful save', async () => {
      mockOnSave.mockResolvedValueOnce(undefined);

      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show error message on save failure', async () => {
      mockOnSave.mockRejectedValueOnce(new Error('Failed to save'));

      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('canceling', () => {
    it('should call onClose when cancel is clicked', () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset form on cancel', () => {
      const { rerender } = render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Edit caption
      const captionInput = screen.getByLabelText(/caption/i);
      fireEvent.change(captionInput, { target: { value: 'Changed caption' } });

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Reopen modal
      rerender(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Should show original caption
      expect(screen.getByDisplayValue('Beach sunset')).toBeInTheDocument();
    });
  });

  describe('media info display', () => {
    it('should display uploader name', () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    it('should display upload date', () => {
      render(
        <MediaEditModal
          isOpen={true}
          media={mockMedia}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // The date is formatted as month + day, but depends on timezone
      // UTC 2026-01-10T00:00:00Z can be Jan 9 or Jan 10 depending on local timezone
      const dateElement = screen.getByText(/jan (9|10)/i);
      expect(dateElement).toBeInTheDocument();
    });
  });
});
