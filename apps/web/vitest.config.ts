import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'app/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
    },
    // Allow mocking of WASM modules
    deps: {
      inline: ['media-processor', 'expense-optimizer', 'finance-core'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/lib': path.resolve(__dirname, './lib'),
      // Mock paths for WASM modules (tests will use vi.mock)
      'expense-optimizer': path.resolve(__dirname, './__mocks__/expense-optimizer.ts'),
      'finance-core': path.resolve(__dirname, './__mocks__/finance-core.ts'),
      'media-processor': path.resolve(__dirname, './__mocks__/media-processor.ts'),
    },
  },
});
