import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/helpers/setup-dom.ts', './src/test-setup.ts'],
    // E2E tests may need longer timeout for complex workflows
    testTimeout: 10000,
    // Include E2E tests in coverage
    coverage: {
      include: ['src/**/*.{vue,ts}'],
      exclude: ['src/__tests__/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})