# Strudel as the Looper's single transport — 2026-10-05

**Verdict: yes with conditions.** Keep one Strudel scheduler, prepare phrases
without blocking the scheduler’s main thread, and swap cached Pattern objects
through `repl.setPattern`.
The desktop experiment preserved the grid, sounding voices and note events.
The Code Strip's existing editor-evaluation path is too expensive for a hot
swap. Phone timing remains an acceptance gate.

There is a real interaction cost: Strudel has already submitted some future
audio when a membership change arrives. The immediate cached path became
effective at the next query frontier, **202–321 ms** after the request here.
It enters at the phrase's current phase; it cannot retract that committed
window or recover a note whose onset preceded it. A specifically timed bar
handoff works when installed ahead of that frontier. Zero-delay mute or
mid-note catch-up would need additional voice ownership/cancellation work.

Two promises in [the brief](../looper.md) also need adapter work: approximate
degree bending for borrowed pitches, and tempo-stretched recorded expression.
Today's notation does neither automatically. Neither requires a second
transport. The richer Code Strip needs a presentation adapter described below.
The spike code is throwaway; only this document and `docs/looper.md` are merge
candidates.

## Evidence and scope

The [harness](../../audio-lab/spike-strudel/README.md) imports the installed
packages, real [StrudelNotation](../../src/services/StrudelNotation.ts) and real
[EmotiTone output](../../src/services/superdoughAudio.ts). There is no substituted
audio boundary. It uses `StrudelMirror` with one REPL/Cyclist and the production
AudioContext, with synth-only initialization to avoid sample downloads. Its
membership and timing fixtures take pitches from the first four built-in
melodies and assign explicit, independent 1/2/3/4-bar lengths. The phone page
plays Twinkle, Midnight Dorian, Highland Reel and Cyber Pulse with their own
timing, rounded to 3/4-bar periods.

Installed versions: core/mini/tonal/transpiler **1.2.6**;
CodeMirror/webaudio/superdough **1.3.0**, with the repository's Superdough patch.
Source and shipped distribution hashes accompany the receipts. The independent
[source inspection](../../audio-lab/spike-strudel/source-scout.md) distinguishes
source-supported behavior from runtime measurements.

The [transport receipt](../../audio-lab/results/spike-strudel-trials.json)
contains every submitted hap's phrase id, whole onset, absolute audio onset,
submission time, gate, controls and source locations, plus before/after swap
snapshots and draw frames. Four separate Superdough orbits feed the existing
PCM capture worklet, allowing attacks to be attributed to individual phrases.
An arithmetic oracle derives expected cycles from source timestamps, period,
offset and rate independently of Strudel's pattern query.

Each membership strategy ran three times at **90 and 150 BPM**: 30 trials.
Another 18 trials compared tempo approaches; six tested a long sounding note
through joins/removals; four rendered recorded expression at both tempos and
rates. There were **58 audio cases**, twelve passing required checks and zero
browser warnings. Twelve measured compiler trials per size
follow three warmups in the [cost receipt](../../audio-lab/results/spike-strudel-cost.json).

Chrome 147 on Linux rendered at **44,100 Hz**. PCM attack detection uses amplitude
0.0005 after 10 ms silence, matching within 12 ms; hap matching allows 3 ms.
Reported errors are the actual matched errors, not those tolerances. Missing
and unexpected attacks remain failures of their experimental strategy.
`baseLatency = 10 ms` and `outputLatency = 32 ms` are browser metadata, not
physical latency measurements. These are software render-graph measurements;
the approximately 0.1 ms threshold delay does not establish speaker timing.

## 1. Independent phrases on one bar grid

**Tried:** cache each phrase's generated relative notation without its playback
`.cpm` and `.scale` suffix, apply the current or pinned scale programmatically,
and `stack` the members. Set the shared scheduler to `bpm / 240` cycles/second,
so one cycle is one 4/4 bar. Each source keeps its recorded BPM for converting
milliseconds to weights. Playback BPM belongs to the shared clock.

