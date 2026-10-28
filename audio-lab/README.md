# Audio lab

Browser measurements of the app's own audio engine. The live worklet
(`src/audio/live/`) is the only renderer; Strudel and superdough left the app in
BJS-495, and with them every harness here that compared against them.

What still runs (each needs Chrome; `CHROME_BIN` overrides `/usr/bin/google-chrome`):

| Harness | Command | What it checks |
| --- | --- | --- |
| Effects (BJS-486) | `bun run test:run audio-lab/reference/effectBrowser.test.ts` | The worklet filter, native delay and room against the frozen references in `effects/fixtures/` |
| Effect listening clips | `RENDER_EFFECT_LISTENING=1 bun run test:run audio-lab/reference/effectListening.test.ts` | Writes WAVs and metrics to `/tmp/emotitone-effects-listening` |
| Loader (BJS-488) | `node audio-lab/loader/run.mjs [receipt.json]` | Every selectable instrument through the app loader, pitch and loop sustain on the worklet core, and the piano's load cost |
| Receipt checkers | `node audio-lab/check-pattern-growth.mjs <receipt>`, `node audio-lab/verify-receipt-guards.mjs` | Criteria for the stored pattern-growth receipts |

The rest of this directory is the record: results under `results/` and
`parity/`, and the write-ups (`native-comparison*.md`, `pattern-growth.md`,
`worklet-*.md`, `ui-README.md`, `finger-vibrato.md`). Their commands name
harnesses that no longer exist; read them as evidence for decisions already
made, not as instructions.

## Record: the first live audio experiment

The section below describes the original harness (`run.mjs`, removed in
BJS-495). It compared the patched superdough sampler with a minimal Web Audio
sampler and the first one-instrument AudioWorklet prototype.

### What is measured

Both paths decode the **same** generated 40 ms, 440 Hz mono WAV once, then reuse its AudioBuffer. They use gain 0.8 and the same 1 ms linear attack, with no effects. The direct path is an AudioBufferSourceNode and GainNode. The Superdough path calls its real registered sampler with the held-voice parameters used by the adapter. Equal recorded peak amplitudes (0.24) provide a simple gain sanity check. A separate scenario uses the previous adapter's 10 ms attack envelope.

The attack matrix has 16 trials per engine, lead time (0/5/10 ms), and idle/busy condition. Busy means 20 ms of synchronous work **before** each API call. `inputToRenderedOnsetMs` starts at the audio clock sampled at that call; it does not include OS input delivery or the preceding busy period. Preparation time measures JavaScript execution including resolved async preparation. Each engine gets three warm-up attacks.

Sequence scenarios run 12 sixteenth notes at 120 BPM, with and without a 300 ms synchronous main-thread stall. The direct and Superdough controls share a 10 ms polling scheduler and 150 ms lookahead, modeled on the production scheduling policy. They deliberately skip expired deadlines. This isolates the scheduling architecture; it does **not** import or end-to-end exercise the production play-style service. Repeat and three-pitch arpeggio in the worklet use the same sample, gain, and envelope.

A separate integration group imports the actual production `createPlayStyleEngine`, `createScheduledLiveVoice`, and shared `createLiveAudioClock`, configured as in the music store. Vite substitutes only the lower `superdoughAudio` module with [audio-boundary.mjs](audio-boundary.mjs): the same preloaded real sampler, production 5 ms lead, and real release/cancel calls, without application startup and sample-catalog downloads. It checks twelve production repeat sixteenth notes through a 100 ms main-thread stall, arpeggio held-pitch changes and pending cancellation, and a tempo change from 120 to 60 BPM. Captured attacks must match production start/end publications with no extra audible onsets; stable and tempo scenarios also have independent expected pulse counts. Ongoing PCM intervals must remain within 1 ms of their 125 ms grid. The first attack-to-second interval is reported separately because immediate attack preparation can clamp the first deadline.

Finally, 500 real looped sample voices are created as fifty ten-note chords at 75 ms intervals, with overlapping one-second gates and 500 ms release tails. This exceeds the 128-active-voice budget unless voices are retired. The registry also retains up to eight short retirement fades, so the browser assertion permits 136 registered voices; package tests separately enforce active admission. The lab checks all 500 admissions, a peak within that total budget, and complete cleanup after the final tail, and records preparation time. This exercises sustained overlapping sources for about six seconds; it is not a heap measurement, CPU utilization profile, or an hours-long soak test. The earlier clock-regression artifact used a lighter 400 ms gate/200 ms tail workload; compare its clock scenarios, not its density timings, with the final run.

Onsets are measured from actual PCM: the first sample above absolute amplitude 0.005 after at least 10 ms of silence. Timing error therefore includes a small threshold-crossing delay (about 0.1 ms here). Missing and unexpected attacks are matched to the requested times. Assertions also check queued cancellation produces silence, an in-flight release becomes silent within a 15 ms allowance without a large sample discontinuity, the prototype stays within 16 voices and releases all voices, and completed Superdough voices leave its registry after release.

