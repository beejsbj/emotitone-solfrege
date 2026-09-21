# Finger vibrato prototype

Run `bun install --frozen-lockfile` and `bun run dev`. Enter the app, select Sine
(or a prepared sampled instrument), hold a melody key, and rock horizontally
without leaving it. Touch, pen, and mouse movement use the same gesture.

- The press position is neutral. A 3 CSS-pixel dead zone absorbs hold jitter;
  each additional pixel bends 2.5 cents, capped at ±50 cents. Returning to the
  press position restores pitch. The audio renderer smooths changes over 7ms.
- Crossing a key boundary retains glissando and starts a fresh gesture origin.
  Different keys bend independently. Multiple contacts on the same key share
  one voice; the first contact controls its pitch until that contact lifts.
- Note releases, cancellation, remapping, blur, and teardown retain the existing
  key lifecycle. No new note is triggered by a pitch update.

Recording stores a note-relative `pitchExpression` curve through Send, saved
patterns, and loading. Values are rounded to cents; an unusually long curve is
thinned when it exceeds 8192 points to bound per-note memory. Strudel export
reduces repeated rocking to per-note `vib` (Hz) and `vibmod` (semitones), including
independent values on overlapping notes. Playback in the app uses that same
portable approximation. Ordinary patterns retain their existing notation.

The approximation does not reproduce the exact movement, its onset within the
note, irregular pauses, or a one-way bend. Curves remain saved so a later replay
format can use them. This prototype adds vibrato only; tremolo, chord-key
expression, and MIDI pitch-bend output are separate follow-ups. Instruments using
the fallback Superdough live path do not bend or record unheard expression.

Validation includes actual oscillator/PCM frequency tests, pointer and ownership
lifecycle tests, saved-pattern round trips, actual Strudel event queries, and
CodeStrip parsing. Physical touchscreen feel and sensitivity still need a device
trial; headless browser input cannot establish that verdict.
