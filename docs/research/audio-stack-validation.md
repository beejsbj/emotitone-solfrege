# Final stack validation — 2026-09-20

Checked the integrated #84 candidate at `0b3c304` in a clean staging worktree after `bun install --frozen-lockfile`. This includes the final worklet FIFO inbox and processor response batching, the viewport/reveal repair, persistence serializer, and the three additional #82 music-store regressions. Subsequent lab receipt/protocol changes do not alter this production source.

## Full test suite

`bunx vitest run --maxWorkers=2 --minWorkers=2 --reporter=default --reporter=json` completed once: **1,526 passed, 11 failed, one intentionally skipped benchmark**; 143 files passed, 12 failed, one skipped. The full suite is not green.

All eleven failed assertion names occur in the prior recorded audio baseline. The unrelated particle edge-case test is intermittent and failed in both that baseline and this run. These test files are unchanged by the stack. The failures are:

- `src/__tests__/integration/audio-visual-integration-fixed.test.ts`: Audio-Visual Integration (Fixed) Note Events Trigger Audio and Visual Effects should trigger visual effects when a note is played via palette.
- `src/__tests__/integration/audio-visual-integration-fixed.test.ts`: Audio-Visual Integration (Fixed) Note Events Trigger Audio and Visual Effects should handle different instruments with appropriate visual responses.
- `src/__tests__/integration/audio-visual-integration-fixed.test.ts`: Audio-Visual Integration (Fixed) Performance Under Load should maintain reasonable performance with rapid note triggers.
- `src/__tests__/integration/audio-visual-integration-fixed.test.ts`: Audio-Visual Integration (Fixed) Color System Integration should update visual colors when key/mode changes.
- `src/__tests__/utils/deviceDetection.test.ts`: Device Detection Utilities hasPhysicalKeyboard should not detect physical keyboard on large touch screen.
- `src/__tests__/utils/performanceMonitor.test.ts`: Performance Monitor PerformanceMonitor Performance warnings should log warning for poor performance.
- `src/__tests__/utils/performanceMonitor.test.ts`: Performance Monitor Integration tests should provide consistent performance assessment.
- `src/__tests__/utils/visualEffects.test.ts`: Visual Effects Utilities mapFrequencyToValue should handle zero range.
- `src/__tests__/utils/visualEffects.test.ts`: Visual Effects Utilities createStringDamping should handle edge cases.
- `src/__tests__/utils/visualEffects.test.ts`: Visual Effects Utilities createHarmonicVibration should vary with time.
- `src/__tests__/utils/visualEffects.test.ts`: Visual Effects Utilities createParticleProperties should handle edge case configurations.

Five collection errors are the previous missing-module/helper errors. Three additional collection errors come from Node test files already on main in the Config/Stage evidence work: Vitest reports “No test suite found” for `node:test` files. Running those three with their intended runner, `node --test`, passes **44/44**. The stack changes none of them.

- `src/__tests__/components/palette/PaletteControls.test.ts`
- `src/__tests__/components/ui/KeySelector.test.ts`
- `src/__tests__/composables/canvas/useBlobRenderer.test.ts`
- `src/__tests__/composables/canvas/useUnifiedCanvas.test.ts`
- `src/__tests__/composables/palette/usePalette.test.ts`
- `src/style-guide/evidence/config-hosted-verification-2026-09-13/capture-policy.test.mjs`
- `src/style-guide/evidence/uibeat-capacity-2026-09-13/build-identity.test.mjs`
- `src/style-guide/evidence/uibeat-capacity-2026-09-13/runtime-guard.test.mjs`

The passing suite includes the new processor-boundary PCM/event equivalence tests; FIFO bridge and acknowledgement/disposal tests; live manager, ownership, preparation and memory accounting regressions; repaired Superdough/soundfont patch tests; viewport/reveal lifecycle tests; and actual Pinia persistence/hydration equivalence tests. The opt-in persistence benchmark is intentionally skipped in normal CI.

## Build and browser evidence

`bun run build` passes, including `vue-tsc` and the production Vite/PWA build. Built assets contain no native lab renderer, lab redirect, or removed production backend selector. Existing bundle-size and stale Browserslist-data warnings remain. Browser captures run serially, separately from these CPU jobs. The targeted worklet source-batching acceptance already passes the unchanged 1,000 ms final-settlement bound at 700.2 ms; broader worklet and final CodeStrip append captures are still pending. See the linked receipts in [the stack decision](audio-stack-decision.md).
