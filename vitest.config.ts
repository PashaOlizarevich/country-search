import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
