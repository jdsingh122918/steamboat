/**
 * Theme Utilities
 *
 * Provides theme management for light/dark mode support.
 * Handles system preference detection and theme persistence.
 */

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'theme';
const VALID_THEMES: Theme[] = ['light', 'dark', 'system'];

/**
 * Get the stored theme from localStorage
 */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(THEME_KEY);
  if (stored && VALID_THEMES.includes(stored as Theme)) {
    return stored as Theme;
  }
  return null;
}

/**
 * Store theme preference in localStorage
 */
export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * Get the system's preferred color scheme
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Get the effective theme (resolving 'system' to actual preference)
 */
export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Apply theme to the document
 */
export function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  root.setAttribute('style', `color-scheme: ${theme}`);
}

/**
 * Initialize theme on page load
 */
export function initializeTheme(): void {
  const stored = getStoredTheme() || 'system';
  const effective = getEffectiveTheme(stored);
  applyTheme(effective);
}

/**
 * Toggle between light and dark themes
 */
export function toggleTheme(): Theme {
  const current = getStoredTheme() || 'system';
  const effective = getEffectiveTheme(current);
  const newTheme = effective === 'dark' ? 'light' : 'dark';

  setStoredTheme(newTheme);
  applyTheme(newTheme);

  return newTheme;
}

/**
 * Subscribe to system theme changes
 */
export function subscribeToSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };

  mediaQuery.addEventListener('change', handler);

  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}
