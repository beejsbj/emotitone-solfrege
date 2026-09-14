# Real application input to rendered audio

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
requests; they happen before warm input trials. The original application creates
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
attacks in 400ms to the same prepared piano and releases every owner. That case
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
in Chrome V8 with 128 mono/stereo voices. It is a CPU microbenchmark, not an audio
thread deadline measurement. The dense real-App case additionally polls CDP
WebAudio realtime render capacity and callback interval statistics. Even a
complete recorder stream alone cannot prove that a physical output device never
underran. `ui-suspended-prepare.json` records the independent actual-browser
check that preparation acknowledges while its AudioContext remains suspended.
