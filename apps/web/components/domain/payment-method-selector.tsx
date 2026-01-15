'use client';

import React from 'react';

export type PaymentMethod = 'venmo' | 'paypal' | 'cashapp' | 'zelle' | 'cash' | 'other';

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  icon?: string;
  available: boolean;
}

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  availableHandles?: {
    venmo?: string;
    paypal?: string;
    cashapp?: string;
    zelle?: string;
  };
  className?: string;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: 'venmo', label: 'Venmo', icon: '💸', available: true },
  { value: 'paypal', label: 'PayPal', icon: '💳', available: true },
  { value: 'cashapp', label: 'Cash App', icon: '💵', available: true },
  { value: 'zelle', label: 'Zelle', icon: '🏦', available: true },
  { value: 'cash', label: 'Cash', icon: '💰', available: true },
  { value: 'other', label: 'Other', icon: '📝', available: true },
];

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  availableHandles = {},
  className = '',
}: PaymentMethodSelectorProps) {
  const getMethodAvailability = (method: PaymentMethod): boolean => {
    switch (method) {
      case 'venmo':
        return !!availableHandles.venmo;
      case 'paypal':
        return !!availableHandles.paypal;
      case 'cashapp':
        return !!availableHandles.cashapp;
      case 'zelle':
        return !!availableHandles.zelle;
      case 'cash':
      case 'other':
        return true;
      default:
        return false;
    }
  };

  const getMethodHandle = (method: PaymentMethod): string | undefined => {
    switch (method) {
      case 'venmo':
        return availableHandles.venmo;
      case 'paypal':
        return availableHandles.paypal;
      case 'cashapp':
        return availableHandles.cashapp;
      case 'zelle':
        return availableHandles.zelle;
      default:
        return undefined;
    }
  };

  return (
    <div
      className={`payment-method-selector ${className}`}
      data-testid="payment-method-selector"
      role="radiogroup"
      aria-label="Select payment method"
    >
      {PAYMENT_METHODS.map((method) => {
        const isAvailable = getMethodAvailability(method.value);
        const handle = getMethodHandle(method.value);
        const isSelected = selectedMethod === method.value;

        return (
          <button
            key={method.value}
            type="button"
            className={`payment-method-option ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
            onClick={() => isAvailable && onSelect(method.value)}
            disabled={!isAvailable}
            role="radio"
            aria-checked={isSelected}
            aria-disabled={!isAvailable}
            data-testid={`payment-method-${method.value}`}
          >
            <span className="payment-method-icon">{method.icon}</span>
            <span className="payment-method-label">{method.label}</span>
            {handle && (
              <span className="payment-method-handle">{handle}</span>
            )}
            {!isAvailable && method.value !== 'cash' && method.value !== 'other' && (
              <span className="payment-method-unavailable">Not set up</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export type { PaymentMethodSelectorProps };
