import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock theme utilities
vi.mock('@/lib/theme', () => ({
  getStoredTheme: vi.fn(),
  setStoredTheme: vi.fn(),
  getSystemTheme: vi.fn(() => 'light'),
  getEffectiveTheme: vi.fn((t) => (t === 'system' ? 'light' : t)),
  applyTheme: vi.fn(),
  subscribeToSystemTheme: vi.fn(() => () => {}),
}));

import { ThemeToggle, ThemeProvider, useTheme } from '../ui/theme-toggle';
import * as themeUtils from '@/lib/theme';

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (themeUtils.getStoredTheme as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  describe('rendering', () => {
    it('should render the toggle button', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-label');
    });
  });

  describe('theme switching', () => {
    it('should toggle to dark theme when clicked', async () => {
      (themeUtils.getEffectiveTheme as ReturnType<typeof vi.fn>).mockReturnValue('light');

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(themeUtils.setStoredTheme).toHaveBeenCalledWith('dark');
      });
    });

    it('should toggle to light theme when in dark mode', async () => {
      (themeUtils.getStoredTheme as ReturnType<typeof vi.fn>).mockReturnValue('dark');
      (themeUtils.getEffectiveTheme as ReturnType<typeof vi.fn>).mockReturnValue('dark');

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(themeUtils.setStoredTheme).toHaveBeenCalledWith('light');
      });
    });
  });

  describe('icons', () => {
    it('should show sun icon in dark mode', () => {
      (themeUtils.getStoredTheme as ReturnType<typeof vi.fn>).mockReturnValue('dark');
      (themeUtils.getEffectiveTheme as ReturnType<typeof vi.fn>).mockReturnValue('dark');

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
    });

    it('should show moon icon in light mode', () => {
      (themeUtils.getStoredTheme as ReturnType<typeof vi.fn>).mockReturnValue('light');
      (themeUtils.getEffectiveTheme as ReturnType<typeof vi.fn>).mockReturnValue('light');

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
    });
  });
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (themeUtils.getStoredTheme as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (themeUtils.getSystemTheme as ReturnType<typeof vi.fn>).mockReturnValue('light');
    (themeUtils.getEffectiveTheme as ReturnType<typeof vi.fn>).mockReturnValue('light');
  });

  it('should provide theme context to children', () => {
    const TestComponent = () => {
      const { theme } = useTheme();
      return <div data-testid="theme">{theme}</div>;
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('should initialize with stored theme', () => {
    (themeUtils.getStoredTheme as ReturnType<typeof vi.fn>).mockReturnValue('dark');

    const TestComponent = () => {
      const { theme } = useTheme();
      return <div data-testid="theme">{theme}</div>;
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('should apply theme on mount', () => {
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>
    );

    expect(themeUtils.applyTheme).toHaveBeenCalled();
  });
});

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (themeUtils.getStoredTheme as ReturnType<typeof vi.fn>).mockReturnValue('light');
    (themeUtils.getEffectiveTheme as ReturnType<typeof vi.fn>).mockReturnValue('light');
  });

  it('should expose setTheme function', async () => {
    const TestComponent = () => {
      const { setTheme } = useTheme();
      return (
        <button onClick={() => setTheme('dark')} data-testid="set-dark">
          Set Dark
        </button>
      );
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('set-dark'));

    await waitFor(() => {
      expect(themeUtils.setStoredTheme).toHaveBeenCalledWith('dark');
    });
  });

  it('should expose resolvedTheme', () => {
    (themeUtils.getEffectiveTheme as ReturnType<typeof vi.fn>).mockReturnValue('dark');

    const TestComponent = () => {
      const { resolvedTheme } = useTheme();
      return <div data-testid="resolved">{resolvedTheme}</div>;
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });
});
