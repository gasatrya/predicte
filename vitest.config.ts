import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'out'],

    // Global configuration
    globals: true,
    environment: 'node',

    // Coverage configuration
    coverage: {
      provider: 'v8', // Recommended for speed and accuracy
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'out/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**', // Type definition files
      ],
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
  },

  // TypeScript configuration
  esbuild: {
    target: 'node20',
    format: 'cjs',
    sourcemap: true,
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
