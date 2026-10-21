# just turn it on and make something. — hijaq.

The first four Library entries are editable, independently selectable parts
adapted from [hijaq.'s HiChord performance](https://www.youtube.com/watch?v=Itn9lI0VK0U).
They are approximate transcriptions, not a MIDI capture or a complete recorded
arrangement. The recording itself is not distributed in the app.

## Play the parts

Scroll the phrase reel to Library and select **hijaq. — Ostinato
(approximation)**, then tap **Play** to start it looping. Select **Low roots**
and tap **Play** to add its bass part; do the same with **Chords** to add the
upper voices. Each part can be
selected independently. Their phrase time zero is shared, so the roots and
chords follow the same changes when layered and repeat together over nine
ostinato cycles. Selecting a Library phrase alone does not add it to the loop.

**Opening · optional** is a separate four-bar loop. Add it only if wanted; it
repeats with the other parts. It is not a once-only introduction and does not
automatically trigger the ostinato or chords. Start with an empty playing stack
to hear the source C-major context at its authored tempo; an existing stack
owns the current tempo and key.

| Part | Stable pattern ID | Length at 416/3 BPM | Notes |
| --- | --- | --- | --- |
| Ostinato | `pattern-hijaq-ostinato-1` | 4 bars / 6.923077 s | One 24-note measured figure |
| Low roots | `pattern-hijaq-low-roots-1` | 36 bars / 62.307692 s | 20 low notes, matching the chord changes |
| Chords | `pattern-hijaq-chords-1` | 36 bars / 62.307692 s | Upper voices without the low roots |
| Opening · optional | `pattern-hijaq-opening-1` | 4 bars / 6.923077 s | Four exploratory notes followed by rest |

The old `pattern-hijaq-just-turn-it-on-1` default is retired through the existing
retired-library migration. It no longer appears alongside the new parts.

## Evidence and transcription

The source video is 122 seconds. Its description says “all my music is free to
use.” The video visibly identifies the instrument as HiChord. At approximately
00:09–11 the performer changes the voice count from four to two to one
oscillator. Later the display shows Cmaj, Emin, Fmaj7, Cmaj7, Dmin7 and Emin7
during the chord section.

An STFT of the source audio (22,050 Hz mono, 8,192-sample window, 441-sample hop)
identified the opening fundamentals near 131, 165, 196 and 247 Hz: C3, E3, G3 and
B3. The harmonic amplitudes are close to 1/n, supporting a sawtooth for the
recorded figure. This is a spectral inference, not a confirmed preset name or
an auditory A/B verdict. The optional opening begins around source 00:12.

The ostinato starts around 00:17.2. It repeats C3–G3–B3 four times, then
E3–G3–B3 four times, with approximately 2:1:1 durations. The phrase repeats
about every 6.923 seconds. Treating it as four bars gives approximately
138.667 BPM (416/3). The part stores just that first figure's measured attacks,
including its small timing variations. Playback supplies the repetition.

The live chords begin around 00:44.82 and end around 01:43.8. Audio fundamentals
support roots around C1 (32.7 Hz), E1 (41.2 Hz) and F1 (43.7 Hz), below the chord
voices. The transcription uses those low roots with third-octave triads, then
seventh chords. Brief intervening changes, voicings and exact gate times are
estimates. Low roots and upper voices are separate parts with identical onset
and gate schedules, both shifted so source 00:44.82 is phrase time zero.

This is an authored looping adaptation: the harmony excerpt occupies 58.98 s,
followed by 3.327692 s of rest to complete 36 bars. That is the shortest multiple
of the four-bar figure that contains the excerpt without stretching its timing
or cutting its final chord. The rest is deliberate, not evidence of a rest at
that position in the source. On every repeat, both harmony parts return to
their first C together. The source's gradual closing fade is not included.

[Thorin7642's community WIP](https://onlinesequencer.net/4924297) was a useful
initial cross-check for the repeating figure. It is incomplete, and its upper
chord register does not match the source fundamentals; the app does not import
that sequence or treat it as an authoritative full transcription.

## Sound and limits

The parts retain the existing sawtooth, per-note envelopes, 9 kHz low-pass
filter and small room effect. Stored authored velocities are retained: 0.36 for the figure, 0.5 for roots,
0.22 for upper voices and 0.32 for the opening. The existing per-pattern gain
normalization makes each layer peak at full level, so the original inter-layer
balance is not preserved. A volume follow-up is deferred; there is no fade or
new volume control in this adaptation.

This reproduces the main pitches and measured rhythmic gestures, not the
original waveform or performance sequence. HiChord's detuning, bass treatment,
moving timbre, glide, exact reverb and continuous volume movements are not
replicated. Playing the parts together creates a musical stack rather than recreating
their entrances in the video. Saved-loop UI and Stage are outside
this change. A listening comparison on Burooj's playback device remains
outstanding; timing and playback checks alone cannot establish sound identity.

## Verification scope

The data exports `hijaqPatterns` and each named part so integration checks can
verify the independent library entries, exact bar lengths, pitch/onset/gate
representation, shared repeat boundaries and retirement of the previous default. Note endpoints are bounded by the exact authored fractional cycle
length; millisecond rounding must not create an extra bar.

The original 110-second reconstruction passed the package verification scripts
on Daytona on 2026-10-18 (queue job `rj-20261018-143239-5f8f85`: 1,688 tests across
152 files and production build). That is historical evidence for the preceding
version, not verification of these separate looping parts. Current PR checks
and the playable preview provide this revision's verification record.
