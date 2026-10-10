# Persistence codec

Saved player data is the one place in EmotiTone where a mistake can't be
undone by a revert. This is the contract every saved store follows. Code:
`src/services/persistenceCodec.ts`. First user: the instrument store
(`src/services/instrumentPersistence.ts`). Spec: W6 in
`docs/retrospective-spec.md`.

Burooj signs off on this design once (BJS-511). After that, migrations are
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
| `backupRetention` | Optional per-store override of how many backups to keep. |

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
   - `label` is `v<from-version>`, `unreadable`, or `pre-restore`.
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
   its newest `BACKUP_RETENTION` backups (2), and the one just written is
   never pruned. Backups are never deleted to make room.

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
it. The page must then be reloaded. On reload the restored bytes are read like
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
- **Phrase book:**
  - v1 is today's `{ book, isRecordingEnabled }`, and its own history
    continues in the table.
  - The legacy `patterns` → `phrases` import reads a different key, so it
    stays a store-level step outside the codec.
  - `decode` can run today's repair, and `encode` can unwrap Vue proxies as
    `serializePatternsState` does.
  - BJS-513 measures its budget with `binding.encode(state).length`, which is
    the exact string a save writes.
- **Visual config (BJS-512):**
  - It writes itself, so it calls `binding.load()` and `binding.save()`
    directly instead of `codecPersist`.
  - The state is the effective config. `encode` writes sparse overrides, and
    `decode` returns defaults plus overrides.
  - The one-time reconciliation is a migration from the full-config format:
    it drops stored values equal to a known previous default. The backup rule
    covers it.
  - Moving BPM, octave and drawer rows into their own stores can happen in
    that same migration step.

## Captured payloads

`src/__tests__/fixtures/persistence/` holds exact bytes as a store wrote them.
Never edit a capture; add a new file.

- `instrument.v0.store-capture.json`: the real instrument store and its
  pre-codec serializer (`JSON.stringify` through the plugin), driven over four
  shaped instruments. Captured 2026-10-10 from origin/main `10717555`.
- `instrument.v0.headless-chrome.json`: read out of a real Chrome profile's
  Local Storage after an audio-lab run (default state).
- Still wanted: payloads from Burooj's own phone and laptop, from
  `localStorage.getItem("emotitone-instrument")` before this ships.

## For Burooj: the decision

You are signing off on the envelope, the read table above, the backup rule,
and the restore path. Four points are real choices:

1. **How many backups to keep per key.**
   - (a) 1, the spec's "kept for one version".
   - (b) **2 (implemented).**
   - (c) All, until removed by hand.

   One isn't enough in two cases:
   - A restore followed by a reload that migrates again drops the
     pre-restore copy.
   - A bad migration followed by a second one before anyone notices replaces
     the only good copy.

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
- Sanitising within a version is not a migration and takes no backup. For
  example, a Shape for an instrument the catalog dropped is lost on the next
  save. This is today's behaviour.
- **Phrase book and quota:** a 3 MB phrase book plus a full backup can't fit
  in the roughly 5 MB origin limit. Under rule 2, its first migration would
  then refuse to run on a full shelf. Before the phrase book's first real
  migration, choose one:
  - back phrases up to IndexedDB;
  - lower the budget to leave room;
  - accept that a full shelf blocks the migration until space is freed.
- Two tabs running the same version still race (last write wins), as today.
  The newer-version rule only protects a newer tab from an older one.
