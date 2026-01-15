'use client';

import React, { useState, useCallback } from 'react';
import type { PaymentHandles } from '@/lib/db/models/attendee';

interface PaymentProfileFormProps {
  initialHandles?: Partial<PaymentHandles>;
  onSave: (handles: Partial<PaymentHandles>) => Promise<void>;
  className?: string;
}

interface FormErrors {
  venmo?: string;
  paypal?: string;
  cashapp?: string;
  zelle?: string;
}

const validateVenmo = (value: string): string | undefined => {
  if (!value) return undefined;
  // Venmo usernames start with @ and are alphanumeric with underscores/hyphens
  if (!/^@[a-zA-Z0-9_-]+$/.test(value)) {
    return 'Invalid Venmo username. Must start with @ and contain only letters, numbers, underscores, or hyphens.';
  }
  return undefined;
};

const validatePaypal = (value: string): string | undefined => {
  if (!value) return undefined;
  // PayPal uses email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Invalid PayPal email address.';
  }
  return undefined;
};

const validateCashApp = (value: string): string | undefined => {
  if (!value) return undefined;
  // CashApp cashtags start with $ and are alphanumeric
  if (!/^\$[a-zA-Z0-9_-]+$/.test(value)) {
    return 'Invalid CashApp cashtag. Must start with $ and contain only letters, numbers, underscores, or hyphens.';
  }
  return undefined;
};

const validateZelle = (value: string): string | undefined => {
  if (!value) return undefined;
  // Zelle uses email or phone number
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isPhone = /^\+?[0-9]{10,15}$/.test(value.replace(/[\s()-]/g, ''));
  if (!isEmail && !isPhone) {
    return 'Invalid Zelle contact. Must be a valid email or phone number.';
  }
  return undefined;
};

export function PaymentProfileForm({
  initialHandles = {},
  onSave,
  className = '',
}: PaymentProfileFormProps) {
  const [venmo, setVenmo] = useState(initialHandles.venmo || '');
  const [paypal, setPaypal] = useState(initialHandles.paypal || '');
  const [cashapp, setCashapp] = useState(initialHandles.cashapp || '');
  const [zelle, setZelle] = useState(initialHandles.zelle || '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    const venmoError = validateVenmo(venmo);
    if (venmoError) newErrors.venmo = venmoError;

    const paypalError = validatePaypal(paypal);
    if (paypalError) newErrors.paypal = paypalError;

    const cashappError = validateCashApp(cashapp);
    if (cashappError) newErrors.cashapp = cashappError;

    const zelleError = validateZelle(zelle);
    if (zelleError) newErrors.zelle = zelleError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [venmo, paypal, cashapp, zelle]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isSaving) return;

      if (!validate()) {
        return;
      }

      setIsSaving(true);
      setSaveStatus('idle');
      setErrorMessage(null);

      try {
        const handles: Partial<PaymentHandles> = {};
        if (venmo.trim()) handles.venmo = venmo.trim();
        if (paypal.trim()) handles.paypal = paypal.trim();
        if (cashapp.trim()) handles.cashapp = cashapp.trim();
        if (zelle.trim()) handles.zelle = zelle.trim();

        await onSave(handles);
        setSaveStatus('success');
      } catch (error) {
        setSaveStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to save'
        );
      } finally {
        setIsSaving(false);
      }
    },
    [venmo, paypal, cashapp, zelle, isSaving, validate, onSave]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={`payment-profile-form ${className}`}
      data-testid="payment-profile-form"
    >
      <div className="payment-profile-form-field">
        <label htmlFor="venmo" className="payment-profile-form-label">
          Venmo
        </label>
        <input
          id="venmo"
          type="text"
          value={venmo}
          onChange={(e) => setVenmo(e.target.value)}
          placeholder="@username"
          className={`payment-profile-form-input ${errors.venmo ? 'input-error' : ''}`}
          aria-invalid={!!errors.venmo}
        />
        {errors.venmo && (
          <span className="payment-profile-form-error" role="alert">
            {errors.venmo}
          </span>
        )}
      </div>

      <div className="payment-profile-form-field">
        <label htmlFor="paypal" className="payment-profile-form-label">
          PayPal
        </label>
        <input
          id="paypal"
          type="text"
          value={paypal}
          onChange={(e) => setPaypal(e.target.value)}
          placeholder="email@example.com"
          className={`payment-profile-form-input ${errors.paypal ? 'input-error' : ''}`}
          aria-invalid={!!errors.paypal}
        />
        {errors.paypal && (
          <span className="payment-profile-form-error" role="alert">
            {errors.paypal}
          </span>
        )}
      </div>

      <div className="payment-profile-form-field">
        <label htmlFor="cashapp" className="payment-profile-form-label">
          CashApp
        </label>
        <input
          id="cashapp"
          type="text"
          value={cashapp}
          onChange={(e) => setCashapp(e.target.value)}
          placeholder="$cashtag"
          className={`payment-profile-form-input ${errors.cashapp ? 'input-error' : ''}`}
          aria-invalid={!!errors.cashapp}
        />
        {errors.cashapp && (
          <span className="payment-profile-form-error" role="alert">
            {errors.cashapp}
          </span>
        )}
      </div>

      <div className="payment-profile-form-field">
        <label htmlFor="zelle" className="payment-profile-form-label">
          Zelle
        </label>
        <input
          id="zelle"
          type="text"
          value={zelle}
          onChange={(e) => setZelle(e.target.value)}
          placeholder="email or phone"
          className={`payment-profile-form-input ${errors.zelle ? 'input-error' : ''}`}
          aria-invalid={!!errors.zelle}
        />
        {errors.zelle && (
          <span className="payment-profile-form-error" role="alert">
            {errors.zelle}
          </span>
        )}
      </div>

      <div className="payment-profile-form-actions">
        <button
          type="submit"
          disabled={isSaving}
          className="payment-profile-form-button"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {saveStatus === 'success' && (
        <div className="payment-profile-form-message success" role="status">
          Payment handles saved successfully!
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="payment-profile-form-message error" role="alert">
          {errorMessage || 'Failed to save payment handles'}
        </div>
      )}
    </form>
  );
}

export type { PaymentProfileFormProps };