**Measured:** querying twelve bars produced **96/96 expected onsets per phrase**,
with exact cycle positions and correct cyclic pitch order for all four lengths.
The 3-bar phrase wraps four times while the 4-bar phrase wraps three times.
Twelve offset/rate combinations (four phrases × 0.5/1/2 rate) all matched the
independent grid exactly, using an offset of **0.375 bar**. Runtime swaps also
included the slow and fast members, with their own periods intact.

**Build:** calculate the whole-bar membership duration once, including authored
silence. Compile the degree body and retain its exact source-location metadata.
Cache immutable base patterns; apply scale, rate and offset to those bases.
`base.fast(rate).late(offsetBars)` keeps the offset in shared bars. Applying
`.late` before `.fast` scales the offset too. Convert a stored millisecond offset
using its capture tempo/bar origin, with a defined policy for later bends.

The generator has an edge to handle: when authored duration ends exactly at the
last note's release, it appends its default extra beat. Simply rounding the
requested duration can therefore still produce a fractional-bar period. Use a
small explicit zero-tail generation seam or a tested `ribbon(0, bars)` window;
keep export and membership duration consistent. The measured fixtures have a
positive authored tail. The phone lab uses a `ribbon(0, bars)` window so its periods
are whole bars, including exact-end cases. This edge does not justify changing the phrase model.

## 2. Join, leave and offset while running

**Tried:** full `StrudelMirror.evaluate`; cached immediate `repl.setPattern`;
a future-bar transition pattern; and waiting until the requested bar before
calling `setPattern`. Scheduler cycle position was sampled immediately before
and after each actual replacement. Residual subtracts elapsed audio time × cps.

| Strategy, six trials each | Missing haps / PCM | Unexpected haps / PCM | PCM mean / max error | Swap mean / max |
| --- | ---: | ---: | ---: | ---: |
| Full editor evaluation | 231 / 231 | 0 / 0 | 0.094 / 0.113 ms | 1,696 / 3,185 ms |
| Cached immediate stack | 0 / 0 | 0 / 0 | 0.092 / 0.109 ms | 1.70 / 3.00 ms |
| Preinstalled future-bar handoff | 0 / 0 | 0 / 0 | 0.090 / 0.113 ms | 2.56 / 4.30 ms |
| Timer calls replacement at the bar | 30 / 30 | 9 / 9 | 0.092 / 0.113 ms | 1.36 / 2.10 ms |

The passing swap cells separately at each tempo (three repeats, six replacements):

| Strategy / BPM | Matched PCM attacks | PCM mean / max error | Replacement range |
| --- | ---: | ---: | ---: |
| Cached immediate / 90 | 153 | 0.093 / 0.109 ms | 1.1–3.0 ms |
| Cached immediate / 150 | 152 | 0.091 / 0.099 ms | 1.0–2.7 ms |
| Future-bar / 90 | 120 | 0.090 / 0.110 ms | 1.2–4.3 ms |
| Future-bar / 150 | 120 | 0.091 / 0.113 ms | 1.2–4.0 ms |

Onset comparisons exclude startup and final capture-drain margins; every swap
falls inside the comparison window. The raw receipt retains the complete event
stream, including those margins. Passing cells contain no missing or doubled
onsets; threshold error does not measure physical output latency.

Unexpected attacks in the timer control are old-member attacks after the desired
handoff, rather than a claim that the same voice triggered twice. All cached
swaps had **zero cycle residual**; surviving haps matched the scheduled grid to
floating-point precision (maximum across these groups below 0.000001 ms).
For example, the first 150 BPM direct join logged cycle **0.5303027210884323**
both before and after replacement, query frontier **0.625**, and audio clock
**151.3708843537415 s** in both snapshots (within one clock quantum). Its
replacement took **1.2 ms** and its effective frontier was **201.516 ms** ahead
of the request. All individual before/after snapshots are in the receipt.
Preserving the cycle counter alone was insufficient: editor evaluation also
kept its counter while losing attacks during its long main-thread work.

