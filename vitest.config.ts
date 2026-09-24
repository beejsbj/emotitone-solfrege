import { configDefaults, defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// These suites exercise pure logic or supply their own audio adapters. They do
// not need a browser, application mocks, or the DOM setup on every file.
const nodeTests = [
  'src/audio/**/*.test.ts',
  'audio-lab/reference/**/*.test.ts',
  'audio-lab/validate.test.ts',
  'src/__tests__/services/{recordedTiming,livePitch,liveResampler,liveArticulation,livePerformance,playStyles,inputVoiceGroups,audioDiagnostics,musicColorCore,keySurfaceColor,pitchAnalysis,music,StrudelNotation}.test.ts',
  'src/__tests__/data/**/*.test.ts',
]

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    // Shared development hosts also run the editor/server. Keep the default
    // bounded; CLI overrides remain available for a dedicated CI worker.
    maxWorkers: 2,
    minWorkers: 1,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: nodeTests,
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: ['src/**/*.test.ts'],
          exclude: [...configDefaults.exclude, ...nodeTests, '**/patternPersistence.bench.test.ts'],
          setupFiles: ['./src/test-setup.ts'],
        },
      },
    ],
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
