import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        '.next/',
        'vitest.config.ts',
        'vitest.setup.ts',
        'scripts/',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
      ],
    },
  },
});
