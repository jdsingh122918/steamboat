'use client';

import React, { forwardRef, useEffect, useRef, useState, useId } from 'react';

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  labelPosition?: 'left' | 'right';
  id?: string;
  className?: string;
  name?: string;
}

export const Toggle = forwardRef<HTMLDivElement, ToggleProps>(
  (
    {
      checked,
      defaultChecked = false,
      onChange,
      disabled = false,
      size = 'md',
      label,
      labelPosition = 'right',
      id,
      className = '',
      name,
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || `toggle-${generatedId}`;
    const inputRef = useRef<HTMLInputElement>(null);

    const [isChecked, setIsChecked] = useState(defaultChecked);

    // Handle controlled component
    const actualChecked = checked !== undefined ? checked : isChecked;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (checked === undefined) {
        setIsChecked(event.target.checked);
      }
      onChange?.(event);
    };

    const sizeClasses = {
      sm: 'toggle-sm',
      md: 'toggle-md',
      lg: 'toggle-lg',
    };

    const toggleClasses = [
      'toggle',
      sizeClasses[size],
      actualChecked && 'toggle-checked',
      disabled && 'toggle-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = [
      'toggle-wrapper',
      label && (labelPosition === 'left' ? 'toggle-label-left' : 'toggle-label-right'),
    ]
      .filter(Boolean)
      .join(' ');

    const toggleElement = (
      <div ref={ref} data-testid="toggle" className={toggleClasses}>
        <input
          ref={inputRef}
          type="checkbox"
          role="switch"
          id={inputId}
          name={name}
          checked={actualChecked}
          disabled={disabled}
          onChange={handleChange}
          aria-checked={actualChecked}
          className="toggle-input"
        />
        <span className="toggle-track">
          <span className="toggle-thumb" />
        </span>
      </div>
    );

    if (!label) {
      return toggleElement;
    }

    return (
      <div data-testid="toggle-wrapper" className={wrapperClasses}>
        {labelPosition === 'left' && (
          <label htmlFor={inputId} className="toggle-label">
            {label}
          </label>
        )}
        {toggleElement}
        {labelPosition === 'right' && (
          <label htmlFor={inputId} className="toggle-label">
            {label}
          </label>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  label?: string;
  description?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className = '',
      size = 'md',
      error = false,
      label,
      description,
      indeterminate = false,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || `checkbox-${generatedId}`;
    const internalRef = useRef<HTMLInputElement>(null);

    // Handle both internal and forwarded ref
    useEffect(() => {
      const inputElement = internalRef.current;
      if (inputElement) {
        inputElement.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    // Forward ref
    useEffect(() => {
      if (typeof ref === 'function') {
        ref(internalRef.current);
      } else if (ref) {
        ref.current = internalRef.current;
      }
    }, [ref]);

    const sizeClasses = {
      sm: 'checkbox-sm',
      md: 'checkbox-md',
      lg: 'checkbox-lg',
    };

    const checkboxClasses = [
      'checkbox',
      sizeClasses[size],
      error && 'checkbox-error',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = [
      'checkbox-wrapper',
      disabled && 'checkbox-wrapper-disabled',
    ]
      .filter(Boolean)
      .join(' ');

    const checkboxElement = (
      <div data-testid="checkbox" className={checkboxClasses}>
        <input
          ref={internalRef}
          type="checkbox"
          id={inputId}
          className="checkbox-input"
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        <span className="checkbox-box">
          <svg className="checkbox-check" viewBox="0 0 16 16" fill="none">
            <path
              d="M13.5 4.5L6 12L2.5 8.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <svg className="checkbox-indeterminate" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8H13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </div>
    );

    if (!label) {
      return checkboxElement;
    }

    return (
      <div className={wrapperClasses}>
        {checkboxElement}
        <div className="checkbox-content">
          <label htmlFor={inputId} className="checkbox-label">
            {label}
          </label>
          {description && (
            <p className="checkbox-description">{description}</p>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
