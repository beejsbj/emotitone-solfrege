# The Looper

Status: the rules and the interaction are Burooj's decisions; the engine was
decided on 2026-10-09 (the worklet, below). The interaction is prototyped in
PR #132 (throwaway, never merged). This document is the brief for the build.
It extends [the pattern system](pattern-system-reimagined.md) and does not
replace any of it.

## The position

A loop is not a new kind of thing. It is what you hear when more than one
pattern is playing. So there is no loop mode, no record button and no loop
button: **Play is the loop.**

## Rules

1. **Any pattern can play.** Play sets the pattern on the desk playing; Play
   again stops it. The first pattern playing sets the tempo and where bar one is.
2. **Playing patterns stack.** Play on another pattern and it joins. Each keeps
   its own length, rounded to whole bars, and cycles on the shared bar grid.
3. **A playing pattern is read-only.** A note played while the desk's pattern
   is playing opens a fresh take on top of it. Nothing writes into a pattern
   that is sounding.
4. **A Loop is a saved set of pointers.** It names the patterns that were
   playing together and how each sat in the loop; opening it sets its
   patterns playing. Where a Loop lives in the reel is still open (see Open).

Everything else in the pattern system holds: whatever you play is captured,
silence closes a take into Recent, Return keeps.

### Joining

- **Tap Play** joins the desk's pattern. This is the default, so you can
  practise over a loop without adding to it.
- **Hold Play** latches, pedal-style. The open take joins as its first note
  lands and grows as you play; it is the one take that may sound while it is
  still being written. While latched, one bar of silence closes it (not the
  usual 1.5-bar take boundary), and the next note opens another. Hold again
  to release.
- A take **played over the loop** joins where it was played. The recorder
  knows each note's position in the loop; the join stores that as an offset.
- A pattern **from the reel** has no position, so its start is pinned to bar
  one and it comes in mid-pattern, in phase, without waiting for the top.
- The offset is adjustable afterwards (the loop dial, below).

### Bending

A pattern that joins follows the Looper's key, mode and tempo. The stored
pattern is never changed; bending happens at play time.

- Key transposes exactly. Mode remaps scale degrees; notes outside the scale
  are approximated. Tempo stretches note lengths and expression curves.
- Instrument, Shape, octave and the timing inside the pattern are not bent.
- **Pin** (per pattern in a loop): plays in its recorded key and mode
  regardless. Unpitched instruments are always pinned.
