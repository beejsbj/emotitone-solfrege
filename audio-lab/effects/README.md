# BJS-486 effect references

The first commit freezes the installed superdough 1.3.0 effects before changing
production audio. `fixtures/reference.json` holds little-endian float32 PCM as
base64, the checkout revision, Chrome version and dependency hashes.

Regenerate deliberately (requires `/usr/bin/google-chrome`, or `CHROME_BIN`):

```sh
REGENERATE_EFFECT_GOLDENS=1 bun run test:run audio-lab/reference/effectGoldens.test.ts
```

The capture uses superdough's real `createFilter` and orbit effect nodes in
OfflineAudioContext, with no network sample downloads. Filter impulses cover
200/1,000/5,000 Hz, native Q=1 (Shape resonance zero) and Q=10 at 44.1/48 kHz.
Filter sources remain active with zero padding so native tail-pruning does not
truncate the reference. The initial one-frame-source captures remain in the
first fixture commit; the next commit corrects their source lifetime.

Delay uses send 0.6, 250 ms and feedback 0.3, with an impulse at 50 ms. Room uses
the default unseeded stereo IR; compare its spectrum and decay, not individual
noise samples. Capture closes its isolated Chrome and Vite server in `finally`.

## Engine checks

```sh
bun run test:run src/audio/live/effects.test.ts audio-lab/reference/effectBrowser.test.ts
RENDER_EFFECT_LISTENING=1 bun run test:run audio-lab/reference/effectListening.test.ts
```

The browser test requires Chrome and exercises the real production processor,
bridge, native buses and context owner. It waits for command receipts/plans
before offline rendering: an OfflineAudioContext can otherwise finish before
queued worklet commands arrive. It blocks external requests and closes its
browser/server. Its measured receipt goes to `/tmp/emotitone-effects-metrics.json`;
`results.json` is the checked-in measurement from this branch.

- Filter: sample-exact against all 12 frozen impulses, including dB-Q, float
  output history and Chromium's float resonance conversion. Chromium's biquad
  arithmetic is documented in its [implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/platform/audio/biquad.cc).
  This is a frozen Linux Chrome 147 contract; other browser implementations can
  differ in their floating-point details.
- Delay: sample-exact native feedback bus, including a rebuild behind the stable
  send input. The first echo is 250 ms after the input. The frozen Chromium
  feedback graph adds a render quantum to subsequent feedback turns; assertions
  preserve that measured timing rather than idealised 250 ms multiples.
- Room: a seeded new IR against the frozen unseeded native IR, compared in
  100 ms energy windows and four broad spectral envelopes (250/1k/4k/12k Hz).
  The recipe retains the 2 s decay, 3 s buffer, 100 ms fade and 15k→1k sweep.
- Graph: superdough borrows the app context, master and orbit; preparation
  issues no resume. The existing lifecycle resume gate waits for effect-node
  rebuilds after a changed sample rate. Inputs/master remain connected.
- Live notes follow knob edits over 15 ms. Playback notes can carry a Shape
  snapshot; their per-voice filtering and sends are independent of live edits.
  Current Strudel playback continues using native per-note filters and borrows
  the new app-owned buses, pending BJS-485.

## Allocation boundary

Seventy-two filter states (64 voices plus 8 retirement fades) and one stereo
128-frame scratch buffer are allocated at engine creation. Admission, retirement,
filtering, coefficient/send glides and summation reuse those states. The focused
allocation check processes 60 s through 16 changing filters and both wet outputs,
with constructor traps for typed buffers, arrays, maps and sets.

This does **not** certify the existing scheduler or event delivery as allocation
free. `LiveAudioCore.fill/start/publishPlan` still create note/event objects and
collections; `processor.flushResponses` still creates response batches. The
BJS-484 acceptance case with sixteen looping transport members is unavailable
on this base (BJS-485/491). Those allocations need that transport's pool/ring
work and its full acceptance run. No full-core zero-allocation claim is made.

## Listening

[The listening assets](https://github.com/beejsbj/emotitone-solfrege/tree/pr-assets/bjs-486) contain two/three-second A4 harmonic plucks with
one effect at a time. Regeneration writes WAVs and metrics to
`/tmp/emotitone-effects-listening`, outside the source tree. Both sides use the same fixed sample, avoiding a synth
or sample-loader change. The delay clip is limited to the frozen two-second response window.
The baseline is convolution with the **frozen**
superdough responses; the new side uses worklet DSP and app-native buses.

- Filter: cutoff 1,000 Hz, resonance 10, room/delay off. Listen for the attack
  and resonant ringing.
- Delay: filter open (12,000 Hz), delay 0.6, room off. Listen for first-echo
  level and the spacing/decay of subsequent echoes; time 0.25 s, feedback 0.3.
- Room: filter open, room 1, delay off. Listen for stereo width, brightness
  through the tail, and the roughly two-second decay. Noise differs between
  the two IRs, as it did across superdough reloads.

These are an isolated fixture instrument, not a captured catalog sample. For
an app check use a bright sawtooth at A4 with the same Shape settings, then a
piano chord to check that wet tails continue after release. `listening/metrics.json`
reports PCM differences **before** 16-bit WAV conversion. The author did not
listen; Burooj's listening and the phone interruption/performance gate remain.
