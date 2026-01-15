import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import { InviteEmail, InviteEmailProps } from '../invite-email';

describe('InviteEmail', () => {
  const defaultProps: InviteEmailProps = {
    inviterName: 'John Doe',
    tripName: 'Vegas Bachelor Party 2025',
    inviteUrl: 'https://steamboat.app/invite/abc123',
    tripLocation: 'Las Vegas, NV',
    tripDates: 'June 15-18, 2025',
  };

  describe('rendering', () => {
    it('should render inviter name', async () => {
      const html = await render(<InviteEmail {...defaultProps} />);
      expect(html).toContain('John Doe');
    });

    it('should render trip name', async () => {
      const html = await render(<InviteEmail {...defaultProps} />);
      expect(html).toContain('Vegas Bachelor Party 2025');
    });

    it('should render invite button with correct URL', async () => {
      const html = await render(<InviteEmail {...defaultProps} />);
      expect(html).toContain('https://steamboat.app/invite/abc123');
    });

    it('should render trip location', async () => {
      const html = await render(<InviteEmail {...defaultProps} />);
      expect(html).toContain('Las Vegas, NV');
    });

    it('should render trip dates', async () => {
      const html = await render(<InviteEmail {...defaultProps} />);
      expect(html).toContain('June 15-18, 2025');
    });
  });

  describe('preview text', () => {
    it('should include trip name in preview', async () => {
      const html = await render(<InviteEmail {...defaultProps} />);
      expect(html).toContain('Vegas Bachelor Party 2025');
    });

    it('should include inviter name in preview', async () => {
      const html = await render(<InviteEmail {...defaultProps} />);
      expect(html).toContain('John Doe');
    });
  });

  describe('optional fields', () => {
    it('should render without location', async () => {
      const props = { ...defaultProps, tripLocation: undefined };
      const html = await render(<InviteEmail {...props} />);

      expect(html).toContain('Vegas Bachelor Party 2025');
      expect(html).not.toContain('Location:');
    });

    it('should render without dates', async () => {
      const props = { ...defaultProps, tripDates: undefined };
      const html = await render(<InviteEmail {...props} />);

      expect(html).toContain('Vegas Bachelor Party 2025');
      expect(html).not.toContain('Dates:');
    });

    it('should render with custom message', async () => {
      const props = {
        ...defaultProps,
        personalMessage: 'Looking forward to seeing you!',
      };
      const html = await render(<InviteEmail {...props} />);

      expect(html).toContain('Looking forward to seeing you!');
    });
  });

  describe('call to action', () => {
    it('should have accept invitation button', async () => {
      const html = await render(<InviteEmail {...defaultProps} />);
      expect(html.toLowerCase()).toContain('accept');
    });

    it('should link to invite URL', async () => {
      const html = await render(<InviteEmail {...defaultProps} />);
      expect(html).toContain('href="https://steamboat.app/invite/abc123"');
    });
  });

  describe('structure', () => {
    it('should use BaseLayout', async () => {
      const html = await render(<InviteEmail {...defaultProps} />);

      // Should have Steamboat branding from BaseLayout
      expect(html).toContain('Steamboat');
      expect(html).toContain('<!DOCTYPE html');
    });

    it('should be valid HTML', async () => {
      const html = await render(<InviteEmail {...defaultProps} />);

      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      expect(html).toContain('<body');
      expect(html).toContain('</body>');
    });
  });
});
