# Recorded playback PCM parity

Run from the repository root:

```sh
bun run test:audio-parity /tmp/recorded-playback-parity.json
```

Requires local Chrome (`CHROME_BIN` overrides `/usr/bin/google-chrome`). The runner starts its own temporary Vite/CDP instance; it does not use a preview service. Temporary cache and Chrome profile are removed. An optional output path receives the full JSON receipt. No production files, package installations, catalog downloads, or commits are involved.

The browser renders actual `LiveAudioCore` with actual prepared instruments for samples, sine, triangle, square and sawtooth, recording attack/release events and articulation. Square/saw now use the production worklet preparation path. Their live polyBLEP waveform is compared against finite native Superdough playback, which remains until BJS-485. The runner also captures the production AudioWorklet's square/saw repeats during an actual 300 ms browser main-thread stall; every attack must be on the 125 ms grid and have complete, audible captured PCM.

The comparison path uses production `logNotesToStrudel`, installed Strudel transpiler/core/tonal, and installed patched Superdough in `OfflineAudioContext`. A 1-cps query clock is used: core `.cpm()` accounts for tempo, and `hap.duration` supplies the clipped gate. `whole.duration` is retained only as a structural diagnostic. Only one phrase is queried; this is not a scheduler/UI latency benchmark.

Fixtures are generated PCM16 WAV data, never catalog assets:

- Two-second harmonic sample, root A4; sample playback at A3, A4, A5.
- Sine and triangle at A4; square and sawtooth at A3–A7 and C2–C7.
- A 5 ms gate under a 10 ms attack, including release from the incomplete attack.
- One rhythmic piano pulse followed by an ordinary held piano note, exercising recorded 30 ms and 200 ms release values in one generated document.
- A 20 ms silent gap: structural rest cleanup must preserve both actual note gates and onsets.
- A synthetic local soundfont preset with tuning, range, and a continuous .1–.5 second loop; a 1.3 second hold exercises the loop. Both the live preparation path and installed soundfont handler decode the same fixture. This does not cover the diversity of real GM zone metadata.

Each result retains source, queried hap values, structural/gate duration, reference renderer and events, preparation result, source hashes, and quantitative PCM metrics. The runner rejects attempted non-local page requests, uncaught browser exceptions, and changes to tracked production inputs during the run, including installed Superdough and soundfont bundles.

Default pass limits are: onset/offset within 3 ms, steady RMS within 5%, normalized local-energy envelope error at most .06, normalized harmonic-magnitude distance at most .08, pitch difference at most .5 Hz, and scheduled gate/onset within .25 ms of recorded values. The harmonic comparison is phase-invariant. The energy envelope uses 20 ms windows; its tolerance accommodates carrier phase near window boundaries. Metric checks explicitly verify that quarter-cycle phase shifts pass while harmonic changes, .6 sustain, detuning, and extra tails fail. A short-gate case has no steady plateau; it compares the corresponding release segment.

Negative controls must fail the applicable metric: omitted sample gating (no clip/release/loop), default synth ADSR, and overriding a generated gate ratio with `.clip(1)`. Removing `.clip(1)` from otherwise explicit ADSR is a separate diagnostic: the installed sampler also gates when `release` is supplied, so it would be incorrect to demand that mutation fail PCM parity.

Square/saw have explicit migration bounds in `oscillator-bounds.mjs`, pinned from the pre-correction BJS-487 receipt at `bdd3b0cb`: native/live RMS must be within .01 of the measured ratio divided by .85, normalized harmonic distance must be at most the recorded distance + .005, and native/live fundamental ratio must stay in [.98, 1.03]. The original onset, offset, pitch and gate limits remain. Envelope limits remain .06 except saw C2/C3: their corrected .186580/.095785 energy errors get .01 margin. At these low pitches, each 20 ms window contains only a few carrier cycles and remains sensitive to native/polyBLEP phase. Each measured MIDI pitch has its own entry; unmeasured pitches fail instead of inheriting an exception. Other sounds keep the default limits. The metrics controls render a deliberately broken .7 fundamental ratio and changed harmonic balance and require these bounds to reject them. Bounds never derive from the render under test.

