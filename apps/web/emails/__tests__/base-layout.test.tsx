import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import { BaseLayout } from '../base-layout';

describe('BaseLayout', () => {
  describe('rendering', () => {
    it('should render children content', async () => {
      const html = await render(
        <BaseLayout previewText="Test Preview">
          <p>Test content</p>
        </BaseLayout>
      );

      expect(html).toContain('Test content');
    });

    it('should include preview text', async () => {
      const html = await render(
        <BaseLayout previewText="This is a preview">
          <p>Content</p>
        </BaseLayout>
      );

      expect(html).toContain('This is a preview');
    });

    it('should include Steamboat branding', async () => {
      const html = await render(
        <BaseLayout previewText="Test">
          <p>Content</p>
        </BaseLayout>
      );

      expect(html).toContain('Steamboat');
    });

    it('should include footer with copyright', async () => {
      const currentYear = new Date().getFullYear();
      const html = await render(
        <BaseLayout previewText="Test">
          <p>Content</p>
        </BaseLayout>
      );

      expect(html).toContain(currentYear.toString());
    });

    it('should render valid HTML', async () => {
      const html = await render(
        <BaseLayout previewText="Test">
          <p>Content</p>
        </BaseLayout>
      );

      expect(html).toContain('<!DOCTYPE html');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });
  });

  describe('styling', () => {
    it('should have responsive container', async () => {
      const html = await render(
        <BaseLayout previewText="Test">
          <p>Content</p>
        </BaseLayout>
      );

      // Check for max-width style for responsive design
      expect(html).toContain('max-width');
    });

    it('should have proper font styling', async () => {
      const html = await render(
        <BaseLayout previewText="Test">
          <p>Content</p>
        </BaseLayout>
      );

      // Check for font-family style
      expect(html).toContain('font-family');
    });
  });

  describe('with custom title', () => {
    it('should use custom title when provided', async () => {
      const html = await render(
        <BaseLayout previewText="Test" title="Custom Title">
          <p>Content</p>
        </BaseLayout>
      );

      expect(html).toContain('Custom Title');
    });

    it('should use default title when not provided', async () => {
      const html = await render(
        <BaseLayout previewText="Test">
          <p>Content</p>
        </BaseLayout>
      );

      expect(html).toContain('Steamboat');
    });
  });

  describe('accessibility', () => {
    it('should have proper HTML lang attribute', async () => {
      const html = await render(
        <BaseLayout previewText="Test">
          <p>Content</p>
        </BaseLayout>
      );

      expect(html).toContain('lang="en"');
    });
  });
});
