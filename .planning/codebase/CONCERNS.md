# Codebase Concerns

**Analysis Date:** 2026-03-30

## Tech Debt

**Startup and audio bootstrap are split across multiple global singletons:**
- Issue: startup state is owned by several separate global/module-level systems instead of one orchestrator. `src/composables/useAppLoading.ts` keeps `globalLoadingState`, `src/services/superdoughAudio.ts` keeps `_initialized`, `_initPromise`, `_activeStrudelVisuals`, and Strudel runtime state, and `src/composables/useLiveStrudelMirror.ts` keeps a global playback controller. `src/components/LoadingSplash.vue` also marks audio complete even though `src/services/superdoughAudio.ts` still owns the real audio readiness state.
- Files: `src/composables/useAppLoading.ts`, `src/components/LoadingSplash.vue`, `src/services/superdoughAudio.ts`, `src/stores/instrument.ts`, `src/composables/useLiveStrudelMirror.ts`
- Impact: loading state can report readiness that does not match the actual Web Audio state, repeated `useAppLoading()` calls create repeated watchers, and resets/HMR/tests are harder because state is shared outside component lifecycles.
- Fix approach: move startup into a single app bootstrap service, make audio readiness derive from the real `AudioContext` state, and scope watchers/controllers to component ownership instead of module singletons.

**The app relies on a global `window` event bus for core behavior:**
- Issue: note playback, release, visuals, MIDI mirroring, and pattern capture all communicate through untyped custom browser events instead of a typed internal bus. Multiple modules dispatch and consume `"note-played"` and `"note-released"` directly.
- Files: `src/stores/music.ts`, `src/services/superdoughAudio.ts`, `src/stores/patterns.ts`, `src/composables/useMidiControls.ts`, `src/composables/canvas/useStringRenderer.ts`, `src/components/UnifiedVisualEffects.vue`
- Impact: payload shape drift is easy to introduce, listeners are hard to trace, and duplicate store/component instances can double-handle the same event stream.
- Fix approach: define one typed note-event contract and route it through an internal service/store API instead of direct `window.dispatchEvent()` calls.

**Pinia persistence is applied to stores that hold non-serializable state:**
- Issue: `src/stores/music.ts` and `src/stores/patterns.ts` both use `persist: true` while keeping `Map`-backed state such as `activeNotes` and `pendingNotes`. `src/stores/keyboardDrawer.ts` contains explicit rehydration guards for `Map`/`Set`, but the other persisted stores do not.
- Files: `src/stores/music.ts`, `src/stores/patterns.ts`, `src/stores/keyboardDrawer.ts`, `src/main.ts`
- Impact: reload/HMR persistence can corrupt runtime collections, hide stale state bugs, and make audio/pattern behavior differ between fresh and restored sessions.
- Fix approach: persist only serializable slices, add schema/versioned rehydration, and keep ephemeral `Map`/`Set` state out of persisted store payloads.

**A large local patch carries critical audio behavior outside normal source control boundaries:**
- Issue: held-note voice lifecycle and other `superdough` behavior depend on a large local patch instead of a small internal wrapper. The app code explicitly depends on this patched behavior.
- Files: `package.json`, `patches/superdough@1.3.0.patch`, `src/services/superdoughAudio.ts`
- Impact: upgrades are high-risk, behavior is harder to reason about, and compiler coverage is weakened because the patched library still lacks bundled TypeScript definitions.
- Fix approach: document the exact patch contract, upstream it if possible, or move the critical behavior behind a narrower internal adapter with focused tests.

**Repo-level quality guardrails are currently broken:**
- Issue: local validation shows `bun run type-check` passes, but `bun run test:run` fails with 26 failing tests across 12 files, and ESLint is not runnable because `package.json` uses flat-config-incompatible CLI flags while `eslint.config.js` defines an invalid rule (`@typescript-eslint/prefer-const`).
- Files: `package.json`, `eslint.config.js`, `vitest.config.ts`, `src/test-setup.ts`, `src/__tests__/components/palette/PaletteControls.test.ts`, `src/__tests__/composables/palette/usePalette.test.ts`, `src/__tests__/integration/setup.ts`
- Impact: refactors and dependency updates ship without trustworthy static or test feedback, and failing/stale tests hide genuine regressions.
- Fix approach: restore a working lint command, repair or delete stale tests, and make the suite green before adding more surface area.

