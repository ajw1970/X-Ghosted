import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // Matches your current JSDOM setup
    setupFiles: './jest.setup.mjs', // Reuse your setup file
    globals: true, // Optional: mimics Jest globals
  },
});