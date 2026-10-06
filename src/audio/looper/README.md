# Looper transport (slice 3)

`createPatternEditor` remains the sole scheduler constructor. The Looper is an
opt-in client of `getLooperPlaybackPort(editor)`; the current Code Strip does
not invoke it. Stop Code Strip playback before starting the Looper. While the
Looper holds the port, editor evaluation is rejected. Stop/dispose releases it;
editor disposal or an external scheduler stop also ends the Looper run.

## API

- `prepareLooperPhrase(phrase, { sliceMs?, onSlice? })` prepares a fresh cached
  member cooperatively (default 2 ms slices). `buildLooperPhrase` is the
  synchronous prewarm/offline equivalent. Neither uses mini or the transpiler.
- `createLooperTransport({ playback, audioContext, clock, beat?, bpm?, key?, mode? })`
  accepts the editor port, shared audio context and existing LiveAudioClock.
- `join(cached, settings?, boundary?)`, `leave(id, boundary?)`,
  `update(id, { muted?, pinned?, rate?, offsetBars? }, boundary?)`,
  `solo(id | null, boundary?)` and `setKeyMode(key, mode, boundary?)` return
  `boundaryBar`, `boundaryAudioTime`, request time and preparation/swap duration.
- `start()`, `stop()`, `dispose()`, `setTempo(bpm)`, `position()`;
  one scheduler cps equals `bpm / 240`. An omitted initial tempo comes from the
  first joined phrase. Explicitly selecting tempo before start takes precedence.
- `eventPosition(epochTimestampMs)`, `getCalibrationMs()`, `setCalibrationMs(ms)`;
  timestamps use `LiveAudioClock.fromEpochTime`. Estimated base + output latency
  and positive calibration are subtracted in milliseconds before mapping into
  bars. A positive calibration means the player's stamp is late. Negative
  pre-start event positions are retained. Calibration has no persistence here.
- `snapshot()` exposes desired/effective members, solo, pending boundary,
  generation and last change. `memberPosition(id)` returns the effective desk
  member's local bar `(sharedBar - offsetBars) * rate`, period and audibility.

`boundary` is `immediate` (default), `bar` (next safe integer bar) or `{ bar: B }`.
Explicit B must be beyond `scheduler.lastEnd`. Multiple pending changes share
one original branch and boundary; a conflicting explicit B is rejected. An
immediate change supersedes a still-pending future change. A membership change
never restarts the scheduler. Muting/solo/leaving only suppress future onsets;
submitted gates and release tails finish. Whole-stop also does not cancel audio
already submitted to Superdough; it ends scheduling and clears Stage visuals.

## Pattern and bending policies

`recordedPatternPlan` shares export's micro-gap cleanup, overlap lanes, boundary
rounding, clip, envelope fallback, filters and expression approximations. Direct
construction attaches `phraseId` and `noteId` to each hap. Member periods round
to whole bars, padding with silence; their rate precedes their shared-bar offset.
Export keeps its existing fractional periods and default trailing beat.

Pins retain exact captured pitches. In the recorded mode, changing key
transposes absolute borrowed pitches exactly. On a mode change, borrowed notes
use the nearest recorded degree (ties choose the lower pitch). Octave cycles
survive a change in degree count; degrees absent from the target scale clamp to
its highest degree. These policies operate on cached playback views, never the
stored phrase or exported source.

Total playback rate is `(transportBpm / sourceBpm) * memberRate`. Recorded
attack/decay/release seconds divide by it; vibrato/tremolo Hz multiply by it.
Depth, sustain, clip, sound and Shape effects are retained. Shape-owned fallback
envelope/effect times stay in seconds. Arbitrary recorded curves still use the
existing steady modulation approximation. The service copies captured controls.

Position is an audio-clock piecewise tempo map, anchored from `lastBegin` and
`lastTick + latency`, not the raw Drawer cursor. Tempo changes anchor their new
rate at `lastEnd`, at `lastTick + clock.duration + latency`. Queued notes retain
their old deadlines. UIBeat keeps one generation and uses `retime`.

## Next slice seam

Attach this service through `getLooperPlaybackPort(existingEditor)`. Play can
prepare and join the desk phrase without creating another editor or scheduler.
Filter highlights by `hap.context.phraseId` before matching source ranges; direct
haps carry note identity, and export/source location mapping belongs to the desk
adapter. Use `memberPosition` and effective membership for rest widgets and
follow. Source/whitespace mapping, rich widgets and recorder wiring remain for
slice 4. No Play button, stores or recorder are changed in this slice.

Looper haps carry the shared key/mode; real output presents pinned pitches
relative to that shared scale and adds `phraseId`/`sourceNoteId` to attack events.
This per-hap context supports old/new events in one lookahead query without
mutating the music-theory singleton ahead of a musical handoff. Slice 4 must
keep the store's key/mode selection in sync with the service.

## Evidence and limits

Run `bun run test:looper-transport` independently of CPU-heavy verification.
`audio-lab/results/looper-transport.json` records real Chrome AudioContext haps,
per-orbit PCM attacks, Stage events, timing errors, UIBeat frames and input
hashes. Unit tests compare direct patterns with actual exported/evaluated
Strudel over eight cycles and cover tempo conversion and handoff behavior.

Receipts are desktop render-graph measurements, not speaker-loopback latency.
Real iOS Safari/Android Chrome, sampled instruments, arbitrary expression
curves, production rich highlights, suspend/resume and background behavior are
still unverified. The next slice must collect the phone gate before shipping.
