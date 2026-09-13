# Playback performance: implementation and evidence

This work follows [issue #78](https://github.com/beejsbj/emotitone-solfrege/issues/78) and builds on [PR #76](https://github.com/beejsbj/emotitone-solfrege/pull/76). The objective is responsive live sound, complete rhythmic playback, and bounded audio resources. It does not claim to eliminate physical output latency or every possible browser stall.

## Production changes

| Proposal | Resolution |
| --- | --- |
| Reduce key-to-sound delay | Warm attacks submit without an unnecessary initialization await. The initial live scheduling margin is 5 ms, down from 10 ms, supported by rendered PCM measurements. Overdue held attacks are admitted at the current audio time; finite pattern events retain their deadline policy. |
| Immediate first repeat/arpeggio note | First pulse begins from the input press with a 5 ms lead. Arpeggios start with the first pressed note; later pulses use the selected pitch ordering. Subsequent pulses retain a 20 ms safety margin and 150 ms lookahead. |
| Strum behavior | Retains 30 ms chord collection plus 20 ms lead so near-simultaneous key events can be strummed in pitch order. Removing this would change the strum's meaning. |
| Lean input and prepared pitch | Normalize and capture pitch/context once per owner. Melody and chord audio submission precede touch feedback and haptics. Canceled attacks that finish loading are stopped without a release tail. Selected-instrument prewarming remains in place. |
| Instrument articulation | Piano/percussive instruments use a 1 ms attack/200 ms release; oscillators use 3/120 ms; recognized sustained instruments use 10/400 ms. Unclassified instruments preserve 10/1500 ms. Repeat/arp retain a 30 ms release override; authored patterns keep their own articulation. Shorter fades affect timbre and perceived responsiveness, not physical output latency. |
| Voice limits and retirement | Invalid/omitted limits resolve to 128. Admission rechecks the cap after async preparation. Released voices retire before held voices; retirement uses a 10 ms fade with at most eight additional retiring voices. Under overload, older held voices can be stolen. |
| Natural-end cleanup | Releasing a sample that already ended updates its cleanup deadline. Due cleanup executes directly, avoiding an unnecessary ConstantSource/Gain pair. Real future effect tails retain scheduled cleanup. |
| Deterministic synthesis reuse | ZZFX caches deterministic buffers per context within 64 entries/8 MiB, preserving random-number consumption; random/noise variants bypass reuse. SBD saturation curves are reused per sample rate. This exchanges bounded memory for repeated synthesis work; CPU savings are not claimed as a measured percentage. |
| Rhythmic clock | Generate recurring deadlines directly in the audio clock domain. Share the epoch mapping used by MIDI/recording, instead of resampling a quantized audio-to-performance offset for each voice. Context suspension clears live input and queued MIDI; the next run receives a fresh anchor. |
| Tempo/rate continuity | Preserve the next safely editable pulse's time, sequence position, and gate; apply the new interval after that boundary. Already sounding voices keep their gate. |
| MIDI overhead | Project a batch's ownership changes once. Queue rewrites replay only configuration that has not reached its timestamp. Already delivered palette/octave configuration is not resent for each note change. Physical MIDI delivery is not acknowledged by this API; timestamp-based delivery assumptions remain explicit. |
| Stage synchronization | Note registries and Stage events share a presentation timeline using estimated audible onset/release. Immediate keyboard feedback, MIDI, and recording retain their existing clocks. Strudel visuals use its absolute audio onset and include lookahead in their lifetime. |
| Output diagnostics | An importable snapshot reports context state, sample rate, voice cap, scheduling lead, and browser latency/output-clock estimates. Unsupported/unavailable values remain distinct from a measured zero. |

## Engine decision and rendered audio

The executable [audio lab](../../audio-lab/README.md) contains the matched-sample comparison, baseline and regression artifacts, production scheduling checks, and a working one-instrument render-thread repeat/arpeggio prototype. Its README is the source of the measurement definitions and latest results.

The matched warm-sample comparison did not reveal an extra fixed median onset penalty from Superdough's cached async sampler path. Removing that async source contract or replacing the full catalog is therefore not justified solely as a single-note latency fix. This proposal is resolved as a measured decision to retain that contract, not an unimplemented fast path claimed as complete.

The worklet prototype keeps established repeat/arp playback running through a 300 ms main-thread stall that outlasts production lookahead. It schedules and renders voices in the worklet; it does not send ticks back to the main thread to build each voice. This completes the proposed one-instrument experiment. Promoting it would still require catalog, effects, stereo/loop, soundfont, voice retirement, MIDI/recording, and device compatibility work. Production does not yet have that long-stall immunity.

Audio-lab PCM is captured inside headless Chrome before a muted output. The measurements exclude OS input delivery and physical output. The user's browser, device, and speaker/headphone connection remain unknown. Physical key-to-speaker loopback, representative cold banks/effects, and long-session heap/CPU profiles remain follow-up measurements; short stress runs are not substitutes for them.

## Inspect the running application

After audio initialization, in the development page's console:

```js
const { getAudioDiagnostics } = await import('/src/services/audioDiagnostics.ts');
getAudioDiagnostics();
```

The Stage prefers the browser's correlated output timestamp; otherwise it uses the available latency estimates. These are presentation estimates, not an input delay measurement. See the browser documentation for [output timestamps](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp), [base latency](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency), and [output latency](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency).

## Verification

Run `bun run test:audio-browser` for rendered PCM checks (Node 22+ and Chrome/Chromium required), `bun run test:run` for the repository suite, and `bun run build` for TypeScript and production bundling. The audio lab snapshots the actual patched package and records its hash. `bun install --frozen-lockfile --ignore-scripts` verifies the dependency patch installs with the committed lockfile; this lockfile format stores the patch path and does not require a content-hash edit.

At the final combined checkpoint, the build and all 11 browser audio assertions passed, and 1,259 repository tests passed with no unhandled errors. The remaining 11 failing tests and five collection errors (nine failing files total) reproduced with identical failure names at starting commit `92d95b9`: stale Palette/KeySelector/helper imports, audio/visual integration, device detection, performance monitoring, and visual utility expectations. Those unrelated baseline failures remain outside this audio change. The final failure names match that baseline exactly.
