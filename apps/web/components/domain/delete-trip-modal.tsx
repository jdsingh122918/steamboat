'use client';

import React, { useState, useCallback } from 'react';

interface DeleteTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripName: string;
  tripId: string;
  onDeleted: () => void;
}

type ConfirmationStep = 'warning' | 'confirm-name';

export function DeleteTripModal({
  isOpen,
  onClose,
  tripName,
  tripId,
  onDeleted,
}: DeleteTripModalProps) {
  const [step, setStep] = useState<ConfirmationStep>('warning');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmationName, setConfirmationName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep('warning');
    setIsConfirmed(false);
    setConfirmationName('');
    setIsDeleting(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (isDeleting) return;
    resetState();
    onClose();
  }, [isDeleting, onClose, resetState]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleConfirmChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIsConfirmed(e.target.checked);
    setError(null);
  }, []);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmationName(e.target.value);
    setError(null);
  }, []);

  const handleProceedToConfirmName = useCallback(() => {
    if (!isConfirmed) return;
    setStep('confirm-name');
  }, [isConfirmed]);

  const handleDelete = useCallback(async () => {
    if (confirmationName !== tripName || isDeleting) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete trip');
      }

      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip');
      setIsDeleting(false);
    }
  }, [confirmationName, tripName, tripId, isDeleting, onDeleted]);

  const canProceed = isConfirmed && !isDeleting;
  const canDelete = confirmationName === tripName && !isDeleting;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      data-testid="modal-overlay"
      onClick={handleOverlayClick}
    >
      <div
        className="delete-trip-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            Delete Trip
          </h2>
        </div>

        <div className="modal-content">
          {step === 'warning' && (
            <>
              <div className="warning-box warning-box-destructive">
                <p className="warning-text">
                  You are about to delete <strong>{tripName}</strong>. This will
                  permanently remove all associated data including:
                </p>
                <ul className="warning-list">
                  <li>All expenses and financial records</li>
                  <li>All activities and RSVPs</li>
                  <li>All photos and media</li>
                  <li>All polls and votes</li>
                  <li>All attendee data</li>
                </ul>
              </div>

              <div className="confirmation-section">
                <label className="confirmation-label">
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={handleConfirmChange}
                    disabled={isDeleting}
                    data-testid="confirm-checkbox"
                  />
                  <span>I understand this action is irreversible</span>
                </label>
              </div>
            </>
          )}

          {step === 'confirm-name' && (
            <>
              <p className="modal-description">
                To confirm deletion, please type the trip name:{' '}
                <strong>{tripName}</strong>
              </p>
              <div className="confirmation-input-section">
                <input
                  type="text"
                  value={confirmationName}
                  onChange={handleNameChange}
                  placeholder="Type trip name to confirm"
                  className="confirmation-input"
                  disabled={isDeleting}
                  data-testid="confirm-name-input"
                  autoFocus
                />
              </div>
            </>
          )}

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="cancel-button"
          >
            Cancel
          </button>

          {step === 'warning' && (
            <button
              type="button"
              onClick={handleProceedToConfirmName}
              disabled={!canProceed}
              className="proceed-button"
              data-testid="proceed-button"
            >
              Continue
            </button>
          )}

          {step === 'confirm-name' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={!canDelete}
              className="delete-button"
              data-testid="delete-button"
            >
              {isDeleting ? 'Deleting...' : 'Delete Trip'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export type { DeleteTripModalProps };
