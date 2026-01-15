'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input } from '@/components/ui';

interface FormErrors {
  invitationCode?: string;
  name?: string;
  general?: string;
}

interface PaymentHandles {
  venmo: string;
  paypal: string;
  cashapp: string;
}

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [invitationCode, setInvitationCode] = useState('');
  const [name, setName] = useState('');
  const [paymentHandles, setPaymentHandles] = useState<PaymentHandles>({
    venmo: '',
    paypal: '',
    cashapp: '',
  });
  const [showPaymentHandles, setShowPaymentHandles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Auto-fill invitation code from URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setInvitationCode(token);
    }
  }, [searchParams]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!invitationCode.trim()) {
      newErrors.invitationCode = 'Invitation code is required';
    }

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: invitationCode,
          name: name.trim(),
          paymentHandles: {
            venmo: paymentHandles.venmo.trim() || undefined,
            paypal: paymentHandles.paypal.trim() || undefined,
            cashapp: paymentHandles.cashapp.trim() || undefined,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || 'Failed to join trip' });
        return;
      }

      router.push(`/trips/${data.tripId}/dashboard`);
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="join-page">
      <div className="join-page-container">
        <div className="join-page-header">
          <h1 className="join-page-title">Join Trip</h1>
          <p className="join-page-subtitle">
            Enter your invitation code to join the trip
          </p>
        </div>

        <form onSubmit={handleSubmit} className="join-page-form">
          {errors.general && (
            <div className="join-page-error" role="alert">
              {errors.general}
            </div>
          )}

          <Input
            label="Invitation Code"
            id="invitation-code"
            value={invitationCode}
            onChange={(e) => setInvitationCode(e.target.value)}
            error={!!errors.invitationCode}
            errorMessage={errors.invitationCode}
            placeholder="Enter your invitation code"
          />

          <Input
            label="Your Name"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!errors.name}
            errorMessage={errors.name}
            placeholder="Enter your name"
          />

          <div
            className="join-page-payment-handles"
            data-testid="payment-handles-section"
            data-expanded={showPaymentHandles}
          >
            <button
              type="button"
              className="join-page-payment-toggle"
              onClick={() => setShowPaymentHandles(!showPaymentHandles)}
            >
              Add Payment Info (Optional)
              <svg
                className={`join-page-payment-toggle-icon ${showPaymentHandles ? 'expanded' : ''}`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>

            {showPaymentHandles && (
              <div className="join-page-payment-inputs">
                <Input
                  label="Venmo"
                  id="venmo"
                  value={paymentHandles.venmo}
                  onChange={(e) =>
                    setPaymentHandles({ ...paymentHandles, venmo: e.target.value })
                  }
                  placeholder="@username"
                />

                <Input
                  label="PayPal"
                  id="paypal"
                  value={paymentHandles.paypal}
                  onChange={(e) =>
                    setPaymentHandles({ ...paymentHandles, paypal: e.target.value })
                  }
                  placeholder="email@example.com"
                />

                <Input
                  label="Cash App"
                  id="cashapp"
                  value={paymentHandles.cashapp}
                  onChange={(e) =>
                    setPaymentHandles({ ...paymentHandles, cashapp: e.target.value })
                  }
                  placeholder="$cashtag"
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Join
          </Button>
        </form>
      </div>
    </div>
  );
}
