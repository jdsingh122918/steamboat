'use client';

import React, { forwardRef } from 'react';
import { formatCurrency, getInitials } from '@/lib/utils/format';

export type AttendeeRole = 'organizer' | 'attendee';

export interface PaymentHandles {
  venmo?: string;
  paypal?: string;
  cashapp?: string;
}

export interface AttendeeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  name: string;
  role: AttendeeRole;
  avatarUrl?: string;
  balance?: number;
  paymentHandles?: PaymentHandles;
  onClick?: () => void;
}

function getBalanceClass(amount: number): string {
  if (amount > 0) return 'balance-positive';
  if (amount < 0) return 'balance-negative';
  return 'balance-zero';
}

function formatBalance(amount: number): string {
  if (amount > 0) return `+${formatCurrency(amount)}`;
  if (amount < 0) return `-${formatCurrency(Math.abs(amount))}`;
  return formatCurrency(0);
}

export const AttendeeCard = forwardRef<HTMLDivElement, AttendeeCardProps>(
  function AttendeeCard(
    {
      id,
      name,
      role,
      avatarUrl,
      balance,
      paymentHandles,
      onClick,
      className = '',
      ...props
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={`attendee-card ${onClick ? 'attendee-card-clickable' : ''} ${className}`}
        data-testid="attendee-card"
        onClick={onClick}
        {...props}
      >
        <div className="attendee-card-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} />
          ) : (
            <span>{getInitials(name)}</span>
          )}
        </div>

        <div className="attendee-card-info">
          <div className="attendee-card-header">
            <h3 className="attendee-card-name">{name}</h3>
            <span className="attendee-card-role">{role}</span>
          </div>

          {balance !== undefined && (
            <div
              className={`attendee-card-balance ${getBalanceClass(balance)}`}
              data-testid="balance"
            >
              {formatBalance(balance)}
            </div>
          )}

          {paymentHandles && Object.keys(paymentHandles).length > 0 && (
            <div className="attendee-card-payment-handles">
              {paymentHandles.venmo && (
                <span className="payment-handle payment-handle-venmo">{paymentHandles.venmo}</span>
              )}
              {paymentHandles.paypal && (
                <span className="payment-handle payment-handle-paypal">{paymentHandles.paypal}</span>
              )}
              {paymentHandles.cashapp && (
                <span className="payment-handle payment-handle-cashapp">{paymentHandles.cashapp}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);
