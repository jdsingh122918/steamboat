import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock useParams and useRouter
const mockParams = { tripId: 'trip123' };
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockParams,
}));

// Mock data
const mockExpenses = [
  {
    id: 'exp1',
    description: 'Hotel Stay',
    amount: 600,
    category: 'lodging',
    paidBy: { id: 'att1', name: 'John Doe' },
    splitAmong: ['att1', 'att2', 'att3'],
    date: '2024-04-15',
    status: 'pending',
  },
  {
    id: 'exp2',
    description: 'Dinner at Restaurant',
    amount: 150,
    category: 'dining',
    paidBy: { id: 'att2', name: 'Jane Smith' },
    splitAmong: ['att1', 'att2'],
    date: '2024-04-16',
    status: 'settled',
  },
];

const mockBalances = {
  balances: [
    { attendeeId: 'att1', attendeeName: 'John Doe', balance: 150.00 },
    { attendeeId: 'att2', attendeeName: 'Jane Smith', balance: -75.00 },
    { attendeeId: 'att3', attendeeName: 'Bob Wilson', balance: -75.00 },
  ],
  summary: {
    totalExpenses: 750,
    expenseCount: 2,
  },
};

const mockSettlements = [
  {
    id: 'set1',
    from: { id: 'att2', name: 'Jane Smith' },
    to: { id: 'att1', name: 'John Doe' },
    amount: 75.00,
    status: 'pending',
  },
  {
    id: 'set2',
    from: { id: 'att3', name: 'Bob Wilson' },
    to: { id: 'att1', name: 'John Doe' },
    amount: 75.00,
    status: 'pending',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/settlements')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { settlements: mockSettlements } }),
      });
    }
    if (url.includes('/balances')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockBalances }),
      });
    }
    if (url.includes('/expenses')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { expenses: mockExpenses } }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

// Import after mocking
import FinancesPage from '../page';

describe('FinancesPage', () => {
  describe('rendering', () => {
    it('should render the finances page', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('finances-page')).toBeInTheDocument();
      });
    });

    it('should render page header', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByText('Finances')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<FinancesPage />);
      expect(screen.getByTestId('finances-loading')).toBeInTheDocument();
    });
  });

  describe('expenses section', () => {
    it('should render expenses list', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expenses-section')).toBeInTheDocument();
      });
    });

    it('should display expense items', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByText('Hotel Stay')).toBeInTheDocument();
        expect(screen.getByText('Dinner at Restaurant')).toBeInTheDocument();
      });
    });

    it('should display expense amounts', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByText('$600.00')).toBeInTheDocument();
        expect(screen.getByText('$150.00')).toBeInTheDocument();
      });
    });

    it('should display who paid for each expense', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
        expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
      });
    });
  });

  describe('expense filters', () => {
    it('should render category filter', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      });
    });

    it('should filter expenses by category', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expenses-section')).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText(/category/i);
      fireEvent.change(categorySelect, { target: { value: 'lodging' } });

      await waitFor(() => {
        expect(screen.getByText('Hotel Stay')).toBeInTheDocument();
        expect(screen.queryByText('Dinner at Restaurant')).not.toBeInTheDocument();
      });
    });

    it('should render search input', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search expenses/i)).toBeInTheDocument();
      });
    });

    it('should filter expenses by search term', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expenses-section')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search expenses/i);
      fireEvent.change(searchInput, { target: { value: 'hotel' } });

      await waitFor(() => {
        expect(screen.getByText('Hotel Stay')).toBeInTheDocument();
        expect(screen.queryByText('Dinner at Restaurant')).not.toBeInTheDocument();
      });
    });
  });

  describe('balances section', () => {
    it('should render balances summary', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('finances-page')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('tab', { name: /balances/i }));
      await waitFor(() => {
        expect(screen.getByTestId('balances-section')).toBeInTheDocument();
      });
    });

    it('should display total expenses', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('finances-page')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('tab', { name: /balances/i }));
      await waitFor(() => {
        expect(screen.getByText('$750.00')).toBeInTheDocument();
      });
    });

    it('should display individual balances', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('finances-page')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('tab', { name: /balances/i }));
      await waitFor(() => {
        expect(screen.getByText(/\+\$150\.00/)).toBeInTheDocument();
      });
    });

    it('should show positive and negative balance indicators', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('finances-page')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('tab', { name: /balances/i }));
      await waitFor(() => {
        const positiveBalance = screen.getByTestId('balance-att1');
        const negativeBalance = screen.getByTestId('balance-att2');
        expect(positiveBalance).toHaveClass('balance-positive');
        expect(negativeBalance).toHaveClass('balance-negative');
      });
    });
  });

  describe('settlements section', () => {
    it('should render settlements list', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('finances-page')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('tab', { name: /settle up/i }));
      await waitFor(() => {
        expect(screen.getByTestId('settlements-section')).toBeInTheDocument();
      });
    });

    it('should display settlement recommendations', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('finances-page')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('tab', { name: /settle up/i }));
      await waitFor(() => {
        expect(screen.getByText(/Jane Smith.*owes.*John Doe/i)).toBeInTheDocument();
      });
    });

    it('should display settlement amounts', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('finances-page')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('tab', { name: /settle up/i }));
      await waitFor(() => {
        expect(screen.getAllByText('$75.00').length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should render pay button for each settlement', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('finances-page')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('tab', { name: /settle up/i }));
      await waitFor(() => {
        const payButtons = screen.getAllByRole('button', { name: /pay/i });
        expect(payButtons.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('add expense', () => {
    it('should render add expense button', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
      });
    });

    it('should navigate to add expense page on click', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /add expense/i }));
      expect(mockPush).toHaveBeenCalledWith('/trips/trip123/expenses/new');
    });
  });

  describe('tabs navigation', () => {
    it('should render tabs for different views', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /expenses/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /balances/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /settle up/i })).toBeInTheDocument();
      });
    });

    it('should switch between tabs', async () => {
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByTestId('expenses-section')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('tab', { name: /balances/i }));

      await waitFor(() => {
        expect(screen.getByTestId('balances-section')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error state on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<FinancesPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });
});
