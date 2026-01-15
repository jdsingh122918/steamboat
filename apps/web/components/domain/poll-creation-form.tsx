'use client';

import React, { useState, useCallback } from 'react';

interface PollData {
  question: string;
  options: string[];
  allowMultiple?: boolean;
  closesAt?: string;
}

interface PollCreationFormProps {
  onCreate: (data: PollData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;

export function PollCreationForm({
  onCreate,
  onCancel,
  className = '',
}: PollCreationFormProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [closesAt, setClosesAt] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const addOption = useCallback(() => {
    if (options.length < MAX_OPTIONS) {
      setOptions([...options, '']);
    }
  }, [options]);

  const removeOption = useCallback(
    (index: number) => {
      if (options.length > MIN_OPTIONS) {
        setOptions(options.filter((_, i) => i !== index));
      }
    },
    [options]
  );

  const updateOption = useCallback(
    (index: number, value: string) => {
      const newOptions = [...options];
      newOptions[index] = value;
      setOptions(newOptions);
    },
    [options]
  );

  const validate = useCallback((): boolean => {
    const newErrors: string[] = [];

    if (!question.trim()) {
      newErrors.push('Question is required');
    }

    const nonEmptyOptions = options.filter((opt) => opt.trim());
    if (nonEmptyOptions.length < MIN_OPTIONS) {
      newErrors.push('At least 2 options are required');
    }

    const uniqueOptions = new Set(
      nonEmptyOptions.map((opt) => opt.trim().toLowerCase())
    );
    if (uniqueOptions.size !== nonEmptyOptions.length) {
      newErrors.push('Duplicate options are not allowed');
    }

    if (closesAt) {
      const closingDate = new Date(closesAt);
      const now = new Date();
      if (closingDate <= now) {
        newErrors.push('Closing date must be a future date');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [question, options, closesAt]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate() || isCreating) return;

      setIsCreating(true);
      setErrors([]);

      try {
        const nonEmptyOptions = options
          .filter((opt) => opt.trim())
          .map((opt) => opt.trim());

        const data: PollData = {
          question: question.trim(),
          options: nonEmptyOptions,
        };

        if (allowMultiple) {
          data.allowMultiple = true;
        }

        if (closesAt) {
          data.closesAt = closesAt;
        }

        await onCreate(data);
      } catch (error) {
        setErrors([error instanceof Error ? error.message : 'Failed to create poll']);
      } finally {
        setIsCreating(false);
      }
    },
    [question, options, allowMultiple, closesAt, validate, isCreating, onCreate]
  );

  const canAddOption = options.length < MAX_OPTIONS;
  const canRemoveOption = options.length > MIN_OPTIONS;

  return (
    <form
      onSubmit={handleSubmit}
      className={`poll-creation-form ${className}`}
      data-testid="poll-creation-form"
    >
      <div className="form-field">
        <label htmlFor="question" className="form-label">
          Question
        </label>
        <input
          id="question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to ask?"
          className="form-input"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Options</label>
        <div className="options-list">
          {options.map((option, index) => (
            <div key={index} className="option-row">
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="form-input option-input"
              />
              {canRemoveOption && (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="remove-option-button"
                  aria-label="Remove option"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addOption}
          disabled={!canAddOption}
          className="add-option-button"
        >
          Add Option
        </button>
      </div>

      <div className="form-field">
        <label htmlFor="closesAt" className="form-label">
          Closing Date (optional)
        </label>
        <input
          id="closesAt"
          type="date"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          className="form-input"
        />
      </div>

      <div className="form-field checkbox-field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
            className="form-checkbox"
          />
          <span>Allow multiple selections</span>
        </label>
      </div>

      {errors.length > 0 && (
        <div className="form-errors" role="alert">
          {errors.map((error, index) => (
            <p key={index} className="form-error">
              {error}
            </p>
          ))}
        </div>
      )}

      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="cancel-button"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isCreating}
          className="create-button"
        >
          {isCreating ? 'Creating...' : 'Create Poll'}
        </button>
      </div>
    </form>
  );
}

export type { PollCreationFormProps, PollData };
