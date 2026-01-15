import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import { PaymentReminderEmail, PaymentReminderEmailProps } from '../payment-reminder-email';

describe('PaymentReminderEmail', () => {
  const defaultProps: PaymentReminderEmailProps = {
    recipientName: 'Mike',
    tripName: 'Vegas Bachelor Party 2025',
    amountOwed: 150.0,
    currency: 'USD',
    creditorName: 'John',
    paymentUrl: 'https://steamboat.app/trips/123/finances',
  };

  describe('rendering', () => {
    it('should render recipient name', async () => {
      const html = await render(<PaymentReminderEmail {...defaultProps} />);
      expect(html).toContain('Mike');
    });

    it('should render trip name', async () => {
      const html = await render(<PaymentReminderEmail {...defaultProps} />);
      expect(html).toContain('Vegas Bachelor Party 2025');
    });

    it('should render amount owed', async () => {
      const html = await render(<PaymentReminderEmail {...defaultProps} />);
      expect(html).toContain('150');
    });

    it('should render creditor name', async () => {
      const html = await render(<PaymentReminderEmail {...defaultProps} />);
      expect(html).toContain('John');
    });

    it('should render payment button with correct URL', async () => {
      const html = await render(<PaymentReminderEmail {...defaultProps} />);
      expect(html).toContain('https://steamboat.app/trips/123/finances');
    });
  });

  describe('currency formatting', () => {
    it('should format USD correctly', async () => {
      const html = await render(<PaymentReminderEmail {...defaultProps} />);
      expect(html).toContain('$');
    });

    it('should format EUR correctly', async () => {
      const props = { ...defaultProps, currency: 'EUR' };
      const html = await render(<PaymentReminderEmail {...props} />);
      expect(html).toContain('€');
    });

    it('should format GBP correctly', async () => {
      const props = { ...defaultProps, currency: 'GBP' };
      const html = await render(<PaymentReminderEmail {...props} />);
      expect(html).toContain('£');
    });
  });

  describe('preview text', () => {
    it('should include amount in preview', async () => {
      const html = await render(<PaymentReminderEmail {...defaultProps} />);
      // Preview text should mention the amount
      expect(html).toContain('150');
    });
  });

  describe('optional fields', () => {
    it('should render with due date when provided', async () => {
      const props = {
        ...defaultProps,
        dueDate: 'January 15, 2026',
      };
      const html = await render(<PaymentReminderEmail {...props} />);
      expect(html).toContain('January 15, 2026');
    });

    it('should render without due date', async () => {
      const html = await render(<PaymentReminderEmail {...defaultProps} />);
      expect(html).not.toContain('Due by');
    });

    it('should render with expense breakdown', async () => {
      const props = {
        ...defaultProps,
        expenseBreakdown: [
          { description: 'Dinner at Nobu', amount: 75.0 },
          { description: 'Club entry', amount: 50.0 },
          { description: 'Taxi', amount: 25.0 },
        ],
      };
      const html = await render(<PaymentReminderEmail {...props} />);

      expect(html).toContain('Dinner at Nobu');
      expect(html).toContain('Club entry');
      expect(html).toContain('Taxi');
    });
  });

  describe('structure', () => {
    it('should use BaseLayout', async () => {
      const html = await render(<PaymentReminderEmail {...defaultProps} />);
      expect(html).toContain('Steamboat');
    });

    it('should be valid HTML', async () => {
      const html = await render(<PaymentReminderEmail {...defaultProps} />);
      expect(html).toContain('<!DOCTYPE html');
      expect(html).toContain('</html>');
    });
  });

  describe('call to action', () => {
    it('should have settle up button', async () => {
      const html = await render(<PaymentReminderEmail {...defaultProps} />);
      expect(html.toLowerCase()).toContain('settle');
    });
  });
});
