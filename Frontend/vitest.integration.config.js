import { defineConfig } from 'vitest/config';
import base from './vite.config.js';
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['src/app/features/integrations/**/*.test.{js,jsx}', 'src/app/services/api/redmine.test.js'],
    coverage: {
      ...base.test.coverage,
      include: ['src/app/features/integrations/**/*.{js,jsx}', 'src/app/services/api/redmine.js'],
      reportsDirectory: './coverage/integration',
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
