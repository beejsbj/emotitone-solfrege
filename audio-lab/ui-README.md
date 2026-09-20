# Real application input to rendered audio

## Current architecture comparison — 2026-09-19

The prepared native Web Audio backend reaches the same low input-response range
without copying the piano bank, but does **not** match worklet rhythm reliability
in the full application. Keep the worklet as the production default. The native
backend is an explicit build-time comparison option, not a silent replacement.
It borrows Superdough's decoded samples and creates native browser nodes directly;
this experiment is not an optimized call to Superdough's sound-trigger API.

Both final receipts used revision `275f6a1`, identical hashes for all source files
and the same installed Superdough dependency. Each run's hashes remained stable.
The runs were serial, with other project builds/tests stopped. Both produced
sound for all 18 trusted inputs, retained distinct stereo channels, created one
AudioContext and one mounted pattern transport, and passed real CodeStrip
Play/live edit/Stop plus common-master mute/restore. Source buffer/rate identities
confirm that editing C4 to E4 changed the sounding pattern.

Each cell contains three trials, shown as median milliseconds (minimum–maximum)
from DOM input's audio-clock reading to rendered PCM. These are small,
render-quantized software samples, not physical finger-to-speaker latency or
population estimates. The observed ranges overlap; they do not establish a
universal latency ranking.

| Actual UI condition | Prepared native Web Audio | Production worklet |
| --- | ---: | ---: |
| together / touch / idle | 5.58 (5.58–5.58) | 14.29 (5.58–17.19) |
| together / touch / haptic-25ms | 5.58 (5.58–14.29) | 14.29 (5.58–17.19) |
| together / keyboard / idle | 5.58 (5.58–5.58) | 5.58 (5.58–14.29) |
| repeat:16 / touch / idle | 5.58 (5.58–5.58) | 5.58 (5.58–5.58) |
| repeat:16 / touch / haptic-25ms | 5.58 (5.58–5.58) | 5.58 (5.58–17.19) |
| repeat:16 / keyboard / idle | 5.58 (5.58–5.58) | 5.58 (5.58–5.58) |

| Same real-app stress case | Prepared native Web Audio | Production worklet |
| --- | ---: | ---: |
| Repeat 1/16, 60 BPM, 300 ms injected stall | **11/12**, largest interval error 250 ms | **12/12**, 0 ms error |
| Repeat 1/16, 60 BPM, 650 ms injected stall | **8/12**, largest interval error 750 ms | **12/12**, 0 ms error |
| Release before next queued sixteenth | 1 onset, no future note, silence after release | Same |
| Known additional prepared PCM | **0 bytes** | **145,147,392 bytes** (138.42 MiB) |
| Dense-burst render capacity, mean / maximum | 0.119 / 0.214 | 0.173 / 0.359 |
| Highest mean over three render-capacity samples | 0.188 | 0.282 |

The native **300 ms continuity check fails**, so its runner exits with status 1.
The 650 ms row intentionally exceeds its 400 ms scheduling horizon; its generic
check only requires valid PCM and cleanup, not continuity. The raw pulse count
above remains a failure of continuity. The worklet passes all 13 checks. The
native result must not be summarized as an all-green performance comparison.

The native gaps are not caused solely by the injected stall. In the final
300 ms case, two source submissions were 827 ms apart; the injected pause itself
was 300.1 ms and began 1,023 ms after input despite an 800 ms timer request. The
retained diagnostic also shows a 601 ms source-submission gap and a missing beat
**before** its injected pause. Browser/main-thread/host contention exceeded the
400 ms lookahead. The traces establish late replenishment; they do not isolate
whether Vue work, layout, painting, garbage collection or host scheduling caused
each delay. Extending the horizon would trade more queued future work for a
larger, still finite tolerance; it would not remove the dependency on that thread.

Both dense cases submit 500 attacks through the real prepared backend manager
with 64-voice budgets, bypassing UI input for that one stress case. Both retain
finite PCM and reach exact silence after cleanup. Render capacity is Chrome's
audio-thread measurement for this burst, not an overall device CPU estimate.
Mixed peaks reach 1.84 native / 1.96 worklet before output, so this overload test
does not prove freedom from clipping. The 144,462,704 original piano PCM bytes
remain available to Superdough in both runs. Reported additional bytes describe
known prepared PCM copies, not total JavaScript heap or process resident memory.

Receipts:

- [Native final](results/ui-architecture-native.json)
- [Worklet final](results/ui-architecture-worklet.json)
- [Matched summary](results/ui-architecture-comparison.json)
- [Native timing diagnostic](results/ui-architecture-native-diagnostic.json)

Regenerate the summary with:

```sh
node audio-lab/ui-compare.mjs audio-lab/results/ui-architecture-native.json audio-lab/results/ui-architecture-worklet.json
```

## Historical Superdough integration comparison

