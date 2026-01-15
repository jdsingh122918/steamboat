/**
 * Centralized format utilities for consistent formatting across the application.
 */

/**
 * Options for currency formatting.
 */
export interface FormatCurrencyOptions {
  /** Currency code (default: 'USD') */
  currency?: string;
  /** Whether the amount is in cents (default: false) */
  isCents?: boolean;
}

/**
 * Format a number as currency.
 *
 * @param amount - The amount to format (in dollars or cents based on isCents)
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1500) // "$1,500.00"
 * formatCurrency(1500, { isCents: true }) // "$15.00"
 * formatCurrency(-50.5) // "-$50.50"
 */
export function formatCurrency(
  amount: number,
  options: FormatCurrencyOptions = {}
): string {
  const { currency = 'USD', isCents = false } = options;

  const dollarAmount = isCents ? amount / 100 : amount;
  const isNegative = dollarAmount < 0;
  const absAmount = Math.abs(dollarAmount);

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(absAmount);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format a date for display.
 *
 * @param date - The date to format (string or Date object)
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string
 *
 * @example
 * formatDate('2024-01-15') // "January 15, 2024"
 * formatDate(new Date(), { month: 'short', day: 'numeric' }) // "Jan 15"
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  let dateObj: Date;
  if (typeof date === 'string') {
    // Check if it's a full ISO string (has T in it)
    if (date.includes('T')) {
      // Parse as ISO and use UTC values to avoid timezone shifts
      const parsed = new Date(date);
      dateObj = new Date(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
        12,
        0,
        0
      );
    } else {
      // For date-only strings (YYYY-MM-DD), add time to avoid timezone issues
      dateObj = new Date(date + 'T12:00:00');
    }
  } else {
    // For Date objects, use UTC values to avoid timezone shifts
    dateObj = new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      12,
      0,
      0
    );
  }
  return dateObj.toLocaleDateString('en-US', options);
}

/**
 * Format a date in short format (e.g., "Jan 15").
 *
 * @param date - The date to format (string or Date object)
 * @returns Short formatted date string
 *
 * @example
 * formatDateShort('2024-01-15') // "Jan 15"
 * formatDateShort(new Date()) // "Jan 15"
 */
export function formatDateShort(date: string | Date): string {
  return formatDate(date, { month: 'short', day: 'numeric' });
}

/**
 * Extract initials from a name.
 *
 * @param name - The full name to extract initials from
 * @returns Uppercase initials (1-2 characters)
 *
 * @example
 * getInitials('John Doe') // "JD"
 * getInitials('Alice') // "A"
 * getInitials('Mary Jane Watson') // "MW"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
