import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    server: {
      deps: {
        // Use the browser ESM entries, as Vite does in production. The core's
        // Kabelsalat dependency also publishes a non-ESM `main` entry.
        inline: ['@strudel/soundfonts', '@strudel/core', '@strudel/mini', '@strudel/transpiler', '@strudel/tonal', '@kabelsalat/web'],
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
