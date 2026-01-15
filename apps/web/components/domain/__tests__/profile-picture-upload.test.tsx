import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';

import { ProfilePictureUpload } from '../profile-picture-upload';

describe('ProfilePictureUpload', () => {
  const defaultProps = {
    name: 'John Doe',
    onUpload: vi.fn().mockResolvedValue({ url: 'https://example.com/avatar.jpg' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render current avatar when URL provided', () => {
      render(
        <ProfilePictureUpload
          {...defaultProps}
          currentImageUrl="https://example.com/current-avatar.jpg"
        />
      );

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toBeInTheDocument();
      const img = avatar.querySelector('img');
      expect(img).toHaveAttribute('src', 'https://example.com/current-avatar.jpg');
    });

    it('should render fallback initials when no URL', () => {
      render(<ProfilePictureUpload {...defaultProps} />);

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveTextContent('JD');
    });

    it('should show upload overlay on hover/focus', async () => {
      render(<ProfilePictureUpload {...defaultProps} />);

      const container = screen.getByTestId('profile-picture-upload');
      fireEvent.mouseEnter(container);

      expect(screen.getByTestId('upload-overlay')).toBeInTheDocument();
    });

    it('should render with different sizes', () => {
      const { rerender } = render(<ProfilePictureUpload {...defaultProps} size="sm" />);
      expect(screen.getByTestId('avatar')).toHaveClass('avatar-sm');

      rerender(<ProfilePictureUpload {...defaultProps} size="lg" />);
      expect(screen.getByTestId('avatar')).toHaveClass('avatar-lg');

      rerender(<ProfilePictureUpload {...defaultProps} size="xl" />);
      expect(screen.getByTestId('avatar')).toHaveClass('avatar-xl');
    });
  });

  describe('file selection', () => {
    it('should open file picker on click', () => {
      render(<ProfilePictureUpload {...defaultProps} />);

      const input = screen.getByTestId('profile-picture-input');
      const clickSpy = vi.spyOn(input, 'click');

      const container = screen.getByTestId('profile-picture-upload');
      fireEvent.click(container);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should accept only image files', () => {
      render(<ProfilePictureUpload {...defaultProps} />);

      const input = screen.getByTestId('profile-picture-input');
      expect(input).toHaveAttribute('accept', 'image/*');
    });

    it('should accept custom allowed types', () => {
      render(
        <ProfilePictureUpload
          {...defaultProps}
          allowedTypes={['image/jpeg', 'image/png']}
        />
      );

      const input = screen.getByTestId('profile-picture-input');
      expect(input).toHaveAttribute('accept', 'image/jpeg,image/png');
    });
  });

  describe('validation', () => {
    it('should validate file size', async () => {
      render(
        <ProfilePictureUpload {...defaultProps} maxSizeBytes={1024} />
      );

      const input = screen.getByTestId('profile-picture-input');

      // Create a file larger than max size
      const largeFile = new File(['x'.repeat(2048)], 'large.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });

      expect(defaultProps.onUpload).not.toHaveBeenCalled();
    });

    it('should validate file type', async () => {
      render(<ProfilePictureUpload {...defaultProps} />);

      const input = screen.getByTestId('profile-picture-input');

      // Create a non-image file
      const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });

      fireEvent.change(input, { target: { files: [textFile] } });

      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });

      expect(defaultProps.onUpload).not.toHaveBeenCalled();
    });

    it('should show error for invalid files', async () => {
      render(<ProfilePictureUpload {...defaultProps} />);

      const input = screen.getByTestId('profile-picture-input');
      const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });

      fireEvent.change(input, { target: { files: [textFile] } });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('upload', () => {
    it('should call onUpload with selected file', async () => {
      render(<ProfilePictureUpload {...defaultProps} />);

      const input = screen.getByTestId('profile-picture-input');
      const validFile = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(defaultProps.onUpload).toHaveBeenCalledWith(validFile);
      });
    });

    it('should show loading state during upload', async () => {
      const slowUpload = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ url: 'https://example.com/avatar.jpg' }), 100))
      );

      render(<ProfilePictureUpload {...defaultProps} onUpload={slowUpload} />);

      const input = screen.getByTestId('profile-picture-input');
      const validFile = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('upload-spinner')).toBeInTheDocument();
      });
    });

    it('should update avatar on successful upload', async () => {
      const onUpload = vi.fn().mockResolvedValue({ url: 'https://example.com/new-avatar.jpg' });

      render(<ProfilePictureUpload {...defaultProps} onUpload={onUpload} />);

      const input = screen.getByTestId('profile-picture-input');
      const validFile = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        const avatar = screen.getByTestId('avatar');
        const img = avatar.querySelector('img');
        expect(img).toHaveAttribute('src', 'https://example.com/new-avatar.jpg');
      });
    });

    it('should show error on upload failure', async () => {
      const onUpload = vi.fn().mockRejectedValue(new Error('Upload failed'));

      render(<ProfilePictureUpload {...defaultProps} onUpload={onUpload} />);

      const input = screen.getByTestId('profile-picture-input');
      const validFile = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('remove', () => {
    it('should show remove button when image exists', () => {
      const onRemove = vi.fn();
      render(
        <ProfilePictureUpload
          {...defaultProps}
          currentImageUrl="https://example.com/avatar.jpg"
          onRemove={onRemove}
        />
      );

      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('should not show remove button when no image', () => {
      const onRemove = vi.fn();
      render(<ProfilePictureUpload {...defaultProps} onRemove={onRemove} />);

      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });

    it('should not show remove button when onRemove not provided', () => {
      render(
        <ProfilePictureUpload
          {...defaultProps}
          currentImageUrl="https://example.com/avatar.jpg"
        />
      );

      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });

    it('should call onRemove when remove clicked', async () => {
      const onRemove = vi.fn().mockResolvedValue(undefined);
      render(
        <ProfilePictureUpload
          {...defaultProps}
          currentImageUrl="https://example.com/avatar.jpg"
          onRemove={onRemove}
        />
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(onRemove).toHaveBeenCalled();
      });
    });
  });

  describe('disabled state', () => {
    it('should respect disabled prop', () => {
      render(<ProfilePictureUpload {...defaultProps} disabled />);

      const container = screen.getByTestId('profile-picture-upload');
      expect(container).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not open file picker when disabled', () => {
      render(<ProfilePictureUpload {...defaultProps} disabled />);

      const input = screen.getByTestId('profile-picture-input');
      const clickSpy = vi.spyOn(input, 'click');

      const container = screen.getByTestId('profile-picture-upload');
      fireEvent.click(container);

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should be keyboard navigable', () => {
      render(<ProfilePictureUpload {...defaultProps} />);

      const container = screen.getByTestId('profile-picture-upload');
      expect(container).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper aria labels', () => {
      render(<ProfilePictureUpload {...defaultProps} />);

      const container = screen.getByTestId('profile-picture-upload');
      expect(container).toHaveAttribute('aria-label', 'Change profile picture');
    });

    it('should open file picker on Enter key', () => {
      render(<ProfilePictureUpload {...defaultProps} />);

      const input = screen.getByTestId('profile-picture-input');
      const clickSpy = vi.spyOn(input, 'click');

      const container = screen.getByTestId('profile-picture-upload');
      fireEvent.keyDown(container, { key: 'Enter' });

      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