**Legacy and unused surfaces are still present in the codebase and test harness:**
- Issue: the runtime no longer imports `src/components/AudioInitializer.vue`, `src/composables/useStrudel.ts` duplicates playback-state responsibilities now handled by `src/composables/useLiveStrudelMirror.ts`, and `src/test-setup.ts` still mocks removed modules such as `@/services/audio` and `@/lib/sample-library`.
- Files: `src/components/AudioInitializer.vue`, `src/composables/useStrudel.ts`, `src/composables/useLiveStrudelMirror.ts`, `src/test-setup.ts`
- Impact: contributors can extend the wrong abstraction, and dead pathways keep the test harness drifting away from the real runtime.
- Fix approach: delete dead files/mocks or reintroduce them intentionally behind a documented compatibility layer.

## Known Bugs

**Large touch devices are treated as having physical keyboards:**
- Symptoms: touch-first tablets and large touch screens are classified as keyboard-capable desktops, so keyboard shortcuts and desktop affordances can be shown in the wrong contexts.
- Files: `src/utils/deviceDetection.ts`, `src/__tests__/utils/deviceDetection.test.ts`
- Trigger: a touch-enabled device with `window.innerWidth >= 1024`.
- Workaround: None in the runtime; only manual UI verification catches it.

**Haptic feedback can throw on browsers with a broken `navigator.vibrate` implementation:**
- Symptoms: note or control interactions can throw instead of degrading gracefully if `navigator.vibrate()` exists but raises an exception.
- Files: `src/utils/hapticFeedback.ts`, `src/__tests__/utils/hapticFeedback.test.ts`
- Trigger: browsers/devices exposing `navigator.vibrate` but throwing at call time.
- Workaround: None in the utility; callers must avoid relying on it.

**Visual math helpers return invalid values for edge inputs:**
- Symptoms: `mapFrequencyToValue()` returns `NaN` when `minFreq === maxFreq`, and `createStringDamping()` can return negative values when the normalized position leaves the `[0, 1]` range.
- Files: `src/utils/visualEffects.ts`, `src/__tests__/utils/visualEffects.test.ts`
- Trigger: zero-width frequency mappings or unclamped string positions.
- Workaround: Clamp and validate inputs before calling the helpers.

**Poor-performance warnings never emit:**
- Symptoms: the performance monitor logs fair-performance notices but does nothing when status is `"poor"`, so the app loses the only built-in signal for serious frame-rate degradation.
- Files: `src/utils/performanceMonitor.ts`, `src/__tests__/utils/performanceMonitor.test.ts`
- Trigger: FPS drops below 30 or average frame time exceeds 33 ms.
- Workaround: Inspect `performanceMonitor.getMetrics()` manually during debugging.

**The loading UI can report audio as ready even when initialization was deferred or failed:**
- Symptoms: the splash screen can advance to a ready state while autoplay restrictions, network timeouts, or audio boot failures still prevent real playback readiness.
- Files: `src/components/LoadingSplash.vue`, `src/composables/useAppLoading.ts`, `src/services/superdoughAudio.ts`
- Trigger: browsers that require user interaction for audio, slow network/sample loading, or `initAudio()` failure paths.
- Workaround: the user can still hide the splash and trigger audio later through interaction, but the reported status is misleading.

## Security Considerations

**Runtime audio assets come from mutable third-party URLs and are cached aggressively:**
- Risk: the app loads sample-pack metadata from `https://raw.githubusercontent.com/felixroos/dough-samples/main/` and caches third-party assets for up to a year without pinning to a commit or self-hosting. This creates supply-chain, cache-poisoning, and stale-asset risk.
- Files: `src/services/superdoughAudio.ts`, `vite.config.ts`, `src/components/LoadingSplash.vue`
- Current mitigation: HTTPS transport and Workbox cache response checks.
- Recommendations: self-host or pin audio assets to immutable URLs, reduce cache retention, and treat remote samples as optional content instead of startup-critical dependencies.

**The app requests MIDI access and enumerates device names on mount:**
- Risk: `src/composables/useMidiControls.ts` calls `navigator.requestMIDIAccess()` during app mount, which can trigger permission prompts and expose hardware names earlier than users expect.
- Files: `src/App.vue`, `src/composables/useMidiControls.ts`, `src/stores/keyboardDrawer.ts`
- Current mitigation: browser permission gating only.
- Recommendations: move MIDI access behind an explicit user action and keep passive capability checks separate from active device enumeration.

**User-created musical history and configuration live in browser localStorage:**
- Risk: note logs, saved patterns, and visual configuration persist locally and can be read or tampered with on shared devices. The stores also trust locally stored JSON with minimal schema validation.
- Files: `src/stores/patterns.ts`, `src/stores/music.ts`, `src/stores/visualConfig.ts`, `src/stores/keyboardDrawer.ts`
- Current mitigation: `src/stores/visualConfig.ts` wraps JSON parse/save in `try/catch`, and `src/stores/patterns.ts` applies a seven-day retention window only when new notes are processed.
- Recommendations: persist smaller validated payloads, add versioned schemas, expose a clear-data control, and move larger histories out of localStorage.

