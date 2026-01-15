import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDateShort, getInitials } from '../format';

describe('formatCurrency', () => {
  it('formats positive dollar amounts', () => {
    expect(formatCurrency(1500)).toBe('$1,500.00');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(50.5)).toBe('$50.50');
  });

  it('formats negative dollar amounts with negative sign prefix', () => {
    expect(formatCurrency(-50)).toBe('-$50.00');
    expect(formatCurrency(-1500.99)).toBe('-$1,500.99');
  });

  it('converts cents to dollars when isCents is true', () => {
    expect(formatCurrency(1500, { isCents: true })).toBe('$15.00');
    expect(formatCurrency(99, { isCents: true })).toBe('$0.99');
    expect(formatCurrency(10050, { isCents: true })).toBe('$100.50');
  });

  it('handles negative cents amounts', () => {
    expect(formatCurrency(-1500, { isCents: true })).toBe('-$15.00');
  });

  it('respects custom currency', () => {
    expect(formatCurrency(100, { currency: 'EUR' })).toMatch(/100/);
    expect(formatCurrency(100, { currency: 'GBP' })).toMatch(/100/);
  });

  it('uses USD as default currency', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });
});

describe('formatDate', () => {
  it('formats string dates with default options', () => {
    const result = formatDate('2024-01-15');
    expect(result).toBe('January 15, 2024');
  });

  it('formats Date objects', () => {
    const date = new Date('2024-06-20T12:00:00');
    const result = formatDate(date);
    expect(result).toBe('June 20, 2024');
  });

  it('accepts custom format options', () => {
    const result = formatDate('2024-01-15', {
      year: '2-digit',
      month: 'short',
      day: 'numeric',
    });
    expect(result).toBe('Jan 15, 24');
  });

  it('handles weekday option', () => {
    const result = formatDate('2024-01-15', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    expect(result).toBe('Monday, January 15');
  });
});

describe('formatDateShort', () => {
  it('formats string dates to short format', () => {
    expect(formatDateShort('2024-01-15')).toBe('Jan 15');
    expect(formatDateShort('2024-12-25')).toBe('Dec 25');
  });

  it('formats Date objects to short format', () => {
    const date = new Date('2024-06-01T12:00:00');
    expect(formatDateShort(date)).toBe('Jun 1');
  });
});

describe('getInitials', () => {
  it('extracts initials from two-word names', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Alice Smith')).toBe('AS');
  });

  it('handles single-word names', () => {
    expect(getInitials('Madonna')).toBe('M');
    expect(getInitials('Prince')).toBe('P');
  });

  it('handles multi-word names (uses first and last)', () => {
    expect(getInitials('Mary Jane Watson')).toBe('MW');
    expect(getInitials('Jean Claude Van Damme')).toBe('JD');
  });

  it('handles names with extra whitespace', () => {
    expect(getInitials('  John   Doe  ')).toBe('JD');
    expect(getInitials('  Alice  ')).toBe('A');
  });

  it('returns uppercase initials', () => {
    expect(getInitials('john doe')).toBe('JD');
    expect(getInitials('alice')).toBe('A');
  });
});
