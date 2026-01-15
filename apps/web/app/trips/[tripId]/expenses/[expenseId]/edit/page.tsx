'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ExpenseEditForm } from '@/components/domain/expense-edit-form';
import { Spinner } from '@/components/ui';
import { PageHeader } from '@/components/navigation';

interface Participant {
  attendeeId: string;
  optedIn: boolean;
  share_cents?: number;
}

interface Expense {
  _id: string;
  description: string;
  amount_cents: number;
  category: 'food' | 'transport' | 'accommodation' | 'activities' | 'drinks' | 'other';
  payerId: string;
  participants: Participant[];
  status: 'pending' | 'settled';
  receiptUrl?: string;
}

interface Attendee {
  _id: string;
  name: string;
  role: 'admin' | 'attendee';
}

interface ExpenseUpdateData {
  description: string;
  amount_cents: number;
  category: string;
  payerId: string;
  participants: Participant[];
}

export default function ExpenseEditPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const expenseId = params.expenseId as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [currentAttendee, setCurrentAttendee] = useState<Attendee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch expense, attendees, and current user in parallel
        const [expenseRes, attendeesRes, meRes] = await Promise.all([
          fetch(`/api/trips/${tripId}/expenses/${expenseId}`),
          fetch(`/api/trips/${tripId}/attendees`),
          fetch(`/api/trips/${tripId}/attendees/me`),
        ]);

        const expenseData = await expenseRes.json();
        const attendeesData = await attendeesRes.json();
        const meData = await meRes.json();

        if (!expenseRes.ok) {
          setError(expenseData.error || 'Failed to fetch expense');
          return;
        }

        if (!attendeesRes.ok) {
          setError(attendeesData.error || 'Failed to fetch attendees');
          return;
        }

        if (!meRes.ok) {
          setError(meData.error || 'Failed to fetch user');
          return;
        }

        setExpense(expenseData.data);
        setAttendees(attendeesData.data);
        setCurrentAttendee(meData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tripId, expenseId]);

  const handleSave = useCallback(
    async (data: ExpenseUpdateData) => {
      const response = await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update expense');
      }

      router.back();
    },
    [tripId, expenseId, router]
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  if (isLoading) {
    return (
      <div className="expense-edit-page">
        <Spinner data-testid="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="expense-edit-page">
        <PageHeader title="Edit Expense" showBack onBack={handleCancel} />
        <div className="expense-edit-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!expense || !currentAttendee) {
    return (
      <div className="expense-edit-page">
        <PageHeader title="Edit Expense" showBack onBack={handleCancel} />
        <div className="expense-edit-error" role="alert">
          Expense not found
        </div>
      </div>
    );
  }

  // Transform data for the form
  const formExpense = {
    id: expense._id,
    description: expense.description,
    amount_cents: expense.amount_cents,
    category: expense.category,
    payerId: expense.payerId,
    participants: expense.participants,
    status: expense.status,
    receiptUrl: expense.receiptUrl,
  };

  const formAttendees = attendees.map((a) => ({
    id: a._id,
    name: a.name,
  }));

  // Check if user can edit (creator or admin)
  const isCreator = currentAttendee._id === expense.payerId;
  const isAdmin = currentAttendee.role === 'admin';
  const canEdit = (isCreator || isAdmin) && expense.status !== 'settled';

  return (
    <div className="expense-edit-page">
      <PageHeader title="Edit Expense" showBack onBack={handleCancel} />

      {!canEdit && !isCreator && expense.status !== 'settled' && (
        <div className="expense-edit-warning" role="alert">
          Only the expense creator can edit this expense.
        </div>
      )}

      {expense.status === 'settled' && (
        <div className="expense-edit-warning" role="alert">
          Settled expenses cannot be edited.
        </div>
      )}

      <ExpenseEditForm
        expense={formExpense}
        attendees={formAttendees}
        currentUserId={currentAttendee._id}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}
