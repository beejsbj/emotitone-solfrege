# Recorded-pattern growth responsiveness

The recorded CodeStrip previously subscribed every mounted historical Note to the shared hue animation clock. Recording a release also replaced its entire CodeMirror document, then published semantic presentation in a second transaction. The first behavior kept style work proportional to mounted history while stopped; the second discarded the document mapping that lets CodeMirror retain unchanged widgets.

The fix supplies production history with a stable static color resolver backed by the user's reactive color configuration. Historical hue no longer cycles, including during replay. Live keyboard hue animation remains enabled, and playback progress/active-note presentation remains in place. Color recipe, key, mode, pitch, brightness, saturation, and monochrome settings still affect historical glyphs.

Generated source and presentation are coalesced into one microtask and one CodeMirror transaction. A common-prefix/common-suffix edit preserves unchanged source positions, note widgets, and selection. StrudelMirror's installed document-change listener still updates its runtime source and REPL; pre-evaluation reconciliation remains. Explicit source loads supersede older queued recording publication, and tempo updates retain the existing phase-preservation guard. Production presentation watches no longer deeply traverse freshly rebuilt token trees; controlled specimens retain deep observation.

An exact-version patch to `@codemirror/view@6.40.0` also avoids reading native Selection for blurred editable or tabbable editors when there is no pointer-selection request. The original implementation made that read before an unconditional no-op return for these states. In the first fixed revision's six-append profile, native Selection reads still accounted for 3.85s of 4.15s editor-dispatch time; persistence was 0.48s and Vue traversal 0.49s. The patch preserves the existing path for focused editing, pointer selection, and noneditable, nontabbable selection. Tests also verify cursor restoration after an unfocused edit. Both ESM and CommonJS builds are patched through Bun; dependency upgrades must revalidate or retire this patch.

## Run

```sh
# Requires installed dependencies, Bun, Node 22+ and Chrome/Chromium. Run one browser job at a time.
LAB_UI_REF=f4ee1c4 LAB_PATTERN_RESULT=/tmp/pattern-before.json node audio-lab/pattern-growth.mjs
LAB_PATTERN_RESULT=/tmp/pattern-after.json node audio-lab/pattern-growth.mjs
node audio-lab/check-pattern-growth.mjs /tmp/pattern-after.json
# Optional shorter protocol:16/512 controls, hue-off/on512 appends, then replay.
LAB_PATTERN_FOCUSED=1 LAB_PATTERN_RESULT=/tmp/pattern-focused.json node audio-lab/pattern-growth.mjs
node audio-lab/check-pattern-growth.mjs /tmp/pattern-focused.json
```

The harness starts isolated Vite/Chrome instances, enters the real app with trusted input, and prepares its normal piano bank. It seeds independent 16/128/512/2048-note histories from an actual recorded note. Fixtures use exactly 90ms durations and 125ms cadence. Append trials translate timestamps together immediately before each press to avoid the silence boundary. Six trusted KeyA down/up pairs follow, with a 90ms hold and 180ms inter-input wait, followed by an equal 1500ms tail drain. Every condition verifies the current take contains the seeded history plus all expected completed notes.

Hue is enabled and disabled at a fixed 512-note history. Both settings include recording-disabled input trials and six consecutive append trials. Color probes verify static historical glyphs and live keyboard animation; the run ends with a rich generated-pattern Play/Stop smoke check. No CPU profiler runs during timing. Source hashes are checked before/after to reject edits during measurement. Reference runs install that revision’s frozen dependencies and patches; final receipts also record CodeMirror and Superdough module hashes. The checker requires all nine full-protocol conditions (or all four explicitly selected focused conditions), the static-history/live-key color behavior, and completed replay, and flags a pooled 512-note median over both 100ms and twice the pooled 16-note median, or an append LongTask above500ms.

A preliminary sweep without the final tail drain was excluded because its last append snapshot contained 517 rather than 518 notes. The matched results below use the same drain on both revisions.

## Validation receipt

