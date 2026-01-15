import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock useParams and useRouter
const mockParams = { tripId: 'trip123', expenseId: 'exp123' };
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockParams,
}));

// Mock expense data
const mockExpense = {
  _id: 'exp123',
  tripId: 'trip123',
  payerId: 'att1',
  amount_cents: 15000,
  currency: 'USD',
  category: 'food',
  description: 'Dinner at Restaurant',
  participants: [
    { attendeeId: 'att1', optedIn: true, share_cents: 5000 },
    { attendeeId: 'att2', optedIn: true, share_cents: 5000 },
    { attendeeId: 'att3', optedIn: true, share_cents: 5000 },
  ],
  status: 'pending',
  createdAt: '2024-04-15T10:00:00Z',
  updatedAt: '2024-04-15T10:00:00Z',
};

const mockExpenseWithDispute = {
  ...mockExpense,
  dispute: {
    filedBy: 'att2',
    reason: 'I did not participate in this dinner event at all',
    filedAt: '2024-04-16T10:00:00Z',
  },
};

const mockExpenseWithResolvedDispute = {
  ...mockExpense,
  dispute: {
    filedBy: 'att2',
    reason: 'I did not participate in this dinner event at all',
    filedAt: '2024-04-16T10:00:00Z',
    resolvedBy: 'att1',
    resolution: 'Dispute accepted - adjusted expense',
    resolvedAt: '2024-04-17T10:00:00Z',
  },
};

const mockAttendees = {
  attendees: [
    { _id: 'att1', name: 'John Doe', role: 'admin' },
    { _id: 'att2', name: 'Jane Smith', role: 'member' },
    { _id: 'att3', name: 'Bob Wilson', role: 'member' },
  ],
};

const mockCurrentUser = {
  id: 'att2',
  name: 'Jane Smith',
  role: 'attendee',
};

const mockCurrentUserAdmin = {
  id: 'att1',
  name: 'John Doe',
  role: 'organizer',
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/me')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockCurrentUser }),
      });
    }
    if (url.includes('/attendees')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockAttendees }),
      });
    }
    if (url.includes(`/expenses/${mockParams.expenseId}`) && !url.includes('/dispute')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockExpense }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

// Import after mocking
import ExpenseDetailPage from '../page';

