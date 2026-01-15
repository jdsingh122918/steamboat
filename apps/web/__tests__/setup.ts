import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock browser APIs for Node.js test environment
if (typeof document === 'undefined') {
  const mockElement = {
    rel: '',
    href: '',
  };

  vi.stubGlobal('document', {
    createElement: vi.fn(() => ({ ...mockElement })),
    head: {
      appendChild: vi.fn(),
      querySelector: vi.fn(() => null),
    },
  });
}

// Mock performance.now if not available
if (typeof performance === 'undefined') {
  vi.stubGlobal('performance', {
    now: vi.fn(() => Date.now()),
  });
}
