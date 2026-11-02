# BJS-486 effect references

The first commit froze the installed superdough 1.3.0 effects before changing
production audio. `fixtures/reference.json` holds little-endian float32 PCM as
base64, the checkout revision, Chrome version and dependency hashes. Superdough
left the app in BJS-495, so the references can no longer be regenerated; they
are kept as the contract the engine checks below are held to.

The capture used superdough's real `createFilter` and orbit effect nodes in
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
bun run test:run src/audio/live/effects.test.ts src/audio/live/wet.test.ts audio-lab/reference/effectBrowser.test.ts
RENDER_EFFECT_LISTENING=1 bun run test:run audio-lab/reference/effectListening.test.ts
```

The browser test requires Chrome (`CHROME_BIN`) and exercises the real
production processor, bridge and context owner. It waits for command
receipts/plans before offline rendering: an OfflineAudioContext can otherwise
finish before queued worklet commands arrive. It blocks external requests and
closes its browser/server. Its measured receipt goes to
`/tmp/emotitone-effects-metrics.json`; `results.json` is the checked-in
measurement from this branch.

Since BJS-596 the room and the echo run inside the worklet (`src/audio/live/`:
`room.ts`, `echo.ts`, `wet.ts`), before its output limiter, so dry and wet are
limited together and nothing at the destination goes over full scale. The app's
graph is the worklet into a unity master into the destination.

- Filter: sample-exact against all 12 frozen impulses, including dB-Q, float
  output history and Chromium's float resonance conversion. Chromium's biquad
  arithmetic is documented in its [implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/platform/audio/biquad.cc).
  This is a frozen Linux Chrome 147 contract; other browser implementations can
  differ in their floating-point details.
- Echo: sample-exact against the frozen native feedback bus, in the core and
  through the real processor. The first echo is 250 ms after the send. The
  frozen Chromium feedback graph added a render quantum to every later turn
  (the loop's DelayNode took one quantum to come round); `echo.ts` keeps that
  timing (`ECHO_LOOP_FRAMES`) and the native float32 rounding of each turn, so
  the echo sounds exactly as it did. Feedback is held at or below 0.98, as the
  native graph held it.
- Room: a feedback delay network, not a convolution (see below), against the
  frozen unseeded native IR. Its level is within 0.1 dB of the old one's and its
  four broad spectral bands (250/1k/4k/12k Hz) within 0.5 dB. Its decay per
  100 ms window is within 2.3 dB over the first 2 s (the first 60 dB) and 2.8 dB
  after; the checks allow 2.5 and 3.5 dB. The old impulse's lowpass swept from
  15 kHz to 1 kHz, so its tail fell faster the longer it rang; a network's tail
  does the opposite, so it is a little quieter than the old room between 0.4
  and 1.6 s (at most 2.2 dB, where the tail is 25 to 40 dB below its start)
  and a little louder after 1.9 s (60 dB down and more). The processor renders the room bit for bit as the
  core does in the page, except that Chrome's audio thread flushes float32
  denormals to zero.
- Peaks: chords whose dry mix sits just under the limiter's ceiling, at room /
  delay 0/0, 1/0, 0/1, 1/1 and 1/1 with feedback 0.98: the destination never
  goes over full scale.
- Stop All's cut (BJS-598): with a held note sounding into the room and echo,
  the notes, the room and the echo are exactly silent once the cut's 10 ms have
  passed, with no step, and a note after it gets a room and echo of its own.
  After a plain stop they ring on. The worklet does this itself, on the frame
  the cut notes finish their release; there is no node swap and no timer.
- Graph: one app context and master survive initialization; preparation
  issues no resume.
- Live notes follow knob edits over 15 ms. Playback notes can carry a Shape
  snapshot; their per-voice filtering and sends are independent of live edits.

## Why a network and not the old impulse

Measured per 128-frame quantum on the dev host (node V8, 48 kHz, budget
2,667 µs), with sends on every frame:

| Room | mean | p99 |
|---|---|---|
| Uniform-partitioned FFT convolution of the 3 s stereo impulse (JS) | 839 µs | 1,469 µs |
| The same, impulse cut to 2 s | 545 µs | 852 µs |
| The same, impulse cut to 1 s | 296 µs | 514 µs |
| The feedback delay network and the echo together | 14 µs | 21–32 µs |
| Both idle (nothing sent, tails died away) | 0.8 µs | 1–6 µs |

A phone is roughly three to five times slower than this host, so the full
convolution would take 2.5–4.2 ms of a 2.67 ms quantum before any voice is
mixed. A non-uniform partitioned convolution would cost about a third of that
on average, but its large FFTs would have to be spread over many quanta by
hand to avoid spikes. The network costs about 0.5% of the quantum here.

## Allocation boundary

Eighty-eight filter states (64 voices plus 24 steal fades) and one stereo
128-frame scratch buffer are allocated at engine creation, and the room's lines
and diffusers, the echo's one-second ring buffer and the stereo room and delay
send buses with the core. Admission, retirement, filtering, coefficient/send
glides, summation, the room, the echo and a cut reuse them. The focused
allocation checks process 60 s through 16 changing filters and both sends, and
60 s of the room and echo with changing sends, feedback and cuts, with
constructor traps for typed buffers, arrays, maps and sets.

This does **not** certify the existing scheduler or event delivery as allocation
free. `LiveAudioCore.fill/start/publishPlan` still create note/event objects and
collections; `processor.flushResponses` still creates response batches. Those
allocations need the transport's pool/ring work and its full acceptance run. No
full-core zero-allocation claim is made.

## Listening

[The BJS-486 listening assets](https://github.com/beejsbj/emotitone-solfrege/tree/pr-assets/bjs-486) contain two/three-second A4 harmonic plucks with
one effect at a time. Regeneration writes WAVs and metrics to
`/tmp/emotitone-effects-listening`, outside the source tree. Both sides use the
same fixed sample, avoiding a synth or sample-loader change. The delay clip is
limited to the frozen two-second response window. The baseline is convolution
with the **frozen** superdough responses; the new side is the worklet's render
core alone (dry, room and echo in one output).

- Filter: cutoff 1,000 Hz, resonance 10, room/delay off. Listen for the attack
  and resonant ringing.
- Delay: filter open (12,000 Hz), delay 0.6, room off. Listen for first-echo
  level and the spacing/decay of subsequent echoes; time 0.25 s, feedback 0.3.
- Room: filter open, room 1, delay off. Listen for stereo width, brightness
  through the tail, and the roughly two-second decay. The room is a different
  algorithm since BJS-596, so the two sides differ sample by sample; listen for
  whether it is the same room.

These are an isolated fixture instrument, not a captured catalog sample. For
an app check use a bright sawtooth at A4 with the same Shape settings, then a
piano chord to check that wet tails continue after release. `listening/metrics.json`
reports PCM differences **before** 16-bit WAV conversion. Burooj's listening and
the phone gate's render cost with `?room=1&delay=1` remain.