- **Half / double time** (per pattern in a loop). There is one clock; two
  free tempos at once are out of scope. Rate scales the cycle after
  rounding: a 3-bar pattern at double time repeats every 1.5 shared bars, as
  the domain (#139) does. The whole-bar rule applies to the recorded length.

## Model

```
PlayingPattern            one per pattern that is sounding
  phraseId                pointer, never a copy
  offsetBars              where phrase time 0 sits on the bar grid
  lengthBars              whole bars at the phrase's recorded tempo
  muted, pinned, rate     rate is 0.5 | 1 | 2

Looper                    transient: what is playing now
  members: PlayingPattern[]
  bpm, barOriginBars      set by the first pattern to play
  soloId, latched

Loop                      saved: a Kept phrase-like entry in the book
  id, name
  members: PlayingPattern[]
```

Consequences to enforce with tests, in the manner of `phraseBook.test.ts`:

- A phrase that is playing, or is a member of a saved Loop, is not purged from
  Recent and cannot be deleted without the Looper or Loop being told.
- Rule 3 is decided at press time, like every other take boundary.
- Played alone, a pattern starts from its first note; its offset belongs to
  the membership, not to the phrase.

## Engine

**Decided (Burooj, 2026-10-09): the transport runs on the app's own
AudioWorklet engine**, not on Strudel. The decision is Decision 3 of
[the retrospective spec](retrospective-spec.md); the design is
[the worklet engine](research/worklet-engine.md), §2. The Strudel transport
(#137, #140) worked on a desktop and is kept as research, unmerged. Its
join, leave, offset, tempo, mute and solo semantics and its receipts are the
worklet transport's acceptance tests.

- **One scheduler on the audio thread**, inside the live worklet core: one
  processor, one voice pool, one frame clock. A stalled main thread cannot
  starve it.
- **Members are event tables** built on the main thread from note data, by
  the same pure plan the code export uses, so the strip's text and the sound
  cannot disagree. Bending decides which table is built (key, mode, or pinned
  to the recorded ones); the transport itself never bends.
- **Placement** is #140's grid: a note sounds at shared bar
  `offset + loop × (length / rate) + begin / rate`, on a tempo map of
  `{ frame, bar, bpm }` anchors.
- **Changes** (join, leave, mute, solo, offset, rate, tempo) apply at the next
  render quantum or exactly at a named bar. Each answers with a receipt of the
  frame and bar it took effect. A past bar is never honoured: a late change
  applies at once and says so.
- **Leave** lets sounding notes finish their gates. **Mute and solo** stop
  future onsets and fade the member's dry sound over 10 ms; what it already
  sent to the shared reverb and delay rings out. That tail is accepted
  (Burooj, 2026-10-17), so there is no wet bus per member.
- **Events** for every transport voice carry the member and the source note,
  so the Stage, the keys, the HighlightStrip and the Looper Stage part follow
  loop notes. They are not recordable: playback never writes into the open
  take.
- **UIBeat** is read from the published tempo anchors at the output time, so
  the beat follows what is heard.
- **Live Repeat and Arp** share the transport's frame counter and start on
  its next subdivision.

The recorder moves to the audio clock. Each live attack's exact frame converts
to a transport bar, minus a one-time, persisted, per-device calibration. That
replaces wall-clock stamps compared to the loop afterwards and the prototype's
nudge.

The desktop spike (#150) passed every #140 receipt check that applied: zero
lost or extra attacks across 2,018, changes applied within one render quantum
instead of #140's 202–321 ms, and nothing lost through 1,000 ms main-thread
stalls. Phone numbers come from the phone gate.

## Surfaces

These are design-system units and go through that process, not this document:

- **Loop dial** (the Looper Dial primitive): one per playing pattern,
  climbing the left edge; the disc turns under a fixed brass hand. Its
  gesture map (Burooj, 2026-10-19):
  - **Tap** mutes or unmutes, at once, so it can be played in rhythm.
  - **Double-tap** brings that pattern to the desk (the front of the reel),
    and the Code Strip follows it. The second tap undoes the first tap's
    mute; double-tap no longer solos.
  - **Hold** solos the pattern while held, from the hold threshold; letting
    go (or a cancelled press) puts the mute and solo states back exactly as
    they were before the hold, whatever changed in between. There is no
    persistent solo on the dial.
  - **Flick off the left edge** removes it: a fast, mostly sideways throw to
    the left past a distance threshold, never a slow drag or a tap. Delete
    still removes from the keyboard.
  - **Vertical drag** is reserved for the loop's volume, which needs
    per-member volume in the transport (a follow-up). Turning a pattern
    within the loop (its offset) moves to the pattern strip dial at the desk,
    also a follow-up; the store's offset path stays for it.
- **Stop All** on top of the dial column.
- **Looper** (a Stage part, its own config tab): the turning light a running
  loop casts, with Strength, Definition and Spread. Haze at low Definition,
  comets curving along their orbits at high.
- **Mic** rides the drawer's lip on the right; the left edge is the dials'.
- **Pattern strip dial**: for a playing pattern it shows what its loop dial
  shows (same notes, length and place) and turns with it; otherwise it rests.
  It will take the offset turn the small dial gave up (a follow-up).
- **Beat dots** above Play: while latched with a take open, they count down
  the bar of silence that closes it, draining beat by beat on the heard
  beat; a note refills them; when the take closes they show the beat again.
- **Code Strip**: when the pattern on the desk is playing, the HighlightStrip
  follows it, lighting that member's notes while the others sound. This comes
  from the single transport's events; the prototype cannot do it.

## Slices

Each is its own PR from main, in this order. The engine track is ticketed in
Linear (BJS-485 to BJS-495), with acceptance tests per ticket in
[the worklet engine](research/worklet-engine.md), §4. Per the spec, no
further Looper slice merges before the phone gate passes.

1. **Spikes.** Done, not for merge: Strudel as the transport (#137,
   [research](research/looper-strudel-transport.md), superseded) and the
   worklet transport (#150, the decided design).
2. **Domain: the Looper and saved Loops** in `src/domain/`, pure and tested,
   with the retention and read-only rules above (#139). Engine-independent.
3. **The Looper Stage part**, reading only a `LooperStageSource` seam (#141).
   Engine-independent.
4. **Transport:** patterns on the worklet clock (BJS-485), then the Looper
   transport on it (BJS-491): #140's receipts, plus Repeat and Arp locked to
   the grid, bending through the musical-identity remap, and recorded offsets
   from transport bars. Headless receipts, not wired to Play yet.
5. **Phone gate (BJS-494):** the transport receipts on Burooj's iPhone (and an
   Android phone if available) with a sampled instrument, from a preview link.
6. **Play is the loop (BJS-493):** wire Play, the latch and rule 3 to the
   domain and the worklet transport, with the HighlightStrip lighting the desk
   member. #142's store wiring, Play key and latch, dial column and
   calibration setting carry forward onto it.
7. **Surfaces**, each as its own design-system unit.

## Decided (Burooj, 2026-10-19)

The questions this section held are settled:

- **A saved Loop is its own reel**, reached by swiping left and right from the
  home reel and holding only that Loop's patterns, so a Loop can be edited
  pattern by pattern. The surface (and its horizontal gesture, which must not
  fight the strips' own) is deferred to its own ticket; until then saved Loops
  exist in the store only (rule 4).
- **Rule 2 uses whole bars.** Each pattern's length rounds up to whole bars
  (#139's `phraseLengthBars`), so every loop cycles on bar lines; a 3-bar
  pattern against a 4-bar one drifts, as rule 2 allows. The take's own
  recorded length stays one switch away (`LOOP_LENGTH` in the Looper store).
- **The latch shows as Play's pressed state**: while latched, the Play key is
  held in the Button's pressed look. Nothing else marks it.
- **Envelopes do not stretch with tempo.** Pitch and gain curves follow the
  Looper's tempo; attack, decay and release stay in seconds, the instrument's
  own touch.
- **Humming keeps the loop playing.** Opening the mic over a running loop does
  not pause or stop it.
- **The wet tail rings out** after mute and solo (already recorded under
  Engine, 2026-10-17).
- **Play waits for the engine**: it cannot start until the pattern player and
  the audio engine are ready, nor while a rebuilt renderer is being restored.
- **The loop dial's gestures** (superseding the drag-to-offset decided
  earlier the same day): tap mutes, double-tap brings to the desk, hold solos
  while held, a flick off the left edge removes; vertical drag is kept for
  volume. See Surfaces.
- **The latch's closing bar shows on the beat dots** ("the beat indicator
  could visually show this").
