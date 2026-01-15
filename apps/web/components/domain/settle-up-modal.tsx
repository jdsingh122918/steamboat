'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { PaymentHandles } from '@/lib/db/models/attendee';
import type { PaymentMethod } from '@/lib/db/models/payment';
import {
  openPaymentLink,
  copyToClipboard,
  supportsDeepLink,
  getPaymentMethodDisplayName,
  type PaymentLinkResult,
} from '@/lib/utils/payment-links';

interface Settlement {
  amount_cents: number;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  toPaymentHandles: Partial<PaymentHandles>;
}

interface PaymentData {
  method: PaymentMethod;
  amount_cents: number;
  note?: string;
}

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (payment: PaymentData) => Promise<void>;
  settlement: Settlement;
  tripId: string;
}

type Step = 'select-method' | 'confirm';

const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

const PAYMENT_METHODS: { key: PaymentMethod; label: string; requiresHandle: boolean }[] = [
  { key: 'venmo', label: 'Venmo', requiresHandle: true },
  { key: 'paypal', label: 'PayPal', requiresHandle: true },
  { key: 'cashapp', label: 'CashApp', requiresHandle: true },
  { key: 'zelle', label: 'Zelle', requiresHandle: true },
  { key: 'cash', label: 'Cash', requiresHandle: false },
  { key: 'other', label: 'Other', requiresHandle: false },
];

