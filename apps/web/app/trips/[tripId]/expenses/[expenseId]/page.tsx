'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Spinner, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { PageHeader } from '@/components/navigation';
import { DisputeForm, DisputeCard } from '@/components/domain';
import type { DisputeData } from '@/components/domain/dispute-form';
import type { Dispute } from '@/components/domain/dispute-card';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface Participant {
  attendeeId: string;
  attendeeName?: string;
  optedIn: boolean;
  share_cents?: number;
}

interface ExpenseDispute {
  filedBy: string;
  filedByName?: string;
  reason: string;
  filedAt: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolution?: string;
  resolvedAt?: string;
}

interface Expense {
  _id: string;
  tripId: string;
  payerId: string;
  payerName?: string;
  amount_cents: number;
  currency: string;
  category: string;
  description: string;
  receiptUrl?: string;
  participants: Participant[];
  status: 'pending' | 'settled';
  dispute?: ExpenseDispute;
  createdAt: string;
  updatedAt: string;
}

interface Attendee {
  _id: string;
  name: string;
  role: 'admin' | 'member';
}

interface CurrentUser {
  id: string;
  name: string;
  role: 'organizer' | 'attendee';
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  transport: 'Transport',
  accommodation: 'Accommodation',
  activities: 'Activities',
  drinks: 'Drinks',
  other: 'Other',
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const expenseId = params.expenseId as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  const fetchExpenseData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [expenseRes, attendeesRes, meRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/expenses/${expenseId}`),
        fetch(`/api/trips/${tripId}/attendees`),
        fetch(`/api/trips/${tripId}/me`),
      ]);

      if (!expenseRes.ok) {
        if (expenseRes.status === 404) {
          throw new Error('Expense not found');
        }
        throw new Error('Failed to load expense');
      }

      const expenseData = await expenseRes.json();
      const expenseWithNames = expenseData.data;

      // Fetch attendees to get names
      let attendeeMap = new Map<string, Attendee>();
      if (attendeesRes.ok) {
        const attendeesData = await attendeesRes.json();
        const attendeesList = attendeesData.data?.attendees || attendeesData.data || [];
        setAttendees(attendeesList);
        attendeeMap = new Map(attendeesList.map((a: Attendee) => [a._id, a]));

        // Enrich expense with names
        const payer = attendeeMap.get(expenseWithNames.payerId);
        expenseWithNames.payerName = payer?.name || 'Unknown';

        expenseWithNames.participants = expenseWithNames.participants.map((p: Participant) => ({
          ...p,
          attendeeName: attendeeMap.get(p.attendeeId)?.name || 'Unknown',
        }));

        if (expenseWithNames.dispute) {
          const filer = attendeeMap.get(expenseWithNames.dispute.filedBy);
          expenseWithNames.dispute.filedByName = filer?.name || 'Unknown';

          if (expenseWithNames.dispute.resolvedBy) {
            const resolver = attendeeMap.get(expenseWithNames.dispute.resolvedBy);
            expenseWithNames.dispute.resolvedByName = resolver?.name || 'Unknown';
          }
        }
      }

      setExpense(expenseWithNames);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expense data');
    } finally {
      setLoading(false);
    }
  }, [tripId, expenseId]);

  useEffect(() => {
    fetchExpenseData();
  }, [fetchExpenseData]);

  const isAdmin = currentUser?.role === 'organizer';
  const isParticipant = expense?.participants.some(
    (p) => p.attendeeId === currentUser?.id && p.optedIn
  );
  const hasDispute = Boolean(expense?.dispute);
  const canFileDispute = isParticipant && !hasDispute && expense?.status !== 'settled';

  const handleDisputeSubmit = async (data: DisputeData) => {
    const response = await fetch(`/api/trips/${tripId}/expenses/${expenseId}/dispute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: data.reason,
        disputeType: data.disputeType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to file dispute');
    }

