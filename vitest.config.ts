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
    // NOTA: la cobertura no está habilitada porque requiere instalar
    // `@vitest/coverage-v8` como devDependency. Si se activa, descomentar:
    //   npm i -D @vitest/coverage-v8
    //   npx vitest run --coverage
  },
});