import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeletedItemCard } from '../deleted-item-card';

describe('DeletedItemCard', () => {
  const mockOnRestore = vi.fn();
  const mockOnPermanentDelete = vi.fn();

  const defaultItem = {
    id: 'item-123',
    type: 'expense' as const,
    title: 'Dinner at restaurant',
    deletedAt: new Date('2024-01-15T10:30:00Z'),
    deletedBy: {
      id: 'user-1',
      name: 'John Doe',
    },
    metadata: {
      amount_cents: 15000,
    },
  };

  const defaultProps = {
    item: defaultItem,
    onRestore: mockOnRestore,
    onPermanentDelete: mockOnPermanentDelete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnRestore.mockResolvedValue(undefined);
    mockOnPermanentDelete.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render item title', () => {
      render(<DeletedItemCard {...defaultProps} />);

      expect(screen.getByText('Dinner at restaurant')).toBeInTheDocument();
    });

    it('should render item type badge', () => {
      render(<DeletedItemCard {...defaultProps} />);

      expect(screen.getByText(/expense/i)).toBeInTheDocument();
    });

    it('should render deleted date', () => {
      render(<DeletedItemCard {...defaultProps} />);

      expect(screen.getByText(/jan.*15.*2024/i)).toBeInTheDocument();
    });

    it('should render deleted by name', () => {
      render(<DeletedItemCard {...defaultProps} />);

      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    it('should render restore button', () => {
      render(<DeletedItemCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /restore/i })).toBeInTheDocument();
    });

    it('should render permanent delete button', () => {
      render(<DeletedItemCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /delete permanently/i })).toBeInTheDocument();
    });
  });

  describe('item types', () => {
    it('should render expense type with amount', () => {
      render(<DeletedItemCard {...defaultProps} />);

      expect(screen.getByText(/\$150\.00/)).toBeInTheDocument();
    });

    it('should render media type with thumbnail', () => {
      render(
        <DeletedItemCard
          {...defaultProps}
          item={{
            ...defaultItem,
            type: 'media',
            title: 'sunset-photo.jpg',
            metadata: {
              thumbnailUrl: 'https://example.com/thumb.jpg',
            },
          }}
        />
      );

      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        'https://example.com/thumb.jpg'
      );
    });

    it('should render activity type', () => {
      render(
        <DeletedItemCard
          {...defaultProps}
          item={{
            ...defaultItem,
            type: 'activity',
            title: 'Beach Day',
            metadata: {
              scheduledAt: '2024-01-20',
            },
          }}
        />
      );

      expect(screen.getByText(/activity/i)).toBeInTheDocument();
      expect(screen.getByText('Beach Day')).toBeInTheDocument();
    });
  });

  describe('restore action', () => {
    it('should call onRestore when restore button is clicked', async () => {
      render(<DeletedItemCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /restore/i }));

      await waitFor(() => {
        expect(mockOnRestore).toHaveBeenCalledWith('item-123', 'expense');
      });
    });

    it('should show loading state while restoring', async () => {
      mockOnRestore.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<DeletedItemCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /restore/i }));

      await waitFor(() => {
        expect(screen.getByText(/restoring/i)).toBeInTheDocument();
      });
    });

    it('should disable buttons while restoring', async () => {
      mockOnRestore.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<DeletedItemCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /restore/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /restoring/i })).toBeDisabled();
      });
    });

    it('should show error on restore failure', async () => {
      mockOnRestore.mockRejectedValue(new Error('Failed to restore'));

      render(<DeletedItemCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /restore/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to restore/i)).toBeInTheDocument();
      });
    });
  });

  describe('permanent delete action', () => {
    it('should show confirmation before permanent delete', () => {
      render(<DeletedItemCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));

      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    it('should call onPermanentDelete when confirmed', async () => {
      render(<DeletedItemCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));
      fireEvent.click(screen.getByRole('button', { name: /yes.*delete/i }));

      await waitFor(() => {
        expect(mockOnPermanentDelete).toHaveBeenCalledWith('item-123', 'expense');
      });
    });

    it('should cancel permanent delete on cancel click', () => {
      render(<DeletedItemCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByText(/cannot be undone/i)).not.toBeInTheDocument();
      expect(mockOnPermanentDelete).not.toHaveBeenCalled();
    });
  });

  describe('time since deletion', () => {
    it('should show days remaining before auto-deletion', () => {
      render(
        <DeletedItemCard
          {...defaultProps}
          autoDeleteDays={30}
        />
      );

      expect(screen.getByText(/expires in.*days/i)).toBeInTheDocument();
    });
  });
});