**Final end-to-end performance validation is incomplete.** The build and regression suites passed, and the browser evidence establishes the two application-level improvements plus the remaining selection-read cause. The installed dependency patch could not complete a valid final sweep on the shared host.

The complete [baseline](results/pattern-growth-baseline.json) at `f4ee1c4` and [application-only fix](results/pattern-growth-application-fix.json) at `bb9f6a3` used the same nine-condition protocol. Both appended 512→518 notes with hue off and on, retained normal keyboard hue motion, and passed rich generated-pattern Play/Stop. The application fix made all historical-color probes static.

|512-note measurement|Baseline|Application-only fix|
|---|---:|---:|
|Longest post-input task, recording/hue off|1464ms|976ms|
|Longest post-input task, recording/hue on|1715ms|662ms|
|Pooled stopped hue-on keydown median|128.8ms|74.0ms|

The application-only fix still failed the 500ms append-stall criterion. The baseline's pooled 16-note keydown median was 121.2ms and the application fix's was 207.4ms: substantial host noise prevents reading the 512-note median difference as a general latency guarantee, and the fresh baseline did not independently reproduce the original investigation's 2× growth ratio.

The [selection diagnostic probe](results/pattern-growth-selection-probe.json) used a temporary broader guard skipping blurred-view selection synchronization. It ran without a CPU profiler and observed a 429ms maximum post-input task for six hue-off appends, with 518 notes retained and successful rich replay. This one-condition probe motivated the narrower, tested production patch; **it is not a completed browser validation of that final installed patch**.

The final installed patch is `f4f49f4`. Its [interrupted full sweep](results/pattern-growth-interrupted.json) recorded an 86,264ms LongTask during the 16-note return control, then failed the append same-take assertion: 518 total notes but 512 current working notes. It is invalid for a final performance verdict. A [focused retry](results/pattern-growth-focused-blocked.json) was stopped before app readiness as host load reached 64.30/47.78/28.54 and trivial tool calls took minutes despite subsecond command execution. These receipts are preserved as failures/incomplete evidence; no thresholds were relaxed and no pass is claimed.

`bun run build` passed (typecheck, production Vite, PWA), with existing stale-Browserslist and large-chunk warnings. Relevant CodeStrip, notation, recording-token, color, clock, and selection suites passed across focused runs. The final selection tests cover blurred edits, focused edits, explicit pointer selection, readonly selection, and mapped cursor restoration on refocus. The original checkout's CodeMirror module remained unchanged (`97d6891b…`); the isolated patched module is `0f2db059…`. Superdough is identical in both installs (`72724b00…`).

The regression tests exercise real CodeMirror source/presentation publication, retained note DOM, and unchanged selection during both decorated and focused editing. Component tests cover runtime-source reconciliation, tempo generation/phase, explicit loads overriding queued changes, and isolated controlled use. A real Note with the production resolver keeps reactive color-setting changes without constructing the animated color composable. Existing notation and recording-token tests cover rests, overlap groups, and onset ordering.

## Limits

These are CDP dispatch round-trips and browser event-queue delays, not acoustic or physical-speaker latency. The headless Linux/Vite development host is noisy; six samples per condition are diagnostic observations, not confidence intervals or guarantees for mobile/production devices. Rich replay is a transport/presentation smoke test, not a new audio timing study.

The fix preserves unchanged rendered widgets, but still regenerates notation/tokens and scans text when recordings change. Persistence remains synchronous. Very long histories, initial loads, and large overlapping-note groups can still require substantial work. This change does not bound total history storage or make arbitrary edits constant-time. Audio engines and scheduling are unchanged.


## Visibility-scoped follow-up, 2026-09-20

Burooj replaced blanket-static history with visible-only motion. The same CodeStrip source still serves production and the controlled guide. Long-line follow now asks CodeMirror to materialize an omitted final event before using its coordinates; already rendered incremental appends keep the smooth follow. That loop finishes if device-pixel rounding or a changed scroll extent prevents movement, leaving subsequent manual scrolling usable. Materializing an append preserves active playback following. These repairs are covered by direct regressions.

