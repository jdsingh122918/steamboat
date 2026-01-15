'use client';

import React, { useState, useCallback } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils/format';

type DisputeStatus = 'open' | 'resolved' | 'rejected';
type DisputeType = 'incorrect_amount' | 'not_participated' | 'other';

const DISPUTE_TYPE_LABELS: Record<DisputeType, string> = {
  incorrect_amount: 'Incorrect Amount',
  not_participated: 'Not Participated',
  other: 'Other',
};

interface Dispute {
  id: string;
  expenseId: string;
  expenseDescription: string;
  expenseAmount: number; // in cents
  filedBy: {
    id: string;
    name: string;
  };
  reason: string;
  disputeType: DisputeType;
  status: DisputeStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolutionNote?: string;
}

interface DisputeCardProps {
  dispute: Dispute;
  isAdmin: boolean;
  onResolve: (disputeId: string, status: 'resolved' | 'rejected') => Promise<void>;
  className?: string;
}

export function DisputeCard({
  dispute,
  isAdmin,
  onResolve,
  className = '',
}: DisputeCardProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = useCallback(
    async (status: 'resolved' | 'rejected') => {
      if (isResolving) return;

      setIsResolving(true);
      setError(null);

      try {
        await onResolve(dispute.id, status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resolve dispute');
      } finally {
        setIsResolving(false);
      }
    },
    [dispute.id, isResolving, onResolve]
  );

  const isOpen = dispute.status === 'open';
  const showAdminActions = isAdmin && isOpen;

  return (
    <div
      className={`dispute-card ${className}`}
      data-testid="dispute-card"
    >
      <div className="dispute-card-header">
        <div className="dispute-expense-info">
          <h4 className="dispute-expense-description">{dispute.expenseDescription}</h4>
          <span className="dispute-expense-amount">{formatCurrency(dispute.expenseAmount, { isCents: true })}</span>
        </div>
        <span className={`dispute-status-badge status-${dispute.status}`}>
          {dispute.status}
        </span>
      </div>

      <div className="dispute-card-body">
        <div className="dispute-meta">
          <span className="dispute-filed-by">
            Filed by: <strong>{dispute.filedBy.name}</strong>
          </span>
          <span className="dispute-type-badge">
            {DISPUTE_TYPE_LABELS[dispute.disputeType]}
          </span>
        </div>

        <p className="dispute-reason">{dispute.reason}</p>

        <div className="dispute-dates">
          <span className="dispute-created">
            Filed: {formatDate(dispute.createdAt)}
          </span>
          {dispute.resolvedAt && (
            <span className="dispute-resolved">
              Resolved: {formatDate(dispute.resolvedAt)}
            </span>
          )}
        </div>

        {dispute.resolutionNote && (
          <div className="dispute-resolution-note">
            <strong>Resolution Note:</strong>
            <p>{dispute.resolutionNote}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="dispute-error" role="alert">
          {error}
        </div>
      )}

      {showAdminActions && (
        <div className="dispute-card-actions">
          {isResolving ? (
            <span className="resolving-indicator">Resolving...</span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleResolve('resolved')}
                disabled={isResolving}
                className="action-button accept-button"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => handleResolve('rejected')}
                disabled={isResolving}
                className="action-button reject-button"
              >
                Reject
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export type { DisputeCardProps, Dispute, DisputeStatus, DisputeType };
