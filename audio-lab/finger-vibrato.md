# Finger expression prototype

Run `bun install --frozen-lockfile` and `bun run dev`. Select Triangle, Sine, or a
prepared sampled instrument, then hold a melody key or chord key. Touch, pen,
and mouse movement use the same positional controls:

- Left/right changes pitch. The press position is neutral; a 3 CSS-pixel dead
  zone absorbs hold jitter, followed by 2.5 cents per pixel, capped at ±50 cents.
- Up/down changes volume. Up is louder, down is quieter, with the same 3-pixel
  dead zone and a gain change of 0.025 per additional pixel. Gain is bounded to
  0.25–1.75 times the original level; the press position restores gain 1.
- Holding an offset holds the bend or volume change. Rocking horizontally
  produces vibrato; rocking vertically produces tremolo. Diagonal movement
  combines them. Both audio controls smooth changes over 7 ms without restarting
  the voice.
- Each melody key has independent expression. Multiple contacts on one melody
  key share a voice, controlled by the first contact; when it lifts, the next
  contact takes control from a neutral state.
- A chord key applies its expression to every member of its captured voicing.
  Separate chord presses retain independent ownership, including shared pitches.
- Crossing a melody-key boundary retains glissando and resets both gesture
  origins. Chord gestures retain the chord captured at the initial press.
  Release, cancellation, blur, remapping, and teardown clean up held inputs.

The audio controls act on the actual oscillator or sample voice before the
master bus. Hilbert receives the changed audio; it has no invented visual bend.
Bending one note against another changes their interval and can change the
combined trace. A lone steady waveform may retain nearly the same outline.
Tremolo changes trace size. Sample decay can make a held Piano note less visible.

Strings remain synthetic: their vibration frequency follows the original note
frequency multiplied by `2 ** (pitchBendCents / 1200)`, while their movement
strength follows the smoothed live audio envelope. Pitch labels and recorded
base-note identities remain unchanged. Reduced Motion retains a still display.

Recordings preserve independent note-relative `pitchExpression` and
`gainExpression` curves through Send, saved patterns, and loading. Long curves
are thinned above 8192 points. Generated Strudel approximates repeated movement
with per-note `vib`/`vibmod` and `tremolo`/`tremolodepth` controls, including
independent values on overlapping notes. Ordinary recordings retain their
existing notation.

Strudel replay approximates regular oscillation; it does not reproduce exact
movement, onset within the note, pauses, a one-way bend, or a sustained volume
offset. Tremolo export uses conservative downward modulation, so its loudness
range differs from the live gesture. Curves remain saved for future replay.
Instruments using the fallback Superdough live path do not bend or change gain,
and do not record unheard expression. MIDI expression output remains out of scope.

Run `node audio-lab/finger-expression.mjs /tmp/finger-expression.json` for the
browser integration check. It uses real browser touch events to check melody
and chord expression, independent contacts, master-audio amplitude, Hilbert's
drawn trace, recording, and cancellation. Focused Vitest suites cover rendered
oscillator/PCM output, ownership, delayed stage presentation, string frequency,
persistence, and actual Strudel event queries. Physical touchscreen feel and
sensitivity still need a device trial; headless input cannot establish that verdict.