This is a **headless browser render-graph measurement**, not microphone loopback, hardware latency, input-event latency, or a listening verdict on the user's device. Browser `baseLatency`/`outputLatency` are recorded as environment metadata, not added to PCM timing or treated as measured physical latency. Sixteen trials per cell are an experiment, not a cross-device latency guarantee. A short synthetic sample also does not establish the behavior of every instrument, sample bank, soundfont, effect, or release tail.

### Evidence and decision

The checked-in [baseline](results/baseline.json) demonstrates two distinct problems. All 129 completed held voices remained registered after release, and the default voice cap was `NaN`. Under a 300 ms main-thread stall the direct and Superdough lookahead schedulers lost one and two of twelve beats respectively. Both worklet modes rendered all twelve, with at most 0.104 ms onset-threshold error, and passed cancellation, release, and voice-budget checks.

The initial patched-engine run is preserved as [before-deadline-fix](results/before-deadline-fix.json). Cleanup and the cap were repaired, but the rendered-audio assertion caught an intermittent missing attack at 5 ms lead (15/16 notes). A 0 ms case also produced 15/16. That is why reducing a constant alone is insufficient: a live attack must survive crossing an audio-clock deadline while being prepared. This evidence prompted a further entry-deadline fix for held voices.

The production integration exposed another problem in [before-clock-fix](results/before-clock-fix.json): recalculating the audio/performance-clock mapping for every voice made nominal 125 ms intervals vary from 120.067 to 134.367 ms in that run. A near-boundary cancellation also produced seven captured attacks while publishing only six starts. The simpler audio-clock controls did not have this interval variation. This prompted a stable production clock mapping and cancellation review, rather than attributing that jitter to the sampler.

The [final patched-engine run](results/current.json) passed all eleven browser assertions with no browser warnings:

| Measurement | Final result |
| --- | --- |
| Superdough individual attacks, all six conditions | 96/96 rendered |
| Superdough 5 ms lead, idle / busy median | 5.104 / 5.104 ms |
| Superdough 5 ms lead, idle / busy p95 | 10.687 / 8.021 ms |
| Superdough 10 ms lead, idle / busy median | 10.104 / 10.104 ms |
| Finished voices still registered after release | 0 of 130 |
| Default voice cap | 128 |
| Direct / Superdough beats through 300 ms stall | 11/12 each |
| Worklet repeat / arpeggio beats through 300 ms stall | 12/12 each |
| Prototype peak voices / remaining after release | 16 / 0 |
| Prototype queued cancellation / release tail after 15 ms | Silent / silent |
| Production repeat through 100 ms stall | 12/12, no extra onsets |
| Production ongoing 125 ms interval maximum PCM deviation | 0.021 ms (one sample at 48 kHz) |
| Production held changes / tempo boundary | 6/6 and 7/7, no extra onsets |
| Dense looped voices admitted | 500 in 5.62 seconds |
| Dense peak registered / remaining after cleanup | 136 (128 active + 8 retiring) / 0 |
| Ten-note chord preparation, median / p95 | 3 / 6 ms |

The shared production audio clock removed the per-voice grid variation: the final stable sequence's rendered intervals stayed within one 48 kHz sample of 125 ms. The near-boundary held-change cancellation also matched all six published starts to six rendered attacks, and the tempo sequence preserved three 125 ms intervals before switching to three 250 ms intervals. These are measured production scheduling improvements; they do not depend on adopting the worklet prototype.

The deliberately stalled main-thread controls are expected to lose beats: their scheduling horizon expires during the stall. Their losses are reported, not counted as a passing claim about production stall resistance. The experiment confirms the worklet proposal's specific benefit while keeping that remaining production limitation visible.

The median rendered onset in the matched-sample baseline was approximately 5.104 ms with 5 ms lead and 10.104 ms with 10 ms lead, for both direct Web Audio and Superdough. Some 5 ms trials arrived later; smaller lead is not a guarantee of lower worst-case jitter. Superdough performed more JavaScript preparation, but the cached-sample promise path introduced no additional fixed median rendered-onset delay in this case. Replacing its async internals without preserving cancellation and loading semantics is not supported by this measurement.

**Decision:** retain the compatible production engine while fixing its lifecycle, admission, attack preparation, and scheduling behavior. The one-instrument worklet experiment is complete and demonstrates a real benefit for ongoing playback during stalls longer than the lookahead window. It remains an explicit prototype, rather than silently replacing the production instrument catalog. A full engine migration is not complete or claimed by this work.

Promotion would require multi-sample/root-note selection, stereo and loop behavior, soundfonts and synthesizers, instrument envelopes/effects, voice-stealing fades, recording/MIDI/visual event integration, and browser/device checks. The prototype uses simple interpolation and a short mono sample; its emergency voice eviction can truncate a voice. It is unsuitable as a transparent replacement for the full catalog. Even a production worklet cannot receive a new browser key event while the main thread is blocked. Its demonstrated advantage is keeping already-running music alive.

The next engine decision should use this harness plus measurements of representative instruments and physical input-to-output loopback. The current result gives a concrete basis for that decision and an executable regression check for sound production now.
