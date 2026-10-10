import { defineConfig } from 'vitest/config';
import base from './vite.config.js';
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['src/app/features/retest/**/*.test.{js,jsx}', 'src/app/services/api/retest.test.js'],
    coverage: {
      ...base.test.coverage,
      include: ['src/app/features/retest/**/*.{js,jsx}', 'src/app/services/api/retest.js'],
      exclude: ['**/*.test.{js,jsx}'],
      reportsDirectory: './coverage/retest',
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
