'use client';

import React, { useState, useCallback } from 'react';

interface FilterState {
  selectedTags: string[];
  searchQuery: string;
}

interface GalleryFiltersProps {
  availableTags: string[];
  selectedTags: string[];
  searchQuery: string;
  onFilterChange: (filters: FilterState) => void;
  collapsible?: boolean;
  className?: string;
}

export function GalleryFilters({
  availableTags,
  selectedTags,
  searchQuery,
  onFilterChange,
  collapsible = false,
  className = '',
}: GalleryFiltersProps) {
  const [isTagsExpanded, setIsTagsExpanded] = useState(true);

  const hasActiveFilters = selectedTags.length > 0 || searchQuery.length > 0;

  const handleTagClick = useCallback(
    (tag: string) => {
      const newTags = selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag];

      onFilterChange({
        selectedTags: newTags,
        searchQuery,
      });
    },
    [selectedTags, searchQuery, onFilterChange]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({
        selectedTags,
        searchQuery: e.target.value,
      });
    },
    [selectedTags, onFilterChange]
  );

  const handleClearSearch = useCallback(() => {
    onFilterChange({
      selectedTags,
      searchQuery: '',
    });
  }, [selectedTags, onFilterChange]);

  const handleClearAll = useCallback(() => {
    onFilterChange({
      selectedTags: [],
      searchQuery: '',
    });
  }, [onFilterChange]);

  const handleToggleTags = useCallback(() => {
    setIsTagsExpanded((prev) => !prev);
  }, []);

  return (
    <div className={`gallery-filters ${className}`} data-testid="gallery-filters">
      <div className="gallery-filters-search">
        <input
          type="search"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search photos..."
          className="gallery-search-input"
          role="searchbox"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="gallery-search-clear"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <div className="gallery-filters-tags">
        {collapsible ? (
          <button
            type="button"
            onClick={handleToggleTags}
            className="gallery-tags-toggle"
            aria-expanded={isTagsExpanded}
          >
            Tags {isTagsExpanded ? '▼' : '▶'}
          </button>
        ) : null}

        {availableTags.length === 0 ? (
          <p className="gallery-no-tags">No tags available</p>
        ) : (
          <div
            className="gallery-tags-list"
            style={collapsible && !isTagsExpanded ? { display: 'none' } : undefined}
          >
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className={`gallery-tag-chip ${isSelected ? 'selected' : ''}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedTags.length > 0 && (
        <div className="gallery-filters-info">
          <span className="gallery-filters-count">
            {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
          </span>
        </div>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClearAll}
          className="gallery-filters-clear-all"
          aria-label="Clear all filters"
        >
          Clear All
        </button>
      )}
    </div>
  );
}

export type { GalleryFiltersProps, FilterState };
