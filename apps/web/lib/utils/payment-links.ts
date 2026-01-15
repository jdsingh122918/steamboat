/**
 * Payment link utilities for opening payment deep links.
 *
 * Supports Venmo, PayPal, CashApp deep links.
 * Zelle does not have a deep link, so it returns fallback text.
 */

import type { PaymentMethod } from '@/lib/db/models/payment';

/**
 * Payment methods that support deep links.
 */
export const DEEP_LINK_METHODS = ['venmo', 'paypal', 'cashapp'] as const;
export type DeepLinkMethod = (typeof DEEP_LINK_METHODS)[number];

/**
 * Result of attempting to open a payment link.
 */
export interface PaymentLinkResult {
  /** Whether the link was opened successfully */
  opened: boolean;
  /** The link URL that was opened (if applicable) */
  link?: string;
  /** Fallback text to display (for methods without deep links) */
  fallbackText?: string;
  /** Receiver name for display */
  receiverName?: string;
  /** Formatted amount for display */
  amount?: string;
  /** Error message if opening failed */
  error?: string;
}

/**
 * API response from payment links endpoint.
 */
interface PaymentLinkApiResponse {
  success: boolean;
  data?: {
    method: string;
    link: string;
    receiverName: string;
    amount: string;
  };
  error?: string;
}

/**
 * Check if a payment method supports deep links.
 */
export function supportsDeepLink(method: PaymentMethod): method is DeepLinkMethod {
  return DEEP_LINK_METHODS.includes(method as DeepLinkMethod);
}

/**
 * Open a payment link for the given method.
 *
 * For Venmo, PayPal, and CashApp, this will:
 * 1. Call the API to generate a payment link with the recipient's handle
 * 2. Open the link in a new tab
 *
 * For Zelle, this returns fallback text since there's no deep link.
 *
 * @param tripId - The trip ID
 * @param toId - The recipient attendee ID
 * @param amount_cents - The amount to pay in cents
 * @param method - The payment method
 * @returns Result indicating success or providing fallback text
 */
export async function openPaymentLink(
  tripId: string,
  toId: string,
  amount_cents: number,
  method: PaymentMethod
): Promise<PaymentLinkResult> {
  // Zelle doesn't support deep links
  if (method === 'zelle') {
    return {
      opened: false,
      fallbackText:
        'Zelle does not support payment links. Please open your banking app and send the payment manually.',
    };
  }

  // Cash and Other don't have digital payment options
  if (method === 'cash' || method === 'other') {
    return {
      opened: false,
      error: `${method} does not support payment links`,
    };
  }

  // Validate method supports deep links
  if (!supportsDeepLink(method)) {
    return {
      opened: false,
      error: `Unknown payment method: ${method}`,
    };
  }

  try {
    const response = await fetch(`/api/trips/${tripId}/payments/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toId,
        amount_cents,
        method,
      }),
    });

    const data: PaymentLinkApiResponse = await response.json();

    if (!response.ok || !data.success) {
      return {
        opened: false,
        error: data.error || 'Failed to generate payment link',
      };
    }

    if (!data.data?.link) {
      return {
        opened: false,
        error: 'No payment link returned',
      };
    }

    // Open the link in a new tab
    const newWindow = window.open(data.data.link, '_blank');
    const opened = newWindow !== null;

    return {
      opened,
      link: data.data.link,
      receiverName: data.data.receiverName,
      amount: data.data.amount,
      error: opened ? undefined : 'Failed to open payment link. Please allow popups.',
    };
  } catch (error) {
    return {
      opened: false,
      error: error instanceof Error ? error.message : 'Failed to generate payment link',
    };
  }
}

/**
 * Copy text to clipboard.
 *
 * @param text - The text to copy
 * @returns Whether the copy succeeded
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  }
}

/**
 * Get display name for a payment method.
 */
export function getPaymentMethodDisplayName(method: PaymentMethod): string {
  const displayNames: Record<PaymentMethod, string> = {
    venmo: 'Venmo',
    paypal: 'PayPal',
    cashapp: 'Cash App',
    zelle: 'Zelle',
    cash: 'Cash',
    other: 'Other',
  };
  return displayNames[method] || method;
}
