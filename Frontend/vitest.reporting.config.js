import { defineConfig } from 'vitest/config';
import base from './vite.config.js';
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['src/app/features/reports/**/*.test.{js,jsx}', 'src/app/services/api/reports.test.js'],
    coverage: {
      ...base.test.coverage,
      include: ['src/app/features/reports/**/*.{js,jsx}', 'src/app/services/api/reports.js', 'src/app/modules/KpiSummaryBar.jsx', 'src/app/modules/TestingOverview.jsx', 'src/app/pages/ProgressPage.jsx', 'src/app/pages/AnalysisPage.jsx'],
      reportsDirectory: './coverage/reporting',
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