    setShowDisputeForm(false);
    await fetchExpenseData();
  };

  const handleDisputeResolve = async (disputeId: string, status: 'resolved' | 'rejected') => {
    const response = await fetch(`/api/trips/${tripId}/expenses/${expenseId}/dispute`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resolution: status === 'resolved' ? 'Dispute accepted' : 'Dispute rejected',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to resolve dispute');
    }

    await fetchExpenseData();
  };

  const getDisputeStatus = (): 'open' | 'resolved' | 'rejected' => {
    if (!expense?.dispute?.resolvedAt) return 'open';
    if (expense.dispute.resolution?.toLowerCase().includes('reject')) return 'rejected';
    return 'resolved';
  };

  const transformToDisputeCardFormat = (): Dispute | null => {
    if (!expense?.dispute) return null;

    return {
      id: `${expense._id}-dispute`,
      expenseId: expense._id,
      expenseDescription: expense.description,
      expenseAmount: expense.amount_cents,
      filedBy: {
        id: expense.dispute.filedBy,
        name: expense.dispute.filedByName || 'Unknown',
      },
      reason: expense.dispute.reason,
      disputeType: 'other',
      status: getDisputeStatus(),
      createdAt: new Date(expense.dispute.filedAt),
      resolvedAt: expense.dispute.resolvedAt ? new Date(expense.dispute.resolvedAt) : undefined,
      resolutionNote: expense.dispute.resolution,
    };
  };

  if (loading) {
    return (
      <div className="expense-detail-loading" data-testid="expense-detail-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="expense-detail-error" data-testid="expense-detail-error">
        <p>{error}</p>
        <Button onClick={() => router.push(`/trips/${tripId}/finances`)}>Back to Finances</Button>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="expense-detail-not-found" data-testid="expense-detail-not-found">
        <p>Expense not found</p>
        <Button onClick={() => router.push(`/trips/${tripId}/finances`)}>Back to Finances</Button>
      </div>
    );
  }

  return (
    <div className="expense-detail-page" data-testid="expense-detail-page">
      <PageHeader
        title={expense.description}
        subtitle={formatCurrency(expense.amount_cents, { isCents: true })}
        showBack
        onBack={() => router.push(`/trips/${tripId}/finances`)}
        actions={
          canFileDispute && !showDisputeForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisputeForm(true)}
              data-testid="file-dispute-button"
            >
              File Dispute
            </Button>
          )
        }
      />

      <div className="expense-detail-content">
        {/* Expense Details Card */}
        <Card className="expense-details-card" data-testid="expense-details-card">
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="expense-details-grid">
              <div className="expense-detail-item">
                <span className="expense-detail-label">Amount</span>
                <span className="expense-detail-value" data-testid="expense-amount">
                  {formatCurrency(expense.amount_cents, { isCents: true })}
                </span>
              </div>

              <div className="expense-detail-item">
                <span className="expense-detail-label">Category</span>
                <span className="expense-detail-value" data-testid="expense-category">
                  {CATEGORY_LABELS[expense.category] || expense.category}
                </span>
              </div>

              <div className="expense-detail-item">
                <span className="expense-detail-label">Paid By</span>
                <span className="expense-detail-value" data-testid="expense-payer">
                  {expense.payerName}
                </span>
              </div>

              <div className="expense-detail-item">
                <span className="expense-detail-label">Date</span>
                <span className="expense-detail-value" data-testid="expense-date">
                  {formatDate(expense.createdAt)}
                </span>
              </div>

              <div className="expense-detail-item">
                <span className="expense-detail-label">Status</span>
                <span data-testid="expense-status">
                  <Badge
                    variant={expense.status === 'settled' ? 'success' : hasDispute ? 'warning' : 'default'}
                  >
                    {expense.status === 'settled' ? 'Settled' : hasDispute ? 'Disputed' : 'Pending'}
                  </Badge>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Image */}
        {expense.receiptUrl && (
          <Card className="expense-receipt-card" data-testid="expense-receipt-card">
            <CardHeader>
              <CardTitle>Receipt</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={expense.receiptUrl}
                alt="Receipt"
                className="expense-receipt-image"
                data-testid="expense-receipt-image"
              />
            </CardContent>
          </Card>
        )}

        {/* Participants List */}
        <Card className="expense-participants-card" data-testid="expense-participants-card">
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="expense-participants-list">
              {expense.participants
                .filter((p) => p.optedIn)
                .map((participant) => (
                  <div
                    key={participant.attendeeId}
                    className="expense-participant-item"
                    data-testid={`participant-${participant.attendeeId}`}
                  >
                    <span className="participant-name">{participant.attendeeName}</span>
                    <span className="participant-share">
                      {participant.share_cents
                        ? formatCurrency(participant.share_cents, { isCents: true })
                        : formatCurrency(
                            expense.amount_cents /
                              expense.participants.filter((p) => p.optedIn).length,
                            { isCents: true }
                          )}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Dispute Section */}
        {showDisputeForm && (
          <Card className="expense-dispute-form-card" data-testid="dispute-form-card">
            <CardContent>
              <DisputeForm
                expenseId={expense._id}
                expenseDescription={expense.description}
                expenseAmount={expense.amount_cents}
                onSubmit={handleDisputeSubmit}
                onCancel={() => setShowDisputeForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {hasDispute && !showDisputeForm && (
          <Card className="expense-dispute-card" data-testid="expense-dispute-section">
            <CardHeader>
              <CardTitle>Dispute</CardTitle>
            </CardHeader>
            <CardContent>
              <DisputeCard
                dispute={transformToDisputeCardFormat()!}
                isAdmin={isAdmin}
                onResolve={handleDisputeResolve}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