The long-note tests submitted one 1.7-bar gate, joined another phrase, then
removed that other phrase. All six retained **one onset**, with **no sustained
silence gap of 10 ms or more** in the interior. Already-sounding voices were
neither restarted nor cancelled by a pattern replacement. This does not prove
the absence of every shorter discontinuity or instrument-specific click.

**Recommended swap approach:**

1. Compile/prewarm before playback, or prepare new material through a bounded
   path that does not block the running scheduler. Keep one active
   scheduler. Normalize generated source to bar units; its member patterns must
   not retain independently captured `.cpm` multipliers.
2. Build `next = stack(...cachedMembers)` outside editor evaluation. Tag each
   member with `withContext(ctx => ({ ...ctx, phraseId }))`, retaining locations.
3. For ordinary immediate join/leave, call **`repl.setPattern(next)`**, then
   explicitly invalidate the existing Drawer. Do not stop/start the scheduler.
   The next unqueried arc uses the new membership. The phrase is already shifted
   by its stored offset, so its first submitted note is mid-phrase when appropriate.
4. For an exact future bar `B`, choose `B > scheduler.lastEnd` after preparation
   and install this immediately:

   ```js
   const transition = stack(
     old.filterHaps(h => h.whole && Number(h.whole.begin) < B),
     next.filterHaps(h => h.whole && Number(h.whole.begin) >= B),
   );
   await repl.setPattern(transition);
   drawer.invalidate(repl.scheduler);
   ```

   Filter **whole onsets**, so a sustained note crossing B is never retriggered.
   Retire the old branch after the query frontier passes B; coalesce changes
   sharing a pending boundary so transition chains do not accumulate.
5. Publish the effective boundary to presentation state. A request inside the
   committed horizon cannot become an exact retroactive swap. Keep existing
   gates/release tails unless a separately owned voice-cancellation policy says
   otherwise.

The immediate frontier delay averaged **264 ms**, ranging **202–321 ms**; a
member's first actual note can be later if its current phase is a rest. The
future-bar option averaged **1,409 ms**, with a **2,364 ms** maximum. Those bar
waits are an explicit musical choice. The pinned Cyclist polls every 100 ms,
queries 50 ms arcs through its lookahead window, and adds 100 ms onset latency.
Its `now()` draw cursor is 50 ms ahead of the audible cursor in this setup.
The receipt records request audio time separately from the replacement snapshots;
`changeDelayMs` measures the effective frontier against that request audio clock.
`drawCursorToFrontierMs` retains the different draw-cursor distance. The frontier
is an eligibility boundary, not a promise that a member emits an attack there.

