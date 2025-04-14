export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  globals: true, // Enable Vitest globals (vi, expect, etc.)
};