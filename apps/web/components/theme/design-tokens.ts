/**
 * Design Tokens for Steamboat
 *
 * These tokens define the visual language of the application.
 * All values are based on a consistent scale for maintainability.
 */

export const colors = {
  // Primary - Blue palette
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#172554',
  },

  // Secondary - Slate palette
  secondary: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Success - Green palette
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
    950: '#022C22',
  },

  // Warning - Amber palette
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
  },

  // Error - Red palette
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },

  // Neutral - Gray palette
  neutral: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#09090B',
  },

  // Theme-specific colors
  light: {
    background: '#FFFFFF',
    foreground: '#09090B',
    card: '#FFFFFF',
    cardForeground: '#09090B',
    popover: '#FFFFFF',
    popoverForeground: '#09090B',
    muted: '#F4F4F5',
    mutedForeground: '#71717A',
    border: '#E4E4E7',
    input: '#E4E4E7',
    ring: '#3B82F6',
  },

  dark: {
    background: '#09090B',
    foreground: '#FAFAFA',
    card: '#18181B',
    cardForeground: '#FAFAFA',
    popover: '#18181B',
    popoverForeground: '#FAFAFA',
    muted: '#27272A',
    mutedForeground: '#A1A1AA',
    border: '#27272A',
    input: '#27272A',
    ring: '#3B82F6',
  },
} as const;

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
} as const;

export const typography = {
  fontFamily: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },

  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
    '8xl': '6rem',
    '9xl': '8rem',
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  modalBackdrop: '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070',
  toast: '1080',
} as const;

export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  timing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

// CSS Variables mapping for themes
export const cssVariables = {
  light: {
    '--background': colors.light.background,
    '--foreground': colors.light.foreground,
    '--card': colors.light.card,
    '--card-foreground': colors.light.cardForeground,
    '--popover': colors.light.popover,
    '--popover-foreground': colors.light.popoverForeground,
    '--muted': colors.light.muted,
    '--muted-foreground': colors.light.mutedForeground,
    '--border': colors.light.border,
    '--input': colors.light.input,
    '--ring': colors.light.ring,
    '--primary': colors.primary[500],
    '--primary-foreground': '#FFFFFF',
    '--secondary': colors.secondary[500],
    '--secondary-foreground': '#FFFFFF',
    '--success': colors.success[500],
    '--success-foreground': '#FFFFFF',
    '--warning': colors.warning[500],
    '--warning-foreground': '#000000',
    '--error': colors.error[500],
    '--error-foreground': '#FFFFFF',
  },
  dark: {
    '--background': colors.dark.background,
    '--foreground': colors.dark.foreground,
    '--card': colors.dark.card,
    '--card-foreground': colors.dark.cardForeground,
    '--popover': colors.dark.popover,
    '--popover-foreground': colors.dark.popoverForeground,
    '--muted': colors.dark.muted,
    '--muted-foreground': colors.dark.mutedForeground,
    '--border': colors.dark.border,
    '--input': colors.dark.input,
    '--ring': colors.dark.ring,
    '--primary': colors.primary[500],
    '--primary-foreground': '#FFFFFF',
    '--secondary': colors.secondary[400],
    '--secondary-foreground': '#FFFFFF',
    '--success': colors.success[500],
    '--success-foreground': '#FFFFFF',
    '--warning': colors.warning[500],
    '--warning-foreground': '#000000',
    '--error': colors.error[500],
    '--error-foreground': '#FFFFFF',
  },
} as const;

/**
 * Generates a CSS variable string for the given theme
 */
export function getCssVariablesString(theme: 'light' | 'dark'): string {
  const variables = cssVariables[theme];
  return Object.entries(variables)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}
