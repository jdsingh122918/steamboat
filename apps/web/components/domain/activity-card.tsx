'use client';

import React, { forwardRef } from 'react';
import { formatDateShort } from '@/lib/utils/format';

export type RsvpStatus = 'yes' | 'no' | 'maybe';

export interface RsvpCount {
  yes: number;
  no: number;
  maybe: number;
}

export interface ActivityCardProps extends React.HTMLAttributes<HTMLDivElement> {
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

function getRsvpLabel(status: RsvpStatus): string {
  switch (status) {
    case 'yes':
      return 'Going';
    case 'no':
      return 'Not Going';
    case 'maybe':
      return 'Maybe';
  }
}

export const ActivityCard = forwardRef<HTMLDivElement, ActivityCardProps>(
  function ActivityCard(
    {
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
    },
    ref
  ) {
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
            <span className="activity-card-date">{formatDateShort(date)}</span>
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
