'use client';

import React, { useState, useCallback } from 'react';

const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'activities', label: 'Activities' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'other', label: 'Other' },
] as const;

type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]['value'];

interface Participant {
  attendeeId: string;
  optedIn: boolean;
  share_cents?: number;
}

interface Expense {
  id: string;
  description: string;
  amount_cents: number;
  category: ExpenseCategory;
  payerId: string;
  participants: Participant[];
  status: 'pending' | 'settled';
  receiptUrl?: string;
}

interface Attendee {
  id: string;
  name: string;
}

interface ExpenseUpdateData {
  description: string;
  amount_cents: number;
  category: ExpenseCategory;
  payerId: string;
  participants: Participant[];
}

interface ExpenseEditFormProps {
  expense: Expense;
  attendees: Attendee[];
  currentUserId: string;
  onSave: (data: ExpenseUpdateData) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

export function ExpenseEditForm({
  expense,
  attendees,
  currentUserId,
  onSave,
  onCancel,
  className = '',
}: ExpenseEditFormProps) {
  const [description, setDescription] = useState(expense.description);
  const [amountStr, setAmountStr] = useState((expense.amount_cents / 100).toFixed(2));
  const [category, setCategory] = useState<ExpenseCategory>(expense.category);
  const [payerId, setPayerId] = useState(expense.payerId);
  const [participants, setParticipants] = useState<Map<string, boolean>>(
    new Map(expense.participants.map((p) => [p.attendeeId, p.optedIn]))
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isCreator = currentUserId === expense.payerId;
  const isSettled = expense.status === 'settled';
  const canEdit = isCreator && !isSettled;

  const toggleParticipant = useCallback((attendeeId: string) => {
    setParticipants((prev) => {
      const newMap = new Map(prev);
      newMap.set(attendeeId, !newMap.get(attendeeId));
      return newMap;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: string[] = [];

    if (!description.trim()) {
      newErrors.push('Description is required');
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      newErrors.push('Invalid amount format');
    } else if (amount <= 0) {
      newErrors.push('Amount must be greater than zero');
    }

    const selectedParticipants = Array.from(participants.entries()).filter(
      ([, optedIn]) => optedIn
    );
    if (selectedParticipants.length === 0) {
      newErrors.push('At least one participant is required');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [description, amountStr, participants]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate() || isSaving || !canEdit) return;

      setIsSaving(true);
      setErrors([]);

      try {
        const amount = parseFloat(amountStr);
        const amountCents = Math.round(amount * 100);

        const participantsList: Participant[] = Array.from(participants.entries()).map(
          ([attendeeId, optedIn]) => ({
            attendeeId,
            optedIn,
          })
        );

        await onSave({
          description: description.trim(),
          amount_cents: amountCents,
          category,
          payerId,
          participants: participantsList,
        });
      } catch (error) {
        setErrors([error instanceof Error ? error.message : 'Failed to save expense']);
      } finally {
        setIsSaving(false);
      }
    },
    [description, amountStr, category, payerId, participants, validate, isSaving, canEdit, onSave]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={`expense-edit-form ${className}`}
      data-testid="expense-edit-form"
    >
      {!isCreator && !isSettled && (
        <div className="expense-edit-warning" role="alert">
          Only the expense creator can edit this expense.
        </div>
      )}

      {isSettled && (
        <div className="expense-edit-warning" role="alert">
          Settled expenses cannot be edited.
        </div>
      )}

      <div className="form-field">
        <label htmlFor="description" className="form-label">
          Description
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canEdit}
          className="form-input"
        />
      </div>

      <div className="form-field">
        <label htmlFor="amount" className="form-label">
          Amount ($)
        </label>
        <input
          id="amount"
          type="text"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          disabled={!canEdit}
          className="form-input"
        />
      </div>

      <div className="form-field">
        <label htmlFor="category" className="form-label">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          disabled={!canEdit}
          className="form-select"
        >
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="payer" className="form-label">
          Paid By
        </label>
        <select
          id="payer"
          value={payerId}
          onChange={(e) => setPayerId(e.target.value)}
          disabled={!canEdit}
          className="form-select"
        >
          {attendees.map((attendee) => (
            <option key={attendee.id} value={attendee.id}>
              {attendee.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="form-field">
        <legend className="form-label">Participants</legend>
        <div className="participants-list">
          {attendees.map((attendee) => (
            <label key={attendee.id} className="participant-checkbox">
              <input
                type="checkbox"
                checked={participants.get(attendee.id) ?? false}
                onChange={() => toggleParticipant(attendee.id)}
                disabled={!canEdit}
              />
              <span>{attendee.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {errors.length > 0 && (
        <div className="form-errors" role="alert">
          {errors.map((error, index) => (
            <p key={index} className="form-error">
              {error}
            </p>
          ))}
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="cancel-button"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canEdit || isSaving}
          className="save-button"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

export type { ExpenseEditFormProps, Expense, Attendee, ExpenseUpdateData };
