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
   patterns playing. A saved Loop gets its own reel (see Decided).

Everything else in the pattern system holds: whatever you play is captured,
silence closes a take into Recent, Return keeps.

### Joining

- **Tap Play** joins the desk's pattern. This is the default, so you can
  practise over a loop without adding to it.
- **Hold Play** latches, pedal-style. The desk moves to a new, empty take,
  and with nothing playing the bar grid starts there and then (see Decided,
  2026-10-26). The open take joins as its first note lands and grows as you
  play; it is the one take that may sound while it is still being written.
  While latched, one bar of silence closes it (not the usual 1.5-bar take
  boundary), and the next note opens another. Hold again to release.
- A take **played over the loop** joins where it was played. The recorder
  knows each note's position in the loop; the join stores that as an offset.
- A pattern **from the reel** has no position, so its start is pinned to bar
  one and it comes in mid-pattern, in phase, without waiting for the top.
- The offset is adjustable afterwards (the loop dial, below).

### Stopping

A loop ends over a bar, not at once (Burooj, 2026-10-28, BJS-598).

- **Stop All fades everything out** over one bar at the loop's tempo, then
  the transport stops. The patterns stop being members at once (Play, the
  reels and Save read them as stopped, and the latch lets go), and nothing
  joins by itself afterwards; their dials stay where they were, dimming,
  until the bar is out. Stop All is held down meanwhile.
- **A second tap cuts.** Stop All tapped while its fade runs (or with only
  fading patterns left) stops everything at once: a 10 ms ramp, release tails
  included, so it is a cut and never a click. A tap is never a dead end.
