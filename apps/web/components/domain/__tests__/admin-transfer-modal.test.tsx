import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminTransferModal } from '../admin-transfer-modal';

describe('AdminTransferModal', () => {
  const mockOnTransfer = vi.fn();
  const mockOnClose = vi.fn();

  const defaultAttendees = [
    { id: 'user-1', name: 'John Doe', email: 'john@example.com', isAdmin: true },
    { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', isAdmin: false },
    { id: 'user-3', name: 'Bob Wilson', email: 'bob@example.com', isAdmin: false },
  ];

  const defaultProps = {
    isOpen: true,
    tripName: 'Vegas Trip 2024',
    currentAdminId: 'user-1',
    attendees: defaultAttendees,
    onTransfer: mockOnTransfer,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnTransfer.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render modal when open', () => {
      render(<AdminTransferModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<AdminTransferModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display modal title', () => {
      render(<AdminTransferModal {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /transfer admin/i })).toBeInTheDocument();
    });

    it('should display trip name in description', () => {
      render(<AdminTransferModal {...defaultProps} />);

      expect(screen.getByText(/vegas trip 2024/i)).toBeInTheDocument();
    });

    it('should display warning about admin transfer', () => {
      render(<AdminTransferModal {...defaultProps} />);

      expect(screen.getByText(/lose admin privileges/i)).toBeInTheDocument();
    });

    it('should render eligible attendees', () => {
      render(<AdminTransferModal {...defaultProps} />);

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should not list current admin as eligible', () => {
      render(<AdminTransferModal {...defaultProps} />);

      // John Doe is current admin, should not be in the selection list
      const attendeeList = screen.getByTestId('attendee-list');
      expect(attendeeList).not.toHaveTextContent('John Doe');
    });

    it('should render close button', () => {
      render(<AdminTransferModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render transfer button', () => {
      render(<AdminTransferModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /transfer admin/i })).toBeInTheDocument();
    });
  });

  describe('attendee selection', () => {
    it('should select attendee when clicked', () => {
      render(<AdminTransferModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Jane Smith'));

      const selectedItem = screen.getByText('Jane Smith').closest('.attendee-item');
      expect(selectedItem).toHaveClass('selected');
    });

    it('should only allow one selection', () => {
      render(<AdminTransferModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Jane Smith'));
      fireEvent.click(screen.getByText('Bob Wilson'));

      const janeItem = screen.getByText('Jane Smith').closest('.attendee-item');
      const bobItem = screen.getByText('Bob Wilson').closest('.attendee-item');

      expect(janeItem).not.toHaveClass('selected');
      expect(bobItem).toHaveClass('selected');
    });

    it('should display attendee email', () => {
      render(<AdminTransferModal {...defaultProps} />);

      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });

  describe('transfer action', () => {
    it('should disable transfer button when no attendee selected', () => {
      render(<AdminTransferModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /transfer admin/i })).toBeDisabled();
    });

    it('should enable transfer button when attendee selected and confirmed', () => {
      render(<AdminTransferModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Jane Smith'));
      fireEvent.click(screen.getByRole('checkbox'));

      expect(screen.getByRole('button', { name: /transfer admin/i })).not.toBeDisabled();
    });

    it('should call onTransfer with selected attendee id', async () => {
      render(<AdminTransferModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Jane Smith'));
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /transfer admin/i }));

      await waitFor(() => {
        expect(mockOnTransfer).toHaveBeenCalledWith('user-2');
      });
    });

    it('should show loading state while transferring', async () => {
      mockOnTransfer.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<AdminTransferModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Jane Smith'));
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /transfer admin/i }));

      await waitFor(() => {
        expect(screen.getByText(/transferring/i)).toBeInTheDocument();
      });
    });

    it('should disable buttons while transferring', async () => {
      mockOnTransfer.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<AdminTransferModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Jane Smith'));
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /transfer admin/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /transferring/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      });
    });

    it('should show error on transfer failure', async () => {
      mockOnTransfer.mockRejectedValue(new Error('Transfer failed'));

      render(<AdminTransferModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Jane Smith'));
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /transfer admin/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/transfer failed/i);
      });
    });
  });

  describe('close action', () => {
    it('should call onClose when cancel clicked', () => {
      render(<AdminTransferModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking outside modal', () => {
      render(<AdminTransferModal {...defaultProps} />);

      fireEvent.click(screen.getByTestId('modal-overlay'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when clicking inside modal', () => {
      render(<AdminTransferModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('dialog'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('confirmation requirement', () => {
    it('should require confirmation checkbox before transfer', () => {
      render(<AdminTransferModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Jane Smith'));

      // Transfer should still be disabled without confirmation
      expect(screen.getByRole('button', { name: /transfer/i })).toBeDisabled();
    });

    it('should enable transfer after confirmation checkbox', () => {
      render(<AdminTransferModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Jane Smith'));
      fireEvent.click(screen.getByRole('checkbox'));

      expect(screen.getByRole('button', { name: /transfer/i })).not.toBeDisabled();
    });

    it('should display confirmation text', () => {
      render(<AdminTransferModal {...defaultProps} />);

      expect(screen.getByText(/understand.*cannot be undone/i)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show message when no eligible attendees', () => {
      render(
        <AdminTransferModal
          {...defaultProps}
          attendees={[defaultAttendees[0]]} // Only current admin
        />
      );

      expect(screen.getByText(/no eligible attendees/i)).toBeInTheDocument();
    });

    it('should disable transfer button with no eligible attendees', () => {
      render(
        <AdminTransferModal
          {...defaultProps}
          attendees={[defaultAttendees[0]]}
        />
      );

      expect(screen.getByRole('button', { name: /transfer admin/i })).toBeDisabled();
    });
  });
});
