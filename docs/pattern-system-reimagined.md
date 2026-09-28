# The pattern system, reimagined

Status: exploration. Stacked on `fix/pattern-reel-snapback` (PR #101).
Built in this branch: the domain model, the store, migration, and the reel as
a linear shelf. Proposed only: everything under *Not built yet*.

## The position

The current system has one real concept wearing five costumes. *Take*, *desk*,
*dynamic pattern*, *saved pattern*, and *default* all mean "a short piece of
music with a context," and they differ only in where the piece currently sits
and whether it may change. The code keeps each costume as its own mechanism:
a raw note log sliced by `isStartingNewPattern` flags, a separate saved array,
a desk made of `loadedBaseNotes` + a `sealedThroughNoteId` cursor into the log,
an `isStripCleared` flag, a `currentTakeGeneration` counter, and a synthetic
"Current Take" reel item that exists only when none of the above claims the
desk. Every bug in PR #101 lived in the seams between those mechanisms.

So: **one noun, four shelves, one open slot.**

## Domain model

**Phrase.** A short piece of music with its context: notes (in phrase-relative
milliseconds, first note at 0), key, mode, instrument, BPM, Shape, root octave,
and duration including authored trailing silence. A phrase has a stable id from
the moment it exists. Its id never depends on its notes.

**Shelf.** Where a phrase lives. Exactly one of:

| Shelf     | What it holds                                  | Lifetime                       |
|-----------|------------------------------------------------|--------------------------------|
| `take`    | The one open phrase. What CodeStrip shows.     | Always exactly one, maybe empty |
| `recent`  | Closed takes.                                  | Until you delete (cap 200)     |
| `kept`    | Phrases you chose to keep.                     | Forever, until you delete      |
| `library` | Built-in phrases. Static data, not stored.     | Ships with the app             |

**Lineage.** A take remembers where it came from: `fresh` (you started
playing), `reopened` (it was in Recent and you brought it back), or
`fork` (a copy of a Kept or Library phrase). Lineage decides what happens
when the take closes.

### The lifecycle of a phrase

```
            play a note                     silence / context change / load
 (empty take) ──────────▶ take (recording) ─────────────────────────────▶ recent
                               │                                            │
                               │ Return (done)                              │
                               ▼                                            │
                             kept          (shown with Recent as one        │
                                            timeline of "yours")  ◀─────────┘
                               │
                    tap in reel│ (fork: kept stays untouched)
                               ▼
                        take (lineage: fork)
```

Rules, each enforced by a test in `src/__tests__/domain/phraseBook.test.ts`:

1. **There is always exactly one take.** Keeping, loading, deleting, or
   migrating never leaves the desk without a take. An empty take is a take.
2. **A note belongs to the phrase that was open when it was pressed.** Boundaries
   are decided at press time. A note released after Return still lands in the
   phrase it started in.
3. **Nothing you played is silently lost.** Closing a take moves it to Recent.
   The only exceptions are named: a fresh take under 3 notes (the stray-tap
   noise floor), and an unmodified fork (its source still exists). Return no
   longer wipes the note log; there is no note log.
4. **Kept and Library are immutable from the desk.** Loading them forks. Playing
   over a fork never edits the source.
5. **Reopening Recent moves, it doesn't copy.** A recent phrase *was* a take;
   bringing it back makes it the take again, so the reel never shows the same
   phrase twice.
6. **An untouched take follows the controls.** While a take has no live notes,
   key, mode, octave, instrument, and Shape changes re-skin it (the existing
   transposition behaviour, kept). Once you play into it, its context is fixed;
   a note in a different context closes it and opens a fresh take.
7. **Continuing a phrase seams, it doesn't gap.** The first live note played
   into a loaded or reopened take lands at the phrase's end (after its trailing
   silence), however long you waited before playing.

### What the old nouns become

| Old                                   | New                                             |
|---------------------------------------|-------------------------------------------------|
| `loggedNotes` + `isStartingNewPattern` | Gone. Notes go straight into the open take.     |
| dynamic pattern                       | A take that closed: a `recent` phrase           |
| `loadedBaseNotes`/`loadedBaseMeta`    | The take's own notes and context                |
| `sealedThroughNoteId`                 | Gone. Loading closes the take; no cursor needed |
| `isStripCleared`                      | Gone. After Return the take is simply empty      |
| `currentTakeGeneration`               | The take's id. A new take means a new id.       |
| saved pattern (`isSaved`)             | `kept`                                          |
| `isKept` purge exemption              | Gone. Nothing you play expires; you delete.      |
| default pattern                       | `library`                                       |
| synthetic "Current Take" reel item    | The take itself, always present                  |

