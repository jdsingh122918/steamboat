'use client';

import React, { forwardRef, ReactNode } from 'react';

// ============================================
// Utility Functions
// ============================================

const formatCurrency = (amount: number): string => {
  return `$${Math.abs(amount).toFixed(2)}`;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ============================================
// ExpenseCard Component
// ============================================

type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'entertainment' | 'shopping' | 'other';

interface ExpenseCardProps extends React.HTMLAttributes<HTMLDivElement> {
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

const ExpenseCard = forwardRef<HTMLDivElement, ExpenseCardProps>(
  ({
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
  }, ref) => {
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
          <span className="expense-card-date">{formatDate(date)}</span>
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

ExpenseCard.displayName = 'ExpenseCard';

// ============================================
// ActivityCard Component
// ============================================

type RsvpStatus = 'yes' | 'no' | 'maybe';

interface RsvpCount {
  yes: number;
  no: number;
  maybe: number;
}

interface ActivityCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  title: string;
  date: Date;
  time: string;
  location: string;
  rsvpCount: RsvpCount;
  description?: string;
  userRsvp?: RsvpStatus;
  onClick?: () => void;
}

const ActivityCard = forwardRef<HTMLDivElement, ActivityCardProps>(
  ({
    id,
    title,
    date,
    time,
    location,
    rsvpCount,
    description,
    userRsvp,
    onClick,
    className = '',
    ...props
  }, ref) => {
    const getRsvpLabel = (status: RsvpStatus) => {
      switch (status) {
        case 'yes':
          return 'Going';
        case 'no':
          return 'Not Going';
        case 'maybe':
          return 'Maybe';
      }
    };

    return (
      <div
        ref={ref}
        className={`activity-card ${onClick ? 'activity-card-clickable' : ''} ${className}`}
        data-testid="activity-card"
        onClick={onClick}
        {...props}
      >
        <div className="activity-card-header">
          <h3 className="activity-card-title">{title}</h3>
          {userRsvp && (
            <span className={`activity-card-user-rsvp activity-card-rsvp-${userRsvp}`} data-testid="user-rsvp">
              {getRsvpLabel(userRsvp)}
            </span>
          )}
        </div>

        <div className="activity-card-info">
          <div className="activity-card-datetime">
            <span className="activity-card-date">{formatDate(date)}</span>
            <span className="activity-card-time">{time}</span>
          </div>
          <div className="activity-card-location">{location}</div>
        </div>

        {description && (
          <p className="activity-card-description">{description}</p>
        )}

        <div className="activity-card-rsvp">
          <span className="activity-card-rsvp-count activity-card-rsvp-yes">{rsvpCount.yes} yes</span>
          <span className="activity-card-rsvp-count activity-card-rsvp-no">{rsvpCount.no} no</span>
          <span className="activity-card-rsvp-count activity-card-rsvp-maybe">{rsvpCount.maybe} maybe</span>
        </div>
      </div>
    );
  }
);

ActivityCard.displayName = 'ActivityCard';

// ============================================
// AttendeeCard Component
// ============================================

type AttendeeRole = 'organizer' | 'attendee';

interface PaymentHandles {
  venmo?: string;
  paypal?: string;
  cashapp?: string;
}

interface AttendeeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  name: string;
  role: AttendeeRole;
  avatarUrl?: string;
  balance?: number;
  paymentHandles?: PaymentHandles;
  onClick?: () => void;
}

const AttendeeCard = forwardRef<HTMLDivElement, AttendeeCardProps>(
  ({
    id,
    name,
    role,
    avatarUrl,
    balance,
    paymentHandles,
    onClick,
    className = '',
    ...props
  }, ref) => {
    const getBalanceClass = (amount: number) => {
      if (amount > 0) return 'balance-positive';
      if (amount < 0) return 'balance-negative';
      return 'balance-zero';
    };

    const formatBalance = (amount: number) => {
      if (amount > 0) return `+${formatCurrency(amount)}`;
      if (amount < 0) return `-${formatCurrency(Math.abs(amount))}`;
      return formatCurrency(0);
    };

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

AttendeeCard.displayName = 'AttendeeCard';

// ============================================
// MediaCard Component
// ============================================

type MediaType = 'image' | 'video';

interface MediaCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  id: string;
  type: MediaType;
  thumbnailUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
  caption?: string;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onClick?: () => void;
}

const MediaCard = forwardRef<HTMLDivElement, MediaCardProps>(
  ({
    id,
    type,
    thumbnailUrl,
    uploadedBy,
    uploadedAt,
    caption,
    selectable = false,
    selected = false,
    onSelect,
    onClick,
    className = '',
    ...props
  }, ref) => {
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onSelect?.(e.target.checked);
    };

    return (
      <div
        ref={ref}
        className={`media-card ${selected ? 'media-card-selected' : ''} ${onClick ? 'media-card-clickable' : ''} ${className}`}
        data-testid="media-card"
        onClick={onClick}
        {...props}
      >
        <div className="media-card-thumbnail">
          <img src={thumbnailUrl} alt={caption || 'Media'} />
          {type === 'video' && (
            <div className="media-card-video-indicator" data-testid="video-indicator">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
          {selectable && (
            <div className="media-card-checkbox-wrapper">
              <input
                type="checkbox"
                checked={selected}
                onChange={handleCheckboxChange}
                className="media-card-checkbox"
              />
            </div>
          )}
        </div>

        <div className="media-card-info">
          <span className="media-card-uploader">By {uploadedBy}</span>
          <span className="media-card-date">{formatDate(uploadedAt)}</span>
        </div>

        {caption && (
          <p className="media-card-caption">{caption}</p>
        )}
      </div>
    );
  }
);

MediaCard.displayName = 'MediaCard';

// ============================================
// PollCard Component
// ============================================

type PollStatus = 'open' | 'closed';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface PollCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  createdBy: string;
  createdAt: Date;
  status?: PollStatus;
  showResults?: boolean;
  userVote?: string;
  onVote?: (optionId: string) => void;
}

const PollCard = forwardRef<HTMLDivElement, PollCardProps>(
  ({
    id,
    question,
    options,
    totalVotes,
    createdBy,
    createdAt,
    status = 'open',
    showResults = false,
    userVote,
    onVote,
    className = '',
    ...props
  }, ref) => {
    const getPercentage = (votes: number) => {
      if (totalVotes === 0) return 0;
      return Math.round((votes / totalVotes) * 100);
    };

    const handleOptionClick = (optionId: string) => {
      if (status === 'open' && onVote) {
        onVote(optionId);
      }
    };

    return (
      <div
        ref={ref}
        className={`poll-card ${status === 'closed' ? 'poll-card-closed' : ''} ${className}`}
        data-testid="poll-card"
        {...props}
      >
        <div className="poll-card-header">
          <h3 className="poll-card-question">{question}</h3>
          <span className={`poll-card-status poll-card-status-${status}`}>
            {status === 'open' ? 'Open' : 'Closed'}
          </span>
        </div>

        <div className="poll-card-options">
          {options.map((option) => (
            <div
              key={option.id}
              className={`poll-option ${userVote === option.id ? 'poll-option-selected' : ''} ${status === 'closed' ? 'poll-option-disabled' : ''}`}
              data-testid={`poll-option-${option.id}`}
              onClick={() => handleOptionClick(option.id)}
            >
              <span className="poll-option-text">{option.text}</span>
              {showResults && (
                <div className="poll-option-results">
                  <span className="poll-option-votes">{option.votes} votes</span>
                  <span className="poll-option-percentage">{getPercentage(option.votes)}%</span>
                  <div
                    className="poll-option-bar"
                    style={{ width: `${getPercentage(option.votes)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="poll-card-footer">
          <span className="poll-card-total">{totalVotes} votes</span>
          <span className="poll-card-separator">•</span>
          <span className="poll-card-creator">By {createdBy}</span>
        </div>
      </div>
    );
  }
);

PollCard.displayName = 'PollCard';

export { ExpenseCard, ActivityCard, AttendeeCard, MediaCard, PollCard };
export { DeleteTripModal } from './delete-trip-modal';
export type { DeleteTripModalProps } from './delete-trip-modal';
export { MediaUploadModal } from './media-upload-modal';
export type { MediaUploadModalProps, MediaUploadResult } from './media-upload-modal';
export { SettleUpModal } from './settle-up-modal';
export type { SettleUpModalProps, Settlement, PaymentData } from './settle-up-modal';
export { DisputeForm } from './dispute-form';
export type { DisputeFormProps, DisputeData, DisputeType } from './dispute-form';
export { DisputeCard } from './dispute-card';
export type { DisputeCardProps, Dispute, DisputeStatus } from './dispute-card';
export type {
  ExpenseCardProps,
  ExpenseCategory,
  ActivityCardProps,
  RsvpStatus,
  RsvpCount,
  AttendeeCardProps,
  AttendeeRole,
  PaymentHandles,
  MediaCardProps,
  MediaType,
  PollCardProps,
  PollStatus,
  PollOption,
};
