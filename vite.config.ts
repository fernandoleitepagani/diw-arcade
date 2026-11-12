import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { htmlHead } from './scripts/vite/htmlHead.js';

export default defineConfig({
  plugins: [react(), htmlHead()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    // Must stay above Testing Library's asyncUtilTimeout (5s in setup.ts) so a
    // slow lazy chunk surfaces as a findBy failure, not a test timeout.
    testTimeout: 15000,
  },
});
