import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PollCreationForm } from '../poll-creation-form';

// Helper to simulate typing
const typeInInput = (input: HTMLElement, text: string) => {
  fireEvent.change(input, { target: { value: text } });
};

describe('PollCreationForm', () => {
  const mockOnCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnCreate.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render question input', () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      expect(screen.getByLabelText(/question/i)).toBeInTheDocument();
    });

    it('should render at least 2 option inputs', () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      expect(optionInputs.length).toBeGreaterThanOrEqual(2);
    });

    it('should render Add Option button', () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      expect(screen.getByRole('button', { name: /add option/i })).toBeInTheDocument();
    });

    it('should render optional closing date picker', () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      expect(screen.getByLabelText(/closing date/i)).toBeInTheDocument();
    });

    it('should render Allow Multiple checkbox', () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      expect(screen.getByLabelText(/allow multiple/i)).toBeInTheDocument();
    });
  });

  describe('option management', () => {
    it('should add new option input on Add Option click', () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      const initialOptions = screen.getAllByPlaceholderText(/option/i);
      const initialCount = initialOptions.length;

      fireEvent.click(screen.getByRole('button', { name: /add option/i }));

      const afterOptions = screen.getAllByPlaceholderText(/option/i);
      expect(afterOptions.length).toBe(initialCount + 1);
    });

    it('should remove option on Remove click', () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      // Add an option first so we have more than 2
      fireEvent.click(screen.getByRole('button', { name: /add option/i }));

      const beforeOptions = screen.getAllByPlaceholderText(/option/i);
      const beforeCount = beforeOptions.length;

      // Remove an option
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      fireEvent.click(removeButtons[0]);

      const afterOptions = screen.getAllByPlaceholderText(/option/i);
      expect(afterOptions.length).toBe(beforeCount - 1);
    });

    it('should not allow fewer than 2 options', () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      // Try to remove options until we have fewer than 2
      const removeButtons = screen.queryAllByRole('button', { name: /remove/i });

      // With 2 options, remove buttons should be disabled or hidden
      expect(removeButtons.length).toBe(0);
    });

    it('should limit to maximum 10 options', () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      // Add 8 more options (starting with 2)
      for (let i = 0; i < 8; i++) {
        const addButton = screen.queryByRole('button', { name: /add option/i });
        if (addButton) fireEvent.click(addButton);
      }

      // Try to add one more
      const addButton = screen.queryByRole('button', { name: /add option/i });

      // Button should be hidden or disabled at 10 options
      if (addButton) {
        expect(addButton).toBeDisabled();
      }
    });
  });

  describe('validation', () => {
    it('should require question text', async () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      // Fill in options but not question
      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      typeInInput(optionInputs[0], 'Option 1');
      typeInInput(optionInputs[1], 'Option 2');

      fireEvent.click(screen.getByRole('button', { name: /create poll/i }));

      await waitFor(() => {
        expect(screen.getByText(/question is required/i)).toBeInTheDocument();
      });
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('should require at least 2 non-empty options', async () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      // Fill in question but only one option
      typeInInput(screen.getByLabelText(/question/i), 'What is your favorite color?');
      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      typeInInput(optionInputs[0], 'Red');

      fireEvent.click(screen.getByRole('button', { name: /create poll/i }));

      await waitFor(() => {
        expect(screen.getByText(/at least 2 options/i)).toBeInTheDocument();
      });
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('should not allow duplicate options', async () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      typeInInput(screen.getByLabelText(/question/i), 'What is your favorite color?');
      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      typeInInput(optionInputs[0], 'Red');
      typeInInput(optionInputs[1], 'Red');

      fireEvent.click(screen.getByRole('button', { name: /create poll/i }));

      await waitFor(() => {
        expect(screen.getByText(/duplicate options/i)).toBeInTheDocument();
      });
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('should validate closing date is in future', async () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      typeInInput(screen.getByLabelText(/question/i), 'What is your favorite color?');
      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      typeInInput(optionInputs[0], 'Red');
      typeInInput(optionInputs[1], 'Blue');

      // Set a past date - use a definitely past date
      const dateInput = screen.getByLabelText(/closing date/i);
      typeInInput(dateInput, '2020-01-01');

      fireEvent.click(screen.getByRole('button', { name: /create poll/i }));

      await waitFor(() => {
        expect(screen.getByText(/future date/i)).toBeInTheDocument();
      });
      expect(mockOnCreate).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('should call onCreate with poll data', async () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      typeInInput(screen.getByLabelText(/question/i), 'What is your favorite color?');
      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      typeInInput(optionInputs[0], 'Red');
      typeInInput(optionInputs[1], 'Blue');

      fireEvent.click(screen.getByRole('button', { name: /create poll/i }));

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            question: 'What is your favorite color?',
            options: ['Red', 'Blue'],
          })
        );
      });
    });

    it('should show loading state while creating', async () => {
      mockOnCreate.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<PollCreationForm onCreate={mockOnCreate} />);

      typeInInput(screen.getByLabelText(/question/i), 'What is your favorite color?');
      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      typeInInput(optionInputs[0], 'Red');
      typeInInput(optionInputs[1], 'Blue');

      fireEvent.click(screen.getByRole('button', { name: /create poll/i }));

      await waitFor(() => {
        expect(screen.getByText(/creating/i)).toBeInTheDocument();
      });
    });

    it('should include allowMultiple in poll data', async () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      typeInInput(screen.getByLabelText(/question/i), 'What toppings do you want?');
      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      typeInInput(optionInputs[0], 'Pepperoni');
      typeInInput(optionInputs[1], 'Mushrooms');

      fireEvent.click(screen.getByLabelText(/allow multiple/i));
      fireEvent.click(screen.getByRole('button', { name: /create poll/i }));

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            allowMultiple: true,
          })
        );
      });
    });

    it('should include closesAt in poll data when set', async () => {
      render(<PollCreationForm onCreate={mockOnCreate} />);

      typeInInput(screen.getByLabelText(/question/i), 'What is your favorite color?');
      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      typeInInput(optionInputs[0], 'Red');
      typeInInput(optionInputs[1], 'Blue');

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      typeInInput(
        screen.getByLabelText(/closing date/i),
        futureDate.toISOString().split('T')[0]
      );

      fireEvent.click(screen.getByRole('button', { name: /create poll/i }));

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            closesAt: expect.any(String),
          })
        );
      });
    });

    it('should display error on create failure', async () => {
      mockOnCreate.mockRejectedValue(new Error('Failed to create poll'));

      render(<PollCreationForm onCreate={mockOnCreate} />);

      typeInInput(screen.getByLabelText(/question/i), 'What is your favorite color?');
      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      typeInInput(optionInputs[0], 'Red');
      typeInInput(optionInputs[1], 'Blue');

      fireEvent.click(screen.getByRole('button', { name: /create poll/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('cancel', () => {
    it('should call onCancel when cancel button clicked', () => {
      const mockOnCancel = vi.fn();
      render(<PollCreationForm onCreate={mockOnCreate} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});
