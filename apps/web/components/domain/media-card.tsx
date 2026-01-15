'use client';

import React, { forwardRef } from 'react';
import { formatDateShort } from '@/lib/utils/format';

export type MediaType = 'image' | 'video';

export interface MediaCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
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

export const MediaCard = forwardRef<HTMLDivElement, MediaCardProps>(
  function MediaCard(
    {
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
    },
    ref
  ) {
    function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>): void {
      e.stopPropagation();
      onSelect?.(e.target.checked);
    }

    function handleCheckboxClick(e: React.MouseEvent): void {
      e.stopPropagation();
    }

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
            <div className="media-card-checkbox-wrapper" onClick={handleCheckboxClick}>
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
          <span className="media-card-date">{formatDateShort(uploadedAt)}</span>
        </div>

        {caption && (
          <p className="media-card-caption">{caption}</p>
        )}
      </div>
    );
  }
);
