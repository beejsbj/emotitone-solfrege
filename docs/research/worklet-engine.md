# The worklet engine: what replaces Strudel and superdough — 2026-10-09

Linear: BJS-484. Spec: `docs/retrospective-spec.md` (PR #143), Decision 3
(superseded 2026-10-09: move off Strudel and superdough) and W9.

This is the design input for the engine track (BJS-485 to BJS-495). It lists
everything the app takes from Strudel and superdough today, says what replaces
each piece, reports a measured prototype of the Looper transport on the worklet
clock, and names the acceptance tests for each later ticket.

**Verdict.** Put the transport on the audio thread, inside the existing live
worklet core: one processor, one voice pool, one frame clock. Members are plain
event tables built on the main thread from note data. The prototype passed all
of #140's receipt checks that apply to it, with zero lost or extra attacks
across 2,018 expected attacks. It also took membership changes at the next
render quantum instead of #140's 202–321 ms committed window, muted a sounding
member within 10 ms, and lost nothing through 1,000 ms main-thread stalls.
These are desktop numbers from a shared host. Phone numbers come from the phone
gate (BJS-494).

Read [Findings that change the plan](#findings-that-change-the-plan) first.
Several tickets need a sentence changed before they start.

## Findings that change the plan

These are places where what I found disagrees with the spec or a ticket as
written. I have not acted on any of them; each is a call for Burooj or the
orchestrator.

1. **Reverb and delay should stay native nodes, fed by the worklet.** BJS-486
   says "Worklet renders lpf, reverb and delay". superdough's reverb is a
   `ConvolverNode` over a generated stereo noise impulse that is 1.5 times the
   decay time long (`reverb.mjs`, `reverbGen.mjs`; defaults: decay 2 s, so a
   3 s buffer, fade-in 0.1 s, low-pass
   sweep 15 kHz to 1 kHz). Its delay is a `DelayNode` with a feedback gain
   (`feedbackdelay.mjs`). A 2-second convolution written in JavaScript inside
   the worklet would be the most expensive thing on a phone's render thread.
   It would also sound different unless it reproduced the same IR. Native
   `ConvolverNode` and `DelayNode` already run on the audio thread, so a
   main-thread stall cannot reach them. **Recommendation:** the lowpass filter
   moves into the worklet, per voice, because superdough filters per voice and
   Looper members carry different Shapes. Reverb and delay become two
   app-owned native buses. The worklet feeds them through extra outputs (send
   levels per voice), the same multi-output mechanism the prototype uses for
   per-member capture. Golden-PCM tests render the buses in an
   `OfflineAudioContext` with a seeded impulse. superdough also holds the
   delay's wet gain until `t + delayTime` when a delay is created
   (`feedbackdelay.mjs:23`, `start(t)`), and the golden test must reproduce
   that gating. BJS-486's "Done when" should
   say "the engine renders", not "the worklet renders".
2. **Someone has to own the audio graph.** superdough owns the
   `AudioContext`, the master gain, and the orbit reverb and delay that live
   playing already sends into (`audioRuntime.ts`, `liveShaping.ts`). No ticket
   names moving that ownership to the app. It fits BJS-486, since the effect
   buses are most of the graph. Without it, BJS-495 cannot remove superdough.
3. **The default GM soundfonts are mostly unlicensed.** 105 of the 125 `gm_*`
   instruments load, by default, a font (JCLive 64, Aspirin 38, Chaos 2,
   Acoustic_Guitar 1) whose licence nobody states. The data's maintainer says
   in writing that he does not know their licences. Only the 20 FluidR3 defaults
   are licensed (MIT). BJS-488 says "its own loader for the same sample and
   soundfont data". This exposure is inherited, not new. Loading the same
   files from the same host is no worse than today. The only decision is
   whether to self-host or service-worker-cache them, which would make
   EmotiTone a redistributor of files with no known licence. Separately,
   `fontloader.mjs` `eval`s remote JavaScript today. A loader that parses the
   font data without `eval` is a security win for BJS-488 whichever way the
   hosting goes. See
   [Licences](#sample-pack-and-soundfont-licences). **Burooj decides** before
   BJS-488 starts: keep fetching from the upstream host as today, or self-host a clean
   set (FluidR3 first, then GeneralUserGS), which changes how about 100
   instruments sound.
4. **supersaw, pulse and the z_* synths have no owner.** The catalog offers
   fourteen synths: triangle, square, sawtooth, sine, the aliases
   tri/sqr/saw/sin, supersaw, pulse, and the four zzfx synths `z_sine`,
   `z_square`, `z_sawtooth` and `z_triangle`. BJS-487 covers square and saw.
   supersaw and pulse exist only as superdough's own worklet oscillators; the
   z_* four are rendered by superdough's zzfx path. All of them route to
   superdough for live playing too. Add them to BJS-487 (or a sibling), or drop
   them from the catalog. That is a product call.
5. **Pattern playback today transpiles editable text.** Play evaluates
   whatever is in the Code Strip editor, hand edits included
   (`useCodeStripStrudel.play` → `StrudelMirror.evaluate`). BJS-485 plays from
   note data, so once it lands, edits in the editor stop changing the sound
   while the editor still looks editable. **Land BJS-492 (the read-only
   HighlightStrip) before BJS-485.** Keep the cheap fallback: if BJS-492
   slips, BJS-485 makes the existing editor read-only. Today the blocking order
   runs the other way: 492 blocks only 493 and 495.
6. **UIBeat has no clock without Strudel.** Its only producer is StrudelMirror's
   draw loop (`CodeStrip/index.vue` `onDraw` → `publishUIBeatFrame`). BJS-485
   must supply the replacement producer, not just patterns. The prototype shows
   one that works: the main thread reads the worklet's published tempo anchors.
7. **The parity suite loses its reference.** `audio-lab/parity` compares the
   worklet against real superdough. Once BJS-495 lands, that reference is gone.
   BJS-486 and BJS-487 should freeze superdough renders as golden fixtures
   while superdough is still installed:
   - filter, delay and oscillators sample-exact;
   - reverb as a spectral and decay envelope. superdough's IR is unseeded
     noise (`reverbGen.mjs` `Math.random`), so no two of its renders are
     sample-identical.
8. **The spec still says Strudel stays in several places.** Decision 3 was
   superseded, but these were not updated. Each should be edited or marked
   superseded when #143 is next touched:
   - Phase 0 item 2 runs the phone gate "on #140" before further Looper slices
     merge. That gate now belongs to the worklet engine (BJS-494).
   - Decision 4, "What stays", lists "Strudel as the engine and transport" and
     "its sound library".
   - Out of Scope lists "Running the Looper on a transport other than
     Strudel".
   - Further Notes ("Strudel stays, the alternatives become the fallback") and
     the Risks bullet on the phone gate failing.
   - W10 says "The Looper brief marks Strudel as decided". It should mark the
     worklet transport as decided.
9. **The main-thread play-style engine needs a retirement owner.** Live
   Repeat/Arp for sounds the worklet can't play still runs on the main thread
   (`playStyles.ts`, `scheduledLiveVoice.ts` → `superdoughAudio.attackNote`).
   Once BJS-487 and BJS-488 put every sound in the worklet, that path is dead
   code. Add its removal to BJS-495's "Done when", so "one live rhythm engine"
   (W9, S117) is actually finished. The same goes for the ambient types in
   `src/types/strudel.d.ts` and the audio-lab harnesses that import or hash
   superdough (§1, "Tests and harnesses").

## 1. What the app uses today, and what replaces it

Inventory at `origin/main` `a771a515`. Production imports are in seven files:
`patternPlayback.ts`, `superdoughAudio.ts`, `audioRuntime.ts`, the two
`prepared*Instrument.ts`, `audioDiagnostics.ts` and the Code Strip's
`strudelExtension.ts`. `src/types/strudel.d.ts` declares ambient types for
the Strudel packages and goes with them (BJS-495). Installed versions: `@strudel/core`, `mini`, `tonal` and
`transpiler` are pinned at 1.2.6. `webaudio`, `codemirror`, `soundfonts` and
`superdough` are 1.3.0, the last three under caret ranges. Three patches are
applied.

### Scheduler and pattern evaluation (BJS-485, BJS-491)

| Import (file) | What it does for the app | Worklet replacement |
| --- | --- | --- |
| `StrudelMirror` (`@strudel/codemirror`, `patternPlayback.ts`) | The one pattern transport: editor, REPL and the Cyclist scheduler, plus the draw loop that drives highlight and UIBeat. `getTime` is `AudioContext.currentTime`. | The audio-thread transport ([§2](#2-the-scheduler-design)). A lone reel pattern is a transport with one member. |
| `transpiler` (`@strudel/transpiler`) | Turns the editor text into JS at Play (about 1.2 s per 64 notes, #137) and records mini source locations for the highlight. | None needed. Members are built from note data. Highlights come from note ids (BJS-492). |
| `evalScope(core, mini, tonal, webaudio)` | Exposes `.as`, `.sound`, `.cpm`, `.scale`, `lpf`, `room` and so on to the evaluated code. `@strudel/tonal`'s `.scale()` resolves relative (degree) notation. | None. Degrees are resolved on the main thread when the member table is built. Bending a running member means rebuilding its table and swapping it at a boundary. |
| `webaudioOutput` (`@strudel/webaudio`) | Sends each hap's value to `superdough()` at its audio time. | The worklet starts voices itself, at exact frames. |
| `emotitoneStrudelOutput` (app, `superdoughAudio.ts`) | Builds `note-played`/`note-released` (source `strudel-playback`) from hap values. A `setTimeout` releases each note. Exposes `getActiveStrudelStageNotes`. | Typed attack/release events posted by the worklet. They carry `noteId`, `memberId`, `sourceNoteId`, `frame` and `bar`. One builder, not two (W9 "typed note events"). |
| `repl.scheduler.setCps(bpm/4/60)` and `.cpm(bpm/4)` in code text | Tempo. A change while playing regenerates the code and re-evaluates it. | A tempo command at the next quantum or an exact bar, recorded in a piecewise tempo map that is published to the main thread. |

### Voice rendering and the graph (BJS-486, BJS-487, BJS-488)

| Import | What it does | Replacement |
| --- | --- | --- |
| `superdough(payload, t, dur, cps)` | Renders every pattern note and the live fallback. Payload fields the app emits: `s`, `note`/`n`, `gain` 0.8, `attack`, `decay`, `sustain`, `release`, `clip`, `cutoff`, `resonance`, `room`, `delay`, `delaytime` 0.25, `delayfeedback` 0.3, `vib`, `vibmod`, `tremolo`, `tremolodepth`, `orbit` 2 (live), and the patch's `voiceId`/`sustainUntilRelease`. | Worklet voices. Envelope and gain already exist. `clip` becomes the gate length in the table. Recorded pitch and gain curves can replay through the existing per-owner bend and gain paths (within the bend range), more exactly than the `vib`/`tremolo` approximations. Filter and sends are covered in the next rows. |
| `hasVoice`, `stopVoice`, `cancelVoice`, `releaseVoice`, `releaseAllVoices` (patch exports) | Held live voices on the fallback path. | The worklet's existing `press`/`release`/`clear` owners. They retire with the fallback. |
| `registerSynthSounds`, synth `square`/`sawtooth` (native `OscillatorNode`), `supersaw`, `pulse` | The fourteen selectable synths (ten oscillator names plus `z_sine`, `z_square`, `z_sawtooth`, `z_triangle`). square/saw go to superdough on purpose (#90, timbre parity). | The polyBLEP square/saw already in `core.ts` (BJS-487). supersaw, pulse and the z_* four: see finding 4. |
| `getAudioContext`, `initAudio({ maxPolyphony: 64 })`, `getSuperdoughAudioController().output.destinationGain`, `getOrbit(2)` (`audioRuntime.ts`) | Owns the context, master gain and live orbit. Every analyser, scope and recorder fans out from that master gain. | An app-owned graph: context, worklet node, master gain, and reverb and delay buses (finding 2). |
| `orbit.getReverb`/`getDelay`/`sendReverb`/`sendDelay` (`liveShaping.ts`) | Live Shape effects. One `BiquadFilterNode` covers the whole live chain; room and delay are sends into orbit 2. | A per-voice lowpass in the worklet. The worklet's send outputs feed native convolver and delay buses (finding 1). |
| Per-voice lowpass in patterns (`cutoff`, `resonance` → `BiquadFilterNode` lowpass, 12 dB, Q = resonance or 1) | Pattern Shape filter. | A worklet biquad with WebAudio's lowpass coefficients. **Trap:** WebAudio defines the lowpass `Q` in dB, not as a linear Q. Use the spec's formula or the parity will be off. |
| `maxPolyphony` (`audioDiagnostics.ts`) | Diagnostics voice limit on the fallback. | `MAX_AUDIO_VOICES`. |

### Loaders (BJS-488)

| Import | What it does | Replacement |
| --- | --- | --- |
| `samples(BASE + 'piano.json' / 'vcsl.json')` | Registers the two sample packs. The piano is 29 pitches from `dough-samples/main/piano/`. VCSL is 128 sounds served straight from `sgossner/VCSL`. | The app's own fetch of the same JSON maps, or maps it generates itself (the dough-samples repo has no licence). |
| `getSound`, `soundMap`, `getSampleInfo`, `getLoadedBuffer`, `loadBuffer` | Sound registry, picker listing, root pitch parsing (keyed banks by note name; array banks use root MIDI 36), and the decoded `AudioBuffer`s that the worklet then *clones*. | An app catalog: name → kind → zones. Decode, copy into an owned `Float32Array` per channel, **transfer** that buffer (not a clone) to the worklet, then drop the `AudioBuffer`. A transfer detaches the whole backing `ArrayBuffer`, so "chunks" means independently allocated per-zone or per-channel buffers that the worklet keeps as chunks, never slices of one buffer; BJS-488 checks that the largest single transfer meets the long-task gate. That leaves one PCM copy. Today the piano holds about 138 MiB in superdough plus about 138 MiB in the worklet. |
| `registerSoundfonts`, `prewarmSoundfont`, `getPreparedSoundfont` (patch exports), `@strudel/soundfonts` | Registers the 125 GM names. Fetches `felixroos.github.io/webaudiofontdata/sound/<font>.js` and evaluates it with `eval`. The patch exposes zones with tuning, key ranges and loop points. | Fetch the font file as text and parse its object literal without `eval`, or pre-convert a chosen set at build time (finding 3). The zone mapping in `preparedNativeInstrument.ts` moves over unchanged. Note the service worker does **not** cache `felixroos.github.io`; it caches `raw.githubusercontent.com` and `cdn.jsdelivr.net`. |

**The boot contract (BJS-488 must re-implement it).** `stores/instrument.ts`
`initialize` calls `initSuperdoughAudio(progressCallback)`. Its progress steps
drive the loading screen: synths registered, each pack loaded, engine
starting, default instrument ready. It also sets the startup stage
(`samples`, `engine` or `ready`). A failed pack download throws
`SampleLoadError`, which `useAppLoading` turns into the "play the synths"
offer through `initSynthOnlyAudio`. The new loader must keep the same steps,
the same error type and the synth-only degraded start.

### Notation export, "Open in Strudel", and the Code Strip (BJS-492, BJS-495)

`StrudelNotation.ts` imports nothing from Strudel; the app already writes the
code text itself. The text uses:
- **Mini syntax:** `<…>`, `@weight`, `~`, `{a, b}` and `:` field joins.
- **Methods:** `.as("note:…")` or `.as("n:…")` with optional `clip`,
  `attack`, `decay`, `sustain`, `release`, `vib`, `vibmod`, `tremolo` and
  `tremolodepth` fields (array form when vibrato or tremolo is present),
  `.scale("Key{oct}:mode")`, `.sound(…)`, `.clip()` and the envelope methods
  when uniform, `.lpf()`, `.lpq()`, `.room()`, `.delay().delaytime(0.25).delayfeedback(0.3)`,
  and `.cpm(bpm/4)`.

"Open in Strudel" already exists: `PhraseShelf.vue` opens
`https://strudel.cc/#${base64(utf8 code)}` with relative notation. Nothing in
it changes when the packages go. It does depend on strudel.cc keeping that URL
format and the same sound names (`piano`, the VCSL names, `gm_*`).

The Code Strip uses `StrudelMirror` and `showMiniLocations`, and the
`strudelExtension.ts` playback field reads `hap.context.locations`. It also
carries the `@codemirror/view` 6.40.0 patch (a selection-read guard) and the
native-reveal workaround. The visible editor goes in BJS-492 and its
replacement lights spans by note id from the typed events. `StrudelMirror` is
still the only pattern transport until BJS-485 lands, so BJS-492 keeps the
packages, the patch and a hidden mirror as a temporary transport adapter; they
are deleted in BJS-495 (or in BJS-492 if it lands after BJS-485).

### Patches

| Patch | Size | What it adds | Fate |
| --- | --- | --- | --- |
| `superdough@1.3.0` | 4,492 lines, about 720 of real source change; the rest is regenerated minified dist | Held voices (`voiceId`, `sustainUntilRelease`, the voice API), late held onsets clamped instead of dropped, time-aware admission and steal fades, eviction of failed sample loads, zzfx stop | Deleted in BJS-495. The fixes worth offering upstream (W9) stay a courtesy, not a dependency. |
| `@strudel/soundfonts@1.3.0` | 475 lines | Object-expression preset parse, cache eviction, `prewarmSoundfont`, `getPreparedSoundfont`, real `stop`, and a reordered variant for five instruments | Deleted in BJS-495. The variant order moves into the app catalog. |
| `@codemirror/view@6.40.0` | 36 lines | Skips a forced selection read on blurred views | Deleted in BJS-495, or in BJS-492 if it lands after BJS-485 (the hidden mirror is the transport until then). |

### Tests and harnesses that retire with the packages

- **Unit tests:** `superdoughPatch`, `superdoughLifecycle`,
  `superdoughRetirementRollback`, `superdoughSynthesisCache` (and
  `superdoughTestAudio.ts`), `superdoughAudio`, `audioRuntime`,
  `audioRuntimeBudget`, `soundfontPatch`, `soundfontStop`,
  `preparedLiveInstrument`, `audioDiagnostics` and `recordedPlayback`.
- **`StrudelNotation`:** its transpiler round-trip becomes a text snapshot.
- **Code Strip:** `CodeStrip`, `CodeStripControlledIsolation` and
  `strudelExtension`.
- **audio-lab:** every harness that imports, aliases or hashes superdough or
  `superdoughAudio`. Each is retired or rewritten against the worklet before
  BJS-495's grep can pass:
  - `lab.mjs`, `audio-boundary.mjs`, `production-scenarios.mjs`,
    `ui-inspect.ts`;
  - `parity/suite.mjs`, `parity/voice-budget.mjs`;
  - `run.mjs` (`LAB_SUPERDOUGH`; it aliases `superdoughAudio`), `ui-run.mjs`,
    `ui-compare.mjs`, `ui-core-run.mjs`, `pattern-growth.mjs`,
    `finger-expression.mjs`, `validate.mjs` and
    `summarize-native-comparison.mjs`;
  - `reference/livePlayback.ts` and its test.
- **Stale:** `superdoughAudio.test.ts` mocks `@strudel/web`, which is not a
  dependency. `buzz` is listed as a synth but superdough 1.3.0 never registers
  it.

## 2. The scheduler design

### Where it runs

On the audio thread, in `LiveAudioCore`, beside the live play styles. Three
alternatives were weighed:

- **Strudel's Cyclist, as in #140.** It works on a desktop. Its scheduler loop
  runs on the main thread, though, and every change waits behind the window it
  has already committed: 202–321 ms in #137, 246–293 ms mean in #140's receipt.
- **A main-thread lookahead scheduler posting timed notes, as in #132.** It is
  still a main-thread loop. The audio-lab baseline lost beats with lookahead
  schedulers under a 300 ms stall, while the worklet lost none (`audio-lab/README.md`).
- **A Worker scheduler.** It is off the main thread, but every note becomes a
  cross-thread timed message with a lead time. That adds a second clock to
  keep in step, for nothing the render thread can't already do.

The render thread is the only place where "now" is exact and cannot be starved
by the UI. The core already sequences Repeat/Arp pulses there.

### Data model

- **Member** (built on the main thread, immutable):
  - `id` (the phrase id);
  - `lengthBars` (fractional, not padded to whole bars: a take that ends off
    the measure keeps its authored length; the tail is the phrase's authored
    trailing silence when it has one, and one beat only for a fresh take with
    none, as `StrudelNotation.ts` does today);
  - `notes[]`, each with `begin` and `duration` in bars at rate 1, `pitch`
    already bent to the Looper's key and mode (or pinned), `instrumentId`,
    `sourceNoteId` (the table holds no `noteId`: the scheduler allocates a
    unique voice `noteId` for each occurrence it schedules), the immutable key, mode and solfège it was built under (or a
    table-generation id that resolves to them), and in production its
    articulation and expression curves. The member also carries its Shape
    (cutoff, resonance, room, delay), the values `filterModifiers()` and
    `effectModifiers()` apply today, so differently shaped members can sound
    together.
- **Settings:** `offsetBars`, `rate` (0.5, 1 or 2) and `muted`, plus the
  transport's `soloId`. Pin is not a transport setting: it decides which table
  gets built.
- **Clock:** a piecewise tempo map of anchors `{ frame, bar, bpm }`. One bar is
  four beats. The first member's tempo sets the start anchor; bar 0 sits at the
  frame Start arrives.
- **Placement:** a note sounds at shared bar
  `offset + loop × (length / rate) + begin / rate`. This is #140's grid, and
  the spike checks it against #140's oracle.

### Changes

- **Commands:** `start`, `stop`, and `change` with a boundary.
  - The change kinds are `join` (which also replaces a member with the same
    id), `leave`, `update` (`muted`, `offsetBars`, `rate`), `solo` and `tempo`.
  - The boundary is `immediate` or `{ bar: B }`.
- **Immediate** applies at the frame the message arrives: the start of the next
  render quantum (128 frames, 2.9 ms at 44.1 kHz). There is no committed window
  to wait behind, because nothing is queried ahead.
- **At bar B**, each render quantum splits at the exact frame of B. Notes before
  B come from the old membership and notes from B on come from the new one, so
  a note exactly on B belongs to the new membership. That is the same rule as
  #140's whole-onset filter. A B already passed is applied at once and reported
  `late`; a past bar is never honoured.
- Every applied change answers with `{ arrivalFrame, appliedFrame, appliedBar, late }`.
  That is the receipt the UI and the recorder use.
- **Tempo** at bar B adds an anchor at B's frame under the old tempo. The main
  thread publishes the anchor when the change is *requested*, so the UI never
  extrapolates past a tempo change it then has to retract. If the command
  arrives after B, the worklet applies it at once and reports `late`. The main
  thread then reconciles the published anchor to the receipt's
  `appliedFrame`/`appliedBar`, because the worklet's clock is the authority.
  The UI must not step backward, and it should not freeze either: when the
  receipt lands behind the provisional position (a late increase, 120 to
  240 BPM), slew the displayed bar's rate until the true clock meets it. The
  cost is a phase error during that window, bounded by the lateness and
  converging to zero. The case is rare (a command posted within the message
  latency of B), so the phase acceptance check excludes the window and reports
  its length. Test a command posted just before B and delivered after it, for
  both an increase and a decrease.

### Tails, mute and solo

- **Leave lets the member's sounding notes finish their gates.** That is
  musical, and it matches #140.
- **Mute and solo stop future onsets and fade the member's sounding voices over
  10 ms.** Voices carry `memberId`. #140 could not do this, because superdough
  owned voices it had already been handed. The fade silences the member's dry
  output only. Sound already sent to the shared native reverb and delay buses
  rings out (up to the 3 s impulse plus echoes), because the buses no longer
  know which member it came from. That is the cost of finding 1; the
  alternative is a wet bus per member. Mute and solo therefore leave a tail
  of the muted member audible, and BJS-491 measures the dry output for its
  150 ms bound. **Burooj decides** whether that tail is acceptable.
- **Stop fades everything.**

### Events, the Stage, keys and UIBeat

The worklet posts attack and release events for every transport voice. Each
carries `noteId`, `memberId`, `sourceNoteId`, `pitch`, `frame`, `bar`, the
articulation, and the key, mode and solfège (or the table-generation id) the
note was built under. Every transport event is marked non-recordable (`record: false`, or a source
the recorder excludes), because `phrases.ts` otherwise records the transport's
own attacks into the open take; a test shows playback leaves the take
unchanged. The Stage and keys cues read these, not the current
store, because a queued key change or a stalled main thread can leave the store
ahead of the sound. Events are batched per quantum through the FIFO bridge. Today's bridge
allocates (it builds response objects and replaces its array on every flush),
so production needs recyclable or transferable event batches, not a new object
per flush.

- **The Stage and keys** keep using `audibleAt` (render time plus output
  latency) as they do now. In the prototype an event reached the main thread
  3.6 ms after its render time on average, and at most 20 ms, outside stalls.
  That is less than the browser-reported 32 ms output latency. So, normally,
  the event arrives before the note is heard.
- **For lookahead**, such as the HighlightStrip's follow-scroll or the Looper
  Stage source, the main thread can compute upcoming notes from the same member
  table and tempo map. Use one pure function, shared by the worklet and the main
  thread, rather than asking the worklet.
- **UIBeat** is computed per animation frame on the main thread as
  `barAt(outputTime)` from the published anchors, where `outputTime` is the
  context's output timestamp (`getOutputTimestamp()` or the existing
  `audibleAt` conversion), so the bar tracks what is heard, not what is
  rendered. There is one
  generation per run, and `retime` is called when the active anchor's bpm
  changes. The prototype measured zero backward steps.

### Live Repeat/Arp and recording

- **Repeat and Arp lock to the grid.** The core's rhythmic pulses and the
  transport share one frame counter. To phase-lock them (S111), quantise the
  first pulse to the transport's next subdivision instead of the press frame.
- **Recording.** Every live attack already comes back with its exact frame.
  The recorder keeps each note's exact frame and converts it to a transport bar
  only once the tempo map is authoritative (a late tempo receipt can change the
  conversion for notes between B and `appliedFrame`), minus the per-device
  calibration (S113). Both late-tempo tests include a recording case. This replaces wall-clock stamps mapped through
  output latency.

### Preparation and allocation

- **Table building is cheap and stays on the main thread.** A member table is
  built from note data by the plan #140 already factored out of export
  (`recordedPatternPlan.ts`, pure). That is the same authority for lanes,
  clipping, articulation and expression, so the exported text and the sound
  cannot disagree. It is posted as a structured clone. The prototype's
  simplified builder took 0.3–0.6 ms for 512 notes.
- **The render loop must not allocate.** The prototype allocates a small object
  per note (acceptable at these rates, not final). Production should use a
  preallocated action ring, binary search per member, and the voice pool (W9's
  owned-source review item).

## 3. The prototype and its numbers

**Spike branch:** `spike/bjs-484-worklet-transport`, draft PR
[#150](https://github.com/beejsbj/emotitone-solfrege/pull/150), "Spike: the
Looper transport on the worklet clock (not for merge)". It is throwaway; this
doc is the deliverable.

**What it is:**
- `src/audio/live/transport.ts`: the transport above, about 230 lines.
- A hook in `core.ts` that collects the transport once per render quantum and
  starts its notes at exact frames through the existing voice path.
- Per-member output buses.
- #140's receipt checks ported to `audio-lab/worklet-transport/`:
  - the same four fixtures (the first four library melodies at 1, 2, 3 and 4
    bars, with offset 0.375 and pinned, half time and double time);
  - the same arithmetic oracle, which reads raw notes and never the
    transport's table;
  - the same PCM onset detector (amplitude 0.0005 after 10 ms of silence,
    matched within 12 ms);
  - the same 90 and 150 BPM matrix and the same change times.

No Strudel or superdough is loaded. The only instrument is a worklet sine with
attack 0.001 s, decay 0.01 s, sustain 0.5 and release 0.01 s. That is #140's
library-fixture articulation, but not its expression and cold fixtures, which
used attacks of 0.002–0.005 s and a 0.02 s release.

**Host and method:**
- The host was bjslab, an i7-6700HQ with 8 threads and 15.5 GiB of RAM, shared
  with other agents' work. The 1-minute load average was 13.2 at the start of
  the run and 9.2 at the end.
- The browser was Chrome 147 headless at 44,100 Hz, reporting 10 ms base and
  32 ms output latency (browser metadata, not measured).
- These are render-graph captures, not speaker loopback.
- The receipt is `audio-lab/results/worklet-transport.json` on the spike
  branch, recorded at 2026-10-09T12:09Z against commit `7c1853fe`. It records
  the host's load before and after. It is marked `dirty` only because the
  receipt file itself was untracked when the run started.

| #140 check | #140 (Strudel, 2026-10-06) | Worklet spike (2026-10-09) |
| --- | --- | --- |
| Requested cells completed | 38 trials | 44 trials |
| Zero missing or extra submitted events and PCM attacks | pass | **pass**: 2,018 expected; 0 missing, 0 extra, both from worklet events and from PCM |
| Independent offset and rate grid retained | pass | **pass**: every event's bar equals the oracle's within 1e-6 bar |
| Zero cycle residual across replacements | pass | **pass**: membership changes never add a tempo anchor; tempo trials have exactly two |
| Pinned and bent pitches reach output | pass | **pass**: 0 mismatches. Bending is a table swap at the bar; the remap function is shared by the table and the oracle, so this checks the swap, not the remap |
| UIBeat generation and cursor continuous | pass | **pass**: one generation, 0 backward steps |
| Stage output balances | pass | **pass**: every attack event has a release event. No production Stage is mounted |
| Stage identity follows events | pass | Partly: events carry member and source note ids and the pitch is checked. Key and mode on the event are not, since there is no music-theory context in the spike |
| One scheduler owner, clean disposal | pass | Stop fades all members and clears the transport. Not separately asserted |
| Tempo changes use the committed frontier anchor | pass | **pass**: the anchor lands at the exact frame of bar B (0 frame and 0 bar residual) |
| Held gates survive joins and leaves | pass | **pass**: one onset, no gap of 10 ms or more |
| Captured expression stretches into output | pass | **Not tested.** The spike has no expression replay (BJS-485 and BJS-491) |
| Cold 512-note join keeps every surviving attack | pass | **pass**, using #140's fixture |
| Fresh 64/256/512-note builds | 1.6 / 7.9 / 8.1 ms sync | 512 notes: 0.3–0.6 ms with the simplified builder; not comparable, since #140 builds Strudel Patterns with lanes and controls |
| No browser errors or warnings | pass | **pass** |
| Measured code and package inputs unchanged during the run | pass | **Not carried.** The spike records the revision, but not input hashes |

Beyond #140's checks:

| Measurement | #140 (Strudel) | Worklet spike |
| --- | --- | --- |
| Immediate join/leave takes effect | 202–321 ms after request (next query frontier) | At the next render quantum. In all 50 immediate changes made while the transport ran, the applied frame equals the main thread's `currentTime` at the request (0 ms, within that clock's 2.9 ms quantum). The applied receipt came back 1.4 ms after posting on average (5.5 ms max). Joins staged before Start show up to 11.6 ms; nothing is playing then, so it doesn't matter |
| Bar-boundary changes | Exact, if installed before the frontier | Exact: 78 of 78 applied on the integer bar, none late |
| Mute: request to silence on that member's output | Not possible immediately; submitted notes finish | 9.8–10.0 ms (the 10 ms fade), 6 trials. That excludes output latency (32 ms reported) and touch latency |
| Main-thread stalls of 250, 500 and 1,000 ms during playback, with a join posted just before the 500 ms stall | Not measured. Cyclist skips a window when starved (#140 counted skips; the lab baseline lost beats at 300 ms) | 0 lost attacks across 12 stalls. Stage events arrived up to 872 ms late during a stall: the sound stayed right and the picture caught up |
| PCM onset error vs oracle | 0.11–0.23 ms max per cell | 0.045 ms (two frames of threshold crossing on a 1 ms attack). Worklet event times are exact frames |
| Event arrival on the main thread after render time | n/a (events dispatched ahead by about 100 ms of scheduler latency) | 3.6 ms mean, 20 ms max, outside stalls |

**One run was discarded, for a fixture error.** The first full run used a
denser cold-join fixture: notes 31 ms apart with 12 ms gates. At 150 BPM the
silence between those notes (5.4 ms) is shorter than the detector's 10 ms
window, so PCM "missed" 251 attacks that the worklet's own events show were
played. I replaced it with #140's exact fixture and reran. The discarded run
passed every other check.

**What the spike does not show:**
- How a phone behaves: render-thread headroom, touch latency, iOS
  interruptions, memory.
- Sampled or soundfont instruments, effects, expression replay, or dense
  members (eight or more).
- Audible quality, and long sessions.

The transport's timing is exact by construction. **The risk moves from lost
attacks to render-thread underruns** when a quantum costs more than its
2.9 ms. That is what the phone gate has to measure.

## 4. Acceptance tests per engine ticket

Each list is what "done" should be checked against, at the highest seam
available. "Receipt" means a headless audio-lab run with an arithmetic oracle
and PCM capture, as #140 and the spike do.

### BJS-485 Play patterns on the worklet clock

1. **From the reel.** Playing a reel pattern constructs no Strudel scheduler
   (assert no `StrudelMirror` or Cyclist exists).
2. **Timing.** PCM attacks on the worklet output match the note-data oracle:
   0 missing, 0 extra, events exact to the frame, PCM within 12 ms. Run for a
   melody, a chord pattern (brace lanes) and a pattern with rests. Notes that
   start on the same frame merge into one onset in mixed PCM, so for chords
   render each note as an isolated stem (or compare per-note spectra) before
   counting missing and extra attacks.
3. **Plan parity.** The member table comes from `recordedPatternPlan`. A test
   compares its onsets and gates with the exported code evaluated by real
   Strudel over eight cycles, as #140 did. Run it while Strudel is still
   installed, then freeze the result as a fixture for after BJS-495.
4. **Typed note events.** There is one type. Every attack has a release.
   `noteId`, `phraseId` and `sourceNoteId` are present. `noteId` is unique per
   occurrence; `sourceNoteId` is stable across loop passes. Stage and keys
   listeners light up and clear (a DOM test drives the event contract, not the
   engine).
5. **UIBeat from the transport.** It has one generation, never steps backward,
   and its phase matches the bar grid within one animation frame (S139),
   measured against captured output, not the render clock.
6. **Changes while playing.** Tempo, key, mode, octave and instrument changes
   apply at the next quantum or bar with no lost or doubled attacks. A change
   that needs a cold sampled or soundfont instrument, including the first
   Play of a persisted reel whose bank boot has not prepared, waits for the bank's
   acknowledgement before its activation boundary is chosen, and keeps the old
   table and instrument if the load fails. Test a cold swap, a cold join and Play on a cold non-default reel
   while playback continues (`LiveAudioCore.start()` drops a voice whose
   instrument is absent today).
7. **Stall survival.** A 1,000 ms main-thread stall loses no attacks (the
   spike's stall cell).
8. **Articulation.** Recorded per-note articulation and clip reach the voice.

### BJS-486 Filter, reverb and delay

1. **Filter.** The per-voice lowpass matches WebAudio's `BiquadFilterNode`
   lowpass (Q in dB) by golden PCM. Use cutoffs of 200, 1,000 and 5,000 Hz with
   resonance 0 and 10. At 12 kHz and above it is bypassed.
2. **Reverb.** It uses an app-owned convolver over superdough's IR recipe
   (2 s decay, so a 3 s impulse buffer; 0.1 s fade, 15 kHz → 1 kHz) with a
   seeded noise source. Golden PCM
   runs in `OfflineAudioContext`. The send level equals `room`.
3. **Delay.** It is 0.25 s with feedback 0.3. Its impulse response has taps at
   multiples of 250 ms. Tap n has amplitude send × 0.3^(n−1): the wet gain is 1,
   and only the feedback loop carries 0.3, so the first echo equals the send.
4. **One chain, live and playback.** Live and pattern voices with the same
   Shape render identically (golden comparison).
5. **No zipper noise.** Knob changes glide over about 15 ms.
6. **No allocation.** Rendering 60 s with 16 voices and all effects in Node
   performs no allocations in the render path, event delivery included. Run it
   with a dense attack/release transport (sixteen looping members), not only
   already-started voices. Count them with an allocation
   hook (deterministic instrumentation: counting wrappers on the pool and ring, or
   an assertion that the render path creates no objects; GC traces and
   sampling can miss allocations), because a flat post-GC heap only rules out
   leaks, not per-quantum garbage.
7. **Graph ownership.** The app owns the context, master gain and buses
   (finding 2). Analysers fan out from the new master. The context still
   resumes inside the Play-on tap, waits for `state === "running"`, and reports
   `AudioBlockedError` when the browser refuses (today's
   `useAppLoading.initializeAudioContext()` contract). The phone gate checks
   it.
8. **Listening note.** An A/B note for Burooj against frozen superdough renders
   is on the PR (finding 7).

### BJS-487 Square and saw

1. **Routing.** square, sawtooth, sqr, saw and the synths mapped to them play
   in the worklet live and in patterns. Add supersaw, pulse and the four z_*
   synths, or drop them (finding 4).
2. **Parity.** The parity suite runs against superdough's native oscillators
   from C2 to C7. Per-harmonic level differences and the aliasing floor are
   reported on the PR.
3. **Expression.** Bend and gain expression work on square and saw.
4. **Stall protection.** Repeat on square loses nothing through a 300 ms
   main-thread stall.

### BJS-488 Load samples and soundfonts into the worklet

1. **Catalog sweep.** A headless run prepares every selectable instrument:
   about 192, being 14 synths, the piano, 74 of the 128 registered VCSL sounds
   and 103 of the 125 registered GM names. The picker's categories filter out
   the rest. Each renders low, middle and high pitches (and every zone boundary for
   multi-zone banks) with non-silent PCM, and each pitch is within ±10 cents by
   `pitchy`. List
   failures on the PR. The serial sweep cannot expose residency: add a case
   with more distinct sampled or soundfont instruments sounding at once than
   `livePlayback.ts` keeps resident (4 banks, 192 MiB, held banks pinned). Define
   the supported behaviour (raise the cap, or refuse a fifth instrument loudly)
   before BJS-495 removes the fallback, because today the extra member would be
   silent.
2. **One PCM copy.** No superdough `AudioBuffer` is retained after transfer.
   The piano's desktop memory reading is posted and should be about half of
   today's 276 MiB.
3. **Chunked transfer.** While the piano loads, no main-thread long task
   exceeds 50 ms, and a key press during load reaches the worklet.
4. **Retry and soundfonts.** A failed load evicts and can retry. Soundfont zones
   keep tuning, key ranges and loop points; compare them with
   `getPreparedSoundfont` output for five fonts while it still exists. No
   `eval`.
5. **NOTICE.** Credits for the Salamander piano (CC BY 3.0) and FluidR3
   (MIT), plus whatever finding 3 decides.
6. **Boot contract.** The loading screen shows the same steps. A failed pack
   download still raises `SampleLoadError` and offers the synth-only start
   (§1, "The boot contract").

### BJS-491 Looper transport on the worklet

1. **#140's receipts.** Every #140 receipt check passes, including the two the
   spike skipped: expression stretch, and Stage identity with key and mode.
2. **The spike's extra checks pass:**
   - an immediate change is applied within one quantum of arrival;
   - mute is silent on the member's dry output within 150 ms, measured tap to
     change (wet tails ring out; see "Tails, mute and solo"). That is the ticket's bound, with desktop render-graph numbers
     now and phone numbers in the gate; the spike's 10 ms is evidence, not a
     new bound;
   - a 1,000 ms stall loses nothing;
   - a cold 512-note join keeps every surviving attack.
3. **Arp lock.** Live Repeat and Arp pulses fall on the transport's
   subdivision frames (frame-exact), quantised to the next subdivision.
4. **Bending.** It uses the musical-identity remap (the ticket "Keep the
   melody when the mode changes"). The receipt's pitch oracle is that module,
   not a copy.
5. **Recording.** Recorded take offsets come from transport bars and are
   checked against the oracle with calibration 0 and ±20 ms.

### BJS-492 HighlightStrip and notation export

1. **Spans.** The generator emits text plus one span per source note id. Every plan
   note has exactly one span, and the text is byte-identical to today's
   `logNotesToStrudel` output for all library patterns (snapshot).
2. **Engine-agnostic lighting.** The strip maps each event to its span by
   `sourceNoteId` and tracks active instances by the unique `noteId`, so
   overlapping loop occurrences neither miss nor clear each other. It lights
   spans from typed note events
   fed by a fake event source in a test, so it is engine-agnostic. Filtering by
   `phraseId` lights only the desk member.
3. **Follow-scroll.** It follows playback. Reduced Motion disables the
   animation but keeps the position.
4. **Open in Strudel.** The URL decodes back to the same text (round-trip
   test).
5. **Removal.** The visible editor is gone and Play still works: until
   BJS-485 lands, a hidden `StrudelMirror` stays as the transport, with its
   packages and patch. If BJS-492 lands after BJS-485, `@strudel/codemirror`,
   `@codemirror/*`, the CodeMirror patch and `nativeReveal.ts` are gone and
   `bun.lock` has no `@codemirror`; otherwise BJS-495 does that.
6. **Order.** Lands before BJS-485, or BJS-485 makes the editor read-only
   (finding 5). Either way there is no shipped state in which Play has no
   scheduler.

### BJS-493 Play is the loop

1. **Rules 1–4.** Each rule of the Looper brief is a store or component test
   on the worklet transport: play and stop, joining a stack, read-only while
   sounding, and saving a Loop as pointers.
2. **Latch and offsets.** Hold Play latches and joins after a silent bar. Reel
   patterns pin to bar one, and a take played over the loop joins at its
   recorded offset.
3. **Highlight.** The HighlightStrip lights the desk member while others
   sound.
4. **PRs.** #142 is closed as superseded, or rebased onto this work. #139 is
   merged.

### BJS-494 Phone gate

1. **Preview route.** The receipts suite and a memory readout run from a
   preview link with a touch Start. Results are shown and can be copied.
2. **What Burooj posts.** Attacks lost and doubled, mute and solo from tap to
   audible change, worklet render cost per quantum, memory with the piano,
   and frame pacing. The worklet records render cost per quantum as a
   histogram, and the p99 and maximum are compared with the budget derived from the measured sample rate (128 frames:
   2.9 ms at 44.1 kHz, 2.67 ms at 48 kHz).
   There is no portable underrun counter, so dropouts are also counted by
   ear.
3. **Test cases:**
   - eight dense members;
   - sampled and soundfont instruments;
   - release tails;
   - mode changes across scales with different degree counts;
   - rapid swaps;
   - a call or Siri interruption, then resume;
   - background and return.
4. **Go/no-go.** Burooj's decision is recorded on the issue.

### BJS-495 Remove Strudel and superdough

1. **Dependencies.** `package.json` and `bun.lock` have no `@strudel/*` or
   `superdough`. The three patches and `src/types/strudel.d.ts` are deleted.
   The audio-lab harnesses listed in §1 are retired or rewritten.
   `rg "@strudel|superdough" src audio-lab` then finds only notation text and
   docs.
2. **Same text.** "Open in Strudel" produces the same code text as the
   BJS-492 snapshot.
3. **Bundle and memory.** Bundle size is posted before and after, and the
   piano memory reading after.
4. **Retired paths.** The main-thread play-style engine and the fallback
   renderer are removed (finding 9).
5. **Licence.** The licence question (Decision 1) is reopened for Burooj; no
   change is made in this PR.

## 5. Open PRs: disposition

| PR | Disposition | What to carry forward |
| --- | --- | --- |
| #137 Spike: Strudel as the Looper's single transport (draft) | Close as research, unmerged. | Its research doc rides on #138. The receipts stay on the branch. |
| #138 Looper brief and transport verdict | Keep, but edit before merging. The brief's Engine section should say the worklet transport is decided (2026-10-09). The Strudel research doc gets a "Superseded by `worklet-engine.md`" banner. | Rules 1–4, the model, the surfaces. |
| #139 Looper domain | **Keep, merge.** It has no Strudel or superdough imports. | All of it. |
| #140 Looper transport on Strudel | Close as research, unmerged (Decision 3). Its semantics and receipt checks are BJS-491's acceptance tests. | Port into BJS-485 and BJS-491: `recordedPatternPlan.ts` (pure, shared with export), `tempoMap.ts` (pure), the `StrudelNotation` refactor that shares the plan, the transport's API shape, and the receipt harness's structure. Drop `patternBuilder.ts` (Strudel Patterns) and the `patternPlayback` port. |
| #141 Stage: the Looper part | **Keep.** `LooperStageSource` is engine-agnostic; the transport implements it. | All of it. |
| #142 Looper: Play is the loop | Close as superseded when BJS-493 opens, or rebase it there. Its store is wired to `getLooperPlaybackPort` and `createLooperTransport`. | The store's domain wiring, the Play key and latch, `LooperDialColumn`, the Loop Timing (calibration) setting, the PhraseShelf press guard and protected ids. Drop `CodeStrip/looperHighlight.ts` (CodeMirror). |
| #132 Prototype: patterns as loopers | Stays unmerged (spec). | Nothing new. |

## Sample-pack and soundfont licences

From the primary sources: repository LICENSE and README files, and the
packages' own source. This is not legal advice.

| Data the app loads | Host | Origin | Licence | Attribution | Self-host? |
| --- | --- | --- | --- | --- | --- |
| `piano` (29 pitches, one velocity layer, MP3) | `raw.githubusercontent.com/felixroos/dough-samples/main/piano/` | Salamander Grand Piano V3, Alexander Holm | CC BY 3.0 ([archive.org](https://archive.org/metadata/SalamanderGrandPianoV3), [dough-samples README](https://github.com/felixroos/dough-samples/blob/main/README.md)) | Required: author, title, licence link, and that it was changed. Suggested: "Salamander Grand Piano V3 by Alexander Holm, CC BY 3.0. Converted to MP3, single velocity layer." | Yes, with credit |
| VCSL (128 sounds) | `raw.githubusercontent.com/sgossner/VCSL/master/` | Versilian Community Sample Library | CC0 1.0 ([LICENSE](https://github.com/sgossner/VCSL/blob/master/LICENSE)) | None required; credit is courteous | Yes |
| The JSON maps (`piano.json`, `vcsl.json`) | `felixroos/dough-samples` | Felix Roos | **None stated** (the repository has no licence) | n/a | Regenerate our own maps rather than copying |
| GM font data (`.js`) | `felixroos.github.io/webaudiofontdata/sound/` | Sergey Surikov's conversion of SF2 banks | The repository is MIT, but its owner says the source fonts' licences are unknown ([issue #1](https://github.com/surikov/webaudiofontdata/issues/1)) | The MIT notice for the conversion | Only for fonts with a known licence |
| FluidR3_GM (20 default instruments) | same | Frank Wen; mono version by Michael Cowgill | MIT ([MuseScore copy](https://github.com/musescore/MuseScore/blob/v3.6.2/share/sound/FluidR3Mono_License.md)) | "Copyright (c) 2000-2002, 2008 Frank Wen", plus "Mono version: Copyright (c) 2014-16 Michael Cowgill"; the notice must ship with derivatives | Yes |
| GeneralUserGS (never the default; second choice in many lists) | same | S. Christian Collins | GeneralUser GS License v2.0 ([text](https://github.com/surikov/webaudiofontdata/blob/master/sf2/GeneralUserGS_LICENSE.txt)) | Not required | Yes, though its author says he can't be sure of every sample's origin |
| JCLive (64 defaults), Aspirin (38), Chaos (2), Acoustic_Guitar (1) | same | Unknown | **None stated anywhere** | Unknown | **Treat as unlicensed** |
| webaudiofont player code | — | Sergey Surikov | GPL-3.0 since 2020 ([LICENSE](https://github.com/surikov/webaudiofont/blob/master/LICENSE.md)); Strudel's font loader is based on it | — | Compatible with AGPL |
| `@strudel/*`, `superdough` | npm | uzu / Felix Roos | AGPL-3.0-or-later | AGPL notices while they ship | — |

The counts come from the installed, patched `@strudel/soundfonts` `gm.mjs`,
reading the first (default) font of each of the 125 names. Nothing loaded today
is copyleft data. CC BY, CC0 and MIT data loaded at runtime don't conflict with
the AGPL code. The open question is only the unlicensed GM fonts (finding 3).

## Risks

- **Sound differences.**
  - square and saw change slightly (polyBLEP against native band-limited
    oscillators; the reason for #90).
  - The filter differs if the dB-Q definition is missed.
  - Reverb differs unless the IR recipe is reproduced; superdough's IR uses
    unseeded noise, so it already differs on every load.
  - Gain staging: superdough's synth path applies 0.3 × 0.8, and the worklet
    copies those constants. The parity suite and an A/B note per PR are the
    controls. Golden fixtures must be frozen before BJS-495.
- **Render-thread budget on weak phones.** The transport adds per-quantum work
  to the thread that renders every voice. A quantum that overruns is an
  audible dropout, not a late note. The cost is a few binary searches per
  member, which is small next to resampling voices, but nobody has measured it
  on a phone. The phone gate measures render cost per quantum and listens for
  dropouts with eight members, including more distinct sampled instruments
  than the residency cap. The mitigations are
  that the worklet already caps voices at 64 with steal fades, and the effect
  buses stay native.
- **GC on the audio thread.** Table swaps allocate in the worklet by design.
  A structured clone arrives on the audio thread, and a key or mode bend
  rebuilds every member at once. Bound it:
  - keep tables small and flat;
  - send expression curves as `Float32Array`s, not arrays of objects;
  - if the phone gate shows GC pauses, stage the rebuilt tables incrementally
    but activate one version for every member atomically at the shared
    boundary. Never stagger the swaps themselves: members would play old and
    new harmony together.
- **iOS sample-rate changes.** After an interruption or an audio route change
  (headphones, Bluetooth), iOS can run the context at a new sample rate. The
  worklet's `sampleRate` is fixed when the processor is constructed, and so
  are the transport's frame-based anchors. Tie this to BJS-507: recreate the
  processor, carry the transport state over in bars, and test it in the gate.
  The new processor starts with no instruments, and the one-copy contract
  already transferred each PCM buffer away. So reload or recover every
  required bank, await its acknowledgement, and only then restore playback.
  The gate exercises this with an actively playing sampled or soundfont
  member.
- **Idle suspend.** BJS-507's 30 s idle suspend must treat a running
  transport as not idle, even while every member is muted or resting.
- **Tempo change mid-gate (minor).** A note's gate length is computed in
  frames at its onset. A tempo change during the note doesn't rescale it, so
  that one note ends at its old-tempo length.
- **iOS interruptions.** The worklet path only resumes a "suspended" context
  today (spec W5). An "interrupted" context after a call stops the transport's
  clock as well. Resume handling is W5 work, but the transport must survive it.
  On resume, its frame anchor continues, and bars resume from where the clock
  stopped. Test this in the phone gate.
- **Messages under main-thread stalls.** Commands are not lost, but the UI's
  view lags. A tap during a stall is delivered when the main thread frees up.
  The worklet can't help with input that the main thread hasn't received.
- **Memory spike during load.** With one PCM copy, the transient peak during
  decode and copy is still two copies of one zone. Serialising zones keeps
  that small.
- **strudel.cc's URL format** is outside our control. "Open in Strudel" is a
  hand-off, so if it breaks, playback is not affected.
- **Momentum.** The Looper waits on BJS-485 and BJS-491. #139 and #141 can
  merge now to reduce rebasing.

## Sources

- **Spec:** `docs/retrospective-spec.md` on `origin/docs/retrospective-spec`
  (#143): Decision 3, W9, W5, W10.
- **#140 `looper/transport`:** `docs/research/looper-strudel-transport.md`,
  `src/audio/looper/README.md`, `audio-lab/looper-transport/*` and
  `audio-lab/results/looper-transport.json` (recorded 2026-10-06, 18/18
  checks).
- **#137** `spike/strudel-single-transport`. **#138** `docs/looper.md`.
  **#139**, **#141**, **#142** as named.
- **Code at `origin/main` `a771a515`:** `src/services/{patternPlayback,superdoughAudio,audioRuntime,preparedNativeInstrument,preparedLiveInstrument,audioDiagnostics,StrudelNotation}.ts`,
  `src/audio/{live/core.ts,liveShaping.ts}`, `src/components/uniques/CodeStrip/`,
  `patches/` and `vite.config.ts`.
- **superdough 1.3.0** (as installed): `reverb.mjs`, `reverbGen.mjs`,
  `feedbackdelay.mjs`, `superdoughoutput.mjs`, `helpers.mjs` (`createFilter`)
  and `synth.mjs`.
- **`@strudel/soundfonts` 1.3.0:** `fontloader.mjs` and `gm.mjs`.
- **Prior lab evidence:** `audio-lab/README.md` (stall comparison) and
  `docs/research/audio-stack-decision.md` (piano memory 138 + 138 MiB).
- **Spike:** branch `spike/bjs-484-worklet-transport` (#150);
  `audio-lab/results/worklet-transport.json` there.
