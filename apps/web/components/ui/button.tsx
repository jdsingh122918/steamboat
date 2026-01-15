'use client';

import React, { forwardRef } from 'react';
import { Spinner } from './spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  hideTextOnLoad?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      loading = false,
      hideTextOnLoad = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      destructive: 'btn-destructive',
      link: 'btn-link',
    };

    const sizeClasses = {
      sm: 'btn-sm',
      md: 'btn-md',
      lg: 'btn-lg',
      icon: 'btn-icon',
    };

    const classes = [
      'btn',
      variantClasses[variant],
      sizeClasses[size],
      isDisabled && 'btn-disabled',
      loading && 'btn-loading',
      fullWidth && 'btn-full',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Spinner
            size="sm"
            color={variant === 'primary' || variant === 'destructive' ? 'white' : 'primary'}
            className="btn-spinner"
          />
        )}
        {leftIcon && !loading && <span className="btn-icon-left">{leftIcon}</span>}
        <span className={loading && hideTextOnLoad ? 'sr-only' : ''}>
          {children}
        </span>
        {rightIcon && !loading && <span className="btn-icon-right">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
