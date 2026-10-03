import { defineConfig } from 'vitest/config';
import base from './vite.config.js';

// S06 API-backed modules; legacy presentation components remain in whole-app coverage.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['src/app/features/work-items/**/*.test.{js,jsx}', 'src/app/pages/WorkBoardPage.test.jsx', 'src/app/modules/ProjectOverview.test.jsx', 'src/app/services/api/workItems.test.js'],
    coverage: {
      ...base.test.coverage,
      include: ['src/app/features/work-items/{ProjectData,WorkItemForm,WorkItemDetail,TransitionDialog,EvidencePanel}.jsx', 'src/app/pages/WorkBoardPage.jsx', 'src/app/modules/ProjectOverview.jsx', 'src/app/services/api/workItems.js'],
      reportsDirectory: './coverage/work-items',
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