The final [focused unprofiled capture](results/pattern-growth-viewport-20260920.json), with current main integrated, verifies natural 512-note follow, both six-note 512→518 append sequences, visible hue following its setting, 117 clipped mounted notes remaining static while 13 visible notes animate, horizontal scroll-away/return, Reduced Motion, and rich Play/Stop. Media emulation explicitly selects screen media and waits for two rendering frames; the capture records both actual media-query matching and the shared color clock's reduced-motion flag. The prior [complete failed capture](results/pattern-growth-viewport-pre-media-failed-20260920.json) used an unsettled media probe and remains diagnostic evidence.

**That pre-repair capture missed the strict 500ms append LongTask gate.** No threshold changed, and no unchanged-source retries were made to obtain a pass:

| Final focused measurement | Result |
| --- | ---: |
| 16-note hue-on stopped keydown median | 111.8ms |
| 512-note hue-on stopped keydown median | 100.6ms (0.90×) |
| 512→518 maximum LongTask, hue off | 395ms |
| 512→518 maximum LongTask, hue on | 502ms |

The preceding failed run measured 627/625ms. A separate [single-sequence CPU profile](results/pattern-growth-viewport-append-profile-20260920.json), with [compressed Chrome profile](results/pattern-growth-viewport-append-profile-20260920.cpuprofile.gz), measured a 347ms maximum task. Its `append-profile` mode cannot satisfy the timing checker. Across that 8.45-second diagnostic window, CodeStrip dispatch consumed 186ms, selection reads 2.1ms, notation generation 20.5ms, and recording tokens 21.3ms. Persistence consumed 359ms (340ms serialization), Vue deep traversal 341ms, and Stage drawing 2107ms (1257ms Blob bodies, 322ms Hilbert, 227ms Ambient). Another 4718ms was attributed only to the browser's native/program bucket. These inclusive categories overlap; the profile does not identify the exact owner of the earlier 625ms task. It supports the selection patch's intended effect, not closure of the whole-application latency gate. Persistence remains synchronous. The [offline parser](summarize-pattern-profile.mjs) reproduces these categories from the compressed profile.

**That capture also left production functional acceptance open:** it records 15 CodeMirror update-during-update errors from native reveal dispatch inside `requestMeasure.write` (the profile records eight). The visible/hidden color and follow assertions passed despite those errors; they did not establish an error-free recording flow. The checker now rejects this error. The dispatch repair and subsequent functional-only capture are recorded below. The real-guide capture contains zero runtime exceptions.

The exact-version CodeMirror selection patch is unchanged. Sixty-nine focused tests, including adjacent mainline CodeStrip display-mode tests, plus typecheck passed after integration; a later focused regression verifies that native materialization preserves subsequent playback-follow callbacks. The source-level visibility owner has five direct regressions, including clipped color-clock reads, latest-only hidden playback redraws, observed-element cleanup, hidden-page stillness, and current visible playback state under Reduced Motion.

Local real-guide DOM checks and inspected [desktop](../../evidence/codestrip-viewport-20260920/guide-desktop.png) / [phone](../../evidence/codestrip-viewport-20260920/guide-phone.png) captures verify the shared source at 1280×900 and 390×844: all three CodeStrip notes visible, isolated static colors, no document horizontal overflow, and 0s progress transitions under Reduced Motion. The [DOM receipt](../../evidence/codestrip-viewport-20260920/guide-check.json) and [reproduction script](../../evidence/codestrip-viewport-20260920/verify-guide.mjs) record that evidence. Production viewport behavior comes from the real-application harness; no new production screenshot, hosted preview, physical-device pacing, or acoustic measurement is claimed.

Diagnostic command (one Chrome job at a time):

```sh
LAB_PATTERN_PROFILE_APPEND=1 LAB_PATTERN_RESULT=/tmp/pattern-append-profile.json node audio-lab/pattern-growth.mjs
node audio-lab/summarize-pattern-profile.mjs audio-lab/results/pattern-growth-viewport-append-profile-20260920.cpuprofile.gz
```

