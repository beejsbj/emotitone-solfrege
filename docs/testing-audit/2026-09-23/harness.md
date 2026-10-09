# Shared harness and scope audit

Source revision: `a3cc6c8`, after the resource fix and first cleanup. This is an investigation, not a harness change. The main inventory contains 148 Vitest files / 1,662 runtime cases and one Node launcher file / four checks. Counts come from the previous successful run of unchanged test sources. No full suite, typecheck, browser capture, or coverage run was repeated for this audit.

## Keep: the four launcher checks

| File | Cases | Disposition | Why |
|---|---:|---|---|
| [scripts/verify.test.mjs](../../../scripts/verify.test.mjs) | 4 | keep | Real subprocesses and temporary Git worktrees exercise serialization, status/cancellation propagation, a live orphan after owner death, and a stuck recovery marker. Each protects a distinct resource-control failure. These are not mock-call tests. |

The launcher tests exercise `runLocked`; they do not independently exercise every CLI argument or abnormal process state. The earlier successful package build and runtime run checked normal command wiring. There is no justification here for a large additional launcher test matrix.

## H-01 — the browser audio validator accepts missing scenario groups

**Action:** strengthen the existing validator; delete zero tests. **Confidence:** high, demonstrated with stored data. **Priority:** first, because the output can overstate coverage.

