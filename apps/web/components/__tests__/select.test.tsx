import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select, SelectOption } from '../ui/select';

const options: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

describe('Select', () => {
  describe('rendering', () => {
    it('should render a select element', () => {
      render(<Select options={options} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(<Select options={options} />);
      expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Banana' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Cherry' })).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Select options={options} className="custom-class" />);
      expect(screen.getByRole('combobox')).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = vi.fn();
      render(<Select options={options} ref={ref} />);
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLSelectElement));
    });
  });

  describe('placeholder', () => {
    it('should show placeholder when provided', () => {
      render(<Select options={options} placeholder="Select a fruit..." />);
      expect(screen.getByRole('option', { name: 'Select a fruit...' })).toBeInTheDocument();
    });

    it('should have placeholder as disabled option', () => {
      render(<Select options={options} placeholder="Select a fruit..." />);
      const placeholder = screen.getByRole('option', { name: 'Select a fruit...' });
      expect(placeholder).toBeDisabled();
    });
  });

  describe('sizes', () => {
    it('should render default size (md)', () => {
      render(<Select options={options} />);
      expect(screen.getByRole('combobox')).toHaveClass('select-md');
    });

    it('should render small size', () => {
      render(<Select options={options} size="sm" />);
      expect(screen.getByRole('combobox')).toHaveClass('select-sm');
    });

    it('should render large size', () => {
      render(<Select options={options} size="lg" />);
      expect(screen.getByRole('combobox')).toHaveClass('select-lg');
    });
  });

  describe('states', () => {
    it('should handle disabled state', () => {
      render(<Select options={options} disabled />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should handle error state', () => {
      render(<Select options={options} error />);
      expect(screen.getByRole('combobox')).toHaveClass('select-error');
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should handle required state', () => {
      render(<Select options={options} required />);
      expect(screen.getByRole('combobox')).toBeRequired();
    });
  });

  describe('interactions', () => {
    it('should call onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<Select options={options} onChange={handleChange} />);
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'banana' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('should update value when option is selected', () => {
      render(<Select options={options} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'banana' } });
      expect(select).toHaveValue('banana');
    });
  });

  describe('controlled value', () => {
    it('should display controlled value', () => {
      render(<Select options={options} value="cherry" onChange={() => {}} />);
      expect(screen.getByRole('combobox')).toHaveValue('cherry');
    });

    it('should support defaultValue', () => {
      render(<Select options={options} defaultValue="banana" />);
      expect(screen.getByRole('combobox')).toHaveValue('banana');
    });
  });

  describe('with wrapper', () => {
    it('should render with label', () => {
      render(<Select options={options} label="Fruit" id="fruit" />);
      expect(screen.getByLabelText('Fruit')).toBeInTheDocument();
    });

    it('should render with helper text', () => {
      render(<Select options={options} helperText="Choose your favorite fruit" />);
      expect(screen.getByText('Choose your favorite fruit')).toBeInTheDocument();
    });

    it('should render with error message', () => {
      render(<Select options={options} error errorMessage="Please select a fruit" />);
      expect(screen.getByText('Please select a fruit')).toBeInTheDocument();
    });

    it('should display error message instead of helper text when both provided', () => {
      render(
        <Select
          options={options}
          error
          helperText="Helper text"
          errorMessage="Error message"
        />
      );
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('disabled options', () => {
    it('should support disabled options', () => {
      const optionsWithDisabled: SelectOption[] = [
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana', disabled: true },
        { value: 'cherry', label: 'Cherry' },
      ];
      render(<Select options={optionsWithDisabled} />);
      expect(screen.getByRole('option', { name: 'Banana' })).toBeDisabled();
    });
  });

  describe('option groups', () => {
    it('should support option groups', () => {
      const groupedOptions: SelectOption[] = [
        { value: 'apple', label: 'Apple', group: 'Fruits' },
        { value: 'banana', label: 'Banana', group: 'Fruits' },
        { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
      ];
      render(<Select options={groupedOptions} />);
      expect(screen.getByRole('group', { name: 'Fruits' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Vegetables' })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should connect label to select via id', () => {
      render(<Select options={options} label="Fruit" id="fruit" />);
      const select = screen.getByLabelText('Fruit');
      expect(select).toHaveAttribute('id', 'fruit');
    });

    it('should connect error message via aria-describedby', () => {
      render(<Select options={options} error errorMessage="Error" id="field" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-describedby', 'field-error');
    });
  });
});
