import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagInput } from '../tag-input';

describe('TagInput', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    tags: ['sunset', 'beach'],
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render existing tags as badges', () => {
      render(<TagInput {...defaultProps} />);

      expect(screen.getByText('sunset')).toBeInTheDocument();
      expect(screen.getByText('beach')).toBeInTheDocument();
    });

    it('should render input for new tags', () => {
      render(<TagInput {...defaultProps} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should show remove button on tags', () => {
      render(<TagInput {...defaultProps} />);

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      expect(removeButtons).toHaveLength(2);
    });

    it('should render with custom placeholder', () => {
      render(<TagInput tags={[]} onChange={mockOnChange} placeholder="Add a tag..." />);

      expect(screen.getByPlaceholderText('Add a tag...')).toBeInTheDocument();
    });

    it('should render empty state correctly', () => {
      render(<TagInput tags={[]} onChange={mockOnChange} />);

      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('adding tags', () => {
    it('should add tag on Enter key', async () => {
      render(<TagInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'mountains' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['sunset', 'beach', 'mountains']);
      });
    });

    it('should add tag on comma', async () => {
      render(<TagInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'forest,' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['sunset', 'beach', 'forest']);
      });
    });

    it('should trim whitespace from new tags', async () => {
      render(<TagInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '  camping  ' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['sunset', 'beach', 'camping']);
      });
    });

    it('should clear input after adding tag', async () => {
      render(<TagInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'hiking' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should not add empty tags', () => {
      render(<TagInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not allow duplicate tags', () => {
      render(<TagInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'sunset' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should be case-insensitive when checking duplicates', () => {
      render(<TagInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'SUNSET' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should add tag on blur', async () => {
      render(<TagInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'adventure' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['sunset', 'beach', 'adventure']);
      });
    });
  });

  describe('removing tags', () => {
    it('should remove tag on X click', async () => {
      render(<TagInput {...defaultProps} />);

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      fireEvent.click(removeButtons[0]); // Remove 'sunset'

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['beach']);
      });
    });

    it('should remove last tag on backspace in empty input', async () => {
      render(<TagInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Backspace' });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['sunset']);
      });
    });

    it('should not remove tag on backspace when input has text', () => {
      render(<TagInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.keyDown(input, { key: 'Backspace' });

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('autocomplete suggestions', () => {
    it('should show autocomplete suggestions when typing', async () => {
      const suggestions = ['sunset', 'sunrise', 'summer'];
      render(<TagInput {...defaultProps} suggestions={suggestions} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'su' } });
      fireEvent.focus(input);

      await waitFor(() => {
        // 'sunset' is already a tag, so only 'sunrise' and 'summer' should show
        expect(screen.getByText('sunrise')).toBeInTheDocument();
        expect(screen.getByText('summer')).toBeInTheDocument();
      });
    });

    it('should add tag when suggestion is clicked', async () => {
      const suggestions = ['sunset', 'sunrise', 'swimming'];
      render(<TagInput {...defaultProps} suggestions={suggestions} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'su' } });
      fireEvent.focus(input);

      await waitFor(() => {
        const suggestion = screen.getByText('sunrise');
        fireEvent.click(suggestion);
      });

      expect(mockOnChange).toHaveBeenCalledWith(['sunset', 'beach', 'sunrise']);
    });

    it('should filter out existing tags from suggestions', async () => {
      const suggestions = ['sunset', 'sunrise'];
      render(<TagInput {...defaultProps} suggestions={suggestions} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'su' } });
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText('sunrise')).toBeInTheDocument();
        // 'sunset' is already a tag, should not appear in suggestions
        const sunsetSuggestions = screen.queryAllByText('sunset');
        // One is the tag badge, none should be a suggestion
        expect(sunsetSuggestions).toHaveLength(1);
      });
    });

    it('should hide suggestions when input is empty', () => {
      const suggestions = ['sunset', 'sunrise'];
      render(<TagInput {...defaultProps} suggestions={suggestions} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      // With empty input, no suggestions should show
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('max tags limit', () => {
    it('should prevent adding more tags when maxTags is reached', () => {
      render(<TagInput {...defaultProps} maxTags={2} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'hiking' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should disable input when maxTags is reached', () => {
      render(<TagInput {...defaultProps} maxTags={2} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should allow adding when under maxTags', async () => {
      render(<TagInput {...defaultProps} maxTags={5} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'hiking' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['sunset', 'beach', 'hiking']);
      });
    });
  });

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      render(<TagInput {...defaultProps} disabled />);

      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should hide remove buttons when disabled', () => {
      render(<TagInput {...defaultProps} disabled />);

      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });
  });
});
