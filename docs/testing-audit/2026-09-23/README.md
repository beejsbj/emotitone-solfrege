# Remaining-test value audit — 2026-09-23

The suite contains real excess, but the evidence does not support throwing away most of it. The clearest waste is concentrated in obsolete utility APIs, redundant assertions, and claims that are stronger than what a test actually observes. Audio rendering, recording timing, asynchronous cancellation, independent input ownership, persistence, and canvas output retain substantial distinct coverage.

This report audits source revision `a3cc6c8` after the resource fix and initial cleanup. It proposes changes; it does not implement further test or production-code deletions.

## Scope and method

Three review agents divided the entire application test inventory. Each reviewed assigned assertions and relevant production seams, classified every file, and supplied case-level evidence for proposed changes. The lead audited shared setup, the launcher checks, unused scaffolding, and browser-runner scope. UI and audio/state reviewers then challenged each other's proposed actions, and the UI reviewer independently checked the logic/canvas deletion ledger and utility-consumer search. Model authorship was not used as evidence.

| Area | Files | Runtime cases | Detailed inventory and findings |
|---|---:|---:|---|
| Components and style guide | 57 | 507 | [UI audit](ui.md) |
| Audio, services, stores and lab reference | 54 | 673 | [Audio/state audit](audio-state.md) |
| Composables, canvas, utilities, domain and data | 37 | 482 | [Logic/canvas audit](logic-canvas.md) |
| Verification launcher | 1 | 4 | [Harness audit](harness.md) |
| **Total** | **149** | **1,666** | [Machine-readable file inventory](inventory.csv) |

The application total remains **1,662 cases: 1,661 passed and one deliberately skipped benchmark**, plus four separately passing launcher checks. These are the previous successful runs of unchanged test sources, not a new full-suite run for this audit. The 1,452 application test declarations expand to 1,662 cases, including parameterized inputs. For example, the 15 declarations in `useHarmonicAnalysis.test.ts` produce 45 cases; that expansion alone is not duplication.

Every inventoried file received source review. “Keep” means no concrete deletion was established, not that the suite is mathematically minimal or every possible regression is caught. This was not a whole-suite mutation campaign, fresh coverage measurement, browser/device certification, or proof of absence of external consumers.

Artifact validation matched every application file exactly once to its lane, checked per-file case totals and finding references, and verified all 322 relative file/line links. Only audit documentation and its index link changed. The browser-validator expression replay is the sole executed defect probe in this pass.

## Proposed disposition

| Action | Existing cases | Meaning |
|---|---:|---|
| Delete redundant or vacuous cases directly | **16** | Eleven utility cases, one duplicated harmony row, and four visual-config cases, with surviving coverage identified. |
| Retire tests together with unused utility source | **96 conditional** | No current application consumer was found for the named APIs. Five overlap the 16 above, so this adds **91**, not 96, further cuts. |
| Repair weak or overstated behavioral checks | **10** | Four UI, one installed-audio-package, four canvas, and one monitor case. These are touched cases, not a net deletion forecast; a private pool detail may only need a narrower test name. |
| Strengthen unused utility checks only if their APIs remain | **3 conditional** | Entirely inside the 96-case source-retirement set; do not rewrite them before deciding whether the code stays. |
| Strengthen malformed-persistence outcome | **1** | Keep the case, assert safe initialized state and successful subsequent use. |
| Repair a composable test harness | **15** | Retain all keyboard-control scenarios, replace mocked Vue lifecycles with a real mounted host and cleanup. |
| Move an opt-in benchmark out of the normal case inventory | **1 skipped** | Preserve the diagnostic as explicit lab tooling. |
| Keep structural checks but narrow their claims | **4** | Avoid generating new UI tests for contracts already checked structurally. |

The combined direct-plus-conditional removal set is **107 distinct existing cases**. Do not add every row of this table: some utility replacement candidates also lie inside conditional source retirement, and replacements do not imply a smaller count. There is no defensible target such as “cut the suite in half.” The unit-test memory reduction from this proposed pruning has not been measured.

## What should actually change

### 1. Repair misleading green results

The highest-impact finding is in the existing browser-audio validator. Evaluating its unchanged checks against a stored result after deleting **all attack/sequence rows** and retaining only the `stable-stall` production scenario still returned **11 passing checks**. Empty filtered arrays satisfy `.every(...)`; missing held-change and tempo-boundary scenarios are not rejected. Retaining `stable-stall` matters: removing it too throws later.

