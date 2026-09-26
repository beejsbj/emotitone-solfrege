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
| `recent`  | Closed takes you didn't keep.                  | 7 days, newest 48              |
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
                               │ Return (Keep)                  Keep button │
                               ▼                                            ▼
                             kept ◀─────────────────────────────────────────┘
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
| `isKept` purge exemption              | Gone. Kept never expires; Recent always does.    |
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
- **Return: Keep.** The take moves to Kept, and a fresh empty take opens. Recent
  is untouched.
- **Backspace.** Removes the take's last note, whether you played it or it was
  loaded.
- **Flick the reel.** Browsing is only a preview; the take stays on the desk.
  Releasing on a phrase *loads* it: the phrase slides down into the front slot
  and the old take slides back into Recent. Flicking one step and releasing
  swaps the two most recent phrases, a free A/B.
- **Keep from the reel.** Recent strips carry a bookmark. Tapping it moves that
  phrase to Kept without touching the take.
- **Delete.** Only Recent and Kept phrases can be deleted. Deleting the open
  take isn't offered; Backspace or Return empties it.

## Visual direction

The reel was a cyclic Rolodex: the defaults, your saves, and the ephemeral
phrases shared one loop with no front and no back, so "where am I" had no
answer. The new reel is a **linear tape with a fixed head**:

- **Front slot = the take, always.** It is the only strip with the brass edge
  (the desk material), a record lamp that glows while the take is recording,
  and a lineage line ("from Golden Sun") when it's a fork. Its name is the
  phrase's solfège contour until you rename it.
- **Depth = distance from now.** Behind the take: Recent (newest first), then
  Kept, then Library. The reel stops at both ends with a rubber-band instead
  of wrapping.
- **Shelf tags, not sections.** Each strip carries a small engraved tag
  (`NOW`, `RECENT · 3m`, `KEPT`, `LIBRARY`). One vertical gesture reaches
  everything, which suits a drawer only one strip tall, and the tag tells you
  where you are on the tape.
- **Names that sound like the music.** Unnamed phrases are titled by their
  first few solfège syllables (`Do Mi Sol Mi Do…`), not by today's date.
  In a solfège app, the contour *is* the most recognizable name.

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
- Recent is capped at 48 phrases as well as 7 days, so localStorage can't grow
  without bound during a long session. The old log was bounded only by time.

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
