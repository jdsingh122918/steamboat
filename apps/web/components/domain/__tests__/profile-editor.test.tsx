import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileEditor } from '../profile-editor';

describe('ProfileEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnAvatarUpload = vi.fn();

  const defaultProfile = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    phoneNumber: '+1 555-1234',
    venmoHandle: '@johndoe',
  };

  const defaultProps = {
    profile: defaultProfile,
    onSave: mockOnSave,
    onAvatarUpload: mockOnAvatarUpload,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
    mockOnAvatarUpload.mockResolvedValue({ url: 'https://example.com/new-avatar.jpg' });
  });

  describe('rendering', () => {
    it('should render profile form', () => {
      render(<ProfileEditor {...defaultProps} />);

      expect(screen.getByTestId('profile-editor')).toBeInTheDocument();
    });

    it('should render name input with current value', () => {
      render(<ProfileEditor {...defaultProps} />);

      expect(screen.getByLabelText(/name/i)).toHaveValue('John Doe');
    });

    it('should render email input as read-only', () => {
      render(<ProfileEditor {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('john@example.com');
      expect(emailInput).toHaveAttribute('readonly');
    });

    it('should render phone number input', () => {
      render(<ProfileEditor {...defaultProps} />);

      expect(screen.getByLabelText(/phone/i)).toHaveValue('+1 555-1234');
    });

    it('should render venmo handle input', () => {
      render(<ProfileEditor {...defaultProps} />);

      expect(screen.getByLabelText(/venmo/i)).toHaveValue('@johndoe');
    });

    it('should render current avatar', () => {
      render(<ProfileEditor {...defaultProps} />);

      const avatar = screen.getByAltText(/profile avatar/i);
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should render save button', () => {
      render(<ProfileEditor {...defaultProps} />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should render avatar upload button', () => {
      render(<ProfileEditor {...defaultProps} />);

      expect(screen.getByRole('button', { name: /change.*avatar/i })).toBeInTheDocument();
    });
  });

  describe('form editing', () => {
    it('should update name on input', () => {
      render(<ProfileEditor {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

      expect(nameInput).toHaveValue('Jane Doe');
    });

    it('should update phone number on input', () => {
      render(<ProfileEditor {...defaultProps} />);

      const phoneInput = screen.getByLabelText(/phone/i);
      fireEvent.change(phoneInput, { target: { value: '+1 555-5678' } });

      expect(phoneInput).toHaveValue('+1 555-5678');
    });

    it('should update venmo handle on input', () => {
      render(<ProfileEditor {...defaultProps} />);

      const venmoInput = screen.getByLabelText(/venmo/i);
      fireEvent.change(venmoInput, { target: { value: '@janedoe' } });

      expect(venmoInput).toHaveValue('@janedoe');
    });
  });

  describe('form submission', () => {
    it('should call onSave with updated data', async () => {
      render(<ProfileEditor {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/name/i), {
        target: { value: 'Jane Doe' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Jane Doe',
          })
        );
      });
    });

    it('should show loading state while saving', async () => {
      mockOnSave.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ProfileEditor {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });
    });

    it('should disable save button while saving', async () => {
      mockOnSave.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ProfileEditor {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
      });
    });

    it('should show success message on save', async () => {
      render(<ProfileEditor {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument();
      });
    });

    it('should show error on save failure', async () => {
      mockOnSave.mockRejectedValue(new Error('Failed to save'));

      render(<ProfileEditor {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/failed to save/i);
      });
    });
  });

  describe('validation', () => {
    it('should require name field', async () => {
      render(<ProfileEditor {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should validate venmo handle format', async () => {
      render(<ProfileEditor {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/venmo/i), {
        target: { value: 'invalidhandle' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/venmo.*@/i)).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('avatar upload', () => {
    it('should open file picker on avatar button click', () => {
      render(<ProfileEditor {...defaultProps} />);

      const fileInput = screen.getByTestId('avatar-input');
      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.click(screen.getByRole('button', { name: /change.*avatar/i }));

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should call onAvatarUpload when file selected', async () => {
      render(<ProfileEditor {...defaultProps} />);

      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('avatar-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnAvatarUpload).toHaveBeenCalledWith(file);
      });
    });

    it('should update avatar preview on upload', async () => {
      render(<ProfileEditor {...defaultProps} />);

      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('avatar-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const avatar = screen.getByAltText(/profile avatar/i);
        expect(avatar).toHaveAttribute('src', 'https://example.com/new-avatar.jpg');
      });
    });

    it('should show uploading state', async () => {
      mockOnAvatarUpload.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ProfileEditor {...defaultProps} />);

      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('avatar-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      });
    });

    it('should show error on upload failure', async () => {
      mockOnAvatarUpload.mockRejectedValue(new Error('Upload failed'));

      render(<ProfileEditor {...defaultProps} />);

      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('avatar-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/upload failed/i);
      });
    });
  });

  describe('empty states', () => {
    it('should handle missing phone number', () => {
      render(
        <ProfileEditor
          {...defaultProps}
          profile={{ ...defaultProfile, phoneNumber: undefined }}
        />
      );

      expect(screen.getByLabelText(/phone/i)).toHaveValue('');
    });

    it('should handle missing venmo handle', () => {
      render(
        <ProfileEditor
          {...defaultProps}
          profile={{ ...defaultProfile, venmoHandle: undefined }}
        />
      );

      expect(screen.getByLabelText(/venmo/i)).toHaveValue('');
    });

    it('should show default avatar when no avatarUrl', () => {
      render(
        <ProfileEditor
          {...defaultProps}
          profile={{ ...defaultProfile, avatarUrl: undefined }}
        />
      );

      expect(screen.getByTestId('default-avatar')).toBeInTheDocument();
    });
  });
});
