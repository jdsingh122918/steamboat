'use client';

import React from 'react';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: number | string;
  height?: number | string;
  animate?: boolean;
  className?: string;
}

function SkeletonBase({
  variant = 'text',
  width,
  height,
  animate = true,
  className = '',
}: SkeletonProps) {
  const variantClasses = {
    text: 'skeleton-text',
    circular: 'skeleton-circular',
    rectangular: 'skeleton-rectangular',
    rounded: 'skeleton-rounded',
  };

  const classes = [
    'skeleton',
    variantClasses[variant],
    animate && 'skeleton-pulse',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = {};
  if (width !== undefined) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height !== undefined) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  return (
    <span
      data-testid="skeleton"
      className={classes}
      style={style}
      aria-hidden="true"
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  lastLineShorter?: boolean;
  animate?: boolean;
  className?: string;
}

function SkeletonText({
  lines = 3,
  lastLineShorter = true,
  animate = true,
  className = '',
}: SkeletonTextProps) {
  return (
    <div className={`skeleton-text-container ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBase
          key={index}
          variant="text"
          animate={animate}
          className={
            lastLineShorter && index === lines - 1 ? 'skeleton-short' : ''
          }
        />
      ))}
    </div>
  );
}

export interface SkeletonAvatarProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

function SkeletonAvatar({
  size = 40,
  animate = true,
  className = '',
}: SkeletonAvatarProps) {
  return (
    <SkeletonBase
      variant="circular"
      width={size}
      height={size}
      animate={animate}
      className={className}
    />
  );
}

export interface SkeletonCardProps {
  showAvatar?: boolean;
  lines?: number;
  animate?: boolean;
  className?: string;
}

function SkeletonCard({
  showAvatar = false,
  lines = 3,
  animate = true,
  className = '',
}: SkeletonCardProps) {
  return (
    <div data-testid="skeleton-card" className={`skeleton-card ${className}`}>
      {showAvatar && (
        <div className="skeleton-card-header">
          <SkeletonAvatar size={40} animate={animate} />
          <div className="skeleton-card-header-text">
            <SkeletonBase variant="text" width="60%" animate={animate} />
            <SkeletonBase variant="text" width="40%" animate={animate} />
          </div>
        </div>
      )}
      <SkeletonText lines={lines} animate={animate} />
    </div>
  );
}

// Attach compound components
export const Skeleton = Object.assign(SkeletonBase, {
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Card: SkeletonCard,
});