The final actual-App capture passed all six checks: every one of 18 trusted
inputs rendered audio, and all captured source hashes remained unchanged. The
piano used the production AudioWorklet with 145,147,392 prepared PCM bytes.
The matched baseline is immutable `cdaccef`; final UI is `f555bcc` and the CPU
receipt is `717d9fc`, whose measured production hashes are identical.

Each cell contains three trials; values are median milliseconds (minimum–maximum)
from trusted DOM entry to rendered PCM. These small software samples demonstrate
the causal input-path improvement, not a population latency guarantee.

| Actual UI condition | Superdough baseline | Production worklet |
| --- | ---: | ---: |
| together / touch / idle | 25.90 (14.29–37.51) | 5.58 (5.58–14.29) |
| together / touch / haptic-25ms | 46.21 (46.21–46.21) | 8.48 (5.58–17.19) |
| together / keyboard / idle | 25.90 (17.19–25.90) | 5.58 (5.58–17.19) |
| repeat:16 / touch / idle | 14.31 (14.31–57.85) | 5.58 (5.58–5.58) |
| repeat:16 / touch / haptic-25ms | 34.63 (34.63–46.24) | 5.58 (5.58–14.29) |
| repeat:16 / keyboard / idle | 25.92 (17.19–25.92) | 5.58 (5.58–14.29) |

The final real-UI rhythm case rendered 12/12 pulses at 250ms intervals with zero
measured interval deviation while the main thread stalled for 300ms. This uses
sixteenth notes at 60 BPM. The baseline rhythm artifact missed pulses during
broader host/UI contention; its failure cannot be attributed solely to the
injected stall.

The dense production-manager case sent 500 attacks across 20 batches; timer
contention stretched submission to 2.75s. It recorded 500 press and 500 release
commands, 1,000 lifecycle events, finite PCM, and exact silence after cleanup. Audio-thread render capacity
was 0.195 mean, 0.291 maximum, and 0.254 for the highest three-sample mean;
callback interval means ranged from 9.996 to 10.000ms. The overloaded mixed signal
peaked at 2.20 before device output; this stress case does not establish freedom
from acoustic clipping.

The final Chrome CPU microbenchmark retained 64 of 128 requested voices. Median
128-frame render times were 1.20ms mono and 1.30ms stereo against a 2.667ms quantum;
p95 was 5.20ms mono and 2.10ms stereo, with maxima of 11.0 and 7.6ms. Main-thread
CPU timing has scheduling/JIT tails and does not prove every audio deadline.
The actual audio-thread capacity measurements above provide the complementary
production-path evidence. Earlier 128-voice receipts are retained: the initial
stereo median was 5.4ms, fused mixing reduced it to 2.7ms, and the 128-voice
production stress reached 0.99 capacity. The worklet therefore retains 64 active
voices plus up to eight retiring fades; the compatibility renderer retains its
own 128-voice budget.

In the retained haptic smoke trace, the real keyboard handler posted `press` at
0.7ms, entered vibration at 0.8ms, and stayed there until 25.8ms; PCM began at
5.58ms. This directly verifies that audio rendering proceeds during that
main-thread platform call. Initial sample downloads, actual touchscreen delivery,
DAC/output buffers, speakers and Bluetooth remain outside this software latency
measurement. Both comparisons use the same Chrome installation and normal App;
other host workloads are not controlled laboratory conditions.

`ui-run.mjs` serves the normal Vite application, loads its actual piano bank and
opens its normal keyboard. Notes enter through trusted Chrome DevTools touch or
QWERTY events. Store actions select the existing play style; they never substitute
for note input. `ui-instrumentation.js` observes DOM event entry, vibration calls,
native source starts and worklet messages, and records PCM immediately before the
application destination. A gain after the recorder mutes test output.

Run with Node and Chrome, after dependencies are installed:

```sh
LAB_UI_REF=cdaccef LAB_UI_FILTER='/(touch/(idle|haptic-25ms)|keyboard/idle)$' node audio-lab/ui-run.mjs audio-lab/results/ui-baseline.json
LAB_UI_FILTER='/(touch/(idle|haptic-25ms)|keyboard/idle)$' LAB_UI_STRESS=1 node audio-lab/ui-run.mjs audio-lab/results/ui-current.json
```

`LAB_UI_REF` serves an immutable git archive with the installed dependencies.
Default runs serve the current checkout and check relevant source hashes before
and after capture. Use `LAB_UI_TRIALS=1` for a smoke test. Each matched condition
uses three trials. Run comparisons serially, with builds and test suites stopped.
The runner uses its own temporary browser profile and closes only its browser.

Latency is measured from the actual trusted DOM event's audio-clock reading to
the first PCM sample exceeding 0.001. Event-to-source/message timing separately
uses the performance clock. The audio-clock reading is render-quantized. These
are software measurements in headless Chrome, not physical finger-to-speaker
latency or microphone recordings. Default sample downloads remain real network
requests; they happen before warm input trials. The historical application at `cdaccef` creates
two audio contexts; the recorder explicitly selects the context returned by the
actual audio adapter, rather than accidentally recording the other context.

