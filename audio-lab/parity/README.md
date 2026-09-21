# Recorded playback PCM parity

Run from the repository root:

```sh
node --test audio-lab/parity/metrics.check.mjs
node audio-lab/parity/run.mjs /tmp/recorded-playback-parity.json
```

Requires local Chrome (`CHROME_BIN` overrides `/usr/bin/google-chrome`). The runner starts its own temporary Vite/CDP instance; it does not use a preview service. Temporary cache and Chrome profile are removed. An optional output path receives the full JSON receipt. No production files, package installations, catalog downloads, or commits are involved.

For samples, sine and triangle, the browser renders actual `LiveAudioCore` with actual prepared instruments and records its attack/release events, including articulation. Square/saw deliberately use the production native fallback decision: preparation must return `unsupported`. Their reference is an actual installed Superdough held voice with `sustainUntilRelease`, full ADSR, gain .8 and `releaseVoice` scheduled at the exact recorded gate. It renders in a separate context before finite playback. Its recorded edges describe direct native API scheduling, not production store callbacks or UI latency; production parameter/capture behavior is covered separately by service/recording tests.

The comparison path uses production `logNotesToStrudel`, installed Strudel transpiler/core/tonal, and installed patched Superdough in `OfflineAudioContext`. A 1-cps query clock is used: core `.cpm()` accounts for tempo, and `hap.duration` supplies the clipped gate. `whole.duration` is retained only as a structural diagnostic. Only one phrase is queried; this is not a scheduler/UI latency benchmark.

Fixtures are generated PCM16 WAV data, never catalog assets:

- Two-second harmonic sample, root A4; sample playback at A3, A4, A5.
- Sine and triangle at A4; square and sawtooth at A3, A4, A5, A6, A7.
- A 5 ms gate under a 10 ms attack, including release from the incomplete attack.
- One rhythmic piano pulse followed by an ordinary held piano note, exercising recorded 30 ms and 200 ms release values in one generated document.
- A 20 ms silent gap: structural rest cleanup must preserve both actual note gates and onsets.
- A synthetic local soundfont preset with tuning, range, and a continuous .1–.5 second loop; a 1.3 second hold exercises the loop. Both the live preparation path and installed soundfont handler decode the same fixture. This does not cover the diversity of real GM zone metadata.

Each result retains source, queried hap values, structural/gate duration, reference renderer and events, preparation result, native held-voice parameters/edges where applicable, source hashes, and quantitative PCM metrics. The runner rejects attempted non-local page requests, uncaught browser exceptions, and changes to tracked production inputs during the run, including installed Superdough and soundfont bundles.

Pass limits are fixed: onset/offset within 3 ms, steady RMS within 5%, normalized local-energy envelope error at most .06, normalized harmonic-magnitude distance at most .08, pitch difference at most .5 Hz, and scheduled gate/onset within .25 ms of recorded values. The harmonic comparison is phase-invariant. The energy envelope uses 20 ms windows; its tolerance accommodates carrier phase near window boundaries. Metric checks explicitly verify that quarter-cycle phase shifts pass while harmonic changes, .6 sustain, detuning, and extra tails fail. A short-gate case has no steady plateau; it compares the corresponding release segment.

Negative controls must fail the applicable metric: omitted sample gating (no clip/release/loop), default synth ADSR, and overriding a generated gate ratio with `.clip(1)`. Removing `.clip(1)` from otherwise explicit ADSR is a separate diagnostic: the installed sampler also gates when `release` is supplied, so it would be incorrect to demand that mutation fail PCM parity.

Any matched-control mismatch remains a failure; the harness does not calibrate away gain differences or widen limits.

## Final verified result

2026-09-21, Linux HeadlessChrome 147, 48 kHz, production revision `04a7fd307bc02d0dc5b13285aaaa17a065bfba7e`: **38/38 checks passed** with unchanged tolerances, stable input hashes, no external requests and no uncaught exceptions. [Compact results and SHA-256 hashes](results.json) preserve the tested environment, all watched inputs and full-receipt digest; the 164,707-byte detailed receipt remains at `/tmp/recorded-playback-parity-final.json`.

- All 24 positive parity cases passed: RMS ratios .999796–1.000530, maximum harmonic error .000591, maximum envelope error .015076, onset error zero and maximum offset error one 48 kHz sample.
- Native square/saw at each of A3–A7: RMS ratio 1.0, harmonic error zero, maximum envelope error 1.04e−9.
- Single and twelve-staggered future-retirement cases: pre-retirement RMS ratio 1.0 and post-retirement peak zero. All three negative controls detected their intended regressions.

The frozen Superdough bundle SHA-256 is `d7adfff1426645fef3f0a56474a74ce7204d12fc96ba5672a14b12fd37e94bf9`; the soundfont bundle is `6ce481a2b0c0e0c7f1caeaa78845fdc7a310bc24fb8ea642691952a366482d48`. Scope remains offline audio parity, not store/UI latency or a cross-browser guarantee.

## Square/saw fallback decision and measured evidence

Square/saw use the existing native fallback so live held voices and finite Strudel playback share the same oscillator implementation. Sine, triangle and supported sample banks remain on the worklet. This narrow, reversible choice preserves native timbre but gives square/saw up the worklet's protection from long UI-thread scheduling stalls. This is an explicit implementation tradeoff; this offline harness does not measure that latency. No wavetable subsystem, core rewrite or oscillator normalization helper is included.

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

The abandoned scalar correction passed only 27/30 checks: square A7 and saw A6/A7 still exceeded the unchanged .08 shape limit; saw A7 also exceeded 5% RMS error. These were not approved exceptions. Native held-voice versus finite playback must now pass the complete A3–A7 matrix with those same limits. Sample transposition, incomplete attack, mixed releases, preserved micro-gap gates, local soundfont looping, and all three negative controls remain required. Final receipts must use the completed native future-admission bundle patch with stable hashes.

## Native future-retirement regression

After generated parity, `voice-budget.mjs` renders actual native sine sources at a 64-voice limit. Scheduling pressure at 1.09 seconds must not reduce the oldest audible voice's 1.04–1.08 second hold; that voice must be silent after its 10 ms retirement. The module also tests twelve staggered future retirements, checks native source start/stop evidence, and guards the single-voice control against the independent .24/√2 RMS target. Its checks and evidence are retained in the same receipt, and its source is hashed. No UI timing or fake audio nodes are involved.
