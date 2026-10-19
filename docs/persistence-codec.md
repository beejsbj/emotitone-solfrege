# Persistence codec

Saved player data is the one place in EmotiTone where a mistake can't be
undone by a revert. This is the contract every saved store follows. Code:
`src/services/persistenceCodec.ts`. First user: the instrument store
(`src/services/instrumentPersistence.ts`). Spec: W6 in
`docs/retrospective-spec.md`.

Signed off by Burooj 2026-10-15 (BJS-511). Later migrations are
ordinary PRs with a second-model review, tested on captured payloads. A
change that drops a backup or changes the backup rule needs his sign-off
again.

## The codec

A store describes its saved format once:

| Field | Meaning |
| --- | --- |
| `key` | The localStorage key. |
| `version` | The current format version, an integer from 1. |
| `defaults()` | The state to run on when nothing usable is stored. |
| `decode(data)` | Current-version data → state. It cleans up field by field (an instrument the catalog no longer has is dropped). It throws only when the data is unusable as a whole. |
| `encode(state)` | State → current-version data. Optional (identity if absent). It may throw. |
| `migrations` | Keyed by from-version: `migrations[n]` turns version-n data into version n+1. `migrations[0]` lifts data saved before codecs existed. `defineCodec` refuses gaps in the table. |
| `backupRetention` | Optional per-store override of how many version-labelled migration backups to keep. |
| `merge(base, ours, theirs)` | Optional. Reconciles with bytes another tab wrote, instead of writing over them; needs `adopt` on the binding. See "Two tabs". |
| `shared(data)` | Optional, with `merge`. The part every tab shares; a save that changes none of it is skipped. |

The stored string is an envelope, `{"$version":1,"data":{…}}`. A payload
with no `$version` field is version 0, which means unversioned. A
`$version` that is not an integer from 1 counts as unreadable.

## Reading: what each case does

| Stored payload | In memory | Stored payload |
| --- | --- | --- |
| Nothing | defaults | written on the first save |
| Current version | decoded | rewritten by ordinary saves |
| Older version (incl. unversioned) | migrated, then decoded | **backed up, then rewritten at once** (eager, at hydration). If the backup can't be written, nothing is rewritten; see below |
| Newer version than this app knows | defaults | **never written** by this page; every save is refused and reported as "Can't save — reload to update" |
| Unreadable (bad JSON, bad envelope, a migration or decode that throws) | defaults | **backed up first**; ordinary saves may replace it only after the backup is stored |
| Storage can't be read at all | defaults | never written by this page |

Writes go through `safeStorage` (BJS-510), so any failed write raises the
"Can't save" Sticker. pinia-plugin-persistedstate swallows serializer errors
before storage, so the codec reports an encode that throws through
`reportSaveFailure` itself, and a refused write is reported before the
serializer stops it.

## The backup rule

1. Before any rewrite of stored bytes the app did not just write itself (a
   migration, replacing an unreadable payload, or a restore), the prior raw
   bytes are copied to `<key>.backup.<label>.<YYYY-MM-DD>`.
   - `label` is `v<n>` (the version the bytes were read as), `unreadable`,
     or `pre-restore`.
   - The date is UTC.
   - If that key already holds the same bytes, it is reused. If it holds
     different bytes, `.2`, `.3` and so on are appended, so a backup is never
     overwritten.
2. **If the backup can't be written** (quota, or storage refusing writes),
   nothing is migrated or overwritten.
   - The page runs on the old payload's content in memory and reports the
     failure ("Can't save — storage full").
   - Every later save tries the backup again. Once it fits, the backup is
     written first and then the save.
3. Pruning happens only after a new backup is safely stored. Each key keeps
   its newest `BACKUP_RETENTION` version-labelled migration backups (2), and
   the one just written is never pruned. `unreadable` and `pre-restore`
   backups are never auto-pruned and do not count toward that limit.
   A payload rejected by migration or decode is labelled `unreadable` too,
   even when its version can be read. Backups are never deleted to make room.

