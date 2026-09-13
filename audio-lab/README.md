# Live audio performance experiment

This lab compares the rendered sound from the installed, patched Superdough sampler with a minimal Web Audio sampler. It also implements the proposed one-instrument AudioWorklet experiment: the worklet generates repeat/arpeggio beats **and plays their samples in the render thread**. Main-thread messages update held notes; there is no message round trip for each beat.

## Run

```sh
node audio-lab/run.mjs
# Optional alternate Chrome binary or result file:
CHROME_BIN=/path/to/chrome node audio-lab/run.mjs /tmp/audio-results.json
```

Requires installed project dependencies, Node 22+ (global WebSocket), and Chrome/Chromium. The runner starts an isolated Vite server and headless Chrome profile, captures PCM through an AudioWorklet, writes JSON, and exits nonzero if a required audio assertion fails. It does not use or change an existing browser tab. The test takes roughly 35 seconds. Audio is captured before a muted output gain; no sound is emitted.

For an older package comparison, set `LAB_SUPERDOUGH` to its `dist/index.mjs`. That skips the two assertions for the known baseline registry/budget defects, while still checking rendered sound and prototype behavior. The runner copies the selected module into a private temporary directory before loading it, so concurrent package rebuilds cannot change a running experiment. JSON records its SHA-256 and the checkout revision.

To reproduce the session baseline, install the dependencies at commit `92d95b9` in a separate checkout and point `LAB_SUPERDOUGH` at that checkout's Superdough bundle. The original run used an immutable copy of the installed package taken before this session's fixes. Compare the recorded bundle hash when assessing reproducibility.

## What is measured

Both paths decode the **same** generated 40 ms, 440 Hz mono WAV once, then reuse its AudioBuffer. They use gain 0.8 and the same 1 ms linear attack, with no effects. The direct path is an AudioBufferSourceNode and GainNode. The Superdough path calls its real registered sampler with the held-voice parameters used by the adapter. Equal recorded peak amplitudes (0.24) provide a simple gain sanity check. A separate scenario uses the previous adapter's 10 ms attack envelope.

The attack matrix has 16 trials per engine, lead time (0/5/10 ms), and idle/busy condition. Busy means 20 ms of synchronous work **before** each API call. `inputToRenderedOnsetMs` starts at the audio clock sampled at that call; it does not include OS input delivery or the preceding busy period. Preparation time measures JavaScript execution including resolved async preparation. Each engine gets three warm-up attacks.

Sequence scenarios run 12 sixteenth notes at 120 BPM, with and without a 300 ms synchronous main-thread stall. The direct and Superdough controls share a 10 ms polling scheduler and 150 ms lookahead, modeled on the production scheduling policy. They deliberately skip expired deadlines. This isolates the scheduling architecture; it does **not** import or end-to-end exercise the production play-style service. Repeat and three-pitch arpeggio in the worklet use the same sample, gain, and envelope.

Onsets are measured from actual PCM: the first sample above absolute amplitude 0.005 after at least 10 ms of silence. Timing error therefore includes a small threshold-crossing delay (about 0.1 ms here). Missing and unexpected attacks are matched to the requested times. Assertions also check queued cancellation produces silence, an in-flight release becomes silent within a 15 ms allowance without a large sample discontinuity, the prototype stays within 16 voices and releases all voices, and completed Superdough voices leave its registry after release.

This is a **headless browser render-graph measurement**, not microphone loopback, hardware latency, input-event latency, or a listening verdict on the user's device. Browser `baseLatency`/`outputLatency` are recorded as environment metadata, not added to PCM timing or treated as measured physical latency. Sixteen trials per cell are an experiment, not a cross-device latency guarantee. A short synthetic sample also does not establish the behavior of every instrument, sample bank, soundfont, effect, or release tail.

## Evidence and decision

The checked-in [baseline](results/baseline.json) demonstrates two distinct problems. All 129 completed held voices remained registered after release, and the default voice cap was `NaN`. Under a 300 ms main-thread stall the direct and Superdough lookahead schedulers lost one and two of twelve beats respectively. Both worklet modes rendered all twelve, with at most 0.104 ms onset-threshold error, and passed cancellation, release, and voice-budget checks.

The initial patched-engine run is preserved as [before-deadline-fix](results/before-deadline-fix.json). Cleanup and the cap were repaired, but the rendered-audio assertion caught an intermittent missing attack at 5 ms lead (15/16 notes). A 0 ms case also produced 15/16. That is why reducing a constant alone is insufficient: a live attack must survive crossing an audio-clock deadline while being prepared. This evidence prompted a further entry-deadline fix for held voices.

The [final patched-engine run](results/current.json) passed all eight browser assertions with no browser warnings:

| Measurement | Final result |
| --- | --- |
| Superdough individual attacks, all six conditions | 96/96 rendered |
| Superdough 5 ms lead, idle / busy median | 5.104 / 5.104 ms |
| Superdough 5 ms lead, idle / busy p95 | 10.688 / 5.104 ms |
| Superdough 10 ms lead, idle / busy median | 10.104 / 10.104 ms |
| Finished voices still registered after release | 0 of 130 |
| Default voice cap | 128 |
| Direct / Superdough beats through 300 ms stall | 11/12 each |
| Worklet repeat / arpeggio beats through 300 ms stall | 12/12 each |
| Prototype peak voices / remaining after release | 16 / 0 |
| Prototype queued cancellation / release tail after 15 ms | Silent / silent |

The deliberately stalled main-thread controls are expected to lose beats: their scheduling horizon expires during the stall. Their losses are reported, not counted as a passing claim about production stall resistance. The experiment confirms the worklet proposal's specific benefit while keeping that remaining production limitation visible.

The median rendered onset in the matched-sample baseline was approximately 5.104 ms with 5 ms lead and 10.104 ms with 10 ms lead, for both direct Web Audio and Superdough. Some 5 ms trials arrived later; smaller lead is not a guarantee of lower worst-case jitter. Superdough performed more JavaScript preparation, but the cached-sample promise path introduced no additional fixed median rendered-onset delay in this case. Replacing its async internals without preserving cancellation and loading semantics is not supported by this measurement.

**Decision:** retain the compatible production engine while fixing its lifecycle, admission, attack preparation, and scheduling behavior. The one-instrument worklet experiment is complete and demonstrates a real benefit for ongoing playback during stalls longer than the lookahead window. It remains an explicit prototype, rather than silently replacing the production instrument catalog. A full engine migration is not complete or claimed by this work.

Promotion would require multi-sample/root-note selection, stereo and loop behavior, soundfonts and synthesizers, instrument envelopes/effects, voice-stealing fades, recording/MIDI/visual event integration, and browser/device checks. The prototype uses simple interpolation and a short mono sample; its emergency voice eviction can truncate a voice. It is unsuitable as a transparent replacement for the full catalog. Even a production worklet cannot receive a new browser key event while the main thread is blocked. Its demonstrated advantage is keeping already-running music alive.

The next engine decision should use this harness plus measurements of representative instruments and physical input-to-output loopback. The current result gives a concrete basis for that decision and an executable regression check for sound production now.
