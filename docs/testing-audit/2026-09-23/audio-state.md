# Audio and state test value audit

Reviewed all 54 assigned files and 673 manifest cases against their assertions and adjacent production seams. This is a read-only judgment at `fix/test-resource-budget`; no tests, browser probes, or mutation checks were run. The reported case count includes an opt-in benchmark declaration that the ordinary runtime command skips.

**Verdict:** Keep the render, ownership, timing, persistence, and adapter boundaries. Four cases in the visual-config store are defensible immediate removals. One dependency-source assertion needs a behavioral replacement; one opt-in benchmark belongs in explicit lab tooling; one malformed-persistence case needs a stronger outcome assertion. These counts do not overlap.

## Per-file inventory

| File | Cases | Disposition | Judgment |
| --- | ---: | --- | --- |
| [audio-lab/reference/livePlayback.test.ts](../../../audio-lab/reference/livePlayback.test.ts) | 2 | keep | Lab-only native selector: borrowed AudioBuffer accounting and catalog fallback; production selector is deliberately worklet-only. |
| [audio-lab/reference/native/renderer.test.ts](../../../audio-lab/reference/native/renderer.test.ts) | 15 | keep | Native comparison renderer has distinct Web Audio node timing, ownership, failure, and suspended-clock contracts; it is not the worklet core. |
| [src/__tests__/services/audibleStageTimeline.test.ts](../../../src/__tests__/services/audibleStageTimeline.test.ts) | 5 | keep | Output-clock presentation registry, early release, future filtering and timer/listener disposal are observable Stage behavior. |
| [src/__tests__/services/audioDiagnostics.test.ts](../../../src/__tests__/services/audioDiagnostics.test.ts) | 6 | keep | Distinguishes unsupported, zero, unavailable and unreadable device clocks plus renderer lead. |
| [src/__tests__/services/audioRuntime.test.ts](../../../src/__tests__/services/audioRuntime.test.ts) | 3 | keep | Canonical graph sharing, suspended initialization and retry after failure are separate initialization states. |
| [src/__tests__/services/audioRuntimeBudget.test.ts](../../../src/__tests__/services/audioRuntimeBudget.test.ts) | 1 | keep | Installed Superdough admission and app budget are exercised through a fake audio clock, bridging constants to behavior. |
| [src/__tests__/services/configPublicSurface.test.ts](../../../src/__tests__/services/configPublicSurface.test.ts) | 7 | keep | Public control mapping preserves hidden calibration and legacy data; distinct from store persistence. |
| [src/__tests__/services/hummingStage.test.ts](../../../src/__tests__/services/hummingStage.test.ts) | 9 | keep | Stable pitch debounce, off-scale omission, musical-context replacement and session ownership are presentation semantics. |
| [src/__tests__/services/inputVoiceGroups.test.ts](../../../src/__tests__/services/inputVoiceGroups.test.ts) | 5 | keep | Overlapping owners and late async attack cleanup prevent stuck voices. |
| [src/__tests__/services/keySurfaceColor.test.ts](../../../src/__tests__/services/keySurfaceColor.test.ts) | 3 | keep | Color conversion and monochrome base outputs cover separate key-surface behavior. |
| [src/__tests__/services/liveArticulation.test.ts](../../../src/__tests__/services/liveArticulation.test.ts) | 19 | keep | Instrument and legacy-name envelope mapping is a public sound contract; parameter rows have different inputs. |
| [src/__tests__/services/liveAudio.test.ts](../../../src/__tests__/services/liveAudio.test.ts) | 3 | keep | MediaStream lease sharing, source loss and late permission cancellation protect actual hardware ownership logic. |
| [src/__tests__/services/liveAudioClock.test.ts](../../../src/__tests__/services/liveAudioClock.test.ts) | 4 | keep | Injected wall/monotonic clocks test drift, pause boundary and reanchor independently of the global test clock. |
| [src/__tests__/services/liveAudioTiming.test.ts](../../../src/__tests__/services/liveAudioTiming.test.ts) | 2 | keep | Device output timestamp and latency fallback are distinct mathematical paths. |
| [src/__tests__/services/livePerformance.test.ts](../../../src/__tests__/services/livePerformance.test.ts) | 7 | keep | Plan-to-MIDI mirror and owner metadata survive delayed renderer events; one test drives the actual worklet core. |
| [src/__tests__/services/livePitch.test.ts](../../../src/__tests__/services/livePitch.test.ts) | 1 | keep | Synthesized A4 PCM plus silence directly exercises MPM pitch recognition. |
| [src/__tests__/services/livePlayback.test.ts](../../../src/__tests__/services/livePlayback.test.ts) | 17 | keep | Production worklet manager covers preparation, PCM budget, LRU, fallback, context replacement and obsolete native-selector regression. |
| [src/__tests__/services/liveResampler.test.ts](../../../src/__tests__/services/liveResampler.test.ts) | 21 | keep | Real PCM tests cover alias rejection, pitch, loop interpolation, stereo, one-shot bounds and memory ownership. |
| [src/__tests__/services/microphoneCapture.test.ts](../../../src/__tests__/services/microphoneCapture.test.ts) | 8 | keep | Recorder failure and races verify source/monitor/lease cleanup, including late startup. |
| [src/__tests__/services/music.test.ts](../../../src/__tests__/services/music.test.ts) | 5 | keep | Mode catalog and scale calculations establish musical domain outputs rather than store wiring. |
| [src/__tests__/services/musicColor.test.ts](../../../src/__tests__/services/musicColor.test.ts) | 7 | keep | Facade resolves movable/fixed/off-scale pitch colors across musical contexts. |
| [src/__tests__/services/musicColorCore.test.ts](../../../src/__tests__/services/musicColorCore.test.ts) | 10 | keep | Core geometry, gamut, alpha and invalid identity rules differ from facade resolution. |
| [src/__tests__/services/patternPersistence.bench.test.ts](../../../src/__tests__/services/patternPersistence.bench.test.ts) | 1 | replace | Opt-in diagnostic prints timings but makes no assertion and is skipped in the normal runtime run; retain benchmark purpose in explicit lab tooling. AS-02. |
| [src/__tests__/services/patternPersistence.test.ts](../../../src/__tests__/services/patternPersistence.test.ts) | 3 | replace | Actual reactive Pinia round-trip is valuable; malformed-data case checks only non-throw and omits asserted default state. AS-03. |
| [src/__tests__/services/pitchAnalysis.test.ts](../../../src/__tests__/services/pitchAnalysis.test.ts) | 5 | keep | Network adapter, WAV bytes, phrase segmentation and out-of-scale candidates are distinct contracts. |
| [src/__tests__/services/playStyles.test.ts](../../../src/__tests__/services/playStyles.test.ts) | 42 | keep | Scheduler unit tests cover pulse grid, stalls, chord collection, unisons, committed edges and cleanup; distinct from store dispatch. |
| [src/__tests__/services/preparedLiveInstrument.test.ts](../../../src/__tests__/services/preparedLiveInstrument.test.ts) | 15 | keep | Decoded AudioBuffer borrowing, soundfont range/root selection, filter pyramid and PCM cache lifetime are central ownership checks. |
| [src/__tests__/services/recordedPlayback.test.ts](../../../src/__tests__/services/recordedPlayback.test.ts) | 27 | keep | Generated code is executed through installed Strudel mini/transpiler and whole-event timing/controls are asserted. |
| [src/__tests__/services/recordedTiming.test.ts](../../../src/__tests__/services/recordedTiming.test.ts) | 6 | keep | Pure coalescing keeps source timestamps and gates even where notation shortens gaps. |
| [src/__tests__/services/roliLiveSync.test.ts](../../../src/__tests__/services/roliLiveSync.test.ts) | 6 | keep | MIDI port identification and exact wire messages have independent protocol failure modes. |
| [src/__tests__/services/roliPianoExport.test.ts](../../../src/__tests__/services/roliPianoExport.test.ts) | 8 | keep | Color-to-ARGB and generated LittleFoot metadata/message hooks are export contracts. |
| [src/__tests__/services/scheduledLiveVoice.test.ts](../../../src/__tests__/services/scheduledLiveVoice.test.ts) | 13 | keep | Audio-clock deadlines, late promises, dropped gates, suspend rebase and timer cleanup protect fallback scheduler. |
| [src/__tests__/services/soundfontPatch.test.ts](../../../src/__tests__/services/soundfontPatch.test.ts) | 5 | keep | Installed soundfont entry/cache, retry, decode and registration tests exercise patched package API with transitive mocks. |
| [src/__tests__/services/soundfontStop.test.ts](../../../src/__tests__/services/soundfontStop.test.ts) | 4 | keep | Installed held-source release and idempotent cleanup are node-lifetime contracts. |
| [src/__tests__/services/stageAppearance.test.ts](../../../src/__tests__/services/stageAppearance.test.ts) | 16 | keep | Stage control allowlist, migrations and saved-Look composition are domain contracts; store tests add persistence. |
| [src/__tests__/services/stageAudio.test.ts](../../../src/__tests__/services/stageAudio.test.ts) | 3 | keep | Playback/microphone analysis bus and envelope timing are distinct, though graph nodes are mocked. |
| [src/__tests__/services/StrudelNotation.test.ts](../../../src/__tests__/services/StrudelNotation.test.ts) | 17 | keep | Text form tests pin readable native notation and several source timing branches; playback suite separately executes representative output. |
| [src/__tests__/services/superdoughAudio.test.ts](../../../src/__tests__/services/superdoughAudio.test.ts) | 20 | keep | Mocked engine seam verifies canonical graph, scheduling, warmup, borrowed-pitch events and cold failures. |
| [src/__tests__/services/superdoughLifecycle.test.ts](../../../src/__tests__/services/superdoughLifecycle.test.ts) | 49 | keep | Installed patched engine with fake audio nodes verifies admissions, provisional retirement, release tails and cleanup; count is high but cases differ. |
| [src/__tests__/services/superdoughPatch.test.ts](../../../src/__tests__/services/superdoughPatch.test.ts) | 2 | replace | Fetch retry is executable; held-voice/ZZFX case checks exact dependency source strings rather than sound duration/loop behavior. AS-01. |
| [src/__tests__/services/superdoughRetirementRollback.test.ts](../../../src/__tests__/services/superdoughRetirementRollback.test.ts) | 3 | keep | Installed builtin oscillator rollback tests stale cleanup and real key-off order; custom-source lifecycle cases do not fully replace them. |
| [src/__tests__/services/superdoughSynthesisCache.test.ts](../../../src/__tests__/services/superdoughSynthesisCache.test.ts) | 9 | keep | Actual generated sample buffers test deterministic reuse, randomized separation, cache keys and memory bounds. |
| [src/__tests__/stores/instrument.test.ts](../../../src/__tests__/stores/instrument.test.ts) | 9 | keep | Selection readiness, deduped warmup and overlapping A/B/A failure races are store-level user interaction states. |
| [src/__tests__/stores/keyboardDrawer.test.ts](../../../src/__tests__/stores/keyboardDrawer.test.ts) | 5 | keep | Drawer touch and overlap ownership reaches public actions. |
| [src/__tests__/stores/music-live-notes.test.ts](../../../src/__tests__/stores/music-live-notes.test.ts) | 3 | keep | Simple but explicit store-to-audio delegation, symbolic state and event dispatch contract. |
| [src/__tests__/stores/music-midi.test.ts](../../../src/__tests__/stores/music-midi.test.ts) | 4 | keep | Negative/flat/wrapped pitch mapping and new note IDs cover MIDI input normalization. |
| [src/__tests__/stores/music-play-styles.test.ts](../../../src/__tests__/stores/music-play-styles.test.ts) | 37 | keep | Store integration records captured envelopes and deadlines while handling mode/instrument switches and pending attacks. |
| [src/__tests__/stores/music.test.ts](../../../src/__tests__/stores/music.test.ts) | 14 | keep | Mode-aware attack, borrowed pitch, warmup lock and pending owner cancellation connect music math to store actions. |
| [src/__tests__/stores/musicWorklet.test.ts](../../../src/__tests__/stores/musicWorklet.test.ts) | 21 | keep | Worklet store path tracks exact renderer events, MIDI plan changes, fallback and disposal; distinct from core and manager. |
| [src/__tests__/stores/patterns.test.ts](../../../src/__tests__/stores/patterns.test.ts) | 49 | keep | Long state suite covers take provenance, undo, load, transformations, save/return and persistence; each named transition differs. |
| [src/__tests__/stores/visualConfig.test.ts](../../../src/__tests__/stores/visualConfig.test.ts) | 71 | trim | Persistence/migrations and Look composition are valuable; four default/framework/illusory assertions add no distinct failure mode; its store ID is consumed by the lab runners. AS-04. |
| [src/audio/live/bridge.test.ts](../../../src/audio/live/bridge.test.ts) | 10 | keep | MessagePort receipt, ordered batched delivery, suspension and disposal are transport boundary behavior. |
| [src/audio/live/core.test.ts](../../../src/audio/live/core.test.ts) | 33 | keep | Real render buffers and lifecycle receipts establish PCM, scheduler, ownership, admission and fade contracts. |
| [src/audio/live/processor.test.ts](../../../src/audio/live/processor.test.ts) | 3 | keep | AudioWorklet processor batches responses per quantum and handles quiet/failure boundaries, separate from core. |