## Restore (support path)

`emotitoneBackups` is installed on `window` in every build:

```js
emotitoneBackups.list()            // [{ backupKey, of, label, date, sequence, bytes }], newest first
emotitoneBackups.read(backupKey)   // the raw bytes, e.g. copy(emotitoneBackups.read(k)) to send them
emotitoneBackups.restore(backupKey)
```

`restore` first backs up what is stored now (`pre-restore`), so a restore can
itself be undone. If that copy fails, nothing is restored. It then writes the
backup back under its store key and stops the running page from overwriting
it. Every other open tab stops too: before the bytes go back, the restore
stamps `<key>.restored`, and a tab that sees a stamp it did not load with holds
writes and says "Can't save — reload to update" (BJS-575). Without the stamp, another
tab would merge its own state back over the restore. Every open tab must then be reloaded. On reload the restored bytes are read like
any other payload, so an old version is migrated again, under the backup rule.

The support step:

1. Open the console. On a phone, use Safari Web Inspector from a Mac, or
   `chrome://inspect` for Android.
2. Run `emotitoneBackups.list()`.
3. Read or copy the backup out if it's needed for a bug report.
4. Run `restore(...)`, then reload.

There is no in-app UI for this.

## Fitting the stores still to come

- **Keyboard drawer, music:** small codecs whose `migrations[0]` is the
  identity, as for the instrument store.
- **Phrase book (BJS-513):** v1 is `{ book, isRecordingEnabled }` inside
  the envelope; v2 (BJS-575) is the same shape, written only by builds that
  merge with other tabs (see "Two tabs"). The v0 and v1 migrations preserve the
  book; decode repairs this page's take, leaves other tabs' takes alone, and
  resets dead wall-clock anchors. The separate legacy `patterns` import
  remains a store-level read and leaves its original key untouched.

### Phrase shelf budget and backups

`src/services/phrasePersistence.ts` owns the 3,000,000-byte budget. It measures
**UTF-16 bytes** (`encoded.length * 2`) of the entire saved envelope, matching
localStorage's DOMString representation and reserving room for other keys.
This is deliberately more conservative than UTF-8 file size.

**The budget warns; it never refuses** (Burooj, 2026-10-17). Above 3 MB every
save still goes ahead: new takes, Keeps, renames and deletes all reach storage.
The one rule is `shelfOverBudget(bytes)`, and it only decides when the shelf
notice appears. A save is refused only when the browser's storage itself
fails: a `QuotaExceededError` or any other failed `setItem` of the shelf, or a
failed IndexedDB backup that a rewrite waits on. Then the previous stored
payload and every in-memory phrase stay as they were, the shelf notice says
so, and the next successful write clears it. A failed read of the shelf counts
too. The phrase store claims these failures (`claimSaveFailureNotice`), so the
shared "Can't save" Sticker does not repeat them; other saved data keeps the
Sticker, and a newer app version's data still raises "reload to update".

Both pitch and gain curves, including `modeBase` copies, are reduced only in
the encoded snapshot. Samples are picked at uniform time targets, at least 10 ms
apart and capped at 100 points per second (rounded up for a partial second).
Both endpoints always survive, including on very short curves.
Live state is unchanged. Reduction is lossy;
no new smoothing or playback behavior is introduced.

There is no default phrase-count cap. The store's `shelfNotice` has two honest
states, shown by one thin, one-line strip floating above the Performance Deck
(not a Stage occluder). The states differ by a small Brass lamp and the words:

- **over budget**, unlit lamp: "Shelf full · still saving".
- **failed**, lit lamp: "New sketches are not being saved". They stay in this
  tab until a write succeeds.

