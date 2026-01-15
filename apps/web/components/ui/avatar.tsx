'use client';

import React, { forwardRef, useState, Children, cloneElement, isValidElement } from 'react';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'away' | 'busy';
  fallback?: React.ReactNode;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function FallbackIcon() {
  return (
    <svg
      data-testid="avatar-fallback-icon"
      className="avatar-fallback-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name,
      size = 'md',
      shape = 'circle',
      status,
      fallback,
      className = '',
    },
    ref
  ) => {
    const [imageError, setImageError] = useState(false);

    const sizeClasses = {
      xs: 'avatar-xs',
      sm: 'avatar-sm',
      md: 'avatar-md',
      lg: 'avatar-lg',
      xl: 'avatar-xl',
    };

    const shapeClasses = {
      circle: 'avatar-circle',
      square: 'avatar-square',
    };

    const classes = [
      'avatar',
      sizeClasses[size],
      shapeClasses[shape],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const showImage = src && !imageError;
    const showInitials = !showImage && name;
    const showFallback = !showImage && !name;

    return (
      <div ref={ref} data-testid="avatar" className={classes}>
        {showImage && (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="avatar-image"
            onError={() => setImageError(true)}
          />
        )}
        {showInitials && (
          <span className="avatar-initials">{getInitials(name)}</span>
        )}
        {showFallback && (fallback || <FallbackIcon />)}
        {status && (
          <span
            data-testid="avatar-status"
            className={`avatar-status status-${status}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AvatarGroup({
  children,
  max,
  size,
  className = '',
}: AvatarGroupProps) {
  const childArray = Children.toArray(children);
  const visibleChildren = max ? childArray.slice(0, max) : childArray;
  const remainingCount = max ? Math.max(0, childArray.length - max) : 0;

  return (
    <div
      data-testid="avatar-group"
      className={`avatar-group avatar-group-stacked ${className}`}
    >
      {visibleChildren.map((child, index) => {
        if (isValidElement<AvatarProps>(child)) {
          return cloneElement(child, {
            key: index,
            size: size || child.props.size,
          });
        }
        return child;
      })}
      {remainingCount > 0 && (
        <div
          data-testid="avatar"
          className={`avatar avatar-remaining ${size ? `avatar-${size}` : 'avatar-md'}`}
        >
          <span className="avatar-initials">+{remainingCount}</span>
        </div>
      )}
    </div>
  );
}