[audio-lab/run.mjs:75](../../../audio-lab/run.mjs#L75) uses filtered `.every(...)` assertions for attacks, idle sequences, and worklet sequences. At line 86 it checks every remaining production scenario; only `stable-stall` is independently required later at line 94. Missing groups and missing held-change/tempo scenarios are not rejected.

The controlled probe evaluated the unchanged validator against [the existing stored result](../../../audio-lab/results/current.json), then removed **all attack and sequence rows** and kept only the `stable-stall` production scenario. **All 11 checks still returned true.** See [the full probe receipt](browser-matrix-probe.json). Removing `stable-stall` too would throw at the later `.find(...)` access; the finding is not that every production row can be absent. This does not claim current captures are empty, or that the sound engine is broken. It shows the validator fails to detect a future missing-scenario regression. A second reviewer checked the expression replay and this scope distinction.

Require the expected scenario identities as well as each row's result. The producer currently emits 12 attack rows (two engines × two stress conditions × three lead times), eight sequence rows (four engines × two stress conditions), and three production scenarios (`stable-stall`, `held-changes`, `tempo-boundary`); see [lab.mjs:114](../../../audio-lab/lab.mjs#L114) and [production-scenarios.mjs:15](../../../audio-lab/production-scenarios.mjs#L15). Keep the intentional 0 ms attack policy and old-package comparison mode explicit. A useful focused verification is to remove or duplicate one required row in stored data and require validator failure, then validate the intact fixture. A fresh browser run belongs to implementation acceptance, not this read-only audit.

## H-02 — the global clock shim hides clock-domain mistakes

**Action:** replace the broad shim with the environment clock and explicit clocks where needed. **Confidence:** high about the mismatch; no specific production regression claimed. **Priority:** after misleading assertions are repaired.

[src/test-setup.ts:130](../../../src/test-setup.ts#L130) replaces `performance.now()` with `Date.now()`. This erases the distinction the production code intentionally uses between epoch and monotonic timestamps, including [MIDI timestamp conversion](../../../src/composables/useMidiControls.ts#L335). Tests inheriting it cannot establish behavior across wall-clock adjustments simply by advancing one clock.

The explicit clock injection in [liveAudioClock.test.ts](../../../src/__tests__/services/liveAudioClock.test.ts) remains meaningful; it is not invalidated by this finding. Preserve that seam and its cases. Remove the global override only with focused verification of MIDI timestamp normalization and animation/pointer timing. Add a case only where an actual clock-conversion boundary lacks independent-clock coverage; do not add a clock test to every consumer.

## H-03 — localStorage is functional but not fully faithful

**Action:** prefer the DOM environment's storage implementation, or repair only the small shared shim. **Confidence:** high about the mismatch, low evidence of current user impact. **Priority:** low.

[src/test-setup.ts:100](../../../src/test-setup.ts#L100) returns `null` for a stored empty string and line 110 leaves `length` permanently zero. `setItem` does not model string conversion. Current visual/pattern persistence predominantly writes JSON and uses `getItem`/`setItem`, so this is not evidence all persistence tests are false. Dedicated serializer round trips and actual Pinia persistence tests should be retained. Check malformed data and storage failure handling at their owning seam, rather than duplicating storage emulation tests throughout the app.

## H-04 — leftover integration documentation claims nonexistent coverage

**Action:** retire stale scaffolding. **Confidence:** high. **Count:** zero runtime cases, three whole stale files plus unused helper exports.

[integration/index.ts](../../../src/__tests__/integration/index.ts) exports five nonexistent test modules. Its [README](../../../src/__tests__/integration/README.md) describes missing suites, references retired Tone.js/Sequencer architecture, and suggests `bun test` commands which bypass this project's configured Vitest runner. [helpers/audio-mocks.ts](../../../src/__tests__/helpers/audio-mocks.ts) is an unimported Tone.js-era mock collection; only the stale README refers to it.

Retire those three files and the unused `mockAudioContext`, touch/note/scale factories, `waitForUpdates`, `triggerResize`, and `measurePerformance` exports in [helpers/test-utils.ts](../../../src/__tests__/helpers/test-utils.ts). Keep the used Pinia, mount, and Canvas helpers. The no-consumer finding comes from source/import search at this revision, not a claim that the surviving helper module is unused. Search again before removal and run the helper's remaining consumers once.

## H-05 — make existing browser checks discoverable, and report focused scope honestly

**Action:** document existing commands and distinguish not-exercised groups. **Count:** zero deletions and no new browser framework proposed.

There is already more than the default Vitest suite:

- [audio-lab/run.mjs](../../../audio-lab/run.mjs) drives real rendered audio and selected production scheduling through a controlled sampler boundary. It is exposed as `bun run test:audio-browser`.
- [audio-lab/ui-run.mjs](../../../audio-lab/ui-run.mjs) drives the actual application, sample bank, trusted Chrome input, and PCM capture. Its optional architecture path also exercises real CodeStrip editing, Play, mute/restore, and Stop through [ui-patterns.mjs](../../../audio-lab/ui-patterns.mjs). Usage is in [ui-README.md](../../../audio-lab/ui-README.md).
- [StickerContract.typecheck.ts](../../../src/types/StickerContract.typecheck.ts) and [StickerContract.typecheck.vue](../../../src/types/StickerContract.typecheck.vue) are deliberately checked by the compiler. Runtime test files are excluded by [tsconfig.json](../../../tsconfig.json).

Therefore, neither “1,662 cases covers everything” nor “there are no real application browser tests” is accurate. The normal `test:run` command executes neither browser harness nor the four Node launcher checks.

Some documented UI comparison modes intentionally set zero UI trials. [ui-run.mjs:293](../../../audio-lab/ui-run.mjs#L293) nevertheless labels `.every(...)` summaries such as “Every trial produces captured audio” as passing on an empty list. Mark these groups not exercised in focused comparison modes; require a nonempty expected matrix in the full UI mode. This preserves useful focused experiments without presenting them as complete UI acceptance.

Document the appropriate existing browser command beside the runtime commands. Choose it for changes to playback/input/audio boundaries, not every small UI edit. This audit did not rerun it or certify existing historical artifacts as current-head browser evidence.

## Harness conclusions

Keep the four process checks and the existing real browser/audio/type-contract seams. The most useful next work is to improve what a green result means, remove false documentation, and reduce broad mocks. Test-count reduction alone does not address these issues. Harness recommendations add no inferred bulk-test quota and make no additional memory-savings claim.
