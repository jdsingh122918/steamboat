import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import { SettlementEmail, SettlementEmailProps } from '../settlement-email';

describe('SettlementEmail', () => {
  const defaultProps: SettlementEmailProps = {
    recipientName: 'John',
    tripName: 'Vegas Bachelor Party 2025',
    payerName: 'Mike',
    amount: 150.0,
    currency: 'USD',
    paymentMethod: 'Venmo',
    settledAt: new Date('2026-01-15T10:30:00Z'),
    tripUrl: 'https://steamboat.app/trips/123',
  };

  describe('rendering', () => {
    it('should render recipient name', async () => {
      const html = await render(<SettlementEmail {...defaultProps} />);
      expect(html).toContain('John');
    });

    it('should render trip name', async () => {
      const html = await render(<SettlementEmail {...defaultProps} />);
      expect(html).toContain('Vegas Bachelor Party 2025');
    });

    it('should render payer name', async () => {
      const html = await render(<SettlementEmail {...defaultProps} />);
      expect(html).toContain('Mike');
    });

    it('should render amount', async () => {
      const html = await render(<SettlementEmail {...defaultProps} />);
      expect(html).toContain('150');
    });

    it('should render payment method', async () => {
      const html = await render(<SettlementEmail {...defaultProps} />);
      expect(html).toContain('Venmo');
    });

    it('should render trip link', async () => {
      const html = await render(<SettlementEmail {...defaultProps} />);
      expect(html).toContain('https://steamboat.app/trips/123');
    });
  });

  describe('currency formatting', () => {
    it('should format USD correctly', async () => {
      const html = await render(<SettlementEmail {...defaultProps} />);
      expect(html).toContain('$');
    });

    it('should format EUR correctly', async () => {
      const props = { ...defaultProps, currency: 'EUR' };
      const html = await render(<SettlementEmail {...props} />);
      expect(html).toContain('€');
    });
  });

  describe('preview text', () => {
    it('should mention payment received', async () => {
      const html = await render(<SettlementEmail {...defaultProps} />);
      // Preview should indicate payment was received
      expect(html.toLowerCase()).toContain('payment');
    });
  });

  describe('settlement types', () => {
    it('should render as payment received for creditor', async () => {
      const props = { ...defaultProps, type: 'received' as const };
      const html = await render(<SettlementEmail {...props} />);
      expect(html.toLowerCase()).toContain('received');
    });

    it('should render as payment confirmed for payer', async () => {
      const props = { ...defaultProps, type: 'confirmed' as const };
      const html = await render(<SettlementEmail {...props} />);
      expect(html.toLowerCase()).toContain('confirm');
    });
  });

  describe('optional fields', () => {
    it('should render with note when provided', async () => {
      const props = {
        ...defaultProps,
        note: 'Thanks for the great trip!',
      };
      const html = await render(<SettlementEmail {...props} />);
      expect(html).toContain('Thanks for the great trip!');
    });

    it('should render without note', async () => {
      const html = await render(<SettlementEmail {...defaultProps} />);
      expect(html).not.toContain('Note:');
    });
  });

  describe('structure', () => {
    it('should use BaseLayout', async () => {
      const html = await render(<SettlementEmail {...defaultProps} />);
      expect(html).toContain('Steamboat');
    });

    it('should be valid HTML', async () => {
      const html = await render(<SettlementEmail {...defaultProps} />);
      expect(html).toContain('<!DOCTYPE html');
      expect(html).toContain('</html>');
    });
  });

  describe('call to action', () => {
    it('should have view trip button', async () => {
      const html = await render(<SettlementEmail {...defaultProps} />);
      expect(html.toLowerCase()).toContain('view');
    });
  });
});