## Performance Bottlenecks

**Startup eagerly loads multiple remote sample packs and prewarms instruments before the app is interactive:**
- Problem: the initial boot path downloads multiple sample packs, registers soundfonts, starts audio, prewarms piano, and then prewarms additional sounds.
- Files: `src/services/superdoughAudio.ts`, `src/stores/instrument.ts`, `src/components/LoadingSplash.vue`, `src/composables/useAppLoading.ts`
- Cause: `initSuperdoughAudio()` treats default and optional instruments as part of the first-run critical path.
- Improvement path: lazy-load by selected instrument, prewarm only the default sound at startup, and move optional packs behind explicit interaction.

**The PWA cache policy can consume browser storage quickly:**
- Problem: Workbox allows up to 2000 `raw.githubusercontent.com` audio entries and 500 `cdn.jsdelivr.net` entries, both with one-year retention.
- Files: `vite.config.ts`
- Cause: very large `maxEntries` and long `maxAgeSeconds` values for media fetched at runtime.
- Improvement path: lower cache ceilings, use shorter TTLs or `StaleWhileRevalidate`, and self-host only the packs that are required offline.

**The render loop always coordinates every visual subsystem on each animation frame:**
- Problem: ambient background, Hilbert scope, blobs, particles, and strings all run inside one frame loop, while configuration snapshots are refreshed every tick and poor-performance warnings never trigger.
- Files: `src/composables/canvas/useUnifiedCanvas.ts`, `src/composables/canvas/useStringRenderer.ts`, `src/composables/canvas/useHilbertScopeRenderer.ts`, `src/utils/performanceMonitor.ts`
- Cause: no adaptive throttling, no selective frame skipping, and no active use of `autoAdjustPerformance()`.
- Improvement path: gate inactive subsystems early, consume the auto-adjust settings in the render pipeline, and avoid per-frame config rebuilding where values are unchanged.

**Strudel playback highlighting is both large and hot:**
- Problem: the playback-highlighting stack updates CodeMirror decorations and follow-scroll behavior during `onDraw`, and the highlight implementation is a 1000+ line file with no direct tests.
- Files: `src/components/patterns/LiveStrip.vue`, `src/components/patterns/strudelPlaybackHighlight.ts`
- Cause: editor DOM decoration work, token parsing, and scroll-follow logic are all coupled to live playback timing.
- Improvement path: add profiling and dedicated tests before expanding the highlight system further, and split parsing/rendering responsibilities into smaller units.

## Fragile Areas

**Pattern capture and note logging:**
- Files: `src/stores/patterns.ts`, `src/stores/music.ts`, `src/services/superdoughAudio.ts`
- Why fragile: `src/stores/patterns.ts` installs global event listeners at store creation time and never tears them down automatically. Logging depends on event payload shape remaining consistent across direct input, Strudel playback, and release events.
- Safe modification: treat `"note-played"` and `"note-released"` as shared contracts and centralize payload typing before changing any dispatch site.
- Test coverage: store tests exist, but the overall test suite is currently failing and the integration harness is stale.

**Live Strudel editor and playback mirror:**
- Files: `src/components/patterns/LiveStrip.vue`, `src/components/patterns/strudelPlaybackHighlight.ts`, `src/composables/useLiveStrudelMirror.ts`
- Why fragile: the stack mixes global controller state, CodeMirror effects, Strudel runtime timing, and DOM scrolling behavior in one feature path.
- Safe modification: separate the editor adapter from playback/highlight logic, and add direct tests before changing token rendering or playback callbacks.
- Test coverage: Not detected for these files directly.

**GSAP integration:**
- Files: `src/composables/useGSAP.ts`, `src/composables/canvas/useStringRenderer.ts`, `src/components/knobs/Knob.vue`, `src/components/TooltipRenderer.vue`
- Why fragile: plugin registration happens at module import time, so partial mocks or non-browser environments fail before component mount.
- Safe modification: make plugin registration lazy and environment-safe, and keep all GSAP access behind a narrow adapter.
- Test coverage: Not detected for `src/composables/useGSAP.ts`; current integration failures show the existing mocks do not match runtime expectations.