export function SettleUpModal({
  isOpen,
  onClose,
  onPaymentComplete,
  settlement,
  tripId,
}: SettleUpModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [step, setStep] = useState<Step>('select-method');
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkResult, setLinkResult] = useState<PaymentLinkResult | null>(null);
  const [zelleHandleCopied, setZelleHandleCopied] = useState(false);

  // Reset state when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedMethod(null);
      setStep('select-method');
      setConfirmed(false);
      setNote('');
      setIsProcessing(false);
      setError(null);
      setIsGeneratingLink(false);
      setLinkResult(null);
      setZelleHandleCopied(false);
    }
  }, [isOpen]);

  const hasDigitalHandles =
    settlement.toPaymentHandles.venmo ||
    settlement.toPaymentHandles.paypal ||
    settlement.toPaymentHandles.cashapp ||
    settlement.toPaymentHandles.zelle;

  const availableMethods = PAYMENT_METHODS.filter((method) => {
    if (!method.requiresHandle) return true;
    const handleKey = method.key as keyof PaymentHandles;
    return !!settlement.toPaymentHandles[handleKey];
  });

  const getHandleForMethod = (method: PaymentMethod): string | undefined => {
    const handleKey = method as keyof PaymentHandles;
    return settlement.toPaymentHandles[handleKey];
  };

  const handleMethodSelect = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method);
    setError(null);
  }, []);

  const handlePayClick = useCallback(async () => {
    if (!selectedMethod) return;

    // For Zelle, show the handle and allow copying
    if (selectedMethod === 'zelle') {
      setStep('confirm');
      return;
    }

    // For methods that support deep links (venmo, paypal, cashapp)
    if (supportsDeepLink(selectedMethod)) {
      setIsGeneratingLink(true);
      setError(null);
      setLinkResult(null);

      try {
        const result = await openPaymentLink(
          tripId,
          settlement.toId,
          settlement.amount_cents,
          selectedMethod
        );

        setLinkResult(result);

        if (result.opened) {
          // Link was opened, move to confirmation step
          setStep('confirm');
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to open payment link');
      } finally {
        setIsGeneratingLink(false);
      }
    } else {
      // For cash/other, just move to confirmation
      setStep('confirm');
    }
  }, [selectedMethod, tripId, settlement.toId, settlement.amount_cents]);

  const handleConfirm = useCallback(async () => {
    if (!selectedMethod || !confirmed || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      await onPaymentComplete({
        method: selectedMethod,
        amount_cents: settlement.amount_cents,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedMethod, confirmed, isProcessing, onPaymentComplete, settlement.amount_cents, note, onClose]);

  const isDigitalMethod = selectedMethod && ['venmo', 'paypal', 'cashapp', 'zelle'].includes(selectedMethod);
  const isCashOrOther = selectedMethod === 'cash' || selectedMethod === 'other';

  const handleCopyZelleHandle = useCallback(async () => {
    const zelleHandle = settlement.toPaymentHandles.zelle;
    if (zelleHandle) {
      const success = await copyToClipboard(zelleHandle);
      if (success) {
        setZelleHandleCopied(true);
        setTimeout(() => setZelleHandleCopied(false), 2000);
      }
    }
  }, [settlement.toPaymentHandles.zelle]);

  if (!isOpen) return null;

  return (
    <div className="settle-up-modal-overlay" data-testid="settle-up-modal">
      <div className="settle-up-modal">
        <div className="settle-up-modal-header">
          <h2 className="settle-up-modal-title">Settle Up</h2>
          <button
            type="button"
            onClick={onClose}
            className="settle-up-modal-close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="settle-up-modal-body">
          <div className="settle-up-modal-amount">
            <span className="amount-label">Amount to pay</span>
            <span className="amount-value">{formatCurrency(settlement.amount_cents)}</span>
          </div>

          <div className="settle-up-modal-parties">
            <div className="party from">
              <span className="party-label">From</span>
              <span className="party-name">{settlement.fromName}</span>
            </div>
            <div className="party-arrow">→</div>
            <div className="party to">
              <span className="party-label">To</span>
              <span className="party-name">{settlement.toName}</span>
            </div>
          </div>

          {/* Recipient payment handles */}
          {hasDigitalHandles && (
            <div className="settle-up-modal-handles">
              <span className="handles-label">Payment handles:</span>
              <div className="handles-list">
                {settlement.toPaymentHandles.venmo && (
                  <span className="handle venmo">@{settlement.toPaymentHandles.venmo.replace('@', '')}</span>
                )}
                {settlement.toPaymentHandles.paypal && (
                  <span className="handle paypal">{settlement.toPaymentHandles.paypal}</span>
                )}
                {settlement.toPaymentHandles.cashapp && (
                  <span className="handle cashapp">{settlement.toPaymentHandles.cashapp}</span>
                )}
                {settlement.toPaymentHandles.zelle && (
                  <span className="handle zelle">{settlement.toPaymentHandles.zelle}</span>
                )}
              </div>
            </div>
          )}

          {!hasDigitalHandles && (
            <div className="settle-up-modal-no-handles">
              <span className="no-handles-message">
                No digital payment handles available. Use Cash or Other payment method.
              </span>
            </div>
          )}

          {/* Note input */}
          <div className="settle-up-modal-note">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              className="note-input"
            />
          </div>

          {/* Payment method selection */}
          {step === 'select-method' && (
            <div className="settle-up-modal-methods">
              <span className="methods-label">Select payment method:</span>
              <div className="methods-grid">
                {availableMethods.map((method) => (
                  <button
                    key={method.key}
                    type="button"
                    onClick={() => handleMethodSelect(method.key)}
                    className={`method-button ${selectedMethod === method.key ? 'selected' : ''}`}
                  >
                    {method.label}
                    {method.requiresHandle && getHandleForMethod(method.key) && (
                      <span className="method-handle">{getHandleForMethod(method.key)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pay button or Cash confirmation */}
          {step === 'select-method' && selectedMethod && (
            <div className="settle-up-modal-action">
              {isCashOrOther ? (
                <>
                  <label className="confirm-checkbox-label">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="confirm-checkbox"
                    />
                    <span>I confirm I have paid {formatCurrency(settlement.amount_cents)} in {selectedMethod}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!confirmed || isProcessing}
                    className="confirm-payment-button"
                  >
                    {isProcessing ? 'Processing...' : 'Confirm Payment'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handlePayClick}
                  disabled={isGeneratingLink}
                  className="pay-button"
                >
                  {isGeneratingLink
                    ? 'Opening...'
                    : `Pay with ${selectedMethod ? getPaymentMethodDisplayName(selectedMethod) : ''}`}
                </button>
              )}
            </div>
          )}

          {/* Confirmation step for digital payments */}
          {step === 'confirm' && isDigitalMethod && (
            <div className="settle-up-modal-confirm">
              {/* Success message for deep link payments */}
              {linkResult?.opened && (
                <div className="link-opened-notice" data-testid="link-opened-notice">
                  <span className="link-opened-icon">&#10003;</span>
                  <span>Payment app opened in a new tab</span>
                </div>
              )}

              {/* Zelle-specific instructions */}
              {selectedMethod === 'zelle' && settlement.toPaymentHandles.zelle && (
                <div className="zelle-instructions" data-testid="zelle-instructions">
                  <p className="zelle-message">
                    Zelle doesn&apos;t support payment links. Please send the payment manually using:
                  </p>
                  <div className="zelle-handle-container">
                    <span className="zelle-handle">{settlement.toPaymentHandles.zelle}</span>
                    <button
                      type="button"
                      onClick={handleCopyZelleHandle}
                      className="copy-handle-button"
                      data-testid="copy-zelle-handle"
                    >
                      {zelleHandleCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              <p className="confirm-instructions">
                {selectedMethod === 'zelle'
                  ? 'Open your banking app and complete the Zelle payment, then confirm below.'
                  : `Please complete the payment using ${getPaymentMethodDisplayName(selectedMethod)}, then confirm below.`}
              </p>
              <label className="confirm-checkbox-label">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="confirm-checkbox"
                />
                <span>I confirm I have sent the payment</span>
              </label>
              <div className="confirm-actions">
                <button
                  type="button"
                  onClick={() => {
                    setStep('select-method');
                    setLinkResult(null);
                  }}
                  className="back-button"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!confirmed || isProcessing}
                  className="confirm-button"
                >
                  {isProcessing ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="settle-up-modal-error" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="settle-up-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export type { SettleUpModalProps, Settlement, PaymentData };