The installed `repl.setPattern` also exposes the scheduler pattern and applies
`editPattern`, whereas direct `scheduler.setPattern` only assigns it. The REPL
seam is sufficient and keeps those hooks. Calling `.evaluate` merely to swap
membership adds compiler and editor work without improving scheduling.
[Strudel's REPL manual](https://strudel.cc/technical-manual/repl/) describes the
query/output model; the pinned installed source and receipts govern this verdict.

## Compiler cost

The benchmark uses **64 notes per phrase**, eight bars each, with varying
recorded attack values. It measures transpilation including source locations,
then evaluates already-transpiled JavaScript including mini parsing. Its cached
alternative builds the same number of members programmatically from already
parsed Pattern objects, including scale/rate/offset/identity transforms.

| Phrases / notes | Transpile mean | Evaluate transpiled JS mean | Total mean / max | Cached stack mean / max |
| --- | ---: | ---: | ---: | ---: |
| 1 / 64 | 613.15 ms | 622.13 ms | 1,235.28 / 1,385.30 ms | 0.075 / 0.20 ms |
| 4 / 256 | 2,846.98 ms | 3,199.13 ms | 6,046.10 / 7,276.10 ms | 0.150 / 0.30 ms |
| 8 / 512 | 6,269.63 ms | 6,357.82 ms | 12,627.45 / 14,640.80 ms | 0.308 / 0.50 ms |

Caching the transpiled JavaScript alone still reparses mini strings during
execution. Cache Pattern objects plus metadata. Generate export/display code
outside the hot swap. The observed full editor path lost audible attacks even
with only the smaller timing fixtures. Moving a synchronous cold compile earlier
in time **does not protect an already-running stack**: it still blocks scheduler
queries. The successful joins use parts parsed before playback, as does the
phone page. Cold joining a new recording without interrupting the other voices
is **not established** by these receipts.

The real build needs a bounded direct builder from recorded note data, or
off-thread parsing into a serializable representation followed by cheap Pattern
construction and a retained location map. Pattern objects contain functions;
they cannot simply be transferred from a worker. Neither fresh-note construction
nor worker parsing was implemented or timed here. The measured programmatic
alternative composes **already-parsed** parts. This preparation requirement is
part of the verdict, alongside the phone gate.

These elapsed main-thread times include this host's scheduling and library
implementation. They are not calibrated phone predictions. The raw cost cells
retain mean, p95 and maximum for each component.

## 3. Key, mode, tempo, pin and half/double time

**Tried:** generate degrees in the phrase's recorded key/mode; cache before
scaling; map unpinned members with `.scale(currentKeyOctave + ':' + currentMode)`
and pinned members with their captured scale. Change C major to D minor on a
running stack, then change 90→150 or 150→90 BPM. Include 0.5× and 2× members.
Compare shared `setCps` with `.cpm` re-evaluation, with and without setting cps.

**Measured:** all four source pitch sequences mapped as expected in the static
scale queries; pins were unchanged. The six cached shared-tempo trials had
**zero missing or extra haps or PCM attacks**, with PCM **0.090 ms mean /
0.104 ms maximum** error against the independently anchored two-tempo grid.
Tempo calls took **0–0.3 ms**. Surviving notes remained at their offset/rate
positions. Re-evaluation with cps set lost **252** attacks; `.cpm`-only
re-evaluation lost **285** and produced **9 unexpected** attacks. Both controls
also incur compilation stalls, so those counts do not isolate phase error from
stall loss. The source shows why `.cpm` alone is unsuitable: its speed multiplier
rescales absolute pattern time, while `setCps` anchors the next query at `lastEnd`.

There is a cursor issue independent of the audio grid. A `setCps` call immediately
changes the cps used by `scheduler.now()` before the next tick establishes its
new anchor. The largest sampled raw jump was **0.0477 bar**; draw frames went
backward four times across the 90→150 trials. The lab's audio-anchored UIBeat
position went backward **zero times**. Keep a piecewise tempo map: at a change,
anchor the new rate at `lastEnd`, at audio time
`lastTick + clock.duration + latency`; use the old rate before that time and
new rate afterwards. Retain the same UIBeat generation and call `retime`.
This also lets already queued notes finish at their original deadlines.

**Build:** use one shared `setCps(bpm / 240)`, stable bar-normalized patterns, and
this anchored beat publication. Keep the captured octave, sound, Shape and
source notes unchanged. Cache scale transforms; key/mode changes can use the
same immediate or future-boundary replacement policy as membership. Existing
sounding notes finish on their old pitch/gate; they are not retuned mid-voice.
The current `canPreserveUIBeatPhase` accepts only unchanged source apart from
one tempo suffix, so it must become a shared-transport adapter rather than
being reused as a stack-membership guard.

**Limits found:**

- Relative export is all-or-nothing. One borrowed note causes absolute notation
  for the entire phrase. Applying `.scale` to those absolute pitches can quantize
  them, but does not implement exact key transposition plus recorded-degree
  mode bending. Approximate source degrees deliberately, preserve octave cycles,
  and feed that playback view to the existing notation generator. Test ties and
  scales with different degree counts. This spike preserves that failure rather
  than silently changing the phrase.
- Recorded controls survive stacking: the expression probe retained per-note
  attack, `vib = 10`, `vibmod = 0.3`, `tremolo = 10`, and depth `0.333`. Doubling
  time halved hap duration from 0.35 to 0.175 bar but left those Hz/second controls
  unchanged. Four supplemental real-output renders at 90/150 BPM and 1×/2×
  retained those controls and matched all twelve PCM attacks, with no missing
  or extra onsets and maximum rendered error **0.217 ms** (the slower recorded
  attack shifts threshold crossing). Today's generator approximates steady
  vibrato/tremolo; arbitrary
  finger curves are already outside its portable subset. Promised expression
  stretching needs a playback-control transform from immutable captured values:
  multiply modulation Hz by total playback rate and divide recorded time-based
  controls by it, with an explicit policy for Shape-owned envelope/effect times.
  Exact arbitrary-curve replay remains separate work.

[Strudel's time modifiers](https://strudel.cc/learn/time-modifiers/) supply rate,
shift and window operations. Their availability does not implement those
EmotiTone bending policies by itself.

## 4. Mute and solo

**Tried:** compose the active membership, mute other phrases for solo, then
restore all members, using the same preinstalled boundary pattern. Immediate
cached removals are covered by the direct join/leave cells.

**Measured:** six mute/solo trials matched **390 PCM attacks**, with **zero
missing or extra haps/PCM**, **0.090 ms mean / 0.109 ms maximum** rendered error.
The eighteen transitions took **4.44 ms mean / 9.80 ms maximum** including
Drawer invalidation. Both membership strategies retained UIBeat generation and
monotonic draw position. The long-note test also confirms removing another
member does not restart an unaffected held voice.

**Build:** mute/solo changes which cached members contribute onsets; they do not
stop the scheduler or rewrite phrases. Preserve phase while silent so unmuting
rejoins the shared grid. Adopt a clear tail policy: the measured operation lets
already submitted notes and gates finish. Immediate truncation of a muted
phrase is unverified and needs member-owned audio handles or an orbit fade.
A bar-quantized solo can use the exact future handoff; a quick tap can use the
cached immediate path and its named committed-window delay.

## 5. Stage, keys, expression, UIBeat and one Code Strip highlight

**Tried and measured:** all **1,396 submitted haps** in the membership cells
went through `emotitoneStrudelOutput`, with matching `note-played` and
`note-released` counts, no output rejection, and no pending output at cleanup.
PCM independently confirmed the tested attacks. The real function supplies
actual sounding pitches and gate durations; borrowed/pinned pitches retain
chromatic identity. Its key/mode/solfège metadata comes from current global
music theory, so the real Looper must update that shared context and decide how
pinned pitches are presented relative to it. The page has no production Stage.
Recorded expression controls are carried in each hap; stretching limits are
listed above. UIBeat kept one generation across all membership swaps, and the
anchored tempo frames remained continuous.

**One editor can follow one member while all sound.** The lab uses one Mirror
and scheduler, showing one cached phrase's source while its scheduler holds the
combined Pattern. It installs that phrase's `meta.miniLocations`, preserves
`hap.context.locations`, tags each member with phrase identity, and filters
active haps **before** the stock `highlightMiniLocations` effect. It explicitly
invalidates the Drawer when the stack or desk changes. Source offsets overlap
between separately compiled phrases, so location matching without identity
filtering lights the wrong phrase. The 120 desk-selection checks matched the
expected decorations while queries included all four members.

Evaluating a combined `stack(...)` source and displaying only one substring
would instead require subtracting that substring's source offset from **both**
metadata and hap locations, plus identity filtering. Caching local source and
local locations avoids that remap. Display edits/whitespace normalization still
need a fresh location map; keep the exact compiled source as the canonical
editor document.

The production [rich Code Strip extension](../../src/components/uniques/CodeStrip/strudelExtension.ts)
needs one more adaptation. Notes use hap source ranges, while rests and played
history derive position from the displayed flat grammar. Feed the desk's local
time `(sharedBar - offsetBars) * rate`, and transform filtered hap whole spans
into that same coordinate system, or teach its timeline the membership's global
timing and period. Gate follow on the desk phrase's membership rather than the
scheduler's global started flag. Clear stale Drawer haps on member/version/desk
changes and use effective membership at a pending boundary. These are
presentation changes; a second scheduler is unnecessary.

The phone page demonstrates **stock CodeMirror phrase highlighting**. Production
rich widgets, rest progress, scroll follow, desk switching during queued
transitions, Stage rendering and keyboard presentation were inspected in source
but were **not exercised together end to end**. This spike makes that work
concrete; it does not claim the existing component already understands a stack.

## Phone page, verification and next gate

On the Vercel preview open **`/spike/strudel-transport`**. Tap Start, join melodies,
select a desk phrase, then try pin, mute/solo, offset, half/double time, key/mode
and tempo. Swap offers an immediate query-window change or the next safe bar.
The readout separates anchored bar position from Strudel's raw cycle cursor.
Locally, run `bun run dev` and open `/audio-lab/spike-strudel.html`.

[The preview](https://emotitone-solfrege-git-spike-strudel-s-9cb33b-beejsbjs-projects.vercel.app/spike/strudel-transport)
deployed successfully for `02a99f60`. Unauthenticated requests redirect to
Vercel login, so the remote rendered page was not inspected. The owner can open
it after signing in; the equivalent built entry was checked locally below.

The page is a separate Vite HTML entry with one explicit preview rewrite and
lab-only exclusions from the PWA's application navigation fallback. It imports
the real modules directly and has no application bootstrap, recorder,
phrase-domain changes or production playback seam. It does not write application
preferences; StrudelMirror retains
its own `codemirror-settings` localStorage entry.
Normal application imports are unchanged. `src/services/patternPlayback.ts`
still owns the existing Code Strip transport.

Verification completed in this worktree:

- `bun install` completed without changing the lockfile.
- `bun run build` passed, including its serialized typecheck and both HTML
  entries. Existing Browserslist, library `eval`, shared-chunk and bundle-size
  warnings remain.
- `bun run test` passed **1,764 tests across 160 files**, once, in **110.99 s**.
- The real-browser transport matrix passed all **12 checks**, and the separate
  compiler benchmark completed all three sizes. Receipts retain the measured
  source revision and hashes; later phone-window and assertion-only changes do
  not change those timing fixtures. The expanded cached-path assertions were
  also checked against the retained raw results: direct, boundary and mute/solo
  all have zero losses, extras and phase residual.
- `node audio-lab/spike-strudel/phone-check.mjs` passed **five checks** on the
  production bundle: installed-PWA navigation, real playback/control events,
  whole-bar periods, stop cleanup and no browser warnings. The
  [receipt](../../audio-lab/results/spike-strudel-phone.json) and inspected
  [screenshot](../../audio-lab/results/spike-strudel-phone.png) use a 390×844
  desktop Chrome viewport. They are not real-phone timing evidence.

Before committing to slice 4, listen and collect the same timing receipts on
real iOS Safari and Android Chrome, under touch interaction and realistic
phone load. Include long recordings, eight dense members, sampled instruments,
release tails, mode changes across scales with different degree counts, repeated
rapid swaps, suspend/resume and background behavior. This desktop synth run
establishes transport feasibility, not broad instrument fidelity, hardware
latency, mobile CPU/memory safety or freedom from every audible click.

If that gate fails, the [PR #132 prototype](https://github.com/beejsbj/emotitone-solfrege/pull/132)
remains the fallback; no scheduler code was ported from it. Its audio-clock
lookahead path already provides independent loop periods, but promotion would
need ownership/cancellation and tempo-boundary policies, recorded-expression
replay, per-note Stage/key events, a shared UIBeat producer, and a new
phrase-source/highlight mapping for the Code Strip. Export can still use
StrudelNotation, but highlighting would have to be reconstructed from that
scheduler's events. It also remains a main-thread lookahead scheduler, so moving
to it does not automatically solve long main-thread stalls. The successful
cached Strudel path avoids paying that integration cost now.