Require expected scenario identities before judging their results. The [probe receipt](browser-matrix-probe.json) and [H-01](harness.md#h-01--the-browser-audio-validator-accepts-missing-scenario-groups) document exactly what was and was not demonstrated. No browser was launched for this probe, and it does not allege the stored capture originally omitted those scenarios.

Then repair the bounded semantic gaps identified in the lane reports: guide tempo continuity, actual note-onset ordering in PatternList, Keyboard specimen control wiring, the accepted fifteen-destination Tabs specimen count, held ZZFX sound/buffer behavior, exact-pitch renderer color, particle path/pool semantics, selective accessible labels, and frame-history eviction. Extend an existing owner test where practical and remove the superseded weak assertion. Require a focused counterexample to fail; merely adding another passing test is insufficient.

### 2. Remove the 16 supported test-only cuts

The logic/canvas report lists eleven utility cases and one duplicated C-major harmony row alongside their stronger survivors. The audio/state report lists four removals in `visualConfig.test.ts`: partial defaults, an uninstalled-watcher “reactivity” assertion, valid-input `typeof` checks presented as type safety, and a same-Pinia singleton check presented as persistence.

Do **not** remove the neighboring store-ID assertion. Cross-review found two actual browser-lab consumers of `pinia._s.get('visualConfig')`. That seemingly trivial test protects a real integration contract. This is why counting small tests or searching for assertions on literals is not enough to justify deletion.

### 3. Retire unused code and its tests together

The [logic/canvas report](logic-canvas.md) identifies **96 cases** attached to these conditional retirement candidates:

| Source/API subset | Cases |
|---|---:|
| All of `deviceDetection.ts` | 28 |
| All of `duration.ts` | 21 |
| Unconsumed `visualEffects.ts` helpers | 35 |
| Unconsumed performance suggestions/automatic adjustment helpers | 12 |

Remove the source exports and barrel entries together with their tests only after rechecking current consumers and whether the exported API is intentionally supported outside this application. The report found no current repository consumer; it cannot prove no external or manually invoked user exists. Preserve the visual/string helpers and the monitor singleton that do have application consumers. Retiring only tests while leaving these APIs present would worsen maintainability.

Five direct-deletion cases already sit in this set. If all conditional retirements proceed, the 16-case first pass plus the additional 91 reaches 107 distinct removals. Case counts after behavioral replacements remain an implementation result, not an audit promise.

### 4. Reduce misleading scaffolding and broad mocks

Retire the stale integration README/index and the unimported Tone.js mock module. They describe or export suites that do not exist and send readers to the wrong runner. Remove unused helper exports while retaining the shared helpers with live consumers.

The keyboard-controls suite replaces Vue mount/unmount hooks with immediate/no-op functions, leaving some listeners and unscoped watchers without cleanup. Repair its host once and retain all 15 behavioral scenarios; this is test isolation debt, not evidence for the earlier compiler incident. The global setup also makes `performance.now()` equal to `Date.now()` and incompletely emulates localStorage. Prefer actual environment behavior plus explicit clocks or storage failures where a test needs control. Existing injected-clock and real-Pinia tests remain useful; the presence of a broad mock does not invalidate every consumer.

Two typography cases make four assertions for every painted pixel. They can retain the same native raster oracle and strict edge bounds while checking a computed bounding box once. That is an optional assertion-cost optimization, with zero case removals and no measured speedup yet.

Keep the four launcher process tests. Document the existing actual-app Chrome/PCM and CodeStrip harness beside the standard runtime commands; do not build another browser framework merely because these scenarios are outside Vitest's count. Focused zero-trial lab modes should say which groups were not exercised rather than labeling them passed.

## Coverage that earns its place

- **Actual audio and musical output:** PCM buffers, resampling/alias rejection, exact attack/release timing, voice budgets, generated Strudel execution, source timestamp preservation and independent borrowed pitches.
- **Race and lifetime behavior:** late permissions, overlapping instrument warmups/evaluations, stale callbacks, cancellation, per-contact note owners, release tails, memory ownership and cleanup.
- **Real visual output:** native raster pixels, held-note visibility, exact-pitch projection, geometry/lifecycle transitions, and independent live/MIDI/Strudel inputs.
- **Application state and interaction:** real Pinia serialization/hydration, take provenance and undo, pointer/keyboard/focus behavior, controlled-component isolation and source-map/editor invalidation.

Tests of different layers are not automatically duplicates: a correct audio core does not prove the MessagePort bridge or store adapter uses it correctly. Conversely, a mock receiving a call does not prove that audio sounded or the browser rendered a layout. The detailed reports state which boundary each file protects.

## Implementation sequence and validation

1. Repair the browser scenario validator and the most misleading semantic checks. Use stored-result rejection probes for missing/duplicate scenarios and focused tests for each owning seam. Reuse the existing real browser harness for final audio acceptance if its validator changes.
2. Remove the 16 direct candidates and stale scaffolding. Run affected package-script test files; no new tests are required merely to prove redundant tests were removed.
3. Make the utility-source retirement as its own commit after consumer review. Remove exports/tests together, preserve live helpers, and run affected tests plus one build/typecheck checkpoint.
4. Repair remaining semantic checks and shared setup in separate coherent slices. Keep intentional structural constraints; narrow names that currently promise mounting, timing, or rendering they never observe.
5. Run one full runtime suite at the combined checkpoint, along with launcher checks only if the launcher changes. Report case inventory, failures, time and sampled RSS separately. A smaller count is useful only when retained coverage remains meaningful.

No implementation, source/test deletion, remote push, or bjslab update occurred in this investigation. The artifacts are committed locally on the existing resource-fix branch. The next action is a bounded cleanup following these named findings, not another open-ended scan or a numerical test quota.

## Implementation status — 2026-09-24

Before implementation, the claims were checked again against the current code. An independent blind review, which did not see this audit, suggested cuts of 12–30%. Spot checks did not support the larger cuts: most of the `visualConfig` cases it would cut are migrations of users' saved localStorage data, and the `Keyboard` prop-mapping test it flagged checks real behavior. Its specific duplicate findings were already in the 16 direct cuts. A separate check confirmed every consumer claim and all 16 survivors. It also found that `src/utils/index.ts` re-exported `deviceDetection`; nothing imports that barrel.

Done:

- Sections 1 and H-05: `audio-lab/validate.mjs` requires every expected attack, sequence and production scenario exactly once. `validate.test.ts` checks it against the stored capture and fails when the gap check is disabled. `ui-run.mjs` lists zero-trial checks under `notExercised` instead of passing them.
- Section 2: all 16 direct cuts.
- Section 3: `deviceDetection.ts`, `duration.ts`, six `visualEffects` helpers and two `performanceMonitor` helpers are removed together with their tests. The three renderer helpers and the monitor singleton remain.
- Section 4 and H-04: the stale integration README/index, `audio-mocks.ts` and unused `test-utils` exports are removed. The keyboard-controls suite mounts a real host and unmounts it after each case. A probe counted this composable's keydown handlers still attached after the file: 4 before, 0 after.

Checkpoint: **1,557 passed, 1 skipped (1,558)**, down from 1,662. That is 107 existing cases removed and 3 validator cases added. Runtime was 32.0 s against a 35.5 s same-day baseline. Environment setup and collection take about 29 s of that, so case count is not what drives suite cost. `bun run build` and the four launcher checks passed. No browser capture was rerun, and no memory change is claimed.

Second pass, same day. All remaining findings are now implemented:

- UI: PatternList onset order, Keyboard specimen control wiring, the UIBeat guide's tempo-phase continuity (driven frame queue) and the fifteen mounted Tabs destinations are now observed at runtime. UI-03/05/07/08 keep their structural checks under narrower titles.
- Logic/canvas: Ambient and Hilbert both resolve an exact pitch class that differs from the solfege index. Particle fills use the registry Path2D, and retired particles are reused and reset. Monitor history evicts old frames. Each harmonic label is exposed only when enabled.
- Audio/state: the patched superdough bundle the app actually loads (`dist/index.mjs`) is exercised directly. A held ZZFX voice loops a buffer of at most ~1 s, and a held synth voice outlives 70 s. Malformed pattern storage leaves safe defaults and later saves still persist. The benchmark moved to `bun run bench:persistence`.
- Harness: `performance.now()` is no longer aliased to `Date.now()`. The localStorage shim now follows the Storage contract.

Each behavioral replacement was checked by breaking the protected production behavior and watching the test fail, then restoring the file. The AS-03 hydration case was not mutation-checked. Several agent-written repairs failed this check on review and were redone: two UI tests were still source-string checks, the Ambient test ignored which pitch class was used, and the ZZFX test missed the open-ended duration.

Final checkpoint: **146 files, 1,562 passed**, no skips. `bun run build` passed, and so did the four launcher checks. The optional typography assertion-cost optimization (logic-canvas-009) was not done.
