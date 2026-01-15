import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast, ToastProvider, useToast } from '../ui/toast';

// Test component that uses the useToast hook
function TestToastConsumer() {
  const { toast, dismiss } = useToast();
  return (
    <div>
      <button onClick={() => toast({ title: 'Test toast' })} data-testid="show-toast">
        Show Toast
      </button>
      <button onClick={() => toast({ title: 'Success', variant: 'success' })} data-testid="show-success">
        Show Success
      </button>
      <button onClick={() => toast({ title: 'Error', variant: 'error' })} data-testid="show-error">
        Show Error
      </button>
      <button onClick={() => dismiss()} data-testid="dismiss-all">
        Dismiss All
      </button>
    </div>
  );
}

describe('Toast', () => {
  describe('rendering', () => {
    it('should render title', () => {
      render(<Toast title="Test Title" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<Toast title="Title" description="Test description" />);
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Toast title="Title" className="custom-class" />);
      expect(screen.getByTestId('toast')).toHaveClass('custom-class');
    });
  });

  describe('variants', () => {
    it('should render default variant', () => {
      render(<Toast title="Default" />);
      expect(screen.getByTestId('toast')).toHaveClass('toast-default');
    });

    it('should render success variant', () => {
      render(<Toast title="Success" variant="success" />);
      expect(screen.getByTestId('toast')).toHaveClass('toast-success');
    });

    it('should render error variant', () => {
      render(<Toast title="Error" variant="error" />);
      expect(screen.getByTestId('toast')).toHaveClass('toast-error');
    });

    it('should render warning variant', () => {
      render(<Toast title="Warning" variant="warning" />);
      expect(screen.getByTestId('toast')).toHaveClass('toast-warning');
    });

    it('should render info variant', () => {
      render(<Toast title="Info" variant="info" />);
      expect(screen.getByTestId('toast')).toHaveClass('toast-info');
    });
  });

  describe('close button', () => {
    it('should render close button when closable', () => {
      render(<Toast title="Title" closable onClose={() => {}} />);
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should not render close button when not closable', () => {
      render(<Toast title="Title" closable={false} />);
      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(<Toast title="Title" closable onClose={handleClose} />);
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('action', () => {
    it('should render action button when action is provided', () => {
      render(
        <Toast
          title="Title"
          action={{ label: 'Undo', onClick: () => {} }}
        />
      );
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    });

    it('should call action onClick when action button is clicked', () => {
      const handleAction = vi.fn();
      render(
        <Toast
          title="Title"
          action={{ label: 'Undo', onClick: handleAction }}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('icons', () => {
    it('should render custom icon when provided', () => {
      render(<Toast title="Title" icon={<span data-testid="custom-icon">!</span>} />);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should render variant icon when showIcon is true', () => {
      render(<Toast title="Success" variant="success" showIcon />);
      expect(screen.getByTestId('toast-icon')).toBeInTheDocument();
    });
  });
});

describe('ToastProvider', () => {
  it('should render children', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Child content</div>
      </ToastProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should render toast container', () => {
    render(
      <ToastProvider>
        <div>Content</div>
      </ToastProvider>
    );
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  });
});

describe('useToast', () => {
  it('should throw error when used outside ToastProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<TestToastConsumer />);
    }).toThrow('useToast must be used within a ToastProvider');
    consoleSpy.mockRestore();
  });

  describe('within provider', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show toast when toast function is called', () => {
      render(
        <ToastProvider>
          <TestToastConsumer />
        </ToastProvider>
      );
      fireEvent.click(screen.getByTestId('show-toast'));
      expect(screen.getByText('Test toast')).toBeInTheDocument();
    });

    it('should show toast with correct variant', () => {
      render(
        <ToastProvider>
          <TestToastConsumer />
        </ToastProvider>
      );
      fireEvent.click(screen.getByTestId('show-success'));
      expect(screen.getByTestId('toast')).toHaveClass('toast-success');
    });

    it('should auto-dismiss toast after duration', () => {
      render(
        <ToastProvider>
          <TestToastConsumer />
        </ToastProvider>
      );
      fireEvent.click(screen.getByTestId('show-toast'));
      expect(screen.getByText('Test toast')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000); // Default duration
      });

      expect(screen.queryByText('Test toast')).not.toBeInTheDocument();
    });

    it('should dismiss all toasts when dismiss is called without id', () => {
      render(
        <ToastProvider>
          <TestToastConsumer />
        </ToastProvider>
      );
      fireEvent.click(screen.getByTestId('show-toast'));
      fireEvent.click(screen.getByTestId('show-success'));

      expect(screen.getByText('Test toast')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('dismiss-all'));

      expect(screen.queryByText('Test toast')).not.toBeInTheDocument();
      expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });
  });
});

describe('Toast positioning', () => {
  it('should position toasts at top-right by default', () => {
    render(
      <ToastProvider>
        <div>Content</div>
      </ToastProvider>
    );
    expect(screen.getByTestId('toast-container')).toHaveClass('toast-position-top-right');
  });

  it('should position toasts at bottom-right', () => {
    render(
      <ToastProvider position="bottom-right">
        <div>Content</div>
      </ToastProvider>
    );
    expect(screen.getByTestId('toast-container')).toHaveClass('toast-position-bottom-right');
  });

  it('should position toasts at top-center', () => {
    render(
      <ToastProvider position="top-center">
        <div>Content</div>
      </ToastProvider>
    );
    expect(screen.getByTestId('toast-container')).toHaveClass('toast-position-top-center');
  });
});