Both offer the oldest Recent phrase on an icon keycap, with a second tap to
confirm release. Candidates sort by `closedAt`, falling back to `createdAt`.
Kept, Library, the open take and any protected id (`setProtectedIds`, the
Looper's playing set) are never release candidates, and `releaseRecent` passes
the protected ids into `deletePhrase`. When no Recent remain the keycap is gone and the notice
explains the manual copy/delete path to screen readers. An oversized shelf is loaded intact; it
is never automatically trimmed.

On load, `decode` drops any phrase without `notes` or `context` and keeps the
rest of the shelf; it throws (unreadable, backed up first) only when there is
no book at all. A save skips the re-read and re-decode of stored bytes when
they equal the payload this binding last produced; bytes from anywhere else
get the full check. The payload is built as plain data (no JSON round-trip).
An IndexedDB open that has not settled within 10 s is a failed backup: it
reports a save failure and the stored shelf stays as it was. The first
accepted save asks the browser, best effort, for persistent storage.

**Measurement (generated data, 2026-10-16):** the regression fixture uses 200
phrases adapted from a real built-in pattern, eight notes per phrase, 50 Kept,
and one one-second note per phrase carrying both pitch and gain at 240 Hz.
The whole envelope is **9,145,426 UTF-16 bytes** before reduction and
**3,037,026 bytes** after, so it shows the over-budget warning and still saves.
Expression-heavy shelves can pass the budget before 200 phrases. This is not a
capture from Burooj's phone. Because the figure only times a warning, it is
provisional: re-measuring on his real shelf, and the browser's actual quota
headroom, remains a follow-up.

As decided by Burooj on 2026-10-15, phrase **backups go to IndexedDB**, database
`emotitone-phrase-backups`, object store `backups`. The active shelf stays in
localStorage. Exact prior bytes, dated names, same-byte reuse, two routine
migration copies and permanent recovery copies follow the codec rule above.
Insertion and pruning share one transaction; no rewrite proceeds until its
commit. A failed or unavailable IndexedDB holds saves and reports a failure;
a later edit/save retries. While a backup is pending, the latest save request
wins in memory. After commit the codec rereads the live key before retrying,
so a newer-version write from another tab is protected. Disposal cancels the
queued rewrite while allowing the recovery copy to finish.

Phrase support uses an asynchronous console handle (the existing
`emotitoneBackups` handle still serves the small localStorage-backed stores):

```js
await emotitonePhraseBackups.list()
await emotitonePhraseBackups.read(backupKey)
await emotitonePhraseBackups.restore(backupKey)
```

Restore backs up current bytes to IndexedDB first and rechecks that the shelf
has not changed during the transaction. On success it holds saves until reload.
Backups themselves do not count toward the active shelf budget.

## Visual config and performance settings (BJS-512)

`emotitone-visual-config` v1 stores sparse overrides, plus the non-default
`visualsEnabled` and `laBasedMinor` preferences. Decode fills omitted fields
from today's defaults; returning a setting to its default removes its override.
Explicitly saved named presets remain snapshots, on their existing keys.

The v0 migration removes values equal to any historical default before legacy
field conversions, then saves only remaining overrides. The checked-in table
in `src/data/visual-config-default-history.ts` is generated from the full Git
history of `src/data/visual-config-metadata.ts` (including merged histories),
covering every historical value per field, including retired fields. Regenerate
from a checkout with full history using:

```sh
node scripts/generate-visual-default-history.mjs
```

Reconciliation runs only once, with the codec's exact-byte backup. **Accepted
pre-v1 cost:** a deliberate choice equal to any historical default is treated
as untouched. Choosing that old value again after migration persists it
normally. Reconciliation precedes conversions so a historical `connectionMode:
"off"` does not manufacture zero-strength overrides. No full-config reset is
used.

Three small stores now own BPM, octave and drawer rows, under
`emotitone-tempo`, `emotitone-octave` and `emotitone-drawer-rows`. Each has a
v1 codec and stores `{ value }`. Missing keys import their values from the
legacy visual config before its eager rewrite; existing keys always win.
If a destination write fails but the visual migration succeeds, a missing
destination recovers from the newest v0 visual-config backup at next load,
including when the live visual-config envelope has a later version.
The backup rule and retention are unchanged.

For existing callers, `config.codeStrip.bpm`, `config.keyboard.mainOctave`
and `config.keyboard.rowCount` remain reactive read/write accessors to those
stores. They are absent from visual persistence and do not trigger its
save debounce. Loading or resetting an appearance preset leaves all three
performance settings alone. Explicit JSON import restores BPM, octave and
drawer rows to their owners, matching the exported snapshot. Small-store
saves debounce for 500 ms and flush on page hide, tab hide and store disposal;
ephemeral stores cancel pending saves. New consumers can use the small stores
directly. Ephemeral and disposed bindings leave the support restore registry,
so opening a style-guide specimen cannot steal the player's restore hold.

## Captured payloads

`src/__tests__/fixtures/persistence/` holds exact bytes as a store wrote them.
Never edit a capture; add a new file.

- `instrument.v0.store-capture.json`: the real instrument store and its
  pre-codec serializer (`JSON.stringify` through the plugin), driven over four
  shaped instruments. Captured 2026-10-10 from origin/main `10717555`.
- `visual-config.v0.store-capture.json`: exact output from the pre-codec visual store at `d85d9a02`, captured 2026-10-15 with customized blob size, BPM, octave, drawer rows and La preference. This is a store-driven capture, not a phone/browser-profile capture.
- `instrument.v0.headless-chrome.json`: read out of a real Chrome profile's
  Local Storage after an audio-lab run (default state).
- Still wanted: payloads from Burooj's own phone and laptop, from
  `localStorage.getItem("emotitone-instrument")` before this ships.

## For Burooj: the decision

You are signing off on the envelope, the read table above, the backup rule,
and the restore path. Four points are real choices:

1. **How many routine migration backups to keep per key.**
   - (a) 1, the spec's "kept for one version".
   - (b) **2 (implemented).**
   - (c) All, until removed by hand.

   One can lose the only good copy after a bad migration followed by a second
   one before anyone notices. Unreadable and pre-restore copies are retained
   independently, so reloads and later migrations cannot prune them.

   Small stores cost a few hundred bytes per backup. The phrase book is
   different; see the cost below.
2. **When to migrate.**
   - (a) **Eagerly, at the store's first load (implemented).** The backup
     and rewrite happen on the first page load after an update.
   - (b) Lazily, at the first save. In practice this is almost the same
     moment with this plugin, but harder to reason about.
   - (c) A central boot pass over every saved key, which reads stores the
     page may never open.
3. **Unreadable payloads.**
   - (a) **Back up the raw bytes, then let saves resume on defaults
     (implemented).**
   - (b) Refuse every save on that key until support restores or clears it.

   (b) is the stricter reading of "never overwrite until a successful
   migrate and backup". But it leaves the player on "Can't save" on that
   device indefinitely, and the raw bytes are already kept in (a).
4. **Newer-version payloads.** These are never overwritten, and that isn't
   a choice. The page runs on defaults and says "Can't save — reload to
   update". The alternative, reading newer data on a best-effort basis, is
   rejected: an old app can't know what it would drop.

## Costs and boundaries

- On the first load after this ships, every returning device backs up and
  rewrites `emotitone-instrument` once (about 500 bytes).
- Unreadable and pre-restore backups accumulate until removed manually;
  this preserves recovery copies but consumes storage beyond the two routine
  migration backups.
- Sanitising within a version is not a migration and takes no backup. For
  example, a Shape for an instrument the catalog dropped is lost on the next
  save. This is today's behaviour.
- **Phrase book and quota:** its backups use IndexedDB, so a full shelf does
  not need another full copy in localStorage. IndexedDB denial or a failed
  transaction still prevents replacement; the backup-first rule is unchanged.
- Before every save or prepare, the binding rereads the stored
  payload and classifies it again. Older or unreadable bytes are backed up
  before saving; this parses and decodes the small instrument payload on each save.
  If a newer tab has written a higher version, the older tab holds writes until reload and
  reports "Can't save — reload to update". A failed storage read also holds
  writes, even if access later recovers. The check and write are separate
  storage operations; they do not make concurrent writes atomic. Two tabs of
  the same version: see below.

## Two tabs (BJS-575)

Every open tab of the app saves to the same localStorage keys. Before this,
nothing listened for another tab's writes and a save went straight over
bytes another tab had written at the current version, so tab A's next save
erased a sketch tab B had just saved.

### The phrase shelf merges

A codec may declare `merge(base, ours, theirs)`. The binding keeps the stored
bytes it last agreed with (loaded, wrote, or merged in): the **base**. Bytes in
storage that are neither that base nor this binding's own last write came from
another tab, and are merged in, never written over:

- **before every write** (the safety net, needing no event), and
- **on the `storage` event** (`binding.listen`), so the other tab's sketch
  shows up on this tab's shelves at once.

Merged state is handed to the store (`adopt`) before it is written. Older
formats are backed up first as before, then lifted and merged with no base (see
below); unreadable or
unmergeable bytes are backed up, then replaced (the unreadable rule); a newer
version holds writes and now says so at the event, not only at the next save.
Empty storage (cleared site data) is not read as "every phrase released": the
tab writes what it holds. A save that would change nothing every tab shares
(`shared`: the book minus `takeId` and `recorder`) is skipped, so two tabs never
trade writes that differ only in their own desks.

**Why merge, not refuse:** the shelf's promise is that everything played is
kept with no record button. Refusing would put a "can't save" in front of the
player for the ordinary act of having two tabs open. Merging keeps both tabs'
sketches with no friction, and every case below resolves without losing a
note.

The rules, by phrase id against the base (`src/services/phraseMerge.ts`):

| Case | Result |
| --- | --- |
| New in either tab | Kept. |
| Changed in one tab only | That change wins. |
| Released (deleted, or expired from Recent) in one tab, untouched in the other | **The release holds**, in every tab. |
| Released in one tab, changed in the other since they last agreed | **Comes back** with the change: an edit beats a concurrent release. Resurrection is the safer failure; it only happens to a phrase someone touched. |
| Changed in the other tab only | Field by field and note by note: what the other tab changed comes in, and every note it did not change keeps this tab's live object (saved curves are thinned; this tab's live curves are not swapped for them). |
| Changed in both | Field by field. Notes join by note id (nothing played in either tab is lost; duration grows to cover them). Kept beats any other shelf (a Keep is never silently undone). Any other field, such as a name: the tab that saves last wins, and the other takes it in from the event. |
| A protected id (`setProtectedIds`, the Looper's playing set) or a member of a saved Loop that survives the merge | Never released by a merge, whichever tab released it. A Loop the other tab deleted no longer holds its members. |
| Saved Loops (`book.loops`, BJS-493) | Merged by id like phrases, field by field, this tab winning a conflict. Nothing here depends on the Loop shape beyond `id` and `members[].phraseId`; a book without `loops` merges without one. |
| `libraryNames` | Per library id, as above. |
| `takeCounter` | The larger, so neither tab hands out a number the other has used from then on. Two tabs numbering takes in the same moment can still both say "Take 7". |
| `isRecordingEnabled` | As a single field. |

**Only bytes that follow this protocol have a base.** Reading a missing phrase
as a release is only sound when the other writer kept the same base. A tab
still running a v1 build (open across the deploy) writes the whole shelf over,
last-write-wins. So the phrase format is **v2** (`PHRASE_FORMAT_VERSION`). It
has v1's shape, with an identity step from 1. From the first v2 write, an
old-build tab meets the "newer" hold instead of writing. Bytes from any other
version (v1 from an old tab, v0) are backed up first, then merged with **no
base**: a plain union in which nothing is read as released. Upgrading a device
backs up the v1 shelf to IndexedDB once (the usual migration rule).

**The open take is per tab.** `takeId` and `recorder` are never merged. A tab's
take keeps its own object, notes and recorder through a merge. A merge never
releases it, and never moves it off the desk: if another tab sharing it closed
or shelved it, this tab writes it back as its take. The one exception is a
**Keep** from a tab sharing the take. Honouring it is the only way it survives,
since this tab would otherwise close the take into Recent later and undo the
Keep. Then this tab opens a fresh take. Another tab's open take is stored with
shelf `take`, so it sits in this tab's book on no shelf, and appears in Recent
when that tab moves on. A second tab opens on the take stored last, as a reload
would. While two tabs share one take, notes played in either land in it.

**Takes left behind.** Load (decode) leaves every other tab's take alone: a
reload or a third tab never shelves a take that a playing tab is sketching
into. To tell a live desk from one left by a closed tab, each tab holds a Web
Lock (`emotitone-desk:<takeId>`) on its open take (`src/services/deskClaims.ts`).
The browser releases it when the tab closes or crashes. After load, the store
shelves any other tab's take that no tab holds: into Recent if it has notes,
dropped if it is empty. Without the Web Locks API it falls back to age: another
tab's take more than a day old (or older than the Recent retention, if that is
shorter) counts as left behind. Misjudging a live take is harmless: a merge never
moves a tab's own take off its desk, so its tab writes it back.

