'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Spinner, Card, CardHeader, CardTitle, CardContent, Input, Select } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { PageHeader } from '@/components/navigation';
import { ExpenseCard, SettleUpModal } from '@/components/domain';
import type { Settlement as SettlementType, PaymentData } from '@/components/domain/settle-up-modal';
import type { PaymentHandles } from '@/lib/db/models/attendee';
import { useTripRealtime } from '@/hooks';
import { formatCurrency } from '@/lib/utils/format';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidBy: { id: string; name: string };
  splitAmong: string[];
  date: string;
  status: 'pending' | 'settled' | 'disputed';
}

interface Balance {
  attendeeId: string;
  attendeeName: string;
  balance: number;
}

interface BalanceData {
  balances: Balance[];
  summary: {
    totalExpenses: number;
    expenseCount: number;
  };
}

interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount_cents: number;
}

interface Attendee {
  _id: string;
  name: string;
  email: string;
  paymentHandles?: Partial<PaymentHandles>;
}

interface ExpenseData {
  expenses: Expense[];
}

interface SettlementData {
  settlements: Settlement[];
  original_count: number;
  optimized_count: number;
  savings_percent: number;
}

const EXPENSE_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'lodging', label: 'Lodging' },
  { value: 'transport', label: 'Transport' },
  { value: 'dining', label: 'Dining' },
  { value: 'activities', label: 'Activities' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'other', label: 'Other' },
];

