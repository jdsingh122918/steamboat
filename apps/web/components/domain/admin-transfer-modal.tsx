'use client';

import React, { useState, useCallback } from 'react';

interface Attendee {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

interface AdminTransferModalProps {
  isOpen: boolean;
  tripName: string;
  currentAdminId: string;
  attendees: Attendee[];
  onTransfer: (newAdminId: string) => Promise<void>;
  onClose: () => void;
}

export function AdminTransferModal({
  isOpen,
  tripName,
  currentAdminId,
  attendees,
  onTransfer,
  onClose,
}: AdminTransferModalProps) {
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleAttendees = attendees.filter(
    (attendee) => attendee.id !== currentAdminId
  );

  const handleAttendeeSelect = useCallback((attendeeId: string) => {
    setSelectedAttendeeId(attendeeId);
    setError(null);
  }, []);

  const handleConfirmChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIsConfirmed(e.target.checked);
  }, []);

  const handleTransfer = useCallback(async () => {
    if (!selectedAttendeeId || !isConfirmed || isTransferring) return;

    setIsTransferring(true);
    setError(null);

    try {
      await onTransfer(selectedAttendeeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  }, [selectedAttendeeId, isConfirmed, isTransferring, onTransfer]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const canTransfer =
    selectedAttendeeId !== null &&
    isConfirmed &&
    !isTransferring &&
    eligibleAttendees.length > 0;

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
        className="admin-transfer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            Transfer Admin
          </h2>
        </div>

        <div className="modal-content">
          <p className="modal-description">
            Transfer admin privileges for <strong>{tripName}</strong> to another
            attendee.
          </p>

          <div className="warning-box">
            <p className="warning-text">
              Warning: You will lose admin privileges after this transfer. This
              action cannot be undone.
            </p>
          </div>

          {eligibleAttendees.length === 0 ? (
            <p className="empty-state">No eligible attendees to transfer admin to.</p>
          ) : (
            <div className="attendee-list" data-testid="attendee-list">
              <h3 className="list-title">Select New Admin</h3>
              {eligibleAttendees.map((attendee) => (
                <button
                  key={attendee.id}
                  type="button"
                  className={`attendee-item ${
                    selectedAttendeeId === attendee.id ? 'selected' : ''
                  }`}
                  onClick={() => handleAttendeeSelect(attendee.id)}
                  disabled={isTransferring}
                >
                  <span className="attendee-name">{attendee.name}</span>
                  <span className="attendee-email">{attendee.email}</span>
                </button>
              ))}
            </div>
          )}

          <div className="confirmation-section">
            <label className="confirmation-label">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={handleConfirmChange}
                disabled={isTransferring}
              />
              <span>I understand this action cannot be undone</span>
            </label>
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={isTransferring}
            className="cancel-button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTransfer}
            disabled={!canTransfer}
            className="transfer-button"
          >
            {isTransferring ? 'Transferring...' : 'Transfer Admin'}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { AdminTransferModalProps, Attendee };