The 25ms haptic condition injects blocking work into the platform vibration call.
It does not measure a physical vibration motor. Optional `ui-50ms` queues work at
DOM capture; Chrome can run that microtask before the keyboard handler. It tests
pre-handler input delay, which an audio engine cannot bypass. It is excluded from
the matched haptic comparison and makes no engine-speed claim.

With `LAB_UI_STRESS=1`, a trusted KeyA holds the real application's sixteenth-note
repeat at 60 BPM during a 300ms main-thread stall. A 10ms silence threshold finds
onsets in actual PCM; this tempo leaves a measurable silence after the gate and
30ms release. The first three seconds must contain 12 onsets with interval error
below 1ms. A separate, explicitly direct production-manager stress sends 500
attacks in 20 batches with requested 20ms gaps to the same prepared piano and releases every owner. That case
checks finite, nonzero PCM and silence after cleanup; bounded voice counts are
asserted by the production core tests, not inferred from mixed audio.

The initial integration diagnostic (`ui-diagnostic.json`) caught an important
coverage gap: default piano has 29 stereo buffers totaling 144,462,704 bytes
before filtering, so the initial 64 MiB policy silently selected Superdough.
`ui-bank-baseline.json` records the actual buffer sizes. This failure artifact
includes concurrent source changes and is diagnostic evidence, not a final
performance comparison. `ui-rhythm-baseline.json` also records startup contention
and missed baseline pulses; retain its warnings when interpreting that result.

`node audio-lab/ui-core-run.mjs` separately measures production core rendering
in Chrome V8 with 128 requested mono/stereo voices, reporting the number actually
retained by the production cap. It is a CPU microbenchmark, not an audio
thread deadline measurement. The dense real-App case additionally polls CDP
WebAudio realtime render capacity and callback interval statistics. It requires
the highest mean over three consecutive capacity samples to remain below 0.8;
the raw maximum remains visible alongside that sustained-load check. Even a
complete recorder stream alone cannot prove that a physical output device never
underran. `ui-suspended-prepare.json` records the independent actual-browser
check that preparation acknowledges while its AudioContext remains suspended.

## Matched architecture comparison

The architecture comparison uses the same application and instrument bank for
both prepared backends. The previous table above is retained as historical
Superdough integration evidence; it does not compare an optimized native backend
against the worklet.

Run these **serially**, with builds, test suites and other browser benchmarks
stopped. The explicit backend value is injected into Vite before startup; the
runner verifies that the actual prepared backend matches the request.

```sh
LAB_UI_BACKEND=native LAB_UI_FILTER='/(touch/(idle|haptic-25ms)|keyboard/idle)$' LAB_UI_STRESS=1 LAB_UI_ARCHITECTURE=1 node audio-lab/ui-run.mjs audio-lab/results/ui-architecture-native.json
LAB_UI_BACKEND=worklet LAB_UI_FILTER='/(touch/(idle|haptic-25ms)|keyboard/idle)$' LAB_UI_STRESS=1 LAB_UI_ARCHITECTURE=1 node audio-lab/ui-run.mjs audio-lab/results/ui-architecture-worklet.json
```

Use `LAB_UI_TRIALS=1` for a smoke run, or `LAB_UI_TRIALS=0` to isolate architecture
and stress checks. Each full latency comparison retains the six matched
conditions with three trusted input trials each. Every tracked or new file under
`src` is hashed before and after capture, so a run with concurrent production
edits is rejected rather than presented as a frozen result.

The capture records both stereo channels and reports their RMS, right-channel
peak and left/right difference RMS. Original piano-bank bytes and backend memory
diagnostics are retained independently: this is known PCM storage, not a browser
resident-memory measurement. The application must create exactly one
`AudioContext` during normal startup.

The repeat scenarios inject both 300 ms and 650 ms main-thread stalls. Both
backends are expected to cover 300 ms. The longer stall intentionally exceeds
the prepared native backend's finite scheduling horizon; its resulting pulse
count and interval error remain visible as a limitation rather than a passing
continuity claim. PCM finiteness and silence after release are required in both
cases. Worklet continuity is required for both stalls. This distinction makes
the native renderer's scheduling tradeoff explicit.

`LAB_UI_ARCHITECTURE=1` additionally exercises the real CodeStrip. Chrome sends
trusted text input to its CodeMirror editor, clicks Play, edits the sounding
pattern and evaluates with Ctrl+Enter, temporarily mutes/restores the shared
master gain, then clicks Stop. PCM must sound before and after editing, disappear
when the shared master is muted, return when restored, and be silent after
stopping. The whole sequence must retain one audio context. This checks the
pattern/editor/audio integration; it does not merely call the live backend.
