'use client';

import React, { forwardRef, useRef, useImperativeHandle } from 'react';

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  errorMessage?: string;
  label?: string;
  helperText?: string;
  clearable?: boolean;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      className = '',
      size = 'md',
      error = false,
      errorMessage,
      label,
      helperText,
      clearable = false,
      id,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const inputId = id || (label ? `datepicker-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    const sizeClasses = {
      sm: 'datepicker-sm',
      md: 'datepicker-md',
      lg: 'datepicker-lg',
    };

    const inputClasses = [
      'datepicker',
      sizeClasses[size],
      error && 'datepicker-error',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const describedBy = error && errorMessage
      ? errorId
      : helperText
        ? helperId
        : undefined;

    const handleClear = () => {
      if (inputRef.current && onChange) {
        const event = {
          target: { value: '' },
          currentTarget: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    };

    const showClearButton = clearable && value && String(value).length > 0;

    const inputElement = (
      <div className="datepicker-input-wrapper">
        <input
          ref={inputRef}
          type="date"
          role="textbox"
          id={inputId}
          className={inputClasses}
          value={value}
          onChange={onChange}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {showClearButton && (
          <button
            type="button"
            className="datepicker-clear"
            onClick={handleClear}
            aria-label="Clear date"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="datepicker-clear-icon">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
        )}
      </div>
    );

    // If no wrapper elements are needed, return just the input
    if (!label && !helperText && !errorMessage) {
      return inputElement;
    }

    return (
      <div className="datepicker-wrapper">
        {label && (
          <label htmlFor={inputId} className="datepicker-label">
            {label}
          </label>
        )}
        {inputElement}
        {error && errorMessage ? (
          <p id={errorId} className="datepicker-error-message">
            {errorMessage}
          </p>
        ) : helperText ? (
          <p id={helperId} className="datepicker-helper-text">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