Lock lifetime, accepted:

- **Reload race.** A tab that reloads releases its lock for a moment. A tab
  loading in that moment can shelve the reloading tab's take to Recent. The
  sketch is kept; the reloaded tab opens on the stored take, as any reload does.
- **iOS discarding a background tab** releases its lock like a close. Its take
  goes to Recent in the next tab that loads, and nothing is lost.
- **Back/forward cache.** A page holding a Web Lock is not kept in the
  back/forward cache, so going back reloads it. That is harmless here: the app
  is a single page, and a reload restores the shelf.

**The read-then-write race.** The check before a write and the write are two
storage operations. If another tab writes between them, this tab writes over
that write, and the other tab can later read what it lost as a release.
localStorage gives no compare-and-swap. The base therefore also moves on this
tab's own writes: without that, a sketch this tab saved and then released would
come back from any tab that had only taken it in (a test covers this). The race
window is a synchronous read and write in one task, far shorter than any player
action.

A storage event's read only looks for another tab's work, so a failed read
there is no save failure: it neither lights the shelf notice nor arms the
leave-page guard.

What is not covered: a tab's reload restores the take stored last, which can be
the other tab's desk (its own take stays its own: on no shelf while its tab
holds it, in Recent once that tab is gone). Merging costs a parse of the base
and the stored shelf whenever another tab has written; the own-write fast path
is unchanged.

### Other stores are last-write-wins, deliberately

| Store | Key | Why last-write-wins is safe |
| --- | --- | --- |
| Instrument (codec) | `emotitone-instrument` | Settings: the current instrument and each instrument's remembered Shape. A stale tab can revert a Shape tweak made in another tab; the player can turn the knob again, and nothing they played is touched. Newer, older and unreadable bytes keep the hold and backup rules. |
| Visual config (codec) | `emotitone-visual-config` | Appearance and Learn preferences. Same reasoning. |
| Performance settings (codec) | `emotitone-tempo`, `emotitone-octave`, `emotitone-drawer-rows` | One value each; the last one set is the one wanted. |
| Music, keyboard drawer (plugin, unversioned) | `music`, `emotitone-keyboard-drawer` | Current key, mode and drawer state: settings. |

**Known gap:** named appearance presets (`emotitone-saved-configs`,
`emotitone-saved-stage-looks`) are things the player made, not settings, and
each save rewrites the whole list. A tab that saves a preset can still drop one
the other tab saved since it loaded. They are small and outside the sketch
path; a follow-up should give them the same merge (a list by id against a
base).
