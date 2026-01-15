import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';

describe('Card', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Card className="custom-class">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = vi.fn();
      render(<Card ref={ref}>Content</Card>);
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    });

    it('should pass through additional props', () => {
      render(<Card data-custom="value">Content</Card>);
      expect(screen.getByTestId('card')).toHaveAttribute('data-custom', 'value');
    });
  });

  describe('variants', () => {
    it('should render default variant', () => {
      render(<Card>Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-default');
    });

    it('should render elevated variant', () => {
      render(<Card variant="elevated">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-elevated');
    });

    it('should render outlined variant', () => {
      render(<Card variant="outlined">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-outlined');
    });

    it('should render ghost variant', () => {
      render(<Card variant="ghost">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-ghost');
    });
  });

  describe('padding', () => {
    it('should render with default padding', () => {
      render(<Card>Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-padding-md');
    });

    it('should render with no padding', () => {
      render(<Card padding="none">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-padding-none');
    });

    it('should render with small padding', () => {
      render(<Card padding="sm">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-padding-sm');
    });

    it('should render with large padding', () => {
      render(<Card padding="lg">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-padding-lg');
    });
  });

  describe('interactive', () => {
    it('should be clickable when onClick is provided', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-interactive');
    });

    it('should render as link when asChild is true with link', () => {
      render(<Card asChild><a href="/test">Link Card</a></Card>);
      expect(screen.getByRole('link')).toBeInTheDocument();
    });
  });
});

describe('CardHeader', () => {
  it('should render children', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<CardHeader className="custom-class">Header</CardHeader>);
    expect(screen.getByTestId('card-header')).toHaveClass('custom-class');
  });
});

describe('CardTitle', () => {
  it('should render as h3 by default', () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('should render with custom heading level', () => {
    render(<CardTitle as="h2">Title</CardTitle>);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<CardTitle className="custom-class">Title</CardTitle>);
    expect(screen.getByRole('heading')).toHaveClass('custom-class');
  });
});

describe('CardDescription', () => {
  it('should render children', () => {
    render(<CardDescription>Description text</CardDescription>);
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<CardDescription className="custom-class">Description</CardDescription>);
    expect(screen.getByTestId('card-description')).toHaveClass('custom-class');
  });
});

describe('CardContent', () => {
  it('should render children', () => {
    render(<CardContent>Content text</CardContent>);
    expect(screen.getByText('Content text')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<CardContent className="custom-class">Content</CardContent>);
    expect(screen.getByTestId('card-content')).toHaveClass('custom-class');
  });
});

describe('CardFooter', () => {
  it('should render children', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<CardFooter className="custom-class">Footer</CardFooter>);
    expect(screen.getByTestId('card-footer')).toHaveClass('custom-class');
  });

  it('should support flex alignment', () => {
    render(<CardFooter justify="between">Footer</CardFooter>);
    expect(screen.getByTestId('card-footer')).toHaveClass('card-footer-between');
  });
});

describe('Card composition', () => {
  it('should compose all parts correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description goes here</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content of the card</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByRole('heading', { name: 'Card Title' })).toBeInTheDocument();
    expect(screen.getByText('Card description goes here')).toBeInTheDocument();
    expect(screen.getByText('Main content of the card')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});
