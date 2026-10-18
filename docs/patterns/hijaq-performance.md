# just turn it on and make something. — hijaq.

The library entry `pattern-hijaq-just-turn-it-on-1` is an editable reconstruction
of [hijaq.'s HiChord performance](https://www.youtube.com/watch?v=Itn9lI0VK0U).
It includes the exploratory opening, recorded ostinato, live chord section and
closing fade. Its name explicitly labels it a reconstruction.

The source video is 122 seconds. Pattern time zero corresponds to approximately
video 00:12, removing the silent power-on/setup sequence. The pattern lasts 110
seconds, including its final release/rest. The original video description says
“all my music is free to use.” The recording itself is not distributed in the app.

## Evidence and transcription

The video visibly identifies the instrument as HiChord. At approximately 00:09–11
the performer changes the voice count from four to two to one oscillator. Later
the display shows Cmaj, Emin, Fmaj7, Cmaj7, Dmin7 and Emin7 during the chord section.

An STFT of the source audio (22,050 Hz mono, 8,192-sample window, 441-sample hop)
identified the opening fundamentals near 131, 165, 196 and 247 Hz: C3, E3, G3 and
B3. The harmonic amplitudes are close to 1/n, supporting a sawtooth for the
recorded figure. This is a spectral inference, not a confirmed preset name or
an auditory A/B verdict.

The loop starts around 00:17.2. It repeats C3–G3–B3 four times, then E3–G3–B3
four times, with approximately 2:1:1 durations. The phrase repeats about every
6.923 seconds. Treating it as four bars gives approximately 138.667 BPM. The
implementation repeats the measured first phrase's small timing variations.

The live chords begin around 00:44.82 and end around 01:43.8. Audio fundamentals
support roots around C1 (32.7 Hz), E1 (41.2 Hz) and F1 (43.7 Hz), below the chord
voices. The score uses those low roots with third-octave triads, then seventh
chords. Brief intervening changes, voicings and exact gate times are estimates.
The final ostinato fades through approximately 02:01.

[Thorin7642's community WIP](https://onlinesequencer.net/4924297) was a useful
initial cross-check for the repeating figure. It is incomplete, and its upper
chord register does not match the source fundamentals; the app does not import
that sequence or treat it as an authoritative full transcription.

## Sound and limits

The closest implemented base sound is the existing `sawtooth`, with per-note
envelopes, a 9 kHz low-pass filter and a small room effect. These shaping values
and layer levels are authored approximations. Note velocities balance the
ostinato, low roots and chord voices and approximate the final volume fade at
each attack. Playback notation must retain those velocities as Strudel gain.

This reproduces the main notes and arrangement, not the original waveform.
HiChord's detuning, bass treatment, moving timbre, glide, exact reverb and
continuous volume movements are not replicated. EmotiTone currently assigns
one instrument and Shape to a pattern; its per-note envelopes and velocities
provide the available differentiation between layers. The source's timbral
changes are simplified to a shared sawtooth. A listening comparison and any
adjustments on Burooj's playback device remain outstanding.

## Verification

The integration test evaluates the complete generated Strudel pattern and
checks every note's pitch, onset, gate and gain, including overlapping bass,
chords and loop notes. It also checks the closing fade. This validates playback
representation; it does not establish note-for-note transcription or sound
identity with the video.

On 2026-10-18, queue job `rj-20261018-143239-5f8f85` ran the package verification
scripts on Daytona: all 1,688 tests across 152 files passed, and `bun run build`
passed its typecheck and production bundle. The long-pattern check exposed
accumulated rounding with four-decimal duration fractions; the default now uses
six decimals, retaining every authored onset and gate within the test's 2 ms
tolerance. Existing bundle-size and Browserslist warnings remain. Browser audio
and listening comparisons were not performed.