One latent bug disappears along the way: the old store purged *saved* patterns
after 7 days unless they were also `isKept`, and nothing in the UI set `isKept`.
Patterns you sent with Return were quietly expiring.

## Interaction model

- **Play.** Notes land in the take. The front strip grows as you play.
- **Pause, then play again.** If the silence passed the tempo-aware threshold
  (1.5 bars, clamped to 1.5–4 s), the take slides back into Recent and your new
  note opens a fresh take. The split happens when you play again, not while
  you're thinking.
- **Change key/mode/instrument, then play.** Same thing: a new context opens a
  new take. Before you play, the controls re-skin the take instead.
- **Return: done.** The take is filed (to Kept, exempt from the storage cap)
  and a fresh empty take opens. Nothing else changes.
- **Backspace.** Removes the take's last note, whether you played it or it was
  loaded.
- **Scroll the reel: load.** Whatever the reel settles on is on the desk:
  CodeStrip shows it and Play plays it. A flick travels as far as you throw
  it; only where it lands loads. A phrase you are only looking at stays in its
  own place on the reel, wearing the brass desk edge there.
- **Play over it: copy.** The first note (or Backspace) onto a Kept or Library
  phrase makes a copy; the copy moves to the front tagged `COPY` and the
  original goes back to plain in its place. A Recent phrase simply continues.
- **Scroll away from what you played: file it.** A take you played into goes
  to Recent, which sits between you and the front, never behind you. Moving
  the reel never drops notes, even one or two.
- **Front slot: start fresh.** A blank `NEW TAKE` waits at the front whenever
  you're looking at something else. Scroll there, or press Return.
- **Everything is saved.** Every phrase you play stays until you delete it.
  Recent and Kept read as one timeline of your phrases, newest first, each
  tagged with its age. There is no save button.
- **Delete (tap, then confirm).** Every phrase of yours carries a delete
  button: the first tap arms it (it turns to a check), and the second deletes.
  On your take at the front, it discards the take. On a phrase you're looking
  at, it deletes that phrase (for an untouched copy, its source), and the reel
  steps to the next newer phrase. Library phrases can't be deleted.

## Visual direction

The reel was a cyclic Rolodex: the defaults, your saves, and the ephemeral
phrases shared one loop with no front and no back, so "where am I" had no
answer. The new reel is a **linear tape with a fixed head**:

- **The desk is where the reel is.** The strip the reel is on wears the brass
  edge (the desk material). No label says "on the desk": the position already
  does. A small lamp carries the state, beside one short word for where the
  phrase lives:
  - a hollow brass ring means it's loaded and you're only looking (`LIBRARY`,
    `KEPT`, `3M AGO`)
  - a filled lamp means it's yours (`NOW`, `COPY`), and it glows while a key is
    down
  - the lamp's colour is the phrase's root Music Color, never a brand colour,
    because this is the playing zone
  The first version used a boxed `ON DESK · LIBRARY` chip, which crowded the
  instrument and solfège contour off a 390px strip.
- **Depth = distance from now.** Behind the take: Recent (newest first), then
  Kept, then Library. The reel stops at both ends with a rubber-band instead
  of wrapping.
- **Shelf tags, not sections.** Each strip carries a small engraved tag
  (`NOW`, `RECENT · 3m`, `KEPT`, `LIBRARY`). One vertical gesture reaches
  everything, which suits a drawer only one strip tall, and the tag tells you
  where you are on the tape.
- **Names that sound like the music.** Unnamed phrases are titled by their
  first few solfège syllables (`Do Mi Sol Mi Do…`), not by today's date.
  Named phrases show that contour on their meta line instead. In a solfège
  app, the contour *is* the most recognizable name.

### Load on scroll, without the swap loop

