'use client';

import React, { forwardRef } from 'react';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

export type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'entertainment' | 'shopping' | 'other';

export interface ExpenseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  date: Date;
  category: ExpenseCategory;
  participantCount: number;
  settled?: boolean;
  disputed?: boolean;
  userShare?: number;
  onClick?: () => void;
}

export const ExpenseCard = forwardRef<HTMLDivElement, ExpenseCardProps>(
  function ExpenseCard(
    {
      id,
      title,
      amount,
      paidBy,
      date,
      category,
      participantCount,
      settled = false,
      disputed = false,
      userShare,
      onClick,
      className = '',
      ...props
    },
    ref
  ) {
    const classes = [
      'expense-card',
      settled ? 'expense-card-settled' : '',
      disputed ? 'expense-card-disputed' : '',
      onClick ? 'expense-card-clickable' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={classes}
        data-testid="expense-card"
        onClick={onClick}
        {...props}
      >
        <div className="expense-card-header">
          <div className="expense-card-title-section">
            <h3 className="expense-card-title">{title}</h3>
            <span className="expense-card-category">{category}</span>
          </div>
          <div className="expense-card-amount">{formatCurrency(amount)}</div>
        </div>

        <div className="expense-card-details">
          <span className="expense-card-payer">Paid by {paidBy}</span>
          <span className="expense-card-separator">•</span>
          <span className="expense-card-date">{formatDateShort(date)}</span>
          <span className="expense-card-separator">•</span>
          <span className="expense-card-participants">{participantCount} participants</span>
        </div>

        {(settled || disputed) && (
          <div className="expense-card-status">
            {settled && <span className="expense-card-badge expense-card-badge-settled">Settled</span>}
            {disputed && <span className="expense-card-badge expense-card-badge-disputed">Disputed</span>}
          </div>
        )}

        {userShare !== undefined && (
          <div className="expense-card-user-share">
            {userShare >= 0 ? (
              <span>Your share: {formatCurrency(userShare)}</span>
            ) : (
              <span>You are owed: {formatCurrency(Math.abs(userShare))}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);
