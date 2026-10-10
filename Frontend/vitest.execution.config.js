import { defineConfig } from 'vitest/config';
import base from './vite.config.js';

// Gate the S05 module separately; legacy prototype coverage remains visible in test:coverage.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['src/app/features/test-execution/**/*.test.{js,jsx}', 'src/app/services/api/execution.test.js'],
    coverage: {
      ...base.test.coverage,
      include: ['src/app/features/test-execution/**/*.{js,jsx}', 'src/app/services/api/execution.js'],
      reportsDirectory: './coverage/execution',
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
