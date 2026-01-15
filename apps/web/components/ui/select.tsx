'use client';

import React, { forwardRef, useMemo } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  errorMessage?: string;
  label?: string;
  helperText?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      className = '',
      size = 'md',
      error = false,
      errorMessage,
      label,
      helperText,
      placeholder,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const errorId = selectId ? `${selectId}-error` : undefined;
    const helperId = selectId ? `${selectId}-helper` : undefined;

    const sizeClasses = {
      sm: 'select-sm',
      md: 'select-md',
      lg: 'select-lg',
    };

    const selectClasses = [
      'select',
      sizeClasses[size],
      error && 'select-error',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const describedBy = error && errorMessage
      ? errorId
      : helperText
        ? helperId
        : undefined;

    // Group options by their group property
    const groupedOptions = useMemo(() => {
      const groups: Record<string, SelectOption[]> = {};
      const ungrouped: SelectOption[] = [];

      options.forEach((option) => {
        if (option.group) {
          if (!groups[option.group]) {
            groups[option.group] = [];
          }
          groups[option.group].push(option);
        } else {
          ungrouped.push(option);
        }
      });

      return { groups, ungrouped };
    }, [options]);

    const hasGroups = Object.keys(groupedOptions.groups).length > 0;

    const selectElement = (
      <select
        ref={ref}
        id={selectId}
        className={selectClasses}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {hasGroups ? (
          <>
            {groupedOptions.ungrouped.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
            {Object.entries(groupedOptions.groups).map(([groupName, groupOptions]) => (
              <optgroup key={groupName} label={groupName}>
                {groupOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </>
        ) : (
          options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))
        )}
      </select>
    );

    // If no wrapper elements are needed, return just the select
    if (!label && !helperText && !errorMessage) {
      return selectElement;
    }

    return (
      <div className="select-wrapper">
        {label && (
          <label htmlFor={selectId} className="select-label">
            {label}
          </label>
        )}
        <div className="select-container">
          {selectElement}
          <span className="select-icon">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 6H4.604a.25.25 0 00-.177.427z" />
            </svg>
          </span>
        </div>
        {error && errorMessage ? (
          <p id={errorId} className="select-error-message">
            {errorMessage}
          </p>
        ) : helperText ? (
          <p id={helperId} className="select-helper-text">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
