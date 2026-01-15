import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationSettings } from '../notification-settings';

describe('NotificationSettings', () => {
  const mockOnSave = vi.fn();

  const defaultSettings = {
    emailNotifications: true,
    pushNotifications: false,
    tripUpdates: true,
    expenseAlerts: true,
    pollReminders: false,
    activityChanges: true,
    newPhotos: false,
    digestFrequency: 'daily' as const,
  };

  const defaultProps = {
    settings: defaultSettings,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render notification settings form', () => {
      render(<NotificationSettings {...defaultProps} />);

      expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
    });

    it('should render email notifications toggle', () => {
      render(<NotificationSettings {...defaultProps} />);

      expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
    });

    it('should render push notifications toggle', () => {
      render(<NotificationSettings {...defaultProps} />);

      expect(screen.getByLabelText(/push notifications/i)).toBeInTheDocument();
    });

    it('should render notification categories', () => {
      render(<NotificationSettings {...defaultProps} />);

      expect(screen.getByRole('checkbox', { name: /trip updates/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /expense alerts/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /poll reminders/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /activity changes/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /new photos/i })).toBeInTheDocument();
    });

    it('should render digest frequency selector', () => {
      render(<NotificationSettings {...defaultProps} />);

      expect(screen.getByLabelText(/digest frequency/i)).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<NotificationSettings {...defaultProps} />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  describe('initial values', () => {
    it('should show email notifications as checked', () => {
      render(<NotificationSettings {...defaultProps} />);

      expect(screen.getByLabelText(/email notifications/i)).toBeChecked();
    });

    it('should show push notifications as unchecked', () => {
      render(<NotificationSettings {...defaultProps} />);

      expect(screen.getByLabelText(/push notifications/i)).not.toBeChecked();
    });

    it('should show trip updates as checked', () => {
      render(<NotificationSettings {...defaultProps} />);

      expect(screen.getByRole('checkbox', { name: /trip updates/i })).toBeChecked();
    });

    it('should show poll reminders as unchecked', () => {
      render(<NotificationSettings {...defaultProps} />);

      expect(screen.getByRole('checkbox', { name: /poll reminders/i })).not.toBeChecked();
    });

    it('should show digest frequency as daily', () => {
      render(<NotificationSettings {...defaultProps} />);

      expect(screen.getByLabelText(/digest frequency/i)).toHaveValue('daily');
    });
  });

  describe('toggling settings', () => {
    it('should toggle email notifications', () => {
      render(<NotificationSettings {...defaultProps} />);

      const toggle = screen.getByLabelText(/email notifications/i);
      fireEvent.click(toggle);

      expect(toggle).not.toBeChecked();
    });

    it('should toggle push notifications', () => {
      render(<NotificationSettings {...defaultProps} />);

      const toggle = screen.getByLabelText(/push notifications/i);
      fireEvent.click(toggle);

      expect(toggle).toBeChecked();
    });

    it('should toggle trip updates', () => {
      render(<NotificationSettings {...defaultProps} />);

      const toggle = screen.getByRole('checkbox', { name: /trip updates/i });
      fireEvent.click(toggle);

      expect(toggle).not.toBeChecked();
    });

    it('should change digest frequency', () => {
      render(<NotificationSettings {...defaultProps} />);

      const select = screen.getByLabelText(/digest frequency/i);
      fireEvent.change(select, { target: { value: 'weekly' } });

      expect(select).toHaveValue('weekly');
    });
  });

  describe('saving settings', () => {
    it('should call onSave with updated settings', async () => {
      render(<NotificationSettings {...defaultProps} />);

      fireEvent.click(screen.getByLabelText(/push notifications/i));
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            pushNotifications: true,
          })
        );
      });
    });

    it('should show loading state while saving', async () => {
      mockOnSave.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<NotificationSettings {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });
    });

    it('should disable save button while saving', async () => {
      mockOnSave.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<NotificationSettings {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
      });
    });

    it('should show success message on save', async () => {
      render(<NotificationSettings {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument();
      });
    });

    it('should show error on save failure', async () => {
      mockOnSave.mockRejectedValue(new Error('Failed to save'));

      render(<NotificationSettings {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/failed to save/i);
      });
    });
  });

  describe('category dependencies', () => {
    it('should disable category toggles when email notifications off', () => {
      render(
        <NotificationSettings
          {...defaultProps}
          settings={{ ...defaultSettings, emailNotifications: false }}
        />
      );

      // Category toggles should be disabled when main email toggle is off
      expect(screen.getByRole('checkbox', { name: /trip updates/i })).toBeDisabled();
      expect(screen.getByRole('checkbox', { name: /expense alerts/i })).toBeDisabled();
    });

    it('should show hint when notifications disabled', () => {
      render(
        <NotificationSettings
          {...defaultProps}
          settings={{ ...defaultSettings, emailNotifications: false }}
        />
      );

      expect(screen.getByText(/enable email notifications/i)).toBeInTheDocument();
    });
  });

  describe('digest frequency options', () => {
    it('should have instant option', () => {
      render(<NotificationSettings {...defaultProps} />);

      const select = screen.getByLabelText(/digest frequency/i);
      const options = Array.from(select.querySelectorAll('option'));
      expect(options.some(opt => opt.value === 'instant')).toBe(true);
    });

    it('should have daily option', () => {
      render(<NotificationSettings {...defaultProps} />);

      const select = screen.getByLabelText(/digest frequency/i);
      const options = Array.from(select.querySelectorAll('option'));
      expect(options.some(opt => opt.value === 'daily')).toBe(true);
    });

    it('should have weekly option', () => {
      render(<NotificationSettings {...defaultProps} />);

      const select = screen.getByLabelText(/digest frequency/i);
      const options = Array.from(select.querySelectorAll('option'));
      expect(options.some(opt => opt.value === 'weekly')).toBe(true);
    });

    it('should have never option', () => {
      render(<NotificationSettings {...defaultProps} />);

      const select = screen.getByLabelText(/digest frequency/i);
      const options = Array.from(select.querySelectorAll('option'));
      expect(options.some(opt => opt.value === 'never')).toBe(true);
    });
  });
});