**Visual configuration and control surface:**
- Files: `src/stores/visualConfig.ts`, `src/data/visual-config-metadata.ts`, `src/components/ConfigPanel.vue`
- Why fragile: the config schema is large, metadata-driven, and updated through `any` escape hatches plus JSON deep-copy logic. Export/import, clipboard actions, and ROLI script generation all depend on that shape staying stable.
- Safe modification: change the schema in one place, regenerate typed helpers with it, and update store/UI tests together before shipping config-shape changes.
- Test coverage: direct store tests exist, but they are heavily out of sync with current defaults and API shape.

## Scaling Limits

**localStorage-backed history and configuration:**
- Current capacity: browser localStorage quota, typically only a few MB.
- Limit: `loggedNotes`, `savedPatterns`, saved visual configs, and persisted music state continue growing until serialization or quota limits are hit.
- Scaling path: move histories to IndexedDB, cap retained patterns/configs, and persist only small serializable summaries in Pinia.

**Remote asset and cache footprint:**
- Current capacity: up to 2500 cached third-party media entries plus in-memory decoded sample buffers and analyser graphs.
- Limit: mobile browsers will evict caches or fail sample loading under storage pressure, and startup memory use will rise as more packs are prewarmed.
- Scaling path: self-host/pin required assets, split optional packs from the default boot path, and reduce Workbox cache budgets.

## Dependencies at Risk

**`superdough`:**
- Risk: the app depends on a large local patch and a library without bundled type definitions.
- Impact: upgrades can silently break held-note playback, voice release, or Strudel integration.
- Migration plan: document the patch contract, upstream the custom behavior where possible, or replace the direct dependency surface with an internal wrapper.

**`gsap` plugin bundle:**
- Risk: `src/composables/useGSAP.ts` assumes plugin exports from `gsap/all` are always available and registerable.
- Impact: tests and alternative runtimes fail at import time instead of degrading gracefully.
- Migration plan: lazy-register only the plugins the app actually uses and harden the adapter against missing plugin exports.

## Missing Critical Features

**Working repository guardrails:**
- Problem: the repo does not currently have a passing test suite or a runnable lint command.
- Blocks: safe refactors, dependency upgrades, and trustworthy CI automation.

**Operational and onboarding documentation:**
- Problem: `README.md` contains only `Boop` even though the app has non-trivial startup, MIDI, PWA, and ROLI behavior.
- Blocks: onboarding, support, and safe environment setup for future contributors.

## Test Coverage Gaps

**Startup, loading, and PWA bootstrap:**
- What's not tested: `src/main.ts`, `src/composables/useAppLoading.ts`, `src/components/LoadingSplash.vue`, service worker registration/update flow, and audio-readiness UX.
- Files: `src/main.ts`, `src/composables/useAppLoading.ts`, `src/components/LoadingSplash.vue`, `vite.config.ts`
- Risk: permission-flow and startup regressions can ship unnoticed.
- Priority: High

**Live Strudel editor and playback highlighting:**
- What's not tested: editor initialization, controller teardown, playback-follow scrolling, and highlight-decoration behavior.
- Files: `src/components/patterns/LiveStrip.vue`, `src/components/patterns/strudelPlaybackHighlight.ts`, `src/composables/useLiveStrudelMirror.ts`
- Risk: live playback UI regressions are likely to surface only through manual testing.
- Priority: High

**Current runtime alignment of the test harness:**
- What's not tested: the actual current component/module graph, because several tests still target removed or renamed surfaces such as `CanvasSolfegePalette`, `@/components/pallete/PaletteControls.vue`, `@/composables/palette/usePalette`, `@/services/audio`, and `@/lib/sample-library`.
- Files: `src/test-setup.ts`, `src/__tests__/components/palette/PaletteControls.test.ts`, `src/__tests__/composables/palette/usePalette.test.ts`, `src/__tests__/composables/canvas/useBlobRenderer.test.ts`, `src/__tests__/composables/canvas/useParticleSystem.test.ts`, `src/__tests__/composables/canvas/useUnifiedCanvas.test.ts`, `src/__tests__/integration/setup.ts`, `src/__tests__/integration/audio-visual-integration-fixed.test.ts`
- Risk: the failing suite obscures real regressions and discourages maintenance.
- Priority: High

**Real hardware and browser integration paths:**
- What's not tested: actual `navigator.requestMIDIAccess()` behavior, MIDI device hot-plugging, ROLI live sync against hardware, and browser-specific audio permission behavior.
- Files: `src/composables/useMidiControls.ts`, `src/services/roliLiveSync.ts`, `src/services/roliPianoExport.ts`, `src/services/superdoughAudio.ts`
- Risk: production-only regressions in browser/device integration remain easy to introduce.
- Priority: Medium

---

*Concerns audit: 2026-03-30*
