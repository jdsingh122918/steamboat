import { describe, it, expect } from 'vitest';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  breakpoints,
  cssVariables,
  getCssVariablesString,
} from '../theme/design-tokens';

describe('Design Tokens', () => {
  describe('colors', () => {
    it('should have primary color palette', () => {
      expect(colors.primary).toBeDefined();
      expect(colors.primary[500]).toBe('#3B82F6'); // Blue-500
      expect(colors.primary[100]).toBeDefined();
      expect(colors.primary[900]).toBeDefined();
    });

    it('should have secondary color palette', () => {
      expect(colors.secondary).toBeDefined();
      expect(colors.secondary[500]).toBeDefined();
    });

    it('should have semantic colors', () => {
      expect(colors.success).toBeDefined();
      expect(colors.success[500]).toBe('#10B981'); // Green-500
      expect(colors.warning).toBeDefined();
      expect(colors.warning[500]).toBe('#F59E0B'); // Amber-500
      expect(colors.error).toBeDefined();
      expect(colors.error[500]).toBe('#EF4444'); // Red-500
    });

    it('should have neutral/gray colors', () => {
      expect(colors.neutral).toBeDefined();
      expect(colors.neutral[50]).toBeDefined();
      expect(colors.neutral[100]).toBeDefined();
      expect(colors.neutral[500]).toBeDefined();
      expect(colors.neutral[900]).toBeDefined();
    });

    it('should have light theme background and foreground', () => {
      expect(colors.light).toBeDefined();
      expect(colors.light.background).toBeDefined();
      expect(colors.light.foreground).toBeDefined();
      expect(colors.light.card).toBeDefined();
      expect(colors.light.border).toBeDefined();
      expect(colors.light.muted).toBeDefined();
    });

    it('should have dark theme background and foreground', () => {
      expect(colors.dark).toBeDefined();
      expect(colors.dark.background).toBeDefined();
      expect(colors.dark.foreground).toBeDefined();
      expect(colors.dark.card).toBeDefined();
      expect(colors.dark.border).toBeDefined();
      expect(colors.dark.muted).toBeDefined();
    });
  });

  describe('spacing', () => {
    it('should have spacing scale from 0 to 96', () => {
      expect(spacing[0]).toBe('0');
      expect(spacing[1]).toBe('0.25rem');
      expect(spacing[2]).toBe('0.5rem');
      expect(spacing[4]).toBe('1rem');
      expect(spacing[8]).toBe('2rem');
      expect(spacing[16]).toBe('4rem');
    });

    it('should have consistent spacing progression', () => {
      expect(spacing.px).toBe('1px');
      expect(spacing[0.5]).toBe('0.125rem');
    });
  });

  describe('typography', () => {
    it('should have font families', () => {
      expect(typography.fontFamily.sans).toBeDefined();
      expect(typography.fontFamily.mono).toBeDefined();
    });

    it('should have font sizes from xs to 5xl', () => {
      expect(typography.fontSize.xs).toBeDefined();
      expect(typography.fontSize.sm).toBeDefined();
      expect(typography.fontSize.base).toBe('1rem');
      expect(typography.fontSize.lg).toBeDefined();
      expect(typography.fontSize.xl).toBeDefined();
      expect(typography.fontSize['2xl']).toBeDefined();
      expect(typography.fontSize['4xl']).toBeDefined();
    });

    it('should have font weights', () => {
      expect(typography.fontWeight.normal).toBe('400');
      expect(typography.fontWeight.medium).toBe('500');
      expect(typography.fontWeight.semibold).toBe('600');
      expect(typography.fontWeight.bold).toBe('700');
    });

    it('should have line heights', () => {
      expect(typography.lineHeight.none).toBe('1');
      expect(typography.lineHeight.tight).toBe('1.25');
      expect(typography.lineHeight.normal).toBe('1.5');
      expect(typography.lineHeight.relaxed).toBe('1.625');
    });
  });

  describe('borderRadius', () => {
    it('should have border radius values', () => {
      expect(borderRadius.none).toBe('0');
      expect(borderRadius.sm).toBe('0.125rem');
      expect(borderRadius.DEFAULT).toBe('0.25rem');
      expect(borderRadius.md).toBe('0.375rem');
      expect(borderRadius.lg).toBe('0.5rem');
      expect(borderRadius.xl).toBe('0.75rem');
      expect(borderRadius.full).toBe('9999px');
    });
  });

  describe('shadows', () => {
    it('should have shadow values', () => {
      expect(shadows.sm).toBeDefined();
      expect(shadows.DEFAULT).toBeDefined();
      expect(shadows.md).toBeDefined();
      expect(shadows.lg).toBeDefined();
      expect(shadows.xl).toBeDefined();
      expect(shadows.none).toBe('none');
    });
  });

  describe('breakpoints', () => {
    it('should have mobile-first breakpoints', () => {
      expect(breakpoints.sm).toBe('640px');
      expect(breakpoints.md).toBe('768px');
      expect(breakpoints.lg).toBe('1024px');
      expect(breakpoints.xl).toBe('1280px');
      expect(breakpoints['2xl']).toBe('1536px');
    });
  });

  describe('cssVariables', () => {
    it('should have CSS variable names for light theme', () => {
      expect(cssVariables.light['--background']).toBe(colors.light.background);
      expect(cssVariables.light['--foreground']).toBe(colors.light.foreground);
      expect(cssVariables.light['--card']).toBe(colors.light.card);
      expect(cssVariables.light['--primary']).toBe(colors.primary[500]);
    });

    it('should have CSS variable names for dark theme', () => {
      expect(cssVariables.dark['--background']).toBe(colors.dark.background);
      expect(cssVariables.dark['--foreground']).toBe(colors.dark.foreground);
      expect(cssVariables.dark['--card']).toBe(colors.dark.card);
    });
  });

  describe('getCssVariablesString', () => {
    it('should generate CSS variable string for light theme', () => {
      const css = getCssVariablesString('light');
      expect(css).toContain('--background:');
      expect(css).toContain('--foreground:');
      expect(css).toContain('--primary:');
    });

    it('should generate CSS variable string for dark theme', () => {
      const css = getCssVariablesString('dark');
      expect(css).toContain('--background:');
      expect(css).toContain('--foreground:');
      expect(css).toContain(colors.dark.background);
    });

    it('should format as valid CSS', () => {
      const css = getCssVariablesString('light');
      // Each variable should end with semicolon
      const variables = css.split(';').filter(Boolean);
      variables.forEach((v) => {
        expect(v.trim()).toMatch(/^--[\w-]+:.+$/);
      });
    });
  });
});
