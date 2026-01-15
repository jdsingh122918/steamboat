'use client';

import React, { useState, useCallback } from 'react';

const DISPUTE_TYPES = [
  { value: 'incorrect_amount', label: 'Incorrect Amount' },
  { value: 'not_participated', label: 'Not Participated' },
  { value: 'other', label: 'Other' },
] as const;

type DisputeType = (typeof DISPUTE_TYPES)[number]['value'];

interface DisputeData {
  expenseId: string;
  reason: string;
  disputeType: DisputeType;
}

interface DisputeFormProps {
  expenseId: string;
  expenseDescription: string;
  expenseAmount: number; // in cents
  onSubmit: (data: DisputeData) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

const MIN_REASON_LENGTH = 20;
const MAX_REASON_LENGTH = 500;

export function DisputeForm({
  expenseId,
  expenseDescription,
  expenseAmount,
  onSubmit,
  onCancel,
  className = '',
}: DisputeFormProps) {
  const [reason, setReason] = useState('');
  const [disputeType, setDisputeType] = useState<DisputeType>('other');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatAmount = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const validate = useCallback((): boolean => {
    const newErrors: string[] = [];

    if (!reason.trim()) {
      newErrors.push('Reason is required');
    } else if (reason.trim().length < MIN_REASON_LENGTH) {
      newErrors.push(`Reason must be at least ${MIN_REASON_LENGTH} characters`);
    } else if (reason.length > MAX_REASON_LENGTH) {
      newErrors.push(`Reason must not exceed ${MAX_REASON_LENGTH} characters`);
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [reason]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate() || isSubmitting) return;

      setIsSubmitting(true);
      setErrors([]);

      try {
        await onSubmit({
          expenseId,
          reason: reason.trim(),
          disputeType,
        });
      } catch (error) {
        setErrors([error instanceof Error ? error.message : 'Failed to submit dispute']);
      } finally {
        setIsSubmitting(false);
      }
    },
    [expenseId, reason, disputeType, validate, isSubmitting, onSubmit]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={`dispute-form ${className}`}
      data-testid="dispute-form"
    >
      <div className="dispute-form-header">
        <h3 className="dispute-form-title">File a Dispute</h3>
        <div className="dispute-expense-info">
          <p className="expense-description">{expenseDescription}</p>
          <p className="expense-amount">{formatAmount(expenseAmount)}</p>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="disputeType" className="form-label">
          Type of Dispute
        </label>
        <select
          id="disputeType"
          value={disputeType}
          onChange={(e) => setDisputeType(e.target.value as DisputeType)}
          disabled={isSubmitting}
          className="form-select"
        >
          {DISPUTE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="reason" className="form-label">
          Reason for Dispute
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please explain why you are disputing this expense..."
          disabled={isSubmitting}
          className="form-textarea"
          rows={4}
        />
        <div className="char-count">
          {reason.length} / {MAX_REASON_LENGTH}
        </div>
      </div>

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
          disabled={isSubmitting}
          className="cancel-button"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="submit-button"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
        </button>
      </div>
    </form>
  );
}

export type { DisputeFormProps, DisputeData, DisputeType };
