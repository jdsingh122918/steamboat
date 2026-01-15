import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '../ui/spinner';

describe('Spinner', () => {
  describe('rendering', () => {
    it('should render with status role for accessibility', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      render(<Spinner />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should hide label visually but keep for screen readers', () => {
      render(<Spinner />);
      expect(screen.getByText('Loading...')).toHaveClass('sr-only');
    });

    it('should apply custom className', () => {
      render(<Spinner className="custom-class" />);
      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });
  });

  describe('sizes', () => {
    it('should render default size (md)', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toHaveClass('spinner-md');
    });

    it('should render small size', () => {
      render(<Spinner size="sm" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-sm');
    });

    it('should render large size', () => {
      render(<Spinner size="lg" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-lg');
    });

    it('should render extra large size', () => {
      render(<Spinner size="xl" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-xl');
    });
  });

  describe('colors', () => {
    it('should render primary color by default', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toHaveClass('spinner-primary');
    });

    it('should render secondary color', () => {
      render(<Spinner color="secondary" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-secondary');
    });

    it('should render white color', () => {
      render(<Spinner color="white" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-white');
    });

    it('should render muted color', () => {
      render(<Spinner color="muted" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-muted');
    });
  });

  describe('label', () => {
    it('should allow custom label', () => {
      render(<Spinner label="Processing..." />);
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });
});
