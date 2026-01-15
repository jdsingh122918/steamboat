import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../ui/skeleton';

describe('Skeleton', () => {
  describe('rendering', () => {
    it('should render with default styles', () => {
      render(<Skeleton />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('skeleton');
    });

    it('should apply custom className', () => {
      render(<Skeleton className="custom-class" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('custom-class');
    });

    it('should have animation', () => {
      render(<Skeleton />);
      expect(screen.getByTestId('skeleton')).toHaveClass('skeleton-pulse');
    });

    it('should allow disabling animation', () => {
      render(<Skeleton animate={false} />);
      expect(screen.getByTestId('skeleton')).not.toHaveClass('skeleton-pulse');
    });
  });

  describe('variants', () => {
    it('should render text variant by default', () => {
      render(<Skeleton />);
      expect(screen.getByTestId('skeleton')).toHaveClass('skeleton-text');
    });

    it('should render circular variant', () => {
      render(<Skeleton variant="circular" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('skeleton-circular');
    });

    it('should render rectangular variant', () => {
      render(<Skeleton variant="rectangular" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('skeleton-rectangular');
    });

    it('should render rounded variant', () => {
      render(<Skeleton variant="rounded" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('skeleton-rounded');
    });
  });

  describe('dimensions', () => {
    it('should accept width as number (pixels)', () => {
      render(<Skeleton width={100} />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ width: '100px' });
    });

    it('should accept width as string', () => {
      render(<Skeleton width="50%" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ width: '50%' });
    });

    it('should accept height as number (pixels)', () => {
      render(<Skeleton height={50} />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ height: '50px' });
    });

    it('should accept height as string', () => {
      render(<Skeleton height="2rem" />);
      const skeleton = screen.getByTestId('skeleton');
      // Browser converts rem to px, so check if style attribute is set correctly
      expect(skeleton.style.height).toBe('2rem');
    });

    it('should apply both width and height', () => {
      render(<Skeleton width={100} height={50} />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ width: '100px', height: '50px' });
    });
  });

  describe('accessibility', () => {
    it('should have aria-hidden attribute', () => {
      render(<Skeleton />);
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

describe('Skeleton.Text', () => {
  it('should render multiple lines', () => {
    render(<Skeleton.Text lines={3} />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('should make last line shorter by default', () => {
    render(<Skeleton.Text lines={2} />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons[1]).toHaveClass('skeleton-short');
  });

  it('should allow uniform lines', () => {
    render(<Skeleton.Text lines={2} lastLineShorter={false} />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons[1]).not.toHaveClass('skeleton-short');
  });
});

describe('Skeleton.Avatar', () => {
  it('should render circular shape', () => {
    render(<Skeleton.Avatar />);
    expect(screen.getByTestId('skeleton')).toHaveClass('skeleton-circular');
  });

  it('should apply size', () => {
    render(<Skeleton.Avatar size={48} />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveStyle({ width: '48px', height: '48px' });
  });
});

describe('Skeleton.Card', () => {
  it('should render a card skeleton', () => {
    render(<Skeleton.Card />);
    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument();
  });

  it('should include avatar placeholder', () => {
    render(<Skeleton.Card showAvatar />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.some(s => s.classList.contains('skeleton-circular'))).toBe(true);
  });

  it('should include text lines', () => {
    render(<Skeleton.Card />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
