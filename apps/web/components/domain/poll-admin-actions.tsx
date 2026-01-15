'use client';

import React, { useState, useCallback } from 'react';

type PollStatus = 'open' | 'closed';

interface PollAdminActionsProps {
  pollId: string;
  status: PollStatus;
  isAdmin: boolean;
  onClose: (pollId: string) => Promise<void>;
  onDelete: (pollId: string) => Promise<void>;
  className?: string;
}

export function PollAdminActions({
  pollId,
  status,
  isAdmin,
  onClose,
  onDelete,
  className = '',
}: PollAdminActionsProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(async () => {
    if (isClosing) return;

    setIsClosing(true);
    setError(null);

    try {
      await onClose(pollId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close poll');
    } finally {
      setIsClosing(false);
    }
  }, [isClosing, onClose, pollId]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    setShowDeleteConfirm(false);
    setError(null);

    try {
      await onDelete(pollId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete poll');
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, onDelete, pollId]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  if (!isAdmin) {
    return null;
  }

  const isOpen = status === 'open';

  return (
    <div className={`poll-admin-actions ${className}`} data-testid="poll-admin-actions">
      <div className="admin-buttons">
        {isOpen && (
          <button
            type="button"
            onClick={handleClose}
            disabled={isClosing}
            className="admin-button close-button"
          >
            {isClosing ? 'Closing...' : 'Close Poll'}
          </button>
        )}

        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="admin-button delete-button"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm-dialog" role="dialog">
          <p className="dialog-message">
            Are you sure you want to delete this poll? This action cannot be undone.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="dialog-button confirm"
            >
              Yes, Delete
            </button>
            <button
              type="button"
              onClick={handleDeleteCancel}
              className="dialog-button cancel"
            >
              No
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="admin-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export type { PollAdminActionsProps, PollStatus };
