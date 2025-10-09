import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load test environment variables
  const env = loadEnv('test', process.cwd(), '');

  return {
    plugins: [tsconfigPaths()],
    test: {
      globals: true,
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      env: env,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'dist/',
          'generated/',
          'tests/',
          '**/*.spec.ts',
          '**/*.test.ts'
        ]
      }
    }
  };
});
