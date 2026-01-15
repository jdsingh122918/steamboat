'use client';

import React, { useState, useCallback } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils/format';

type ItemType = 'expense' | 'media' | 'activity';

interface DeletedBy {
  id: string;
  name: string;
}

interface ItemMetadata {
  amount_cents?: number;
  thumbnailUrl?: string;
  scheduledAt?: string;
}

interface DeletedItem {
  id: string;
  type: ItemType;
  title: string;
  deletedAt: Date;
  deletedBy: DeletedBy;
  metadata?: ItemMetadata;
}

interface DeletedItemCardProps {
  item: DeletedItem;
  onRestore: (id: string, type: ItemType) => Promise<void>;
  onPermanentDelete: (id: string, type: ItemType) => Promise<void>;
  autoDeleteDays?: number;
  className?: string;
}

const TYPE_LABELS: Record<ItemType, string> = {
  expense: 'Expense',
  media: 'Media',
  activity: 'Activity',
};

export function DeletedItemCard({
  item,
  onRestore,
  onPermanentDelete,
  autoDeleteDays,
  className = '',
}: DeletedItemCardProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDaysRemaining = (): number | null => {
    if (!autoDeleteDays) return null;
    const deletedDate = new Date(item.deletedAt);
    const expiryDate = new Date(deletedDate);
    expiryDate.setDate(expiryDate.getDate() + autoDeleteDays);
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleRestore = useCallback(async () => {
    if (isRestoring) return;

    setIsRestoring(true);
    setError(null);

    try {
      await onRestore(item.id, item.type);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore');
    } finally {
      setIsRestoring(false);
    }
  }, [item.id, item.type, isRestoring, onRestore]);

  const handlePermanentDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handlePermanentDeleteConfirm = useCallback(async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    setShowDeleteConfirm(false);
    setError(null);

    try {
      await onPermanentDelete(item.id, item.type);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  }, [item.id, item.type, isDeleting, onPermanentDelete]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const daysRemaining = getDaysRemaining();
  const isProcessing = isRestoring || isDeleting;

  return (
    <div
      className={`deleted-item-card ${className}`}
      data-testid="deleted-item-card"
    >
      <div className="deleted-item-header">
        <span className={`item-type-badge type-${item.type}`}>
          {TYPE_LABELS[item.type]}
        </span>
        {daysRemaining !== null && (
          <span className="expiry-badge">
            Expires in {daysRemaining} days
          </span>
        )}
      </div>

      <div className="deleted-item-content">
        {item.type === 'media' && item.metadata?.thumbnailUrl && (
          <img
            src={item.metadata.thumbnailUrl}
            alt={item.title}
            className="item-thumbnail"
          />
        )}

        <div className="item-details">
          <h4 className="item-title">{item.title}</h4>

          {item.type === 'expense' && item.metadata?.amount_cents && (
            <span className="item-amount">
              {formatCurrency(item.metadata.amount_cents, { isCents: true })}
            </span>
          )}
        </div>
      </div>

      <div className="deleted-item-meta">
        <span className="deleted-date">
          Deleted: {formatDate(item.deletedAt)}
        </span>
        <span className="deleted-by">
          By: {item.deletedBy.name}
        </span>
      </div>

      {error && (
        <div className="item-error" role="alert">
          {error}
        </div>
      )}

      {showDeleteConfirm ? (
        <div className="delete-confirm">
          <p className="confirm-message">
            This action cannot be undone. Are you sure?
          </p>
          <div className="confirm-actions">
            <button
              type="button"
              onClick={handlePermanentDeleteConfirm}
              disabled={isDeleting}
              className="confirm-delete-button"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete Forever'}
            </button>
            <button
              type="button"
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="deleted-item-actions">
          <button
            type="button"
            onClick={handleRestore}
            disabled={isProcessing}
            className="restore-button"
          >
            {isRestoring ? 'Restoring...' : 'Restore'}
          </button>
          <button
            type="button"
            onClick={handlePermanentDeleteClick}
            disabled={isProcessing}
            className="permanent-delete-button"
          >
            Delete Permanently
          </button>
        </div>
      )}
    </div>
  );
}

export type { DeletedItemCardProps, DeletedItem, ItemType };
