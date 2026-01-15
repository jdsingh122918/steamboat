import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../ui/input';

describe('Input', () => {
  describe('rendering', () => {
    it('should render an input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Input className="custom-class" />);
      expect(screen.getByRole('textbox')).toHaveClass('custom-class');
    });

    it('should forward ref to input element', () => {
      const ref = vi.fn();
      render(<Input ref={ref} />);
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
    });

    it('should pass through additional props', () => {
      render(<Input data-testid="custom-input" aria-label="Custom label" />);
      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Custom label');
    });
  });

  describe('types', () => {
    it('should default to text type', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    it('should support email type', () => {
      render(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('should support password type', () => {
      render(<Input type="password" />);
      // Password inputs don't have textbox role
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('should support number type', () => {
      render(<Input type="number" />);
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });

    it('should support tel type', () => {
      render(<Input type="tel" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel');
    });

    it('should support url type', () => {
      render(<Input type="url" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'url');
    });

    it('should support search type', () => {
      render(<Input type="search" />);
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('should render default size (md)', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toHaveClass('input-md');
    });

    it('should render small size', () => {
      render(<Input size="sm" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-sm');
    });

    it('should render large size', () => {
      render(<Input size="lg" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-lg');
    });
  });

  describe('states', () => {
    it('should handle disabled state', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should handle readOnly state', () => {
      render(<Input readOnly value="Read only value" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });

    it('should handle error state', () => {
      render(<Input error />);
      expect(screen.getByRole('textbox')).toHaveClass('input-error');
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should handle required state', () => {
      render(<Input required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });
  });

  describe('interactions', () => {
    it('should call onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('should call onFocus when focused', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);
      fireEvent.focus(screen.getByRole('textbox'));
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur when blurred', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('placeholder', () => {
    it('should display placeholder text', () => {
      render(<Input placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });
  });

  describe('value', () => {
    it('should display controlled value', () => {
      render(<Input value="controlled" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveValue('controlled');
    });

    it('should display defaultValue', () => {
      render(<Input defaultValue="default" />);
      expect(screen.getByRole('textbox')).toHaveValue('default');
    });
  });

  describe('with wrapper', () => {
    it('should render with label', () => {
      render(<Input label="Email" id="email" />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('should render with helper text', () => {
      render(<Input helperText="Enter a valid email" />);
      expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    });

    it('should render with error message', () => {
      render(<Input error errorMessage="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should display error message instead of helper text when both provided', () => {
      render(
        <Input
          error
          helperText="Helper text"
          errorMessage="Error message"
        />
      );
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });

    it('should render with left icon', () => {
      render(<Input leftIcon={<span data-testid="left-icon">@</span>} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render with right icon', () => {
      render(<Input rightIcon={<span data-testid="right-icon">✓</span>} />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should connect label to input via id', () => {
      render(<Input label="Username" id="username" />);
      const input = screen.getByLabelText('Username');
      expect(input).toHaveAttribute('id', 'username');
    });

    it('should connect error message via aria-describedby', () => {
      render(<Input error errorMessage="Error" id="field" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'field-error');
    });

    it('should connect helper text via aria-describedby', () => {
      render(<Input helperText="Help" id="field" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'field-helper');
    });
  });
});
