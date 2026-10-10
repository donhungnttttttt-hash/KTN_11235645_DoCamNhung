import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8080',
      '/actuator': 'http://127.0.0.1:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      // Legacy bootstrap uses JSX in .js; index.html starts src/main.jsx instead.
      exclude: ['src/**/*.test.{js,jsx}', 'src/test/**', 'src/index.js'],
      reporter: ['text', 'json-summary', 'html'],
    },
  },
});
