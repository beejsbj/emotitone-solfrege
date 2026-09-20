# Bounded native lookahead comparison

This laboratory compares the actual app's piano renderer at native 400, 1200 and
2000 ms lookahead with the worklet. The native horizon is an explicit guarded
Vite transform in the lab runner. It does not change production defaults or add
a setting. The receipt records `labNativeLookaheadMs`; the unmodified manager's
static `backend.lookaheadMs` continues to describe the production default.

Run one browser job at a time, on a quiet host and the same frozen app source and
dependencies. The runner hashes app and harness files before and after capture.
The existing piano preparation, graph, trusted keyboard events and PCM recorder
are reused. Each case clears the temporary browser's working recording desk so
history growth is equal across cases; full-history performance has its own lab.

```sh
LAB_UI_BACKEND=native LAB_NATIVE_LOOKAHEAD_MS=400 LAB_NATIVE_COMPARE=1 LAB_UI_TRIALS=3 LAB_UI_FILTER='/(touch/idle|keyboard/idle)$' node audio-lab/ui-run.mjs audio-lab/results/native-comparison/native400.json
LAB_UI_BACKEND=native LAB_NATIVE_LOOKAHEAD_MS=1200 LAB_NATIVE_COMPARE=1 LAB_UI_TRIALS=3 LAB_UI_FILTER='/(touch/idle|keyboard/idle)$' node audio-lab/ui-run.mjs audio-lab/results/native-comparison/native1200.json
LAB_UI_BACKEND=native LAB_NATIVE_LOOKAHEAD_MS=2000 LAB_NATIVE_COMPARE=1 LAB_UI_TRIALS=3 LAB_UI_FILTER='/(touch/idle|keyboard/idle)$' node audio-lab/ui-run.mjs audio-lab/results/native-comparison/native2000.json
LAB_UI_BACKEND=worklet LAB_NATIVE_COMPARE=1 LAB_UI_TRIALS=3 LAB_UI_FILTER='/(touch/idle|keyboard/idle)$' node audio-lab/ui-run.mjs audio-lab/results/native-comparison/worklet.json
```

For a harness smoke, use `LAB_UI_TRIALS=0 LAB_UI_FILTER='^$'` to skip the warm
input matrix. Do not describe that as validated warm touch latency.

The seven comparison cases cover single-key 60 BPM and three-key 220 BPM repeat
through 300/650 ms main-thread stalls, immediate three-key release with future
notes queued, arpeggio chord and tempo revision, and eight rapid three-key chords.
Operations go through the real application's input and playback ownership. The
collector observes synchronous renderer operation costs, source/gain creation
and disconnection, lifecycle events, browser long tasks and raw stereo PCM.

At 220 BPM, a sixteenth is 68.18 ms. The preceding pulse's 80% gate and 30 ms
release end 16.36 ms into the next pulse. A PCM energy window 25–45 ms into every
expected grid position therefore cannot count that previous release tail as a
new beat. Lifecycle events separately check removal and tempo-change semantics;
they are not accepted as proof of rendered continuity. This is an energy test,
not a musical-fidelity or pitch-spectrum comparison.

Declared gates are in `comparisonLimits`, set before measurements: warm
input-to-PCM at most 50 ms, synchronous renderer call at most 25 ms, at most 256
retained source/gain nodes (128 voices), no missing PCM grid windows, exact node
disconnection after cleanup, and silence 100 ms after delivered rhythmic
release. The three-key fixture must arrive within 150 ms. PCM must extend past
all delivered releases. An independent runner event-loop delay over 250 ms
rejects the run for host contention. Browser long tasks remain evidence of app
work, and must not be silently excluded as host noise. These are desktop lab
bounds, not physical audio-device latency or mobile-resource claims.

The rejected initial native1200 receipt is retained at
[rejected-native1200-host-stall.json](results/native-comparison/rejected-native1200-host-stall.json).
It used source `5ddc134` and the first exploratory harness, before fixture
validity checks and per-case desk reset were added. Its external event loop
stalled 51,880 ms and one browser task lasted 1,106,527 ms. The final capture hit
its 12-second buffer limit before the releases. It cannot decide renderer choice.
Its apparent missing notes and operation costs must not be presented as valid
comparative results. The raw source hashes and failed host gate are preserved.

A later native400 startup at runtime `8cac9a4` left an empty app for 180 seconds,
with no recorded Runtime exception. Its log is retained as
`results/native-comparison/rejected-native400-startup.txt`. A bounded diagnostic
with startup Network/Log observation mounted the same source normally; this does
not establish a cause for the first failure. The runner now preserves structured
rejection receipts and disables these extra observations before timing.

That diagnostic's zero-warm-trial receipt,
`results/native-comparison/rejected-native400-editor-reentrancy.json`, exposed
CodeMirror update-during-update errors from viewport measurement. It is excluded
from the final matched group pending the application repair. These observations
are not a substitute for the four frozen-source receipts above.