## BJS-487 worklet receipt

[Square/saw results](square-saw-results.json) records the worklet migration's input hashes, per-harmonic levels, bounded parity checks, 5 kHz foldback levels and captured stall pulses. The detailed receipt can be regenerated with the package command above. [Earlier results](results.json) describe the superseded native fallback and are historical evidence.

The parity command must exit zero for the documented baseline and fail on new drift outside the explicit bounds. This receipt does **not** claim full PCM parity. All non-square/saw comparisons, negative controls, native voice-budget checks and worklet stall/foldback checks must also pass. CI covers routing, rendered harmonic families, high-note foldback, pitch bends, gain expression, repeat scheduling and release to silence.

Both paths retain attack .003 s, decay .001 s, sustain 1, release .12 s, configured gain .24 (.8 × .3), and no base detune. Worklet square/saw now apply a named fixed .85 waveform scalar to match Superdough's band-limited normalization; remove it when patterns render on the worklet (BJS-485). This removes the roughly 1.4 dB A4 level step. Upper-register brightness and a smaller RMS difference remain because the bandlimiting differs; the correction is fixed, not browser-probed. Waveform parity remains incomplete until both paths use the same renderer.

The 5 kHz check bounds the first five folded harmonics below −20 dBc at 48 kHz. PolyBLEP suppresses aliases; it is not alias-free. A naive discontinuous oscillator fails this threshold. This is a measured desktop Chrome result, not a phone or cross-browser guarantee. Per-harmonic native magnitudes are retained as evidence, not sample-exact golden PCM fixtures.

## Historical square/saw fallback decision (#90)

Before BJS-487, square/saw used the native fallback to preserve timbre, giving up worklet stall protection. BJS-487 reverses that tradeoff as directed by the retrospective spec. The following historical measurements explain why #90 introduced the fallback.

The motivating 48 kHz Chrome measurements below compare finite native playback against the former live polyBLEP reference. Ratios are Strudel/live steady RMS; the scalar column is an abandoned browser-probed gain correction, not current production behavior. Shape is phase-invariant normalized harmonic distance and did not materially change with scalar normalization.

| Wave | Pitch | PolyBLEP RMS | Rejected scalar RMS | Shape error |
| --- | --- | ---: | ---: | ---: |
| square | A3 | .84972 | 1.00180 | .00114 |
| square | A4 | .85128 | 1.00364 | .00454 |
| square | A5 | .85450 | 1.00744 | .01767 |
| square | A6 | .86115 | 1.01528 | .05533 |
| square | A7 | .88189 | 1.03973 | .08473 |
| sawtooth | A3 | .85085 | 1.00272 | .00172 |
| sawtooth | A4 | .85321 | 1.00551 | .00685 |
| sawtooth | A5 | .85812 | 1.01129 | .02659 |
| sawtooth | A6 | .86858 | 1.02361 | .08099 |
| sawtooth | A7 | .89267 | 1.05201 | .11235 |

The abandoned scalar correction passed only 27/30 checks: square A7 and saw A6/A7 still exceeded the unchanged .08 shape limit; saw A7 also exceeded 5% RMS error. BJS-487 now uses the fixed .85 scalar requested in review and explicit bounds for the remaining differences. It does not revive the browser-probed correction. Its current receipt above reports the corrected levels.

## Native future-retirement regression

After generated parity, `voice-budget.mjs` renders actual native sine sources at a 64-voice limit. Scheduling pressure at 1.09 seconds must not reduce the oldest audible voice's 1.04–1.08 second hold; that voice must be silent after its 10 ms retirement. The module also tests twelve staggered future retirements, checks native source start/stop evidence, and guards the single-voice control against the independent .24/√2 RMS target. Its checks and evidence are retained in the same receipt, and its source is hashed. No UI timing or fake audio nodes are involved.
