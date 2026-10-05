import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    // Suite completa ubicada en ./test (ver test/README.md)
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'test/helpers/**', 'test/contracts/**'],
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./test/setup.ts'],
    globalSetup: ['./test/global-setup.ts'],
    css: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    teardownTimeout: 20000,
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: 'reports/junit.xml' },
    coverage: {
      provider: 'v8',
      reportsDirectory: 'reports/coverage',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}', 'server.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/assets/**',
        'src/data/**',
      ],
    },
  },
});