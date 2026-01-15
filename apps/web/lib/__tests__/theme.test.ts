import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  Theme,
  getStoredTheme,
  setStoredTheme,
  getSystemTheme,
  getEffectiveTheme,
  applyTheme,
} from '../theme';

describe('Theme Utilities', () => {
  const originalLocalStorage = global.localStorage;
  const originalMatchMedia = global.matchMedia;

  let mockStorage: Record<string, string>;
  let mockDarkModePreference: boolean;

  beforeEach(() => {
    mockStorage = {};
    mockDarkModePreference = false;

    // Mock localStorage
    global.localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      length: 0,
      key: () => null,
    };

    // Mock matchMedia
    global.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark') ? mockDarkModePreference : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Mock document
    global.document = {
      documentElement: {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          toggle: vi.fn(),
        },
        setAttribute: vi.fn(),
      },
    } as unknown as Document;
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    global.matchMedia = originalMatchMedia;
  });

  describe('Theme type', () => {
    it('should have light theme option', () => {
      const theme: Theme = 'light';
      expect(theme).toBe('light');
    });

    it('should have dark theme option', () => {
      const theme: Theme = 'dark';
      expect(theme).toBe('dark');
    });

    it('should have system theme option', () => {
      const theme: Theme = 'system';
      expect(theme).toBe('system');
    });
  });

  describe('getStoredTheme', () => {
    it('should return null when no theme is stored', () => {
      expect(getStoredTheme()).toBeNull();
    });

    it('should return stored theme', () => {
      mockStorage['theme'] = 'dark';
      expect(getStoredTheme()).toBe('dark');
    });

    it('should return null for invalid stored value', () => {
      mockStorage['theme'] = 'invalid';
      expect(getStoredTheme()).toBeNull();
    });
  });

  describe('setStoredTheme', () => {
    it('should store light theme', () => {
      setStoredTheme('light');
      expect(mockStorage['theme']).toBe('light');
    });

    it('should store dark theme', () => {
      setStoredTheme('dark');
      expect(mockStorage['theme']).toBe('dark');
    });

    it('should store system theme', () => {
      setStoredTheme('system');
      expect(mockStorage['theme']).toBe('system');
    });
  });

  describe('getSystemTheme', () => {
    it('should return dark when system prefers dark mode', () => {
      mockDarkModePreference = true;
      expect(getSystemTheme()).toBe('dark');
    });

    it('should return light when system prefers light mode', () => {
      mockDarkModePreference = false;
      expect(getSystemTheme()).toBe('light');
    });
  });

  describe('getEffectiveTheme', () => {
    it('should return stored theme when not system', () => {
      expect(getEffectiveTheme('dark')).toBe('dark');
      expect(getEffectiveTheme('light')).toBe('light');
    });

    it('should return system preference when theme is system', () => {
      mockDarkModePreference = true;
      expect(getEffectiveTheme('system')).toBe('dark');

      mockDarkModePreference = false;
      expect(getEffectiveTheme('system')).toBe('light');
    });
  });

  describe('applyTheme', () => {
    it('should add dark class for dark theme', () => {
      applyTheme('dark');
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should remove dark class for light theme', () => {
      applyTheme('light');
      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });

    it('should set color-scheme attribute', () => {
      applyTheme('dark');
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
        'style',
        'color-scheme: dark'
      );
    });
  });
});
