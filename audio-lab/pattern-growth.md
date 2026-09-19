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
