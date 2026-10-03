import { defineConfig } from 'vitest/config';
import base from './vite.config.js';
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['src/app/features/projects/*.test.jsx', 'src/app/services/api/projects.test.js', 'src/app/hooks/useDialogFocus.test.jsx'],
    coverage: {
      ...base.test.coverage,
      // Review completion scope: settings UI and the shared case-dialog keyboard guard.
      include: ['src/app/features/projects/{CatalogPage,CatalogEditor,ProjectSettingsPage,ProjectMembers,RulesPanel,HandbookPanel}.jsx', 'src/app/hooks/useDialogFocus.js'],
      reportsDirectory: './coverage/hardening',
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