Three earlier incomplete viewport captures are retained alongside the final receipt. They exposed the virtualized-follow problem and are not performance acceptance evidence.

### Deferred native reveal repair

Commit `ccdad1f` moves native reveal dispatch into a coalesced microtask after CodeMirror's measurement lock is released. The owner discards stale document/view/generation requests and cancels pending work before teardown or replacement by a newer follow; transport-follow state remains active. The component regression first reproduced the exact nested-update error (Vitest exit 1), then passed with the fix. Thirty-five component/real-EditorView queue tests and typecheck passed; direct queue tests cover latest-target coalescing, document/view replacement, teardown cancellation, and a new request after cancellation.

The [functional-only follow-up](results/pattern-growth-viewport-deferred-smoke-20260920.json), captured at `ccdad1f`, records **zero warnings/errors** with six real 512→518 appends, visible hue/clipped stillness, natural long-line follow, manual scroll-away/return, actual Reduced Motion media and shared-clock state, and rich Play/Stop with an active glyph. This resolves the recorded nested-update functional failure. Its abbreviated `viewport-smoke` mode cannot pass the complete performance checker; at that point the 502ms timing failure remained open pending a separately verified source change and complete capture.

```sh
LAB_PATTERN_VIEWPORT_SMOKE=1 LAB_PATTERN_RESULT=/tmp/pattern-viewport-smoke.json node audio-lab/pattern-growth.mjs
```

### Final integrated focused capture

The [final repaired-source capture](results/pattern-growth-viewport-repaired-20260920.json) **passes all four-condition focused gates**, including the unchanged 500ms maximum append LongTask criterion and zero captured browser warnings/errors. This was one capture after verified source changes: deferred native reveal, synchronous pattern serialization without reactive proxy traversal, and exact worklet-response batching. Its revision `48b8962` has the same production source as the parent's frozen `bf26759`; no source changed during the run. Earlier failures and the separate profile remain preserved above.

| Final integrated measurement | Result |
| --- | ---: |
| 16-note hue-on stopped keydown median | 117.3ms |
| 512-note hue-on stopped keydown median | 159.3ms (1.36×) |
| 512→518 maximum LongTask, hue off | 458ms |
| 512→518 maximum LongTask, hue on | 405ms |
| Captured browser warnings/errors | 0 |

Both six-note append sequences reach 518. Visible hue follows configuration, clipped mounted notes remain still, native long-line follow leaves real glyphs in view, horizontal scroll-away/return resumes current color, and Reduced Motion matches both the real media query and shared clock while all sampled motion remains still. Rich Play/Stop includes an active glyph. The [checker transcript](results/pattern-growth-viewport-repaired-20260920.check.txt) records the complete verdict. The receipt contains all 668 tested source hashes and aggregate SHA256 `46f921ed76328e9260c829325aaa18c666445c8f1032249c9404b4aa0fd57dc7`; installed CodeMirror and Superdough hashes match the preceding exact-patch captures.

This closes the local focused CodeStrip gate. Absolute input delays remain visible in the table and are not acoustic latency or a physical-device performance guarantee. No unchanged-source rerun, threshold relaxation, or new guide/production screenshot claim was used to obtain the result.

### Subsequent review guards

The final review additionally tightened the checker to require the complete tuple multiset for either focused or full sweeps, preserving the two intentional repeated controls in the full matrix. `node audio-lab/verify-receipt-guards.mjs` verifies that duplicate rows cannot replace the 128/2048-note or hue-off conditions; the retained focused receipt still passes. The same script verifies that asynchronously captured guide errors cannot publish or overwrite a success receipt.

A separate CodeStrip generation guard fixes pattern replacement concurrent with a tempo edit; 31 component regressions and typecheck pass, including pure-tempo continuity. This changes active-pattern phase ownership, not the recorded append/viewport benchmark path. No additional timing or guide capture is claimed; see [post-review validation](../docs/research/audio-stack-validation.md).
