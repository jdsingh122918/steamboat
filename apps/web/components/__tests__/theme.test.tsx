import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme, getSystemTheme } from '../theme/theme-provider';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
})();

// Mock matchMedia
const mockMatchMedia = vi.fn((query: string) => ({
  matches: query.includes('dark'),
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Test component that uses the theme hook
function TestComponent() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')} data-testid="set-light">
        Light
      </button>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">
        Dark
      </button>
      <button onClick={() => setTheme('system')} data-testid="set-system">
        System
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('matchMedia', mockMatchMedia);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('should default to system theme when no preference is stored', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme').textContent).toBe('system');
    });

    it('should load stored theme from localStorage', () => {
      mockLocalStorage.setItem('steamboat-theme', 'dark');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme').textContent).toBe('dark');
    });

    it('should respect defaultTheme prop', () => {
      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme').textContent).toBe('light');
    });

    it('should prioritize localStorage over defaultTheme', () => {
      mockLocalStorage.setItem('steamboat-theme', 'dark');

      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme').textContent).toBe('dark');
    });
  });

  describe('theme switching', () => {
    it('should update theme when setTheme is called', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      act(() => {
        screen.getByTestId('set-dark').click();
      });

      expect(screen.getByTestId('theme').textContent).toBe('dark');
    });

    it('should persist theme to localStorage', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      act(() => {
        screen.getByTestId('set-dark').click();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('steamboat-theme', 'dark');
    });

    it('should allow switching between all theme modes', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      act(() => {
        screen.getByTestId('set-light').click();
      });
      expect(screen.getByTestId('theme').textContent).toBe('light');

      act(() => {
        screen.getByTestId('set-dark').click();
      });
      expect(screen.getByTestId('theme').textContent).toBe('dark');

      act(() => {
        screen.getByTestId('set-system').click();
      });
      expect(screen.getByTestId('theme').textContent).toBe('system');
    });
  });

  describe('resolved theme', () => {
    it('should return light when theme is light', () => {
      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('resolved-theme').textContent).toBe('light');
    });

    it('should return dark when theme is dark', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('resolved-theme').textContent).toBe('dark');
    });

    it('should return system preference when theme is system', () => {
      // Mock system preference to dark
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <ThemeProvider defaultTheme="system">
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('resolved-theme').textContent).toBe('dark');
    });
  });

  describe('storageKey', () => {
    it('should use custom storage key when provided', () => {
      render(
        <ThemeProvider storageKey="custom-theme-key">
          <TestComponent />
        </ThemeProvider>
      );

      act(() => {
        screen.getByTestId('set-dark').click();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('custom-theme-key', 'dark');
    });

    it('should load from custom storage key', () => {
      mockLocalStorage.setItem('custom-theme-key', 'dark');

      render(
        <ThemeProvider storageKey="custom-theme-key">
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme').textContent).toBe('dark');
    });
  });

  describe('useTheme hook', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });
});

describe('getSystemTheme', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', mockMatchMedia);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return dark when system prefers dark mode', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(getSystemTheme()).toBe('dark');
  });

  it('should return light when system prefers light mode', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: !query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(getSystemTheme()).toBe('light');
  });

  it('should return light as fallback when matchMedia is not available', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(getSystemTheme()).toBe('light');
  });
});
