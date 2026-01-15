import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';

// Mock the next/navigation module
vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ tripId: 'trip-123' }),
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import AdminPage from '../page';
import { useRouter } from 'next/navigation';

describe('AdminPage', () => {
  const mockTripStats = {
    success: true,
    data: {
      totalExpenses: 150000,
      expenseCount: 12,
      totalAttendees: 8,
      confirmedAttendees: 6,
      totalPhotos: 45,
      totalActivities: 5,
      completedActivities: 3,
      totalPolls: 4,
      openPolls: 1,
      closedPolls: 3,
      expenseBreakdown: [
        { category: 'lodging', total: 80000, count: 2 },
        { category: 'dining', total: 50000, count: 6 },
      ],
      settlementStatus: { pending: 2, completed: 5, total: 7 },
    },
  };

  const mockDeletedItems = {
    success: true,
    data: {
      items: [
        {
          id: 'deleted-1',
          type: 'expense',
          title: 'Deleted Expense',
          deletedAt: '2024-01-15T10:00:00Z',
          deletedBy: { id: 'user-1', name: 'John' },
          autoDeleteAt: '2024-02-14T10:00:00Z',
        },
        {
          id: 'deleted-2',
          type: 'media',
          title: 'Deleted Photo',
          deletedAt: '2024-01-16T10:00:00Z',
          deletedBy: { id: 'user-2', name: 'Jane' },
          autoDeleteAt: '2024-02-15T10:00:00Z',
        },
      ],
    },
  };

  const mockAttendees = {
    success: true,
    data: [
      { _id: 'user-1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
      { _id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', role: 'member' },
      { _id: 'user-3', name: 'Bob Wilson', email: 'bob@example.com', role: 'member' },
    ],
  };

  const mockTrip = {
    success: true,
    data: {
      _id: 'trip-123',
      name: 'Bachelor Party 2024',
      adminIds: ['user-1'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Setup default mock responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTripStats),
        });
      }
      if (url.includes('/deleted')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDeletedItems),
        });
      }
      if (url.includes('/attendees')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAttendees),
        });
      }
      if (url.includes('/trips/trip-123') && !url.includes('/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTrip),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });
  });

  describe('loading state', () => {
    it('should render loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AdminPage />);

      expect(screen.getByTestId('admin-loading')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors with retry option', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-error')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('statistics tab', () => {
    it('should render statistics tab by default', async () => {
      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /statistics/i })).toBeInTheDocument();
      });
    });

    it('should display TripStatsCard with fetched data', async () => {
      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByTestId('stats-card')).toBeInTheDocument();
      });

      // Check some stats values
      expect(screen.getByText(/\$1,500\.00/)).toBeInTheDocument(); // Total expenses
      expect(screen.getByText('12')).toBeInTheDocument(); // Expense count (exact match)
    });
  });

  describe('tab navigation', () => {
    it('should switch between tabs', async () => {
      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /statistics/i })).toBeInTheDocument();
      });

      // Switch to deleted items tab
      const deletedTab = screen.getByRole('tab', { name: /deleted/i });
      fireEvent.click(deletedTab);

      await waitFor(() => {
        expect(screen.getByTestId('deleted-items-section')).toBeInTheDocument();
      });

      // Switch to admin transfer tab
      const transferTab = screen.getByRole('tab', { name: /transfer/i });
      fireEvent.click(transferTab);

      await waitFor(() => {
        expect(screen.getByTestId('admin-transfer-section')).toBeInTheDocument();
      });
    });
  });

  describe('deleted items tab', () => {
    it('should filter deleted items by type', async () => {
      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /deleted/i })).toBeInTheDocument();
      });

      // Switch to deleted items tab
      const deletedTab = screen.getByRole('tab', { name: /deleted/i });
      fireEvent.click(deletedTab);

      await waitFor(() => {
        expect(screen.getByTestId('deleted-items-section')).toBeInTheDocument();
      });

      // Should show all items initially
      expect(screen.getByText('Deleted Expense')).toBeInTheDocument();
      expect(screen.getByText('Deleted Photo')).toBeInTheDocument();

      // Filter by type
      const filterSelect = screen.getByRole('combobox', { name: /filter/i });
      fireEvent.change(filterSelect, { target: { value: 'expense' } });

      await waitFor(() => {
        expect(screen.getByText('Deleted Expense')).toBeInTheDocument();
        expect(screen.queryByText('Deleted Photo')).not.toBeInTheDocument();
      });
    });

    it('should call restore API and refresh list', async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/restore') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        if (url.includes('/deleted')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDeletedItems),
          });
        }
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTripStats),
          });
        }
        if (url.includes('/attendees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAttendees),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {} }),
        });
      });

      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /deleted/i })).toBeInTheDocument();
      });

      // Switch to deleted items tab
      fireEvent.click(screen.getByRole('tab', { name: /deleted/i }));

      await waitFor(() => {
        expect(screen.getByText('Deleted Expense')).toBeInTheDocument();
      });

      // Click restore button
      const restoreButton = screen.getAllByRole('button', { name: /restore/i })[0];
      fireEvent.click(restoreButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/restore'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should show confirmation before permanent delete', async () => {
      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /deleted/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('tab', { name: /deleted/i }));

      await waitFor(() => {
        expect(screen.getByText('Deleted Expense')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getAllByRole('button', { name: /delete permanently/i })[0];
      fireEvent.click(deleteButton);

      // Should show confirmation
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    });
  });

  describe('admin transfer tab', () => {
    it('should open admin transfer modal', async () => {
      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /transfer/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('tab', { name: /transfer/i }));

      await waitFor(() => {
        expect(screen.getByTestId('admin-transfer-section')).toBeInTheDocument();
      });

      const transferButton = screen.getByRole('button', { name: /transfer admin/i });
      fireEvent.click(transferButton);

      await waitFor(() => {
        expect(screen.getByTestId('admin-transfer-modal')).toBeInTheDocument();
      });
    });

    it('should list attendees for selection', async () => {
      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /transfer/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('tab', { name: /transfer/i }));

      await waitFor(() => {
        expect(screen.getByTestId('admin-transfer-section')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /transfer admin/i }));

      await waitFor(() => {
        // Should list non-admin attendees
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });
    });
  });

  describe('authorization', () => {
    it('should redirect non-admin users to trip dashboard', async () => {
      // Mock a 403 response
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: false,
            status: 403,
            json: () => Promise.resolve({ success: false, error: 'Forbidden' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      const mockRouter = { push: vi.fn(), replace: vi.fn() };
      vi.mocked(useRouter).mockReturnValue(mockRouter as any);

      render(<AdminPage />);

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/trips/trip-123');
      });
    });
  });
});
