# Playback performance: implementation and evidence

This work follows [issue #78](https://github.com/beejsbj/emotitone-solfrege/issues/78) and builds on [PR #76](https://github.com/beejsbj/emotitone-solfrege/pull/76). The objective is responsive live sound, complete rhythmic playback, and bounded audio resources. It does not claim to eliminate physical output latency or every possible browser stall.

## Production live renderer

The keyboard now sends prepared note commands to one persistent AudioWorklet, which both generates rhythmic events and renders voices. Together, repeat and arpeggio begin at the next render quantum, with **zero added scheduling lead**. Subsequent beats and gates run on the audio thread through main-thread stalls. Strum keeps its intentional 30 ms chord collection and 35 ms note spacing.

Instrument selection prepares mono/stereo sample banks, GM soundfont zones (including tuning and loops), and sine/triangle/sawtooth/square oscillators. PCM is cloned once to the processor; shared cached buffers are never detached. Installation is acknowledged before selection becomes ready. The processor has a four-bank/192 MiB budget; held banks are pinned. Eviction shortens the old bank's remaining release tails to a 5 ms fade and waits for the processor to free them before installing another bank. Voices are bounded at 64 plus eight short retirement fades. The 128-voice trial approached 99% audio render capacity on the test host; 64 preserves headroom at the cost of lower maximum polyphony. Under overload, releasing voices retire first, followed by the oldest held voices. The compatibility renderer keeps its previous 128-voice limit.

The worklet connects to the existing master gain, preserving mute, analysis and audio recording. Lifecycle events carry their original audio-clock onset/release, even when UI delivery is late. MIDI plans carry monotonic deadlines; revised future attacks are canceled with ownership preserved. MIDI messages still cross the main thread and use the browser's MIDI queue, so the local audio renderer's stall independence is not a claim about hardware MIDI delivery. Suspending, changing instruments and releasing inputs cancel their work. Independent fingers holding a unison retain ownership until the last release.

Unsupported custom synths/effects and banks exceeding the PCM budget retain Superdough playback with an explicit diagnostic reason. Authored Strudel patterns retain their existing renderer. The fallback still has its 5 ms preparation margin. The live mixer uses prepared low-pass sample levels and a bounded interpolation filter, plus bandlimited oscillator discontinuities. It is a new renderer; bit-identical output to the browser's native resampler is not claimed. Moving rendering to the audio thread exchanges bounded PCM memory and mixer CPU for independence from UI stalls. Low-pass levels are prepared only where the selected source needs them over MIDI pitches 0–127, and count toward the same 192 MiB budget. The default piano's 29 original stereo buffers occupy about 138 MiB; cloning them adds approximately one bank's worth of memory. The application's note parser rejects pitches outside MIDI 0–127.

The original isolated-engine benchmark bypassed keyboard event handling and Vue work. Its conclusion could not establish the actual input path's latency. The new real-application benchmark measures trusted touch/keyboard events through the production store to captured PCM, including haptic and UI workload conditions. See the audio lab for repeatable commands, baseline and final results. These measurements exclude physical input delivery and speaker/headphone latency.

## Earlier Superdough improvements (PR #79 baseline)

The following table describes the prior renderer, which remains the compatibility fallback.

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

The executable [audio lab](../../audio-lab/README.md) contains the matched-sample comparison, baseline and regression artifacts, production scheduling checks, and a working one-instrument render-thread repeat/arpeggio prototype. Those are historical isolated-engine measurements. The [real UI lab](../../audio-lab/ui-README.md) records the production worklet comparison, measurement definitions and latest results.

The earlier matched-sample tests measured an isolated cached sampler, and the earlier one-instrument worklet established feasibility. The production renderer above supersedes that prototype-only decision. Real UI measurements are necessary to assess the user's input-delay report; isolated PCM tests remain useful for timing correctness.

Audio-lab PCM is captured inside headless Chrome before a muted output. The measurements exclude OS input delivery and physical output. The user's browser, device, and speaker/headphone connection remain unknown. Physical key-to-speaker loopback, representative cold banks/effects, and long-session heap/CPU profiles remain follow-up measurements; short stress runs are not substitutes for them.

## Inspect the running application

After audio initialization, in the development page's console:

```js
const { getAudioDiagnostics } = await import('/src/services/audioDiagnostics.ts');
getAudioDiagnostics('piano');
const { getLivePlaybackDiagnostics } = await import('/src/services/livePlayback.ts');
getLivePlaybackDiagnostics('piano');
```

The Stage prefers the browser's correlated output timestamp; otherwise it uses the available latency estimates. These are presentation estimates, not an input delay measurement. See the browser documentation for [output timestamps](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp), [base latency](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency), and [output latency](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency).

## Verification

Run `bun run test:audio-browser` for rendered PCM checks (Node 22+ and Chrome/Chromium required), `bun run test:run` for the repository suite, and `bun run build` for TypeScript and production bundling. The audio lab snapshots the actual patched package and records its hash. `bun install --frozen-lockfile --ignore-scripts` verifies the dependency patch installs with the committed lockfile; this lockfile format stores the patch path and does not require a content-hash edit.

At the prior PR #79 checkpoint, the build and all 11 browser audio assertions passed, and 1,259 repository tests passed with no unhandled errors. The remaining 11 failing tests and five collection errors (nine failing files total) reproduced with identical failure names at starting commit `92d95b9`: stale Palette/KeySelector/helper imports, audio/visual integration, device detection, performance monitoring, and visual utility expectations. Those unrelated baseline failures remain outside this audio change. The final failure names match that baseline exactly.

At the production-worklet checkpoint `f555bcc`, the build passes and 1,348 repository tests pass. The remaining 11 failing tests and five collection errors have exactly the same failure names as the recorded starting baseline; there are no added failures. Focused tests cover prepared PCM, alias rejection, stereo and loop boundaries, all play styles, voice limits, acknowledged bank retirement, suspended clocks, recorder disposal and MIDI ownership. The final real-UI measurements and rendering-capacity receipts are maintained in the [UI lab report](../../audio-lab/ui-README.md).
