import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GalleryFilters } from '../gallery-filters';

describe('GalleryFilters', () => {
  const mockOnFilterChange = vi.fn();
  const defaultProps = {
    availableTags: ['sunset', 'beach', 'group', 'food', 'party'],
    selectedTags: [] as string[],
    searchQuery: '',
    onFilterChange: mockOnFilterChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render search input', () => {
      render(<GalleryFilters {...defaultProps} />);

      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('should render available tags as clickable chips', () => {
      render(<GalleryFilters {...defaultProps} />);

      expect(screen.getByText('sunset')).toBeInTheDocument();
      expect(screen.getByText('beach')).toBeInTheDocument();
      expect(screen.getByText('group')).toBeInTheDocument();
    });

    it('should highlight selected tags', () => {
      render(<GalleryFilters {...defaultProps} selectedTags={['sunset', 'beach']} />);

      const sunsetTag = screen.getByText('sunset').closest('button');
      const beachTag = screen.getByText('beach').closest('button');
      const groupTag = screen.getByText('group').closest('button');

      expect(sunsetTag).toHaveClass('selected');
      expect(beachTag).toHaveClass('selected');
      expect(groupTag).not.toHaveClass('selected');
    });

    it('should display current search query', () => {
      render(<GalleryFilters {...defaultProps} searchQuery="hawaii" />);

      expect(screen.getByRole('searchbox')).toHaveValue('hawaii');
    });

    it('should render clear filters button when filters are active', () => {
      render(<GalleryFilters {...defaultProps} selectedTags={['sunset']} />);

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('should hide clear filters button when no filters are active', () => {
      render(<GalleryFilters {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    });
  });

  describe('tag selection', () => {
    it('should add tag to selection on click', async () => {
      render(<GalleryFilters {...defaultProps} />);

      fireEvent.click(screen.getByText('sunset'));

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          selectedTags: ['sunset'],
          searchQuery: '',
        });
      });
    });

    it('should remove tag from selection on click when already selected', async () => {
      render(<GalleryFilters {...defaultProps} selectedTags={['sunset', 'beach']} />);

      fireEvent.click(screen.getByText('sunset'));

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          selectedTags: ['beach'],
          searchQuery: '',
        });
      });
    });

    it('should allow selecting multiple tags', async () => {
      render(<GalleryFilters {...defaultProps} selectedTags={['sunset']} />);

      fireEvent.click(screen.getByText('beach'));

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          selectedTags: ['sunset', 'beach'],
          searchQuery: '',
        });
      });
    });
  });

  describe('search', () => {
    it('should call onFilterChange when search query changes', async () => {
      render(<GalleryFilters {...defaultProps} />);

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'vacation' } });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          selectedTags: [],
          searchQuery: 'vacation',
        });
      });
    });

    it('should preserve selected tags when search query changes', async () => {
      render(<GalleryFilters {...defaultProps} selectedTags={['beach']} />);

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'fun' } });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          selectedTags: ['beach'],
          searchQuery: 'fun',
        });
      });
    });

    it('should show clear button in search input when query is not empty', () => {
      render(<GalleryFilters {...defaultProps} searchQuery="test" />);

      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    it('should clear search on clear button click', async () => {
      render(<GalleryFilters {...defaultProps} searchQuery="test" />);

      fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          selectedTags: [],
          searchQuery: '',
        });
      });
    });
  });

  describe('clear all filters', () => {
    it('should clear all filters when clear button is clicked', async () => {
      render(
        <GalleryFilters
          {...defaultProps}
          selectedTags={['sunset', 'beach']}
          searchQuery="vacation"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /clear all/i }));

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          selectedTags: [],
          searchQuery: '',
        });
      });
    });
  });

  describe('filter count', () => {
    it('should display count of active filters', () => {
      render(<GalleryFilters {...defaultProps} selectedTags={['sunset', 'beach']} />);

      expect(screen.getByText(/2 tags selected/i)).toBeInTheDocument();
    });

    it('should not display count when no filters are active', () => {
      render(<GalleryFilters {...defaultProps} />);

      expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show message when no tags are available', () => {
      render(<GalleryFilters {...defaultProps} availableTags={[]} />);

      expect(screen.getByText(/no tags available/i)).toBeInTheDocument();
    });
  });

  describe('collapsible tags', () => {
    it('should collapse tags section when clicking toggle', async () => {
      render(<GalleryFilters {...defaultProps} collapsible />);

      const toggleButton = screen.getByRole('button', { name: /tags/i });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByText('sunset')).not.toBeVisible();
      });
    });

    it('should expand tags section when clicking toggle again', async () => {
      render(<GalleryFilters {...defaultProps} collapsible />);

      const toggleButton = screen.getByRole('button', { name: /tags/i });
      fireEvent.click(toggleButton); // Collapse
      fireEvent.click(toggleButton); // Expand

      await waitFor(() => {
        expect(screen.getByText('sunset')).toBeVisible();
      });
    });
  });
});
