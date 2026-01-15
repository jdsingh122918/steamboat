'use client';

import React, { forwardRef } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  errorMessage?: string;
  label?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      size = 'md',
      error = false,
      errorMessage,
      label,
      helperText,
      leftIcon,
      rightIcon,
      id,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    const sizeClasses = {
      sm: 'input-sm',
      md: 'input-md',
      lg: 'input-lg',
    };

    const inputClasses = [
      'input',
      sizeClasses[size],
      error && 'input-error',
      leftIcon && 'input-with-left-icon',
      rightIcon && 'input-with-right-icon',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const describedBy = error && errorMessage
      ? errorId
      : helperText
        ? helperId
        : undefined;

    const inputElement = (
      <input
        ref={ref}
        id={inputId}
        type={type}
        className={inputClasses}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      />
    );

    // If no wrapper elements are needed, return just the input
    if (!label && !helperText && !errorMessage && !leftIcon && !rightIcon) {
      return inputElement;
    }

    return (
      <div className="input-wrapper">
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
          </label>
        )}
        <div className="input-container">
          {leftIcon && <span className="input-icon-left">{leftIcon}</span>}
          {inputElement}
          {rightIcon && <span className="input-icon-right">{rightIcon}</span>}
        </div>
        {error && errorMessage ? (
          <p id={errorId} className="input-error-message">
            {errorMessage}
          </p>
        ) : helperText ? (
          <p id={helperId} className="input-helper-text">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
