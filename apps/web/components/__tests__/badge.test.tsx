import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '../ui/badge';

describe('Badge', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Badge className="custom-class">Test</Badge>);
      expect(screen.getByText('Test')).toHaveClass('custom-class');
    });
  });

  describe('variants', () => {
    it('should render default variant', () => {
      render(<Badge>Default</Badge>);
      expect(screen.getByText('Default')).toHaveClass('badge-default');
    });

    it('should render primary variant', () => {
      render(<Badge variant="primary">Primary</Badge>);
      expect(screen.getByText('Primary')).toHaveClass('badge-primary');
    });

    it('should render secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      expect(screen.getByText('Secondary')).toHaveClass('badge-secondary');
    });

    it('should render success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      expect(screen.getByText('Success')).toHaveClass('badge-success');
    });

    it('should render warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      expect(screen.getByText('Warning')).toHaveClass('badge-warning');
    });

    it('should render error variant', () => {
      render(<Badge variant="error">Error</Badge>);
      expect(screen.getByText('Error')).toHaveClass('badge-error');
    });

    it('should render outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>);
      expect(screen.getByText('Outline')).toHaveClass('badge-outline');
    });
  });

  describe('sizes', () => {
    it('should render default size (md)', () => {
      render(<Badge>Medium</Badge>);
      expect(screen.getByText('Medium')).toHaveClass('badge-md');
    });

    it('should render small size', () => {
      render(<Badge size="sm">Small</Badge>);
      expect(screen.getByText('Small')).toHaveClass('badge-sm');
    });

    it('should render large size', () => {
      render(<Badge size="lg">Large</Badge>);
      expect(screen.getByText('Large')).toHaveClass('badge-lg');
    });
  });

  describe('dot', () => {
    it('should render as dot when dot prop is true', () => {
      render(<Badge dot />);
      expect(screen.getByTestId('badge')).toHaveClass('badge-dot');
    });

    it('should not render children when dot prop is true', () => {
      render(<Badge dot>Hidden</Badge>);
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });
  });

  describe('removable', () => {
    it('should show remove button when removable', () => {
      render(<Badge removable onRemove={() => {}}>Removable</Badge>);
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('should call onRemove when remove button is clicked', () => {
      const handleRemove = vi.fn();
      render(<Badge removable onRemove={handleRemove}>Removable</Badge>);
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it('should not show remove button when not removable', () => {
      render(<Badge>Not Removable</Badge>);
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });
  });

  describe('icon', () => {
    it('should render left icon', () => {
      render(
        <Badge leftIcon={<span data-testid="left-icon">★</span>}>
          With Icon
        </Badge>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      render(
        <Badge rightIcon={<span data-testid="right-icon">→</span>}>
          With Icon
        </Badge>
      );
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('rounded', () => {
    it('should render rounded by default', () => {
      render(<Badge>Rounded</Badge>);
      expect(screen.getByText('Rounded')).toHaveClass('badge-rounded');
    });

    it('should render pill shape', () => {
      render(<Badge shape="pill">Pill</Badge>);
      expect(screen.getByText('Pill')).toHaveClass('badge-pill');
    });

    it('should render square shape', () => {
      render(<Badge shape="square">Square</Badge>);
      expect(screen.getByText('Square')).toHaveClass('badge-square');
    });
  });

  describe('interactive', () => {
    it('should be clickable when onClick is provided', () => {
      const handleClick = vi.fn();
      render(<Badge onClick={handleClick}>Clickable</Badge>);
      fireEvent.click(screen.getByText('Clickable'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have cursor pointer when clickable', () => {
      render(<Badge onClick={() => {}}>Clickable</Badge>);
      expect(screen.getByText('Clickable')).toHaveClass('badge-clickable');
    });
  });

  describe('accessibility', () => {
    it('should have appropriate role', () => {
      render(<Badge>Test</Badge>);
      expect(screen.getByTestId('badge')).toBeInTheDocument();
    });

    it('should be focusable when interactive', () => {
      render(<Badge onClick={() => {}} tabIndex={0}>Interactive</Badge>);
      const badge = screen.getByText('Interactive');
      badge.focus();
      expect(badge).toHaveFocus();
    });
  });
});
