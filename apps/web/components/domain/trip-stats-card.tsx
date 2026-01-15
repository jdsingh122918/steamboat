'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils/format';

interface ExpenseCategory {
  category: string;
  amount_cents: number;
}

interface PaymentStatus {
  settled: number;
  pending: number;
}

interface TripStats {
  totalExpenses: number;
  totalAttendees: number;
  confirmedAttendees: number;
  totalPhotos: number;
  totalActivities: number;
  totalPolls: number;
  openPolls: number;
  expenseBreakdown: ExpenseCategory[];
  paymentStatus: PaymentStatus;
}

interface TripStatsCardProps {
  stats: TripStats;
  loading?: boolean;
  className?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  transport: 'Transport',
  accommodation: 'Accommodation',
  activities: 'Activities',
  drinks: 'Drinks',
  other: 'Other',
};

export function TripStatsCard({
  stats,
  loading = false,
  className = '',
}: TripStatsCardProps) {
  const getPercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const settlementPercentage = getPercentage(
    stats.paymentStatus.settled,
    stats.totalExpenses
  );

  // Find top category
  const topCategory =
    stats.expenseBreakdown.length > 0
      ? stats.expenseBreakdown.reduce((max, cat) =>
          cat.amount_cents > max.amount_cents ? cat : max
        )
      : null;

  if (loading) {
    return (
      <div
        className={`trip-stats-card ${className}`}
        data-testid="trip-stats-card"
      >
        <div className="trip-stats-loading" data-testid="trip-stats-loading">
          <div className="skeleton-block" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`trip-stats-card ${className}`}
      data-testid="trip-stats-card"
    >
      <div className="stats-section overview">
        <h3 className="section-title">Overview</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-value">{formatCurrency(stats.totalExpenses, { isCents: true })}</span>
            <span className="stat-label">Total Expenses</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalAttendees} attendees</span>
            <span className="stat-label">{stats.confirmedAttendees} confirmed</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalPhotos} photos</span>
            <span className="stat-label">Uploaded</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalActivities} activities</span>
            <span className="stat-label">Planned</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalPolls} polls</span>
            <span className="stat-label">{stats.openPolls} open</span>
          </div>
        </div>
      </div>

      <div className="stats-section expenses">
        <h3 className="section-title">Expense Breakdown</h3>
        {stats.expenseBreakdown.length === 0 ? (
          <p className="empty-state">No expenses yet</p>
        ) : (
          <div className="expense-list">
            {stats.expenseBreakdown.map((cat) => {
              const percentage = getPercentage(cat.amount_cents, stats.totalExpenses);
              const isTopCategory =
                topCategory && cat.category === topCategory.category;

              return (
                <div
                  key={cat.category}
                  className={`expense-category ${isTopCategory ? 'top-category' : ''}`}
                >
                  <div className="category-header">
                    <span className="category-name">
                      {CATEGORY_LABELS[cat.category] || cat.category}
                    </span>
                    <span className="category-percentage">{percentage}%</span>
                  </div>
                  <div className="category-bar">
                    <div
                      className="category-bar-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="category-amount">
                    {formatCurrency(cat.amount_cents, { isCents: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="stats-section payments">
        <h3 className="section-title">Payment Status</h3>
        <div className="payment-summary">
          <div className="payment-item settled">
            <span className="payment-label">Settled</span>
            <span className="payment-amount">
              {formatCurrency(stats.paymentStatus.settled, { isCents: true })}
            </span>
          </div>
          <div className="payment-item pending">
            <span className="payment-label">Pending</span>
            <span className="payment-amount">
              {formatCurrency(stats.paymentStatus.pending, { isCents: true })}
            </span>
          </div>
        </div>
        <div className="settlement-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${settlementPercentage}%` }}
            />
          </div>
          <span className="progress-text">{settlementPercentage}% settled</span>
        </div>
      </div>
    </div>
  );
}

export type { TripStatsCardProps, TripStats, ExpenseCategory, PaymentStatus };
