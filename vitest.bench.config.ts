import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Opt-in diagnostics with no pass/fail threshold; kept out of the normal
// suite's inventory. Run with `bun run bench:persistence`.
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/__tests__/services/patternPersistence.bench.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
  },
})