## Actionable findings

### AS-01 — replace (1 case)

The test reads two dependency files and checks literal substrings. Those strings can remain while actual held duration, ZZFX loop region, stop behavior or memory allocation regresses.

Locations: [src/__tests__/services/superdoughPatch.test.ts:33](../../../src/__tests__/services/superdoughPatch.test.ts#L33) — keeps held voices open while bounding materialized ZZFX buffers; [patches/superdough@1.3.0.patch:4476](../../../patches/superdough@1.3.0.patch#L4476) — patched ZZFX loop source.

Action and surviving coverage: Keep line 11 fetch-retry case. Add an installed-package behavioral test using createSuperdoughTestAudio: advance a fake audio clock with a held ZZFX note beyond 60 s (no wall-clock wait), assert it still owns a voice, buffer bounded near one second and loops, then release and assert stop/disconnect. The lifecycle and synthesis-cache suites cover neighboring contracts but not this combination.

Loss risk: Removing before a behavioral replacement loses the only direct guard for the materialized held ZZFX patch.

Verification: Run the new focused package test and the existing patch/lifecycle/cache suites; inspect runtime voice and source state, not dependency text.

### AS-02 — relocate (1 case)

describe.runIf skips this assertion-free console benchmark in the normal runtime run, yet its discovered case contributes to the reported inventory. The measured timing has no pass/fail threshold.

Locations: [src/__tests__/services/patternPersistence.bench.test.ts:7](../../../src/__tests__/services/patternPersistence.bench.test.ts#L7) — compares legacy and optimized JSON on a 512-note reactive Pinia state.

Action and surviving coverage: Keep the opt-in timing experiment as a named lab/bench script with an explicit command and output; patternPersistence.test.ts:82 and :95 retain correctness and actual Pinia persistence.

Loss risk: A performance investigation aid would be lost if the benchmark is simply erased.

Verification: Verify normal suite inventory excludes benchmark; run bench explicitly once and check it reports both timings and sample state size. No performance threshold proposed.

### AS-03 — strengthen (1 case)

The store assertion is only not.toThrow(); the second assertion proves the raw parser throws. A store that silently starts with corrupt or empty state could pass.

Locations: [src/__tests__/services/patternPersistence.test.ts:152](../../../src/__tests__/services/patternPersistence.test.ts#L152) — leaves malformed persisted JSON on safe store defaults.

Action and surviving coverage: Assert the initialized patterns state equals specific safe defaults and can accept/save a subsequent note; keep the malformed JSON parser expectation if the parser contract matters.

Loss risk: Default fields can intentionally migrate, so assert stable user-facing state rather than every incidental field.

Verification: Focused persistence test after changing the assertion; inspect storage and store state after malformed hydration.

### AS-04 — delete (4 cases)

The first is a partial subset of the exact default-config assertion at :965. The reactivity case creates but never installs a watcher and only checks an update value. The type-safety case supplies valid inputs and checks their types. Same-Pinia useVisualConfigStore returns the same instance, a framework property rather than a tested persistence boundary. The store-ID case stays: two lab runners retrieve the real Pinia store by that literal ID.

Locations: [src/__tests__/stores/visualConfig.test.ts:43](../../../src/__tests__/stores/visualConfig.test.ts#L43) — should initialize with default values; [src/__tests__/stores/visualConfig.test.ts:912](../../../src/__tests__/stores/visualConfig.test.ts#L912) — should trigger reactivity on config updates; [src/__tests__/stores/visualConfig.test.ts:952](../../../src/__tests__/stores/visualConfig.test.ts#L952) — should preserve type safety in configuration updates; [src/__tests__/stores/visualConfig.test.ts:1251](../../../src/__tests__/stores/visualConfig.test.ts#L1251) — should maintain state across store instances.

Action and surviving coverage: Retain :965 for full defaults, :496/:926 for update values and object reference behavior, :798/:816/:1261 for storage writes, :78/:857/:1146 for fresh-Pinia reloads, and [visualConfig.test.ts:1247](../../../src/__tests__/stores/visualConfig.test.ts#L1247) for the store ID consumed by the lab runners.

Loss risk: The four cases add little distinct protection; preserve the cited store behavior and ID guard.

Verification: Inspect the four exact removals and run the focused visualConfig suite at the implementation checkpoint.

## Valuable coverage and remaining gaps

The worklet [core](../../../src/audio/live/core.test.ts) renders and inspects stereo PCM, ADSR, timing, unison ownership and 64-voice admission. The [resampler](../../../src/__tests__/services/liveResampler.test.ts) checks alias suppression, loop edges, original-buffer integrity and pyramid size. The [bridge](../../../src/audio/live/bridge.test.ts), [performance mirror](../../../src/__tests__/services/livePerformance.test.ts), [worklet store](../../../src/__tests__/stores/musicWorklet.test.ts), [fallback scheduler](../../../src/__tests__/services/scheduledLiveVoice.test.ts), and [native lab reference](../../../audio-lab/reference/native/renderer.test.ts) defend different boundaries. The installed patched Superdough [lifecycle](../../../src/__tests__/services/superdoughLifecycle.test.ts) and [rollback](../../../src/__tests__/services/superdoughRetirementRollback.test.ts) suites protect source retirement, not just mocked calls. [Recorded playback](../../../src/__tests__/services/recordedPlayback.test.ts) executes generated Strudel code and queries whole onsets, making its timing assertions materially stronger than string-only snapshots. [Pattern persistence](../../../src/__tests__/services/patternPersistence.test.ts) exercises a 512-note reactive store through Pinia.

These unit files model MediaStream permissions, Web Audio suspension, AudioWorklet delivery, and output latency. Existing audio-lab browser runs exercise app paths separately; this audit did not repeat them. Any engine or scheduler change should be checked against those existing browser scenarios. The [Strudel notation](../../../src/__tests__/services/StrudelNotation.test.ts) syntax cases are useful for readability; where a future notation change alters timing, add a whole-event queryArc assertion rather than deleting syntax cases on count grounds. The patched ZZFX held-buffer case is the one source-only claim with no equivalent executable guard.

## Cross-review receipt

The [UI lab runner](../../../audio-lab/ui-run.mjs#L136) and [pattern-growth runner](../../../audio-lab/pattern-growth.mjs#L130) retrieve the real Pinia store with `pinia._s.get('visualConfig')`. This makes the store ID an integration contract, so the [ID case](../../../src/__tests__/stores/visualConfig.test.ts#L1247) is retained. AS-04 therefore proposes four deletions.

## Resolution order

1. Remove the four exact visual-config cases in AS-04. Preserve the cited neighboring behavioral cases and the store-ID assertion.
2. Add the held ZZFX runtime test in AS-01, then remove the source-text assertion. Run focused installed-package tests.
3. Strengthen malformed patterns hydration in AS-03 and move the opt-in benchmark in AS-02 to an explicit lab command.
4. At the next coherent checkpoint run repository package-script verification, then use targeted browser audio checks for any engine or scheduling code change. No engine change is proposed by this audit.
