import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle, Checkbox } from '../ui/toggle';

describe('Toggle', () => {
  describe('rendering', () => {
    it('should render a switch', () => {
      render(<Toggle />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Toggle className="custom-class" />);
      // className is applied to the wrapper, not the input
      expect(screen.getByTestId('toggle')).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = vi.fn();
      render(<Toggle ref={ref} />);
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('states', () => {
    it('should be off by default', () => {
      render(<Toggle />);
      expect(screen.getByRole('switch')).not.toBeChecked();
    });

    it('should be on when checked prop is true', () => {
      render(<Toggle checked onChange={() => {}} />);
      expect(screen.getByRole('switch')).toBeChecked();
    });

    it('should be on when defaultChecked is true', () => {
      render(<Toggle defaultChecked />);
      expect(screen.getByRole('switch')).toBeChecked();
    });

    it('should handle disabled state', () => {
      render(<Toggle disabled />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('should call onChange when toggled', () => {
      const handleChange = vi.fn();
      render(<Toggle onChange={handleChange} />);
      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('should toggle state on click', () => {
      render(<Toggle />);
      const toggle = screen.getByRole('switch');
      expect(toggle).not.toBeChecked();
      fireEvent.click(toggle);
      expect(toggle).toBeChecked();
    });

    it('should not toggle when disabled', () => {
      render(<Toggle disabled />);
      const toggle = screen.getByRole('switch');
      expect(toggle).not.toBeChecked();
      fireEvent.click(toggle);
      expect(toggle).not.toBeChecked();
    });
  });

  describe('sizes', () => {
    it('should render default size (md)', () => {
      render(<Toggle />);
      expect(screen.getByTestId('toggle')).toHaveClass('toggle-md');
    });

    it('should render small size', () => {
      render(<Toggle size="sm" />);
      expect(screen.getByTestId('toggle')).toHaveClass('toggle-sm');
    });

    it('should render large size', () => {
      render(<Toggle size="lg" />);
      expect(screen.getByTestId('toggle')).toHaveClass('toggle-lg');
    });
  });

  describe('label', () => {
    it('should render with label', () => {
      render(<Toggle label="Enable notifications" />);
      expect(screen.getByText('Enable notifications')).toBeInTheDocument();
    });

    it('should associate label with toggle', () => {
      render(<Toggle label="Enable notifications" id="notifications" />);
      expect(screen.getByLabelText('Enable notifications')).toBeInTheDocument();
    });

    it('should render label on the left when labelPosition is left', () => {
      render(<Toggle label="Enable notifications" labelPosition="left" />);
      const wrapper = screen.getByTestId('toggle-wrapper');
      expect(wrapper).toHaveClass('toggle-label-left');
    });

    it('should render label on the right by default', () => {
      render(<Toggle label="Enable notifications" />);
      const wrapper = screen.getByTestId('toggle-wrapper');
      expect(wrapper).toHaveClass('toggle-label-right');
    });
  });

  describe('accessibility', () => {
    it('should have aria-checked attribute', () => {
      render(<Toggle />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('should update aria-checked when toggled', () => {
      render(<Toggle />);
      const toggle = screen.getByRole('switch');
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });
  });
});

describe('Checkbox', () => {
  describe('rendering', () => {
    it('should render a checkbox', () => {
      render(<Checkbox />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Checkbox className="custom-class" />);
      // className is applied to the wrapper, not the input
      expect(screen.getByTestId('checkbox')).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = vi.fn();
      render(<Checkbox ref={ref} />);
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
    });
  });

  describe('states', () => {
    it('should be unchecked by default', () => {
      render(<Checkbox />);
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('should be checked when checked prop is true', () => {
      render(<Checkbox checked onChange={() => {}} />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('should be checked when defaultChecked is true', () => {
      render(<Checkbox defaultChecked />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('should handle disabled state', () => {
      render(<Checkbox disabled />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('should handle indeterminate state', () => {
      render(<Checkbox indeterminate />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.indeterminate).toBe(true);
    });
  });

  describe('interactions', () => {
    it('should call onChange when clicked', () => {
      const handleChange = vi.fn();
      render(<Checkbox onChange={handleChange} />);
      fireEvent.click(screen.getByRole('checkbox'));
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('should toggle checked state on click', () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('should not toggle when disabled', () => {
      const handleChange = vi.fn();
      render(<Checkbox disabled onChange={handleChange} />);
      fireEvent.click(screen.getByRole('checkbox'));
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('sizes', () => {
    it('should render default size (md)', () => {
      render(<Checkbox />);
      expect(screen.getByTestId('checkbox')).toHaveClass('checkbox-md');
    });

    it('should render small size', () => {
      render(<Checkbox size="sm" />);
      expect(screen.getByTestId('checkbox')).toHaveClass('checkbox-sm');
    });

    it('should render large size', () => {
      render(<Checkbox size="lg" />);
      expect(screen.getByTestId('checkbox')).toHaveClass('checkbox-lg');
    });
  });

  describe('error state', () => {
    it('should display error styling', () => {
      render(<Checkbox error />);
      // error class is on the wrapper
      expect(screen.getByTestId('checkbox')).toHaveClass('checkbox-error');
    });
  });

  describe('label', () => {
    it('should render with label', () => {
      render(<Checkbox label="I agree to terms" />);
      expect(screen.getByText('I agree to terms')).toBeInTheDocument();
    });

    it('should associate label with checkbox', () => {
      render(<Checkbox label="I agree to terms" id="terms" />);
      expect(screen.getByLabelText('I agree to terms')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<Checkbox label="Terms" description="Read the full terms and conditions" />);
      expect(screen.getByText('Read the full terms and conditions')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should support aria-invalid for error state', () => {
      render(<Checkbox error />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should support required attribute', () => {
      render(<Checkbox required />);
      expect(screen.getByRole('checkbox')).toBeRequired();
    });
  });
});