My first design loaded on every reel step and pinned the take to the front.
Loading put the old take away into Recent, which sat *behind* the reel's
position, so one step back and one more step back just swapped the two newest
phrases. I then separated browsing from loading (a brass "put on desk" button,
with the reel snapping home when you played). That was safe but not intuitive:
the take vanished while you browsed, browsing was silent, and the load button
was one small icon among three.

An independent review (Fable 5.1) found the flawed premise. Loading on scroll
was never the problem; drawing the take at the front was. Draw a phrase you're
only *looking at* in its own place, and file a phrase you *played into*
between you and the front, and nothing ever lands behind you. Scrolling then
never reorders the reel, and every phrase is reachable. `arrangeReel` in
`src/domain/phraseBook.ts` is that rule, and a test walks back through every
shelf and forward again, checking the reel's order never changes.

The same review supplied three supporting rules, all built:
- a Recent phrase you only looked at keeps its original place when you move on
- moving the reel never drops notes
- Return on an untouched copy just clears the desk, with no duplicate

The cost that remains is control sync: loading moves key, mode, BPM, octave,
and instrument to the phrase. A cold sampled instrument can show the
"Preparing instrument" overlay on each step. Syncing only on settle is built.
Warming quietly in the background without the keyboard lock is not built yet.

## Persistence and migration

- The new store persists under a new localStorage key, `phrases`. The old
  `patterns` key is **read once and left in place**, so rolling back to the old
  build loses nothing. A later cleanup can remove it.
- Migration, in `src/domain/phraseMigration.ts`:
  - saved patterns with `isSaved` or `isKept` → `kept`
  - saved-but-unsent imports (`isSaved: false`, e.g. humming takes) → `recent`
  - saved entries that shadow a library id (renamed defaults) → library name
    overrides
  - the note log → split on its own `isStartingNewPattern` flags into `recent`
    phrases, applying the old ">2 notes" rule so nothing appears that the old
    reel didn't show
  - the desk (`loadedBaseNotes` + unsealed live notes) is not migrated as a
    take. Its content is already in Kept, Library, or the log. The migrated app
    opens on an empty take.
- Nothing expires by time. Recent is capped at 200 phrases so localStorage
  can't grow without bound; past that, the oldest phrases are dropped, except
  ones finished with Return. That is the one remaining silent loss, and it
  only happens at a size most players won't reach. A warning before the cap is
  not built yet.

## Tradeoffs, named

- **Press-time boundaries vs release-time.** The old store decided boundaries
  on release and re-flowed successors when releases arrived out of order. This
  model decides at press, when the performer acts, and never re-flows. Cost: a
  note held across a long silence threshold can't retroactively split a phrase.
  I think that's correct: a held note is not silence.
- **Load swaps, so Recent reorders.** Recent is sorted by when a phrase last
  closed, so loading something reshuffles the stack behind it. The alternative
  (stable order, take shown in place) loses the pinned front slot, which is the
  whole point.
- **The noise floor still drops 1–2 note fresh takes.** That's the one silent
  loss the model keeps, because the reel filling with every stray tap is worse.
  It's a single named constant.
- **Big-bang store replacement.** The old store and its 1,800-line test file
  are removed rather than run in parallel. Two recorders listening to the same
  note events would be a worse review than one clean swap.

## Not built yet

- **Quiet instrument warmup while scrolling.** Warm a newly loaded instrument
  in the background, without the keyboard lock, and switch when it's ready.
- **Instrument and octave jumps while scrolling.** Loading syncs octave and
  instrument, so the Deltarune tracks (octaves 6 and 2, five different sampled
  instruments in a row) make the keyboard jump as you pass them. Candidates:
  sync on settle only after a short pause, or keep the octave until you play.
- **A warning before the 200-phrase cap** drops anything.
- **Shelf jump.** A long flick that skips to the next shelf boundary, with a
  haptic tick at each shelf crossing.
- **Join / split.** Merging two adjacent Recent phrases (when the silence split
  was wrong) and splitting a take at a point.
- **Versions of a Kept phrase.** Forking then keeping currently makes a sibling;
  a lineage view ("3 versions") could group them.
- **Library as a real catalogue.** Categories, search, and Strudel-authored
  entries. Today it's the same 18 built-in defaults.
- **Deleting the old `patterns` localStorage key** after the new model has
  shipped for a while.
