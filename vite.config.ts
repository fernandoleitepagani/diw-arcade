import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'codemirror',
              test: /node_modules[\\/]@codemirror[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              priority: 10,
              maxSize: 450 * 1024,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