- **The flick fades too.** Throwing a dial off the left edge fades that
  pattern out over the same bar while the others play on at full level.
  Delete does the same. Play again (Play, a Loop's Play) still stops a pattern
  at once, letting its sounding notes finish.
- **A pattern started during a fade joins at full level** (the fade does not
  win). It joins the running bar grid and plays on after the fading ones have
  left, so the transport keeps running. Played again while it fades, a pattern
  comes back at full level from its next note; the notes it was already
  sounding fade on.
- **The fade is a level ramp in the mix**, not a release: a fading pattern
  keeps playing through the bar, and every note it sounds, or starts, follows
  one curve, (1 − t)², to silence at the bar's end, where it leaves. Its room
  and delay sends fade with it; what the shared room and delay already hold
  rings out afterwards, as after a mute (2026-10-17). The ramp comes before
  the output limiter, which only sees the level fall.

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
  bpm, barOriginBars      set by the first pattern to play (or the latch's grid)
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
[the worklet engine](research/worklet-engine.md), §2. Strudel and superdough
have since left the app entirely (BJS-495). The Strudel transport
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
- **Fade-out** (BJS-598) is its own change, immediate only: the named members
  stay members for the fade, their voices (release tails included) and their
  onsets scaled by one (1 − t)² ramp before each voice's filter and sends, from
  the change's frame to the first frame of the bar one bar later; they leave
  on that bar through the pending changes, and the receipt answers then. A
  join of a fading member withdraws its leave; Stop cuts the fade (Stop also
  shortens release tails to its 10 ms).
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
    go (or a cancelled press) puts back the solo from before the hold and the
    held pattern's own mute. A mute or unmute tapped on another dial during
    the hold is a deliberate act and is kept. There is no persistent solo on
    the dial.
  - **Flick off the left edge** removes it: a fast, mostly sideways throw to
    the left, as far as the room allows. The dials sit at the edge, so the
    throw counts at 48 px or on reaching the screen's edge, whichever comes
    first; never a slow drag, a vertical swipe or a tap. Delete still removes
    from the keyboard. Removing fades the pattern out over a bar (see
    Stopping): the dial stays in its place, its record dimming to nothing on
    the sound's curve, and takes no gesture until it has gone.
  - **Vertical drag** is reserved for the loop's volume, which needs
    per-member volume in the transport (a follow-up). Turning a pattern
    within the loop (its offset) moves to the pattern strip dial at the desk,
    also a follow-up; the store's offset path stays for it.
- **Stop All** on top of the dial column: it fades everything out over a bar
  and is held in its pressed look meanwhile; a second tap cuts (see Stopping).
- **Save as a Loop** (BJS-572, proposed): a key above Stop All, shown while
  two or more patterns play and no saved Loop holds exactly them. It saves
  them as "Loop n" and files the take if it was one of them (it plays on),
  so nothing more is written into a Loop's pattern from the desk.
- **Loop reels** (BJS-572, proposed; the Reel Switch compound): each saved
  Loop is a reel beside the home reel, reached by swiping sideways across
  the reel strip; pips on the reel's bottom edge say which reel shows. A
  Loop's reel holds only its patterns, in its order, each wearing the
  Loop's name as its shelf word, then the front slot.
  - **Play** on a Loop's reel is the Loop's: with nothing playing it starts
    from bar one as saved; over a running loop its patterns join the grid
    in their saved places (rule 2); with all of them playing, they stop
    together. Anything else playing plays on.
  - **Editing** is rule 3: a pattern any saved Loop points at is read-only
    from the desk on every reel, home included, playing or not, so a note
    opens a new take on top. On the Loop's reel the take, at the front,
    offers **Replace in Loop**: a pointer swap for the pattern last on the
    desk there. Neither phrase changes. A replaced pattern that is playing
    gives way to the new one: where the new one already plays, else in the
    replaced one's place. The take is then filed. A take saved into a Loop
    while one of its keys is still down stays on the desk until that key
    lets go, and is then filed once, so the latch cannot grow a Loop's
    pattern. One guard in the phrases store (`isLoopOwned`) covers every
    path that writes a phrase: a new note opens a fresh take; Backspace is
    refused, and the notice says "In a saved Loop. Play over it."; the controls (key, mode, octave, sound, Shape) never re-skin
    it; opening one whose sound is gone moves the controls to a working
    sound but leaves the pattern's own; delete is refused. Rename and Keep
    change only its name and shelf, not the pattern, so they stay free.
  - **Stopping a Loop** leaves playing any pattern another Loop, playing in
    full, still holds (as Replace in Loop and another tab's swap do), but
    only a Loop with a pattern of its own outside the one stopping counts: a
    Loop inside it (a part of it, or the same set) plays only because it
    does, and stops with it.
  - **Play with a latched take growing** on a Loop's reel closes and files
    the take, as a silent bar would (it plays on, the latch holds), and then
    plays or stops the Loop.
  - **A missing pattern** (another tab deleted the phrase): the Loop is
    judged by the patterns that are there. Play starts or joins those, and
    the notice says "A pattern in this Loop is gone."; Stop stops them.
  - **Another tab swaps a pointer** while this tab plays the Loop: the
    swapped-in pattern joins the running grid at once in its saved place,
    then the swapped-out one leaves (unless another playing Loop holds it),
    so the Loop's Stop stops what the Loop now is. A Loop not playing here
    plays what it holds at its next Play. Another tab deleting the Loop
    whose reel shows turns this tab back to the home reel.
  - The swipe is a page turn under the finger (a quarter of the width, or a
    quick throw), never a throw off an edge, so it cannot be taken for the
    dial's flick or the notice's sweep; it never starts within 20px of the
    viewport's sides (iOS Safari's back swipe). Arrow keys and a previous
    and next Button, named for their reels, turn without a swipe.
- **Looper** (a Stage part, its own config tab): the turning light a running
  loop casts, with Strength, Definition and Spread. Haze at low Definition,
  comets curving along their orbits at high.
- **Mic** keeps its place at the top centre whether or not anything plays
  (Burooj, 2026-10-20; it used to ride the drawer's lip while dials showed).
  The left edge is the dials'.
- **Notices** (the Looper's error, the shelf's storage notice) are Edge
  Notices: one right-aligned line of type on the Stage's right edge, with a
  Brass lamp and no box or close key, swept off the right edge to dismiss:
  the dial's flick, mirrored (Burooj, 2026-10-20; the look BJS-578 asked for).
- **Pattern strip dial**: for a playing pattern it shows what its loop dial
  shows (same notes, length and place) and turns with it; otherwise it rests.
  It will take the offset turn the small dial gave up (a follow-up).
- **Beat dots** above Play: while latched with a take open, they count down
  the bar of silence that closes it, draining beat by beat on the heard
  beat; a note refills them; when the take closes they show the beat again.
- **Latch Ring** (a compound around Play): a Brass ring that sweeps once per
  bar while latched, on the heard bar; it keeps sweeping while the beat dots
  drain the closing bar. See Decided, 2026-10-26.
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
  exist in the store only (rule 4). BJS-572 builds it (see Surfaces, Loop
  reels), pending Burooj's acceptance.
- **Rule 2 uses whole bars.** Each pattern's length rounds up to whole bars
  (#139's `phraseLengthBars`), so every loop cycles on bar lines; a 3-bar
  pattern against a 4-bar one drifts, as rule 2 allows. The take's own
  recorded length stays one switch away (`LOOP_LENGTH` in the Looper store).
- **The latch shows as Play's pressed state**: while latched, the Play key is
  held in the Button's pressed look. (Superseded on 2026-10-26: the pressed
  look stays, and a Latch Ring now marks it too.)
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

## Decided (Burooj, 2026-10-20, from the preview)

- **Hold Play must latch on the phone.** Play owns its touch while held (no
  pan, callout or selection can cancel the hold), and the click that ends a
  hold is never a tap, however late it arrives.
- **The Code Strip bar has no Open in Strudel**; the pattern strip keeps it.
- **Notices are text on the right edge**, swiped right to dismiss (Surfaces).
- **The unwound reel sits above everything**: the deck lifts over the mic and
  the dials while the reel is scrolled or held open.
- **The mic stays where it is** while loops play.

## Decided (Burooj, 2026-10-26, from the phone)

Burooj tried the latch on his phone: it worked but was unclear ("I know how
all this works. Let alone a new user."). These make it legible (BJS-493,
absorbing BJS-582):

- **The latch shows on Play while it is held**, as a Brass **Latch Ring**
  ("perhaps loading button animation"). The ring sits in Play's lip channel
  and sweeps once per bar, read from the transport's heard bar through UIBeat:
  the audio clock is the truth, and there is no free-running timer. The
  pressed look stays underneath. While latched the ring is the bar clock and
  nothing else: when a take is closing, the beat dots alone count the closing
  bar, and the ring keeps sweeping through notes, the countdown, the take's
  growth and its close. (#202 first rested the ring while the dots drained;
  since the dots drain after every note, the ring kept vanishing and
  restarting as you played: "the brass ring is weird af", BJS-582.) It rests
  on its dim track only while the AudioContext is suspended, and comes back
  at the heard bar's phase.
  Reduced Motion: no sweep; a still, full Brass ring and Play's Ink and Ivory
  inverted. Playing-zone palette only, no text label.
- **The beat starts when you latch, not at the first note.** Latching with
  nothing playing starts the transport's bar grid at that moment, at the
  current tempo, with no member: the dots and the ring tick at once, silently,
  with no click. Latching over a running loop joins its grid. While latched
  the grid outlives its last member; releasing the latch stops an empty one.
- **The first take keeps its place on that grid.** A take played into the
  latch joins where its notes fell: its offset is its first note's bar on the
  grid that started at the latch (bar one is the latch), so a take begun on
  beat 3 still sits on beat 3 when it loops. Its length is its own recorded
  length rounded up to whole bars (rule 2, #139's `phraseLengthBars`), so
  every lap starts on that same beat and every cycle is whole bars. Counting
  the grid bars it touches instead would sometimes add a whole bar of silence
  (a 1.6-bar take begun on beat 3 touches three bars, where its own length
  rounds to two) and would not move a single note: the offset already holds
  the grid position. Pressing Play while latched to add
  a pattern from the reel still works; it is pinned to bar one of the same
  grid.
- **Latching moves the desk to a new, empty take.** If a pattern was at the
  front (brought from the reel, or playing), latching puts it back on the
  reel untouched (rule 3: nothing writes into it), or leaves it playing if it
  was. A take with notes closes as any take does when you scroll to the blank
  slot. A key still held keeps its take, so no sounding note is cut from it.

## Decided (Burooj, 2026-10-28)

- **A loop ends over a bar** ("i dont think it needs a hold, couldnt stop all
  by default be a fade? or maybe even the swipe left stop do that?"): Stop All
  and the dial's flick fade out over one bar, and a second tap of Stop All
  cuts. The rules are under Stopping (BJS-598). A pattern started during the
  fade joins at full level (the builder's choice, for Burooj's look on the
  preview).

## Open

- **One pattern or everything playing.** Key, mode, tempo and instrument are
  set per pattern, and a pinned pattern keeps its own key. Burooj is weighing
  a small toggle that decides whether a change applies to the selected pattern
  or to everything playing. It is undecided, so nothing builds it yet.