export default function FinancesPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [expenses, setExpenses] = useState<ExpenseData | null>(null);
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [settlements, setSettlements] = useState<SettlementData | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('expenses');

  // Settle up modal state
  const [settleUpModalOpen, setSettleUpModalOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Real-time event handlers for refreshing data
  const refetchFinanceData = useCallback(async () => {
    try {
      const [balancesRes, settlementsRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/balances`),
        fetch(`/api/trips/${tripId}/balances/settlements`),
      ]);

      if (balancesRes.ok) {
        const balancesData = await balancesRes.json();
        setBalances(balancesData.data);
      }

      if (settlementsRes.ok) {
        const settlementsData = await settlementsRes.json();
        setSettlements(settlementsData.data);
      }
    } catch (err) {
      console.error('Failed to refresh finance data:', err);
    }
  }, [tripId]);

  const refetchExpenses = useCallback(async () => {
    try {
      const expensesRes = await fetch(`/api/trips/${tripId}/expenses`);
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData.data);
      }
    } catch (err) {
      console.error('Failed to refresh expenses:', err);
    }
  }, [tripId]);

  // Subscribe to real-time updates
  useTripRealtime(tripId, {
    onExpenseCreated: () => {
      refetchExpenses();
      refetchFinanceData();
    },
    onExpenseUpdated: () => {
      refetchExpenses();
      refetchFinanceData();
    },
    onExpenseDeleted: () => {
      refetchExpenses();
      refetchFinanceData();
    },
    onPaymentReceived: () => {
      refetchFinanceData();
    },
    onSettlementUpdated: () => {
      refetchFinanceData();
    },
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [expensesRes, balancesRes, settlementsRes, attendeesRes] = await Promise.all([
          fetch(`/api/trips/${tripId}/expenses`),
          fetch(`/api/trips/${tripId}/balances`),
          fetch(`/api/trips/${tripId}/balances/settlements`),
          fetch(`/api/trips/${tripId}/attendees`),
        ]);

        if (!expensesRes.ok) {
          throw new Error('Failed to load expenses');
        }

        const expensesData = await expensesRes.json();
        setExpenses(expensesData.data);

        if (balancesRes.ok) {
          const balancesData = await balancesRes.json();
          setBalances(balancesData.data);
        }

        if (settlementsRes.ok) {
          const settlementsData = await settlementsRes.json();
          setSettlements(settlementsData.data);
        }

        if (attendeesRes.ok) {
          const attendeesData = await attendeesRes.json();
          setAttendees(attendeesData.data || []);
        }
      } catch (err) {
        setError('Failed to load finances data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tripId]);

  const formatBalance = (amount: number): string => {
    if (amount > 0) return `+${formatCurrency(amount)}`;
    if (amount < 0) return formatCurrency(amount);
    return formatCurrency(0);
  };

  // Build a map of attendee IDs to attendees for easy lookup
  const attendeeMap = useMemo(() => {
    return new Map(attendees.map((a) => [a._id, a]));
  }, [attendees]);

  // Get payment handles for a given attendee ID
  const getPaymentHandles = useCallback(
    (attendeeId: string): Partial<PaymentHandles> => {
      const attendee = attendeeMap.get(attendeeId);
      return attendee?.paymentHandles || {};
    },
    [attendeeMap]
  );

  // Get current user's attendee ID (assumes first attendee for now, should be from auth context)
  const currentUserAttendeeId = useMemo(() => {
    // In a real app, this would come from auth context
    // For now, we'll use the first attendee as a placeholder
    return attendees[0]?._id || '';
  }, [attendees]);

  // Handle opening the settle up modal
  const handleSettleUpClick = useCallback((settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setSettleUpModalOpen(true);
  }, []);

  // Handle closing the settle up modal
  const handleSettleUpClose = useCallback(() => {
    setSettleUpModalOpen(false);
    setSelectedSettlement(null);
  }, []);

  // Handle payment completion
  const handlePaymentComplete = useCallback(
    async (payment: PaymentData) => {
      if (!selectedSettlement) return;

      const response = await fetch(`/api/trips/${tripId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromId: selectedSettlement.from,
          toId: selectedSettlement.to,
          amount_cents: payment.amount_cents,
          method: payment.method,
          note: payment.note,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record payment');
      }

      // Refresh settlements data
      const settlementsRes = await fetch(`/api/trips/${tripId}/balances/settlements`);
      if (settlementsRes.ok) {
        const settlementsData = await settlementsRes.json();
        setSettlements(settlementsData.data);
      }
    },
    [selectedSettlement, tripId]
  );

  // Convert Settlement to SettlementType for the modal
  const getSettlementForModal = useCallback(
    (settlement: Settlement): SettlementType => ({
      amount_cents: settlement.amount_cents,
      fromId: settlement.from,
      fromName: settlement.fromName,
      toId: settlement.to,
      toName: settlement.toName,
      toPaymentHandles: getPaymentHandles(settlement.to),
    }),
    [getPaymentHandles]
  );

  const filteredExpenses = useMemo(() => {
    if (!expenses?.expenses) return [];

    return expenses.expenses.filter((expense) => {
      const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || expense.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  if (loading) {
    return (
      <div className="finances-loading" data-testid="finances-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="finances-error" data-testid="finances-error">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="finances-page" data-testid="finances-page">
      <PageHeader
        title="Finances"
        subtitle="Track expenses and settle up"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/trips/${tripId}/expenses/new`)}
          >
            Add Expense
          </Button>
        }
      />

      <div className="finances-content">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="settlements">Settle Up</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <div className="finances-expenses" data-testid="expenses-section">
              {/* Filters */}
              <div className="finances-filters">
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="finances-search"
                />
                <Select
                  label="Category"
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={EXPENSE_CATEGORIES}
                />
              </div>

              {/* Expense List */}
              <div className="expenses-list">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      id={expense.id}
                      title={expense.description}
                      amount={expense.amount}
                      category={expense.category as 'food' | 'transport' | 'accommodation' | 'entertainment' | 'shopping' | 'other'}
                      paidBy={expense.paidBy.name}
                      participantCount={expense.splitAmong.length}
                      date={new Date(expense.date)}
                      settled={expense.status === 'settled'}
                      disputed={expense.status === 'disputed'}
                      onClick={() => router.push(`/trips/${tripId}/expenses/${expense.id}`)}
                    />
                  ))
                ) : (
                  <p className="no-expenses">No expenses found</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="balances">
            <div className="finances-balances" data-testid="balances-section">
              {/* Summary Card */}
              <Card className="balances-summary-card">
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="balances-summary">
                    <div className="balance-stat">
                      <span className="balance-stat-value">
                        {balances ? formatCurrency(balances.summary.totalExpenses) : '$0.00'}
                      </span>
                      <span className="balance-stat-label">Total Expenses</span>
                    </div>
                    <div className="balance-stat">
                      <span className="balance-stat-value">
                        {balances?.summary.expenseCount || 0}
                      </span>
                      <span className="balance-stat-label">Expenses</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Balances */}
              <Card className="balances-list-card">
                <CardHeader>
                  <CardTitle>Individual Balances</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="balances-list">
                    {balances?.balances.map((balance) => (
                      <div
                        key={balance.attendeeId}
                        className={`balance-item ${balance.balance >= 0 ? 'balance-positive' : 'balance-negative'}`}
                        data-testid={`balance-${balance.attendeeId}`}
                      >
                        <span className="balance-name">{balance.attendeeName}</span>
                        <span className="balance-amount">{formatBalance(balance.balance)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settlements">
            <div className="finances-settlements" data-testid="settlements-section">
              <Card>
                <CardHeader>
                  <CardTitle>Settle Up</CardTitle>
                </CardHeader>
                <CardContent>
                  {settlements?.settlements && settlements.settlements.length > 0 ? (
                    <>
                      {settlements.savings_percent > 0 && (
                        <div className="settlements-optimization-notice" data-testid="optimization-notice">
                          <span>
                            Optimized from {settlements.original_count} to {settlements.optimized_count} transactions
                            ({settlements.savings_percent.toFixed(0)}% fewer)
                          </span>
                        </div>
                      )}
                      <div className="settlements-list">
                        {settlements.settlements.map((settlement, index) => (
                          <div key={`${settlement.from}-${settlement.to}-${index}`} className="settlement-item">
                            <div className="settlement-info">
                              <span className="settlement-description">
                                {settlement.fromName} owes {settlement.toName}
                              </span>
                              <span className="settlement-amount">
                                {formatCurrency(settlement.amount_cents / 100)}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSettleUpClick(settlement)}
                              data-testid={`pay-button-${index}`}
                            >
                              Pay
                            </Button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="no-settlements">Everyone is settled up!</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Settle Up Modal */}
      {selectedSettlement && (
        <SettleUpModal
          isOpen={settleUpModalOpen}
          onClose={handleSettleUpClose}
          onPaymentComplete={handlePaymentComplete}
          settlement={getSettlementForModal(selectedSettlement)}
          tripId={tripId}
        />
      )}
    </div>
  );
}
