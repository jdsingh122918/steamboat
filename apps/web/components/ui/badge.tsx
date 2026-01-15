'use client';

import React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'pill' | 'square';
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  tabIndex?: number;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  shape = 'rounded',
  dot = false,
  removable = false,
  onRemove,
  leftIcon,
  rightIcon,
  onClick,
  className = '',
  tabIndex,
}: BadgeProps) {
  const variantClasses = {
    default: 'badge-default',
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    outline: 'badge-outline',
  };

  const sizeClasses = {
    sm: 'badge-sm',
    md: 'badge-md',
    lg: 'badge-lg',
  };

  const shapeClasses = {
    rounded: 'badge-rounded',
    pill: 'badge-pill',
    square: 'badge-square',
  };

  const classes = [
    'badge',
    variantClasses[variant],
    sizeClasses[size],
    shapeClasses[shape],
    dot && 'badge-dot',
    onClick && 'badge-clickable',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (dot) {
    return <span data-testid="badge" className={classes} />;
  }

  return (
    <span
      data-testid="badge"
      className={classes}
      onClick={onClick}
      tabIndex={tabIndex}
      role={onClick ? 'button' : undefined}
    >
      {leftIcon && <span className="badge-icon-left">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="badge-icon-right">{rightIcon}</span>}
      {removable && onRemove && (
        <button
          type="button"
          className="badge-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove"
        >
          <svg
            className="badge-remove-icon"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      )}
    </span>
  );
}
