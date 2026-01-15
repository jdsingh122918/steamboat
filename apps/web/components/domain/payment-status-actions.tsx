'use client';

import React, { useState, useCallback } from 'react';
import type { PaymentStatus } from '@/lib/db/models/payment';

interface PaymentStatusActionsProps {
  paymentId: string;
  status: PaymentStatus;
  isReceiver: boolean;
  isSender: boolean;
  onConfirm: (paymentId: string) => Promise<void>;
  onCancel: (paymentId: string) => Promise<void>;
  className?: string;
}

export function PaymentStatusActions({
  paymentId,
  status,
  isReceiver,
  isSender,
  onConfirm,
  onCancel,
  className = '',
}: PaymentStatusActionsProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [actionStatus, setActionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    if (isConfirming) return;

    setIsConfirming(true);
    setActionStatus('idle');
    setErrorMessage(null);

    try {
      await onConfirm(paymentId);
      setActionStatus('success');
    } catch (error) {
      setActionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to confirm payment');
    } finally {
      setIsConfirming(false);
    }
  }, [isConfirming, onConfirm, paymentId]);

  const handleCancelClick = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  const handleCancelConfirm = useCallback(async () => {
    if (isCancelling) return;

    setIsCancelling(true);
    setShowCancelDialog(false);
    setActionStatus('idle');
    setErrorMessage(null);

    try {
      await onCancel(paymentId);
      setActionStatus('success');
    } catch (error) {
      setActionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to cancel payment');
    } finally {
      setIsCancelling(false);
    }
  }, [isCancelling, onCancel, paymentId]);

  const handleCancelDismiss = useCallback(() => {
    setShowCancelDialog(false);
  }, []);

  const getStatusLabel = (s: PaymentStatus): string => {
    switch (s) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return s;
    }
  };

  const canConfirm = status === 'pending' && isReceiver && !isConfirming;
  const canCancel = status === 'pending' && isSender && !isCancelling;
  const showActions = canConfirm || canCancel;

  return (
    <div className={`payment-status-actions ${className}`} data-testid="payment-status-actions">
      {/* Status Badge */}
      <span
        className={`payment-status-badge status-${status}`}
        data-testid="payment-status-badge"
      >
        {actionStatus === 'success' ? 'Confirmed' : getStatusLabel(status)}
      </span>

      {/* Actions */}
      {showActions && (
        <div className="payment-actions">
          {/* Confirm button for receiver */}
          {canConfirm && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirming}
              className="payment-action-button confirm-button"
            >
              {isConfirming ? 'Confirming...' : 'Mark as Received'}
            </button>
          )}

          {/* Cancel button for sender */}
          {canCancel && (
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={isCancelling}
              className="payment-action-button cancel-button"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Payment'}
            </button>
          )}
        </div>
      )}

      {/* Cancel confirmation dialog */}
      {showCancelDialog && (
        <div className="payment-cancel-dialog" role="dialog">
          <p className="dialog-message">Are you sure you want to cancel this payment?</p>
          <div className="dialog-actions">
            <button
              type="button"
              onClick={handleCancelConfirm}
              className="dialog-button confirm"
            >
              Yes, Cancel
            </button>
            <button
              type="button"
              onClick={handleCancelDismiss}
              className="dialog-button dismiss"
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {actionStatus === 'error' && errorMessage && (
        <div className="payment-error" role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

export type { PaymentStatusActionsProps };
