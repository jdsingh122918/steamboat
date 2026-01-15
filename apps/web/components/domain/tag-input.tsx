'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
}

export function TagInput({
  tags,
  onChange,
  suggestions = [],
  placeholder = 'Add tag...',
  maxTags,
  disabled = false,
  className = '',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMaxReached = maxTags !== undefined && tags.length >= maxTags;

  const normalizeTag = (tag: string): string => {
    return tag.trim().toLowerCase();
  };

  const isDuplicate = (tag: string): boolean => {
    const normalized = normalizeTag(tag);
    return tags.some((t) => normalizeTag(t) === normalized);
  };

  const addTag = useCallback(
    (tagText: string) => {
      const trimmed = tagText.trim();
      if (!trimmed || isDuplicate(trimmed) || isMaxReached) {
        return false;
      }
      onChange([...tags, trimmed]);
      return true;
    },
    [tags, onChange, isMaxReached]
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(tags.filter((_, i) => i !== index));
    },
    [tags, onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // Check for comma to add tag
      if (value.includes(',')) {
        const parts = value.split(',');
        const tagToAdd = parts[0].trim();
        if (tagToAdd && addTag(tagToAdd)) {
          setInputValue('');
        } else {
          setInputValue(parts[0]);
        }
      } else {
        setInputValue(value);
      }

      setShowSuggestions(value.trim().length > 0);
    },
    [addTag]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (addTag(inputValue)) {
          setInputValue('');
          setShowSuggestions(false);
        }
      } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
        removeTag(tags.length - 1);
      }
    },
    [inputValue, tags, addTag, removeTag]
  );

  const handleBlur = useCallback(() => {
    // Add tag on blur if there's text
    if (inputValue.trim()) {
      if (addTag(inputValue)) {
        setInputValue('');
      }
    }
    // Delay hiding suggestions to allow click
    setTimeout(() => setShowSuggestions(false), 150);
  }, [inputValue, addTag]);

  const handleFocus = useCallback(() => {
    if (inputValue.trim().length > 0) {
      setShowSuggestions(true);
    }
  }, [inputValue]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (addTag(suggestion)) {
        setInputValue('');
        setShowSuggestions(false);
        inputRef.current?.focus();
      }
    },
    [addTag]
  );

  // Filter suggestions based on input and exclude existing tags
  const filteredSuggestions = suggestions.filter((suggestion) => {
    const normalizedSuggestion = normalizeTag(suggestion);
    const normalizedInput = normalizeTag(inputValue);
    return (
      normalizedSuggestion.includes(normalizedInput) &&
      !tags.some((t) => normalizeTag(t) === normalizedSuggestion)
    );
  });

  return (
    <div className={`tag-input-container ${className}`} data-testid="tag-input">
      <div className="tag-input-wrapper">
        {tags.map((tag, index) => (
          <span key={`${tag}-${index}`} className="tag-badge">
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="tag-remove-button"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={disabled || isMaxReached}
          className="tag-input"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="tag-suggestions" role="listbox">
          {filteredSuggestions.map((suggestion) => (
            <li
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className="tag-suggestion-item"
              role="option"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type { TagInputProps };
