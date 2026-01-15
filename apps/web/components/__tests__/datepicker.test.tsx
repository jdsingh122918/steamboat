import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatePicker } from '../ui/datepicker';

describe('DatePicker', () => {
  describe('rendering', () => {
    it('should render a date input', () => {
      render(<DatePicker />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should have type="date" on the native input', () => {
      render(<DatePicker />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'date');
    });

    it('should apply custom className', () => {
      render(<DatePicker className="custom-class" />);
      expect(screen.getByRole('textbox')).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = vi.fn();
      render(<DatePicker ref={ref} />);
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
    });
  });

  describe('value', () => {
    it('should display controlled value', () => {
      render(<DatePicker value="2024-01-15" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveValue('2024-01-15');
    });

    it('should display defaultValue', () => {
      render(<DatePicker defaultValue="2024-01-15" />);
      expect(screen.getByRole('textbox')).toHaveValue('2024-01-15');
    });

    it('should update value on change', () => {
      const handleChange = vi.fn();
      render(<DatePicker onChange={handleChange} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '2024-02-20' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('constraints', () => {
    it('should support min date', () => {
      render(<DatePicker min="2024-01-01" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('min', '2024-01-01');
    });

    it('should support max date', () => {
      render(<DatePicker max="2024-12-31" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('max', '2024-12-31');
    });

    it('should support both min and max', () => {
      render(<DatePicker min="2024-01-01" max="2024-12-31" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('min', '2024-01-01');
      expect(input).toHaveAttribute('max', '2024-12-31');
    });
  });

  describe('sizes', () => {
    it('should render default size (md)', () => {
      render(<DatePicker />);
      expect(screen.getByRole('textbox')).toHaveClass('datepicker-md');
    });

    it('should render small size', () => {
      render(<DatePicker size="sm" />);
      expect(screen.getByRole('textbox')).toHaveClass('datepicker-sm');
    });

    it('should render large size', () => {
      render(<DatePicker size="lg" />);
      expect(screen.getByRole('textbox')).toHaveClass('datepicker-lg');
    });
  });

  describe('states', () => {
    it('should handle disabled state', () => {
      render(<DatePicker disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should handle readOnly state', () => {
      render(<DatePicker readOnly value="2024-01-15" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });

    it('should handle error state', () => {
      render(<DatePicker error />);
      expect(screen.getByRole('textbox')).toHaveClass('datepicker-error');
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should handle required state', () => {
      render(<DatePicker required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });
  });

  describe('with wrapper', () => {
    it('should render with label', () => {
      render(<DatePicker label="Birth Date" id="birthdate" />);
      expect(screen.getByLabelText('Birth Date')).toBeInTheDocument();
    });

    it('should render with helper text', () => {
      render(<DatePicker helperText="Enter your date of birth" />);
      expect(screen.getByText('Enter your date of birth')).toBeInTheDocument();
    });

    it('should render with error message', () => {
      render(<DatePicker error errorMessage="Please enter a valid date" />);
      expect(screen.getByText('Please enter a valid date')).toBeInTheDocument();
    });

    it('should display error message instead of helper text when both provided', () => {
      render(
        <DatePicker
          error
          helperText="Helper text"
          errorMessage="Error message"
        />
      );
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('placeholder', () => {
    it('should display placeholder', () => {
      render(<DatePicker placeholder="Select a date..." />);
      expect(screen.getByPlaceholderText('Select a date...')).toBeInTheDocument();
    });
  });

  describe('format', () => {
    it('should handle ISO format by default', () => {
      render(<DatePicker value="2024-01-15" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveValue('2024-01-15');
    });
  });

  describe('accessibility', () => {
    it('should connect label to input via id', () => {
      render(<DatePicker label="Date" id="date" />);
      const input = screen.getByLabelText('Date');
      expect(input).toHaveAttribute('id', 'date');
    });

    it('should connect error message via aria-describedby', () => {
      render(<DatePicker error errorMessage="Error" id="field" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'field-error');
    });

    it('should connect helper text via aria-describedby', () => {
      render(<DatePicker helperText="Help" id="field" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'field-helper');
    });
  });

  describe('clear button', () => {
    it('should show clear button when value is set and clearable', () => {
      render(<DatePicker value="2024-01-15" clearable onChange={() => {}} />);
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('should not show clear button when no value', () => {
      render(<DatePicker clearable />);
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    });

    it('should clear value when clear button is clicked', () => {
      const handleChange = vi.fn();
      render(<DatePicker value="2024-01-15" clearable onChange={handleChange} />);
      fireEvent.click(screen.getByRole('button', { name: /clear/i }));
      expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
        target: expect.objectContaining({ value: '' })
      }));
    });
  });
});
