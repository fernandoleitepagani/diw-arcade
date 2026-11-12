import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { htmlHead } from './scripts/vite/htmlHead.js';

export default defineConfig({
  plugins: [react(), htmlHead()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
