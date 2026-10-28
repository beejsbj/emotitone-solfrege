import { configDefaults, defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// These suites exercise pure logic or supply their own audio adapters. They do
// not need a browser, application mocks, or the DOM setup on every file.
const nodeTests = [
  'src/audio/**/*.test.ts',
  'audio-lab/reference/**/*.test.ts',
  'src/__tests__/services/{recordedTiming,livePitch,liveResampler,liveArticulation,livePerformance,inputVoiceGroups,audioDiagnostics,musicColorCore,keySurfaceColor,pitchAnalysis,music,StrudelNotation}.test.ts',
  'src/__tests__/data/**/*.test.ts',
  'src/__tests__/lint/**/*.test.ts',
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
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // vite-plugin-pwa does not run under Vitest; its virtual module is a no-op here.
      'virtual:pwa-register': resolve(__dirname, 'src/__tests__/helpers/pwaRegister.ts'),
    },
  },
})
