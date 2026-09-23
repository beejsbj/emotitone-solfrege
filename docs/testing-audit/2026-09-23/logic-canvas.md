# Logic and canvas test-value audit — 2026-09-23

Reviewed branch `fix/test-resource-budget`, starting head `a3cc6c8`. This is an investigation and resolution plan; no production, test or configuration edits were made by this lane.

**482 runtime cases across 37 files were read.** The strongest coverage is in musical identity, ownership/timing, asynchronous cancellation and native canvas pixels. A blanket reduction would discard real regressions. There is nevertheless concrete excess: **12 cases can be removed with existing coverage preserved**, and **96 cases belong to utility exports with no current application consumer found**. The latter is a conditional source-and-test retirement, not a second unconditional deletion count. Five overlap the 12 immediate cuts, so retirement would add 91 and the combined ceiling is 103.

Counting is by the last passing runtime manifest, including expanded parameterized rows. Assertions and relevant production seams were read, not merely regex-counted. No tests, compiler, browser, host or mutation checks were run. `keep` below means no concrete cut established.

## Per-file inventory

| File | Cases | Disposition | Specific judgment / findings |
| --- | ---: | --- | --- |
| [composables/canvas/harmonicTypography.test.ts](../../../src/__tests__/composables/canvas/harmonicTypography.test.ts#L1) | 19 | keep | Real native-canvas pixels and measured glyph transforms protect entrance identity, collision avoidance, bounds and reduced motion. Optimize assertion overhead without dropping scenarios. logic-canvas-009 |
| [composables/canvas/intervalLettering.test.ts](../../../src/__tests__/composables/canvas/intervalLettering.test.ts#L1) | 11 | keep | Real raster colors/transparency plus tangent/degenerate-path geometry cover separate Merge and Web contracts.  |
| [composables/canvas/stageNoteSources.test.ts](../../../src/__tests__/composables/canvas/stageNoteSources.test.ts#L1) | 2 | keep | Controlled notes must suppress foreign registries; uncontrolled notes must merge by identity with later-source replacement. Two distinct contracts.  |
| [composables/canvas/stageRuntime.test.ts](../../../src/__tests__/composables/canvas/stageRuntime.test.ts#L1) | 29 | keep | Cross-size parameterization protects coupled fit limits, independent Body/Scope controls, orbit stability, drawable threshold and continuous audio-to-breath release. Historical formulas pin an existing geometry contract; no cut established.  |
| [composables/canvas/useBlobFieldRenderer.pixels.test.ts](../../../src/__tests__/composables/canvas/useBlobFieldRenderer.pixels.test.ts#L1) | 33 | keep | Thirty-three real raster cases protect opacity/color separation, connected material, open Web interiors, release tiers, frame-order independence, small-body visibility and mode-switch surface reuse. Shared setup is not duplicate behavior.  |
| [composables/canvas/useBlobFieldRenderer.test.ts](../../../src/__tests__/composables/canvas/useBlobFieldRenderer.test.ts#L1) | 12 | keep | Planner ownership, stable edge roles, contour attachments, softness endpoints and a hard field-pixel budget are distinct from raster outcomes.  |
| [composables/canvas/useBlobRenderer.lifecycle.test.ts](../../../src/__tests__/composables/canvas/useBlobRenderer.lifecycle.test.ts#L1) | 10 | keep | Held/releasing blob lifetime, exact pitch color, responsive reprojection, prepared-frame consistency and pitch-period motion are observable state contracts.  |
| [composables/canvas/useBlobRenderer.test.ts](../../../src/__tests__/composables/canvas/useBlobRenderer.test.ts#L1) | 2 | keep | Same-pitch independent ownership and clearing prepared frames protect two cleanup regressions that a single-blob lifecycle test misses.  |
| [composables/canvas/useBlobVisibility.pixels.test.ts](../../../src/__tests__/composables/canvas/useBlobVisibility.pixels.test.ts#L1) | 2 | keep | Actual Blob preparation plus native field painting across phone sizes and long holds catches invisible-but-still-present notes in both modes.  |
| [composables/canvas/useExactPitchRenderers.test.ts](../../../src/__tests__/composables/canvas/useExactPitchRenderers.test.ts#L1) | 1 | replace | The one test searches raw Ambient/Hilbert source strings; it cannot establish the exact-pitch color-routing behavior it names. logic-canvas-001 |
| [composables/canvas/useHarmonicGeometryRenderer.test.ts](../../../src/__tests__/composables/canvas/useHarmonicGeometryRenderer.test.ts#L1) | 9 | keep | Partial-analysis invalidation, surviving geometry, label visibility and font/no-compression behavior exercise real scene construction and label delivery.  |
| [composables/canvas/useHilbertScopeLiveAudio.test.ts](../../../src/__tests__/composables/canvas/useHilbertScopeLiveAudio.test.ts#L1) | 2 | keep | Injected Stage audio source connection/disconnection and reduced-motion history clearing exercise resource ownership and state transitions. These are not a waveform-accuracy oracle.  |
| [composables/canvas/useParticleSystem.test.ts](../../../src/__tests__/composables/canvas/useParticleSystem.test.ts#L1) | 4 | replace | Mark-family selection and disabled behavior are useful; the registry-render and pool-retirement cases do not check the named registry/pool guarantees. logic-canvas-003 |
| [composables/canvas/useParticleSystemExactPitch.test.ts](../../../src/__tests__/composables/canvas/useParticleSystemExactPitch.test.ts#L1) | 1 | keep | A borrowed pitch explicitly reaches the exact-pitch color service and the resulting particle receives that color; name-route fallback is excluded.  |
| [composables/canvas/useStringRendererHumming.test.ts](../../../src/__tests__/composables/canvas/useStringRendererHumming.test.ts#L1) | 11 | keep | Eleven cases preserve independent event/store pitch sources, scientific versus keyboard octave, held identity across key changes, controlled targets and force/reduced-motion behavior.  |
| [composables/canvas/useUnifiedCanvas.harmonic.test.ts](../../../src/__tests__/composables/canvas/useUnifiedCanvas.harmonic.test.ts#L1) | 15 | replace | Keep scheduling, source rehydration and transient-layer contracts. The accessible-text case only tests all labels enabled despite claiming selective exposure. logic-canvas-006 |
| [composables/canvas/useUnifiedCanvas.test.ts](../../../src/__tests__/composables/canvas/useUnifiedCanvas.test.ts#L1) | 2 | keep | Real mounted composables verify backing dimensions and teardown of animation, note timers, audio features and EventTarget listeners.  |
| [composables/useCodeStripStrudelWarmup.test.ts](../../../src/__tests__/composables/useCodeStripStrudelWarmup.test.ts#L1) | 6 | keep | Deferred completion/error, controller replacement, warmup epochs, transport cancellation and comment-only code are distinct playback-intent failure modes.  |
| [composables/useHarmonicAnalysis.test.ts](../../../src/__tests__/composables/useHarmonicAnalysis.test.ts#L1) | 45 | trim | Retain harmonic timing, inversion/order, extreme octaves, family and held-history behavior; remove the exact duplicated root-position C-major row. logic-canvas-007 |
| [composables/useHummingCapture.test.ts](../../../src/__tests__/composables/useHummingCapture.test.ts#L1) | 15 | keep | Deferred microphone acceptance/cancellation, immutable take context, live-context updates, import preservation and unmount cancellation protect user recordings.  |
| [composables/useKeyboardControls.test.ts](../../../src/__tests__/composables/useKeyboardControls.test.ts#L1) | 15 | replace | Mapping, shortcut, warmup and async-owner assertions deserve retention, but mocked mount/unmount hooks and incomplete cleanup leave unscoped watchers/listeners in the test harness. logic-canvas-002 |
| [composables/useLiveListening.test.ts](../../../src/__tests__/composables/useLiveListening.test.ts#L1) | 6 | keep | Lease release, permission denial, source loss and competing startup generations protect independent live listening. Hardware acquisition itself is mocked.  |
| [composables/useMidiControls.test.ts](../../../src/__tests__/composables/useMidiControls.test.ts#L1) | 21 | keep | Precise timestamp queues, owner refcounts, batch ordering/clock drift and exact-pitch MIDI bounds protect distinct output contracts.  |
| [composables/useMidiPlayStyles.test.ts](../../../src/__tests__/composables/useMidiPlayStyles.test.ts#L1) | 14 | keep | Real Pinia/event delivery and captured MIDI packet schedules test changing held sets, queue repair, ROLI configuration identity and input echo suppression.  |
| [composables/useMidiWarmup.test.ts](../../../src/__tests__/composables/useMidiWarmup.test.ts#L1) | 2 | keep | Active and not-yet-resolved MIDI attacks require different cleanup paths when samples warm; both cases exercise mounted lifecycle.  |
| [composables/useMusicColor.test.ts](../../../src/__tests__/composables/useMusicColor.test.ts#L1) | 8 | keep | Real resolver output covers movable/fixed pitch semantics, chromatic fallback, tuning and static adapter parity. These are consumer-level seams, not copies of color-core arithmetic.  |
| [composables/useMusicColorClock.test.ts](../../../src/__tests__/composables/useMusicColorClock.test.ts#L1) | 5 | keep | Five clock scenarios protect monotonic time, shared subscribers, reduced motion, provider isolation and identity after configuration replacement.  |
| [composables/useMusicColorConfig.test.ts](../../../src/__tests__/composables/useMusicColorConfig.test.ts#L1) | 1 | keep | One focused production-provider contract pins a stable clock key across config replacement; distinct from clock behavior with caller-supplied keys.  |
| [composables/useStageHostLayout.test.ts](../../../src/__tests__/composables/useStageHostLayout.test.ts#L1) | 1 | keep | The single case models moving occlusion parts and frame scheduling; useful geometry behavior, with observer/unmount coverage still a gap.  |
| [composables/useUIBeat.test.ts](../../../src/__tests__/composables/useUIBeat.test.ts#L1) | 14 | keep | Clock generation, meter mapping, stale frames, phase retiming, independent scale ownership, visibility observers and reduced motion deserve retention.  |
| [data/scales.test.ts](../../../src/__tests__/data/scales.test.ts#L1) | 2 | keep | Tiny pure tests establish non-heptatonic wrap and its label consumer. No defensible cut identified.  |
| [domain/harmony.test.ts](../../../src/__tests__/domain/harmony.test.ts#L1) | 10 | keep | Actual domain output covers sparse/heptatonic/chromatic policies, borrowed tones, alteration qualities, octave wrapping and MIDI range.  |
| [utils/deviceDetection.test.ts](../../../src/__tests__/utils/deviceDetection.test.ts#L1) | 28 | retire | No current application consumer found for this module or its barrel exports. Conditional module retirement affects all 28; one identical keyboard-detection test can be cut independently. logic-canvas-007; logic-canvas-008 |
| [utils/duration.test.ts](../../../src/__tests__/utils/duration.test.ts#L1) | 21 | retire | No current application consumer found for duration.ts. Conditional module retirement affects all 21; its single-value round-trip test is already contained in the five-value round-trip test. logic-canvas-007; logic-canvas-008 |
| [utils/hapticFeedback.test.ts](../../../src/__tests__/utils/hapticFeedback.test.ts#L1) | 27 | trim | Retain browser failure handling and wrapper contracts; six redundant or misleading cases have surviving coverage. This module has production consumers. logic-canvas-007 |
| [utils/performanceMonitor.test.ts](../../../src/__tests__/utils/performanceMonitor.test.ts#L1) | 27 | trim | Retain the live singleton monitor; two exported convenience APIs have no current consumers (12 associated cases conditional). Strengthen bounded-history behavior. logic-canvas-004; logic-canvas-008 |
| [utils/visualEffects.test.ts](../../../src/__tests__/utils/visualEffects.test.ts#L1) | 49 | trim | Fourteen cases cover live String/Blob helpers; 35 cover unconsumed exports or synthetic integration. Three defensible duplicate/weak cuts and three replacements if obsolete helpers remain. logic-canvas-005; logic-canvas-007; logic-canvas-008 |

## Actionable findings

### logic-canvas-001 — REPLACE

**Affected cases:** 1. **Confidence:** high.

Case "routes Ambient and Hilbert active notes through exact pitch identity" searches source substrings. Dead code/comments can satisfy it; the wrong argument value or fallback color can pass. Replace the raw-source test with rendering a borrowed exact pitch whose scale index disagrees with its pitch class.

**Evidence:** [src/__tests__/composables/canvas/useExactPitchRenderers.test.ts:6](../../../src/__tests__/composables/canvas/useExactPitchRenderers.test.ts#L6), [src/composables/canvas/useAmbientRenderer.ts:138](../../../src/composables/canvas/useAmbientRenderer.ts#L138), [src/composables/canvas/useHilbertScopeRenderer.ts:366](../../../src/composables/canvas/useHilbertScopeRenderer.ts#L366).

**Preservation / overlap:** Existing useUnifiedCanvas.harmonic.test.ts:542 proves the note reaches each mocked renderer, and useMusicColor.test.ts:210 proves resolver precedence. Neither proves the actual Ambient/Hilbert renderers use the identity. Required replacements should observe real Ambient gradient stops and Hilbert stroke color, including reduced motion and a conflicting fallback store.

**Loss risk:** Medium if simply deleted: the renderer handoff would lose its only local guard. Retain a behavioral replacement; do not call this a one-case saving.

**Validation needed:** Focused renderer/resolver tests through the package script; intentionally route the scale fallback in a local check and require the replacement to fail. No such mutation or execution was performed here.

### logic-canvas-002 — REPAIR_HARNESS

**Affected cases:** 15. **Confidence:** high.

The suite replaces onMounted with an immediate callback and onUnmounted with a no-op. Each call installs real window listeners and an unscoped watch. Cases at 78/109/123 and 360 never call cleanupKeyboardListeners; the other cases remove listeners but still do not own the watcher scope. The suite cannot validate normal unmount and can retain work across cases.

**Evidence:** [src/__tests__/composables/useKeyboardControls.test.ts:3](../../../src/__tests__/composables/useKeyboardControls.test.ts#L3), [src/__tests__/composables/useKeyboardControls.test.ts:78](../../../src/__tests__/composables/useKeyboardControls.test.ts#L78), [src/__tests__/composables/useKeyboardControls.test.ts:360](../../../src/__tests__/composables/useKeyboardControls.test.ts#L360), [src/composables/useKeyboardControls.ts:367](../../../src/composables/useKeyboardControls.ts#L367), [src/composables/useKeyboardControls.ts:383](../../../src/composables/useKeyboardControls.ts#L383).

**Preservation / overlap:** Keep all 15 behavioral cases. Mount a small real Vue host, return the composable, and unmount it in afterEach; remove Vue lifecycle mocks. Dispatch at least the async-keyup case through the actual target. Preserve shortcut gating, visible rows and async release identities.

**Loss risk:** Low product risk because only harness changes; moderate risk of exposing previously hidden test interdependence. This is 15 cases affected, zero proposed removals. It is not evidence that these watchers caused the measured bjslab compiler incident.

**Validation needed:** Focused keyboard-controls run with unmount in finally/afterEach; require matching listener removals and no store reaction after unmount. Use package scripts. No run performed in this audit.

### logic-canvas-003 — REPLACE

**Affected cases:** 2. **Confidence:** high.

"renders particle paths from the shared Mark registry" only checks scale/fill/save/restore calls; any unrelated fill passes. "retires elapsed particles back into the pool" checks active count0 but never proves reuse. Strengthen both namesake contracts rather than deleting the lifecycle checks.

**Evidence:** [src/__tests__/composables/canvas/useParticleSystem.test.ts:68](../../../src/__tests__/composables/canvas/useParticleSystem.test.ts#L68), [src/__tests__/composables/canvas/useParticleSystem.test.ts:80](../../../src/__tests__/composables/canvas/useParticleSystem.test.ts#L80), [src/composables/canvas/useParticleSystem.ts:138](../../../src/composables/canvas/useParticleSystem.ts#L138), [src/composables/canvas/useParticleSystem.ts:152](../../../src/composables/canvas/useParticleSystem.ts#L152).

**Preservation / overlap:** The selection case at49 independently checks chosen Marks and the exact-pitch suite checks color. For rendering, fix a known Mark and inspect the MockPath2D.d supplied to fill against its registry path. For pooling, retain the expired object reference, create again and assert identity plus reset state, or narrow the title if reuse is intentionally private.

**Loss risk:** Low if strengthened; deleting the retirement case loses elapsed-particle cleanup coverage. No case-count reduction claimed.

**Validation needed:** Focused particle suite; a wrong Mark path and disabled reuse should be distinguishable by the assertions if those contracts remain explicit. No mutation testing performed.

### logic-canvas-004 — REPLACE

**Affected cases:** 1. **Confidence:** high.

"should limit frame history size" feeds 100 identical frame intervals and only expects 60 FPS. An unlimited history returns exactly that too. Test the sliding window by first feeding slow frames, then enough fast frames to evict them, and assert the final average.

**Evidence:** [src/__tests__/utils/performanceMonitor.test.ts:65](../../../src/__tests__/utils/performanceMonitor.test.ts#L65), [src/utils/performanceMonitor.ts:32](../../../src/utils/performanceMonitor.ts#L32).

**Preservation / overlap:** Tests24/38 already cover arithmetic at60/30FPS; reset85 covers state reset. Neither establishes history eviction. Keep bounded-history protection for the production singleton even if the unused convenience APIs are retired.

**Loss risk:** Low; replace one misleading case with one discriminating case. No deletion credit.

**Validation needed:** Focused monitor suite; temporarily removing history.shift should fail the new case. Not executed here.

### logic-canvas-005 — REPLACE_IF_RETAINED

**Affected cases:** 3. **Confidence:** high.

Three weak cases: createOscillation "should handle phase offset" compares sin(0) with sin(pi), both zero, so ignoring phase passes; "should create different properties each time" asserts unseeded randomness; "should handle inverted min/max values gracefully" only checks typeof number, which admits NaN/Infinity. Use a pi/2 phase, deterministic random endpoints, and finite range assertions if these APIs remain.

**Evidence:** [src/__tests__/utils/visualEffects.test.ts:194](../../../src/__tests__/utils/visualEffects.test.ts#L194), [src/__tests__/utils/visualEffects.test.ts:407](../../../src/__tests__/utils/visualEffects.test.ts#L407), [src/__tests__/utils/visualEffects.test.ts:436](../../../src/__tests__/utils/visualEffects.test.ts#L436), [src/utils/visualEffects.ts:90](../../../src/utils/visualEffects.ts#L90), [src/utils/visualEffects.ts:170](../../../src/utils/visualEffects.ts#L170).

**Preservation / overlap:** These 3 cases are wholly inside the 35 unused-export retirement candidates in 008. Retiring those exports makes replacements unnecessary. If retained, preserve current default/zero/range contracts with independent expected values.

**Loss risk:** Low for deterministic strengthening. Decide the intended inverted-range contract before changing production. Do not quietly invent support for malformed configuration.

**Validation needed:** Focused visual utility run if retained. Static counterexamples establish weak assertions; no mutated implementation was executed.

### logic-canvas-006 — REPLACE

**Affected cases:** 1. **Confidence:** high.

"exposes only enabled harmonic labels as accessible text" asserts one full string with every flag enabled. It never disables a label or the stage/analysis and cannot catch the selective-exposure failure named in its title.

**Evidence:** [src/__tests__/composables/canvas/useUnifiedCanvas.harmonic.test.ts:621](../../../src/__tests__/composables/canvas/useUnifiedCanvas.harmonic.test.ts#L621), [src/composables/canvas/useUnifiedCanvas.ts:143](../../../src/composables/canvas/useUnifiedCanvas.ts#L143).

**Preservation / overlap:** Keep the combined string assertion, then toggle showChordLabel/showIntervalLabels/showEmotionLabel and check the exact remaining announcements. Assert no text for disabled blobs or invisible analysis. Related geometry visibility cases do not exercise the accessibility-text consumer.

**Loss risk:** Low; strengthen the existing case instead of deleting useful accessibility coverage. Zero savings claimed.

**Validation needed:** Focused unified-canvas harmonic suite. Changing one flag must change the announcement. No browser/screen-reader validation claimed.

### logic-canvas-007 — DELETE

**Affected cases:** 12. **Confidence:** high.

Twelve defensible test-only removals, precisely enumerated in the report: identical inputs/assertions, subsets of surviving table/round-trip cases, two weak synthetic utility integrations, and a purported browser matrix that never instantiates browsers and mutates an API the implementation does not read.

**Evidence:** [src/__tests__/utils/deviceDetection.test.ts:213](../../../src/__tests__/utils/deviceDetection.test.ts#L213), [src/__tests__/utils/duration.test.ts:144](../../../src/__tests__/utils/duration.test.ts#L144), [src/__tests__/utils/visualEffects.test.ts:116](../../../src/__tests__/utils/visualEffects.test.ts#L116), [src/__tests__/utils/visualEffects.test.ts:457](../../../src/__tests__/utils/visualEffects.test.ts#L457), [src/__tests__/utils/visualEffects.test.ts:470](../../../src/__tests__/utils/visualEffects.test.ts#L470), [src/__tests__/composables/useHarmonicAnalysis.test.ts:287](../../../src/__tests__/composables/useHarmonicAnalysis.test.ts#L287), [src/__tests__/utils/hapticFeedback.test.ts:45](../../../src/__tests__/utils/hapticFeedback.test.ts#L45), [src/__tests__/utils/hapticFeedback.test.ts:50](../../../src/__tests__/utils/hapticFeedback.test.ts#L50), [src/__tests__/utils/hapticFeedback.test.ts:55](../../../src/__tests__/utils/hapticFeedback.test.ts#L55), [src/__tests__/utils/hapticFeedback.test.ts:60](../../../src/__tests__/utils/hapticFeedback.test.ts#L60), [src/__tests__/utils/hapticFeedback.test.ts:201](../../../src/__tests__/utils/hapticFeedback.test.ts#L201), [src/__tests__/utils/hapticFeedback.test.ts:250](../../../src/__tests__/utils/hapticFeedback.test.ts#L250).

**Preservation / overlap:** Survivors: deviceDetection 195; duration 158; visualEffects 108 plus map/oscillation/damping/blob/particle unit groups; harmonicAnalysis 269 C4,E4,G4 row; hapticFeedback 109 all explicit intensities, 65 absent vibrate, 272 ordered context calls and 284 dual-API contexts. Keep the default-intensity case 40. Five of these 12 (device 1, duration 1, visual 3) overlap retirement 008.

**Loss risk:** Low for named deletions. This is source-based dominance judgment, not mutation-tested proof. Do not delete whole files solely to achieve this count.

**Validation needed:** Run the five affected files after edits, then one coherent full-suite checkpoint. Verify all survivor assertions remain and the root-position table retains its C-major row.

### logic-canvas-008 — RETIRE_IF_UNUSED_API_CONFIRMED

**Affected cases:** 96. **Confidence:** high for no current repository consumer; conditional for retirement.

Four utility areas contain 96 cases tied to code without current application consumers: deviceDetection 28; duration 21; visualEffects 35; performance convenience helpers 12. Search included TS/JS/Vue/mjs/cjs code, symbol names, direct module imports and the utils barrel. The barrel re-exports device/visual/performance, but no consumer of the barrel was found. No package library export entry was found. This establishes current repository reachability evidence, not proof against external/dynamic consumers.

**Evidence:** [src/__tests__/utils/deviceDetection.test.ts:11](../../../src/__tests__/utils/deviceDetection.test.ts#L11), [src/__tests__/utils/duration.test.ts:8](../../../src/__tests__/utils/duration.test.ts#L8), [src/__tests__/utils/visualEffects.test.ts:16](../../../src/__tests__/utils/visualEffects.test.ts#L16), [src/__tests__/utils/performanceMonitor.test.ts:199](../../../src/__tests__/utils/performanceMonitor.test.ts#L199), [src/utils/index.ts:16](../../../src/utils/index.ts#L16), [src/composables/canvas/useStringRenderer.ts:13](../../../src/composables/canvas/useStringRenderer.ts#L13), [src/composables/canvas/useBlobRenderer.ts:11](../../../src/composables/canvas/useBlobRenderer.ts#L11), [src/composables/canvas/useUnifiedCanvas.ts:19](../../../src/composables/canvas/useUnifiedCanvas.ts#L19).

**Preservation / overlap:** Retire unused production exports with their tests in one focused slice, rather than leaving callable code untested. Keep visualEffects createVisualFrequency (4),createStringDamping (4),createHarmonicVibration (6) (14 cases; real String/Blob imports). Keep performanceMonitor singleton and its 15 cases, strengthening 004. Remove only getOptimizationSuggestions (6),autoAdjustPerformance (5) and the combined-assessment case 380. Whole deviceDetection/duration files are conditional retirement candidates. Current 96 contains 5 delete-now cases from 007 and 3 replacements from 005; additional retirement beyond 007 is 91, not 96.

**Loss risk:** Medium: re-exported symbols could be an intentional informal API or work outside this checkout. Confirm intended ownership and recheck imports at implementation head; preserve any established consumer. No source changes authorized by this artifact-only audit.

**Validation needed:** Recheck code imports including utils/index.ts and any dynamic loading, remove unused source and tests together, then package-script build plus focused live renderer/singleton tests and one full checkpoint. Do not repair obsolete helper behavior before this decision.

### logic-canvas-009 — OPTIMIZE_ASSERTIONS

**Affected cases:** 2. **Confidence:** high for assertion count; unmeasured for speedup.

The two boundary-pixel cases run four expect calls for every painted pixel. Preserve the native raster oracle while scanning once for painted count and min/max painted coordinates, then assert the bounding box once. This changes assertion overhead, not scenarios or tolerances.

**Evidence:** [src/__tests__/composables/canvas/harmonicTypography.test.ts:200](../../../src/__tests__/composables/canvas/harmonicTypography.test.ts#L200).

**Preservation / overlap:** Keep both left/right edge inputs, actual font rasterization, painted>100 and every current strict edge inequality. The manifest last-run durations were about 320 ms and 308ms, but this audit did not measure an optimized version.

**Loss risk:** Low if bounds and minimum painted count are equivalent. No test-count or guaranteed memory savings claimed.

**Validation needed:** Focused typography suite and compare before/after failures for out-of-bounds pixels if optimizing. No performance rerun performed.

## Exact delete-now ledger (12 cases)

| Delete case / row | Existing surviving coverage |
| --- | --- |
| [hasPhysicalKeyboard: should detect physical keyboard on large screen without touch](../../../src/__tests__/utils/deviceDetection.test.ts#L213) | [should detect physical keyboard on desktop](../../../src/__tests__/utils/deviceDetection.test.ts#L195) has identical1200px/non-touch setup and true assertion. |
| [should maintain consistency between conversion functions](../../../src/__tests__/utils/duration.test.ts#L144) | [round-trip conversion for all standard note values](../../../src/__tests__/utils/duration.test.ts#L158) includes the exact4/16/120 input. |
| [should use default values when undefined config provided](../../../src/__tests__/utils/visualEffects.test.ts#L116) | [default values when no config provided](../../../src/__tests__/utils/visualEffects.test.ts#L108) passes the same optional undefined value and checks the same four fields. |
| [should work together for frequency-based effects](../../../src/__tests__/utils/visualEffects.test.ts#L457) | Mapping cases24–73, default mapping108, frequency126–143 and oscillation177–224 check meaningful exact outputs. This fake integration only requires positive values. |
| [should create coherent visual effects](../../../src/__tests__/utils/visualEffects.test.ts#L470) | Blob size314–363, particle range389–404 and damping233 test each output more precisely; there is no production composition in this test. |
| [bass-qualified-triad table row [C4,E4,G4] → CM](../../../src/__tests__/composables/useHarmonicAnalysis.test.ts#L287) | [root-position table row [C4,E4,G4] → CM](../../../src/__tests__/composables/useHarmonicAnalysis.test.ts#L269) has the same setup, chord assertion and displayed-note assertion. Keep all actual inversion rows. |
| [should trigger vibration with light intensity](../../../src/__tests__/utils/hapticFeedback.test.ts#L45) | [all intensity types](../../../src/__tests__/utils/hapticFeedback.test.ts#L109) checks explicit light → [50]. |
| [should trigger vibration with medium intensity](../../../src/__tests__/utils/hapticFeedback.test.ts#L50) | Same surviving table checks explicit medium → [70]. |
| [should trigger vibration with heavy intensity](../../../src/__tests__/utils/hapticFeedback.test.ts#L55) | Same surviving table checks explicit heavy → [100]. |
| [should trigger vibration with string pattern](../../../src/__tests__/utils/hapticFeedback.test.ts#L60) | Same surviving table checks explicit string → [20,10,20,10]. Keep the distinct omitted-argument default case 40. |
| [should handle different browser implementations](../../../src/__tests__/utils/hapticFeedback.test.ts#L201) | Table109 exercises present vibrate; missing-API case 65 exercises absent vibrate. The third named browser branch inherits missing vibrate and changes msMaxTouchPoints, which [the implementation](../../../src/utils/hapticFeedback.ts#L25) never reads. It does not test actual browsers. |
| [should provide different feedback for different contexts](../../../src/__tests__/utils/hapticFeedback.test.ts#L250) | [rapid successive calls](../../../src/__tests__/utils/hapticFeedback.test.ts#L272) checks the same three wrapper mappings plus exactly one ordered call each. |

## Conditional retirement ledger (96 cases; 91 additional after the 12 cuts)

| Area | Candidate cases | Scope to remove together, if current repo reachability is the intended contract | Must retain |
| --- | ---: | --- | --- |
| [deviceDetection.ts](../../../src/utils/deviceDetection.ts#L13) | 28 | Entire module and its utils/index.ts export; no production symbol/import consumer found. | Any newly established external consumer invalidates whole-module retirement. |
| [duration.ts](../../../src/utils/duration.ts#L28) | 21 | Entire legacy Tone-notation utility and suite; remove the now-dead explicit Node-project include too. | Live recording/MIDI/Strudel duration services are separate and untouched. |
| [visualEffects.ts unused exports](../../../src/utils/visualEffects.ts#L11) | 35 | mapFrequencyToValue (8); createFontWeightMapping (3); clamp (5); createOscillation (6); calculateBlobSize (6); createParticleProperties (5); synthetic Integration (2). | createVisualFrequency (4), createStringDamping (4), createHarmonicVibration (6): imported by the real String/Blob renderers. Never retire the whole file. |
| [performanceMonitor convenience exports](../../../src/utils/performanceMonitor.ts#L130) | 12 | getOptimizationSuggestions (6); autoAdjustPerformance (5); combined assessment at test 380 (1). | Singleton performanceMonitor with 15 cases, imported by useUnifiedCanvas. Never retire the whole module. |

The code search covered `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.cjs`, and `*.vue`, excluding tests when looking for consumers; it searched both symbol names and module paths. [The utils barrel](../../../src/utils/index.ts#L16) re-exports deviceDetection, visualEffects and performanceMonitor. No current code consumer of that barrel was found; package.json has application scripts, no library export entry. This is evidence for retirement, not a guarantee about code outside the checkout or computed imports. A new implementation-head reference check is required.

## Valuable coverage and meaningful gaps

- **Keep independent input identities.** [Scheduled owner overlap](../../../src/__tests__/composables/useMidiControls.test.ts#L64), [held-pitch queue replacement](../../../src/__tests__/composables/useMidiPlayStyles.test.ts#L263), [live rehydration](../../../src/__tests__/composables/canvas/useUnifiedCanvas.harmonic.test.ts#L396) and its Strudel case 439 reach different registries/transport seams. Do not merge away those scenarios because their expected pitches look similar.
- **Keep timing boundaries and ownership.** [359ms/360ms hold expiry](../../../src/__tests__/composables/useHarmonicAnalysis.test.ts#L144), [cancellation during acceptance](../../../src/__tests__/composables/useHummingCapture.test.ts#L201), [late startup after session replacement](../../../src/__tests__/composables/useLiveListening.test.ts#L114) and [real teardown](../../../src/__tests__/composables/canvas/useUnifiedCanvas.test.ts#L68) test costly stuck-note/resource failures.
- **Keep raster evidence.** [color independent of release opacity](../../../src/__tests__/composables/canvas/useBlobFieldRenderer.pixels.test.ts#L286), [long-held phone-size visibility](../../../src/__tests__/composables/canvas/useBlobVisibility.pixels.test.ts#L26) and [glyph bounds](../../../src/__tests__/composables/canvas/harmonicTypography.test.ts#L200) observe real native pixels. Mock call counts elsewhere cannot substitute for them. The field pixel-budget test is a useful resource contract.
- **Keep musical semantics.** [borrowed pitch voicing](../../../src/__tests__/domain/harmony.test.ts#L64), [MIDI range](../../../src/__tests__/domain/harmony.test.ts#L102) and the retained harmony inversion/press-order rows protect sounding notes rather than implementation labels.
- **Gaps remain despite 482 cases.** Ambient/Hilbert exact colors and particle registry/pool behavior need the replacements above. [Stage host observers are inert mocks](../../../src/__tests__/composables/useStageHostLayout.test.ts#L30) and unmount is called without asserting observer/listener disposal. The keyboard harness suppresses actual unmount. Microphone/MIDI tests mock physical devices; native canvas tests do not certify browser rendering. These are bounded limitations, not evidence that all their tests should be deleted.
- **Resolve an unused API before expanding tests.** [autoAdjustPerformance(metrics)](../../../src/utils/performanceMonitor.ts#L159) ignores its metrics argument and reads the singleton. All existing tests populate that singleton. If this export must remain, clarify its intended contract and test a supplied-metrics/singleton mismatch; if retired, do not spend effort hardening it.

## Phased resolution plan

1. Remove the 12 enumerated duplicates/weak synthetic cases, preserving the exact survivors. Run the five affected files through `bun run test:run <paths>`, then commit that small slice.
2. Confirm the no-consumer utility decision at the implementation head. Remove unused source exports, barrel exports and their associated suites/groups together. This is 96 total conditional retirements, including five from phase 1, so 91 further cases. Preserve live math and the monitor singleton; build once because it already typechecks.
3. Strengthen the four live behavioral gaps: actual Ambient/Hilbert color routing, particle registry/pool semantics, monitor history eviction and selective accessibility text. Repair the keyboard host/cleanup harness while retaining all 15 scenarios. Only strengthen the three weak visual utility cases if those APIs survived phase 2.
4. Optionally optimize the two per-pixel assertion loops without changing their inputs or bounds. Compare focused timing if this is implemented. Finish with one full verification checkpoint; do not run concurrent raw compilers or strip separate input/timing cases merely to hit a numerical target.

No implementation, verification runs or source retirement occurred in this audit.