describe('ExpenseDetailPage', () => {
  describe('rendering', () => {
    it('should render the expense detail page', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-detail-page')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<ExpenseDetailPage />);
      expect(screen.getByTestId('expense-detail-loading')).toBeInTheDocument();
    });

    it('should render expense description in header', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByText('Dinner at Restaurant')).toBeInTheDocument();
      });
    });

    it('should render expense amount', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-amount')).toHaveTextContent('$150.00');
      });
    });
  });

  describe('expense details card', () => {
    it('should render expense details card', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-details-card')).toBeInTheDocument();
      });
    });

    it('should display expense category', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-category')).toHaveTextContent('Food');
      });
    });

    it('should display payer name', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-payer')).toHaveTextContent('John Doe');
      });
    });

    it('should display expense status', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-status')).toHaveTextContent('Pending');
      });
    });
  });

  describe('participants section', () => {
    it('should render participants card', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-participants-card')).toBeInTheDocument();
      });
    });

    it('should display all opted-in participants', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('participant-att1')).toBeInTheDocument();
        expect(screen.getByTestId('participant-att2')).toBeInTheDocument();
        expect(screen.getByTestId('participant-att3')).toBeInTheDocument();
      });
    });

    it('should display participant shares', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        const participant1 = screen.getByTestId('participant-att1');
        expect(participant1).toHaveTextContent('$50.00');
      });
    });
  });

  describe('receipt image', () => {
    it('should render receipt image when present', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockCurrentUser }),
          });
        }
        if (url.includes('/attendees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockAttendees }),
          });
        }
        if (url.includes(`/expenses/${mockParams.expenseId}`) && !url.includes('/dispute')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: { ...mockExpense, receiptUrl: 'https://example.com/receipt.jpg' },
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-receipt-card')).toBeInTheDocument();
        expect(screen.getByTestId('expense-receipt-image')).toHaveAttribute(
          'src',
          'https://example.com/receipt.jpg'
        );
      });
    });

    it('should not render receipt card when no receipt URL', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-detail-page')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('expense-receipt-card')).not.toBeInTheDocument();
    });
  });

  describe('dispute filing', () => {
    it('should show file dispute button for participants', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('file-dispute-button')).toBeInTheDocument();
      });
    });

    it('should not show file dispute button for non-participants', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: { id: 'att999', name: 'Outsider', role: 'attendee' },
              }),
          });
        }
        if (url.includes('/attendees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockAttendees }),
          });
        }
        if (url.includes(`/expenses/${mockParams.expenseId}`) && !url.includes('/dispute')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockExpense }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-detail-page')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('file-dispute-button')).not.toBeInTheDocument();
    });

    it('should show dispute form when file dispute button is clicked', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('file-dispute-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('file-dispute-button'));

      await waitFor(() => {
        expect(screen.getByTestId('dispute-form-card')).toBeInTheDocument();
        expect(screen.getByTestId('dispute-form')).toBeInTheDocument();
      });
    });

    it('should hide file dispute button when form is shown', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('file-dispute-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('file-dispute-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('file-dispute-button')).not.toBeInTheDocument();
      });
    });

    it('should submit dispute when form is submitted', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/dispute') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ success: true, data: mockExpenseWithDispute }),
          });
        }
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockCurrentUser }),
          });
        }
        if (url.includes('/attendees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockAttendees }),
          });
        }
        if (url.includes(`/expenses/${mockParams.expenseId}`) && !url.includes('/dispute')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockExpense }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      global.fetch = mockFetch;

      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('file-dispute-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('file-dispute-button'));

      await waitFor(() => {
        expect(screen.getByTestId('dispute-form')).toBeInTheDocument();
      });

      // Fill in the form
      const reasonTextarea = screen.getByLabelText(/reason/i);
      fireEvent.change(reasonTextarea, {
        target: { value: 'I did not participate in this dinner event at all' },
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /submit dispute/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/dispute'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('I did not participate'),
          })
        );
      });
    });

    it('should close dispute form when cancel is clicked', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('file-dispute-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('file-dispute-button'));

      await waitFor(() => {
        expect(screen.getByTestId('dispute-form')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByTestId('dispute-form')).not.toBeInTheDocument();
        expect(screen.getByTestId('file-dispute-button')).toBeInTheDocument();
      });
    });
  });

  describe('existing dispute display', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockCurrentUser }),
          });
        }
        if (url.includes('/attendees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockAttendees }),
          });
        }
        if (url.includes(`/expenses/${mockParams.expenseId}`) && !url.includes('/dispute')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockExpenseWithDispute }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
    });

    it('should show dispute card when expense has dispute', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-dispute-section')).toBeInTheDocument();
      });
    });

    it('should not show file dispute button when dispute exists', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-dispute-section')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('file-dispute-button')).not.toBeInTheDocument();
    });

    it('should show dispute status as disputed', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-status')).toHaveTextContent('Disputed');
      });
    });
  });

  describe('admin resolution', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockCurrentUserAdmin }),
          });
        }
        if (url.includes('/attendees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockAttendees }),
          });
        }
        if (url.includes(`/expenses/${mockParams.expenseId}`) && !url.includes('/dispute')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockExpenseWithDispute }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
    });

    it('should show accept and reject buttons for admin', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
      });
    });

    it('should call resolve API when accept is clicked', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/dispute') && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ success: true, data: mockExpenseWithResolvedDispute }),
          });
        }
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockCurrentUserAdmin }),
          });
        }
        if (url.includes('/attendees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockAttendees }),
          });
        }
        if (url.includes(`/expenses/${mockParams.expenseId}`) && !url.includes('/dispute')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockExpenseWithDispute }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      global.fetch = mockFetch;

      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /accept/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/dispute'),
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });
    });
  });

  describe('resolved dispute', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockCurrentUser }),
          });
        }
        if (url.includes('/attendees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockAttendees }),
          });
        }
        if (url.includes(`/expenses/${mockParams.expenseId}`) && !url.includes('/dispute')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ success: true, data: mockExpenseWithResolvedDispute }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
    });

    it('should display resolved dispute without action buttons', async () => {
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-dispute-section')).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should show error state on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-detail-error')).toBeInTheDocument();
      });
    });

    it('should show not found state for 404', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes(`/expenses/${mockParams.expenseId}`) && !url.includes('/dispute')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ success: false, error: 'Expense not found' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByText(/expense not found/i)).toBeInTheDocument();
      });
    });

    it('should show back button on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to finances/i })).toBeInTheDocument();
      });
    });

    it('should navigate back when back button is clicked', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to finances/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /back to finances/i }));
      expect(mockPush).toHaveBeenCalledWith('/trips/trip123/finances');
    });
  });

  describe('settled expense', () => {
    it('should not show file dispute button for settled expense', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockCurrentUser }),
          });
        }
        if (url.includes('/attendees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockAttendees }),
          });
        }
        if (url.includes(`/expenses/${mockParams.expenseId}`) && !url.includes('/dispute')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ success: true, data: { ...mockExpense, status: 'settled' } }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-detail-page')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('file-dispute-button')).not.toBeInTheDocument();
    });

    it('should show settled status badge', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockCurrentUser }),
          });
        }
        if (url.includes('/attendees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockAttendees }),
          });
        }
        if (url.includes(`/expenses/${mockParams.expenseId}`) && !url.includes('/dispute')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ success: true, data: { ...mockExpense, status: 'settled' } }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ExpenseDetailPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expense-status')).toHaveTextContent('Settled');
      });
    });
  });
});
