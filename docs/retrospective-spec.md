# Spec: an instrument that teaches through its cues

Status: proposed, 2026-10-07.

**How to use this document.** This file is the record: the problem, the decisions and their costs, what is out of scope, and where every retrospective finding went. Only Phase 0 below is written to be executed as is. When a later phase starts, write a short executable spec for it against the code as it is then, using this file's stories and decisions as input. Workstreams W3, W7, W8 (beyond Phase 0), W9 consolidation and the Phase 5 cues are directions: named and costed, not yet specified.

### Phase 0: execute this week

All of it is reversible. Each item is a small PR.

1. **CI and lint.** A GitHub workflow runs type-check, tests and lint on every PR. Fix the ESLint config (the invalid rule name and the legacy flags). Done when a PR shows all three checks green on GitHub.
2. **The phone gate, first.** Before any further Looper slice merges, run #140's transport receipts on Burooj's iPhone (and an Android phone if available), with a sampled instrument. Count scheduler skips and read the tab's memory with the default piano. Done when the numbers are in the Looper PR. If the gate fails, the fallback in Decision 3 becomes the plan before more slices land.
3. **Licence and content.**
   - Add the LICENSE (AGPL-3.0-or-later) and NOTICE.
   - Move the five transcriptions out of the default library.
   - Merge #64.
   - Close #33, #34, #35 and #40, linking to this spec.
   - Check the Let's Jazz font licence and report the result; don't act on it yet.
4. **One-line fixes:**
   - The Visuals switch reads the store reactively.
   - The number row passes the Joystick's current alteration, read where it lives today. Moving it into a store waits for W3.
   - Scope Size drops the clamp that caps it at its default, and the test that asserts the cap is rewritten.
5. **Stop the ledger bleeding.**
   - Freeze the design log at a dated line.
   - Add the rule that adoptions fix the defects their lab found.
   - Stop recording 32px targets as an invariant.
6. **The stance into the bible and router** (S138): the moats, the cues, and the origin story.
7. **The design law as lint, starting now.** Two rules arrive with committed allowlists of today's violations, so they pass on day one and fail only on new violations. The allowlists shrink as Phases 2 and 4 fix the drift.
   - No brand-paper tokens or raw colour values in playing-zone components.
   - No store imports in primitives and compounds.

   ESLint covers script; Stylelint (with Vue support) covers style blocks. What lint can hold: colours, imports, raw values, banned properties such as perpetual `infinite` animation outside named exceptions, and required props. What stays in the bible: taste, composition, and whether something feels like hardware.

#136 (retiring Flecks) merges before any of this. Removing the colour accent follows as its own small PR. Sources: retrospective #1 (2026-09-23, PRs #27–#93), retrospective #2 (2026-10-06, PRs #86–#135 and the open PRs), and Burooj's answers of 2026-10-07. Each retrospective had independent Opus and Fable reviews per track; Sol, Luna and Opus verified the load-bearing claims against the code. The appendix maps every finding, direction and idea from both retrospectives to a user story here or to an explicit out-of-scope reason.

## Problem Statement

EmotiTone is an instrument that teaches. Burooj, 2026-10-07: "It's an instrument that teaches through its moats and cues", and on 2026-10-09: "I meant moats itself." The instrument teaches through what only it does (its moats) and through the signals it gives (its cues). It does not teach through lessons or quizzes.

His account of how it got here (2026-10-09):

- **Where it started.** It began as a feeling- and intuition-building app, using solfège and LLM-written text describing each interval.
- **The sketching need.** It also met his own need to sketch ideas. A separate repo of his for quickly sketching melodies merged into it, because every other tool was a full, bloated DAW.
- **Strudel.** Strudel arrived to simplify patterns, playback and samples, and brought its own headaches.
- **The Looper** is the natural extension.
- **Throughout:** keep the UX simple while allowing more, and stay very mobile-focused.

The moats are four things (Claude's reading, confirmed by Burooj on 2026-10-09):

1. **Feeling first.** Every interval has an emotional voice: the written interval descriptions and Music Color.
2. **Sketch speed.** Everything played is kept, there is no record button and no DAW, and humming is a sketch too.
3. **Loops as play.** Play is the loop.
4. **A pocket instrument.** One-handed on a phone, with Strudel's sound library behind it and its code one tap away.

Read this way, the most striking finding is that the founding moat is the least visible. The interval descriptions are never rendered, and the emotion label is off by default.

That makes every cue a promise, and several are false today:

- **Wrong names.** In F major the fourth degree is called A#, not Bb. The Stage labels the minor third C→Eb as an augmented second. The chord row and the Stage name the same chord two ways ("C" and "CM/E").
- **Missing or conflicting syllables.** Borrowed notes get letter names, not syllables. Three syllable tables disagree: the raised fourth is Fi on the keys and Se in phrase contours.
- **Inputs that drop or corrupt notes.** Humming drops off-key notes in both lanes: the live lane ignores them, and import throws away the whole take because of one. MIDI notes outside the scale make no sound. Switching a loaded melody to pentatonic changes its notes, and the Looper is about to reuse that remap for bending.
- **Controls that don't do what they show.** The number row ignores the Joystick. The Visuals switch does nothing. The Scope Size knob does nothing above its default.

The instrument also does not work for everyone who could play it:

- Keyboard users can't change tabs or turn a range knob, even though a lab wrote the Tabs fix (#102) and the adoption PR dropped it (#111).
- Several redesigned labels, focus rings and LED marks fall below contrast minimums.
- Nearly all sized Buttons are 32px touch targets. Keys keep a 44px floor, but chord keys compress below it on narrow screens.
- On a phone, the Stage renders blurry because the canvas ignores device pixel ratio, and motion runs twice as fast at 120 Hz.
- The worklet path only resumes a "suspended" audio context. Read from the code (not seen on a device), that means an iPhone can stay silent after a call, which leaves the context "interrupted".
- The default piano holds about 276 MiB of sample data. Nothing has been measured on a real device.

Saving is fragile:

- Changed defaults don't reach returning players. Any change saves the whole config (after a 500 ms debounce), so every field a player has ever saved keeps its old value over a new default. Only fields missing from the save get the new default. Load-time migration and clamping exist, but there is no schema version.
- The phrase book and the other saved stores have no versions either.
- A full localStorage fails silently, which breaks #103's own promise that nothing played is lost.

Behind these sit how the work is checked and recorded:

- There is no CI and ESLint cannot run, so "green" is self-reported and depends on host load.
- The design records grew to 96 KB (tracker) and 314 KB (log) and became a merge bottleneck.
- The rules of the design pass told adoptions to *preserve* accessibility behaviour, so they preserved known defects.
- The root agent docs still describe a Tone.js sequencer that no longer exists.
- The repo is public with no licence, while it ships AGPL code (Strudel, superdough), five transcriptions of copyrighted songs, and a commercial font whose licence nobody has checked.

The craft underneath is strong: the harmony domain, the worklet engine, voice-group ownership, the Music Color core, the phrase book, finger expression, and the Looper transport receipts. This spec is about making the cues true, the instrument reachable, the data safe and the checks real, while the Looper ("Play is the loop") goes ahead.

## Solution

From the player's side:

**Cues.**
- Every name, syllable, interval, chord symbol and colour the instrument shows is correct in every key and mode.
- Borrowed notes speak chromatic solfège.
- Humming and MIDI accept the notes people actually play.
- Changing mode or bending a loop keeps the melody's shape.

**Reach.**
- The instrument works from a keyboard and a screen reader.
- It reads at contrast, takes thumbs at 44px, and runs sharp and calm on a phone.
- It keeps sounding after an interruption, fits in phone memory, and idles when silent.

**Saving.**
- New defaults reach returning players without overwriting choices they made.
- Every saved format is versioned, a full shelf says so, and nothing is lost silently.

**Teaching through its cues.**
- The emotion text the app already has becomes visible.
- Tension and resolution show on the Stage.
- Chords show their function.
- A drone on Do and a count-in come from the loop clock.
- Live arpeggios stay on the loop's grid.

**Checking and recording.** For Burooj and the agents working on the repo:
- Checks run in CI: types, tests, lint, colour law, layering, axe and screenshots on the style-guide routes, and scheduled audio invariants.
- The design records shrink to a bible, a one-line-per-unit table and the PR bodies.
- The docs describe the app that exists.
- The repo carries a licence that matches its obligations.

### Decisions recorded on 2026-10-07

1. **Licence: AGPL-3.0-or-later** for the repository. Claude selected this, as Burooj asked.
   - **Why:** Strudel and superdough are AGPL-3.0-or-later. The app sends a patched superdough to every player over the network, so §13 (the AGPL network clause) obliges offering that source to people who use the app online.
   - **Compatibility:** the Hilbert scope's GPLv3 lineage (#64) combines with AGPLv3.
   - **Alternatives weighed:**
     - GPL-3.0 has no network clause, so it would not cover how the app is actually used.
     - A permissive licence for Burooj's own files, with the served bundle under AGPL, is a legitimate and common arrangement. It would keep his code free to reuse if superdough is ever replaced.
     - AGPL on everything was chosen for simplicity: one licence that matches the deployed artefact.
   - **Reversibility:** Burooj is the sole copyright holder, so he can relicense future versions. Only already-published snapshots stay AGPL, plus anything contributed by others under it.
   - **Costs:**
     - Closed or proprietary forks of published versions are ruled out.
     - Every deployed version, including the patched superdough, must be offered as source.
     - Outside contributions would arrive under AGPL.
     - App-store packaging may be harder.
   - **Comes with it:** third-party notices and an in-app Source/Credits link.
   - This is a reasoned engineering choice, not legal advice. The font and the song transcriptions are separate questions no code licence covers (see W10).
2. **Product stance: an instrument that teaches through its moats and cues** (Burooj, confirmed 2026-10-09). Teaching happens through what only this instrument does and through its signals. The four moats are listed in the Problem Statement.
   - **Priorities that follow from the moats:**
     - The feeling-first moat moves the interval descriptions and the emotion label (S95) up to Phase 1.
     - The sketch-speed moat makes safe saving (W6) and humming that never throws away a take (S42, S141) protect the core, not polish it.
   - Structured practice (quizzes, scoring, sing-back, call-and-response) is deferred, not ruled out.
   - The stance, the moats and the origin story are written into the design bible and the repository router (S138).
   - **Cost:** learners who want structured practice get none for now.
3. **Superseded on 2026-10-09: move off Strudel and superdough to the worklet engine** (Burooj: "let's do it and move away from strudel/superdough").
   - **What changes:**
     - The worklet engine becomes the only engine: one scheduler on the audio clock, its own filter, reverb and delay, square and saw, and its own loader for the same sample and soundfont data.
     - #140's transport semantics and test results become the acceptance tests for the worklet transport.
     - #137 and #140 are kept as research, not merged.
     - The HighlightStrip and "Open in Strudel" stay, because the app writes the code text itself.
   - **What it buys:**
     - One engine and one clock.
     - No superdough patch.
     - No main-thread scheduler to stall on phones.
     - Roughly half the piano's memory.
     - A smaller bundle.
     - For future versions, no AGPL obligation from Strudel.
   - **What it costs:**
     - Rewriting #140's transport.
     - Building the three effects.
     - A risk of sound differences.
     - Time against the Looper's momentum.
   - **The licence (Decision 1) stays AGPL** while Strudel code ships, and is revisited once it is gone. The Hilbert scope's GPL lineage still applies.
   - The original Decision 3 follows, for the record.

   **Original:** Strudel stays the single musical clock.
   - **The question.** Two reviewers did propose alternatives:
     - Retrospective #1 (Fable): make the worklet the app's transport, with Strudel following it.
     - Retrospective #2 (Opus): build a data-first transport scheduled on the worklet's audio clock, with Strudel only for export and display.
     - The 2026-10-06 summary put this to Burooj as a decision. He replied with a question, "is strudel not a good idea?". This spec proposes the answer: yes, it is.
   - **Who decided:** Strudel as the shared clock was already Burooj's call in the Looper session of 2026-10-05, recorded in the project memory. The Looper brief (#138) still says "Proposed", and #138 should be updated to say decided.
   - **Why the alternatives no longer win:**
     - Their main argument was cost. The transpiler took about 1.2 s per 64-note phrase, and a main-thread scheduler would remain.
     - #140 removed the first problem by building Patterns from note data: 1.6 ms for 64 notes, with zero lost attacks across 1,768 measured.
     - Strudel also keeps code export, recorded expression, and Stage and key reactions on one path.
   - **What remains true from the alternatives:**
     - Strudel's Cyclist (its scheduler loop) still runs on the main thread and drops a window when starved; #140 saw this under host load.
     - That is why the phone gate is a condition, and why the worklet-scheduled transport is the named fallback.
   - **Conditions:**
     - Never run the transpiler while playing.
     - The phone gate passes before "Play is the loop" ships.
     - Live play styles and UIBeat share the transport's tempo grid.
     - superdough becomes owned source.
     - The AGPL licence above.
   - **Costs:**
     - AGPL obligations.
     - A main-thread scheduler on weak phones.
     - Maintaining a patched superdough.
   - **Reopened (2026-10-09).** Burooj asked whether to drop Strudel, and perhaps superdough, in favour of the worklet engine. Both retrospectives raised that direction. The Looper (#140) went the other way, deepening both dependencies.
     - **The worklet would need:** a scheduler (porting #140's join/leave/offset/tempo/mute/solo semantics, with its receipts as acceptance tests), a filter, reverb and delay (the only effects the Shape knobs emit), the existing square/saw oscillators, and its own loader for the same sample and soundfont data.
     - **"Open in Strudel" survives either way,** because the notation generator writes the code text itself.
     - **To decide:** first the Phase 0 phone gate on #140, then a short worklet-transport spike measured against the same receipts, and decide before #142 merges.

4. **The Code Strip leaves the Strudel code editor and becomes the HighlightStrip** (Burooj, 2026-10-09: "No one's really gonna edit the code editor. It doesn't even look editable.").
   - **What stays:**
     - Strudel as the engine and transport.
     - Its sound library, the larger instrument library that was a reason it was added.
     - The highlight animation.
     - An "Open in Strudel" action that hands the current code to strudel.cc.
   - **What goes:**
     - The CodeMirror editor and the Strudel CodeMirror extensions.
     - The pinned CodeMirror patch.
     - The native-reveal and deferred-scroll workarounds.
     - The selection reads that showed up in the stall profile.
   - **The replacement** is the HighlightStrip, the app's own read-only text view. The notation generator records which text span each note produced, and the highlight lights spans by note id. This works for Looper members too, which are built without the transpiler and so carry no source locations.
   - The text keeps the original reason for the strip: playing types the notation as you go.
   - **Costs:**
     - Editing is gone. Burooj judges no one uses it.
     - Highlight and follow-scroll are reimplemented.
     - "Open in Strudel" depends on strudel.cc's URL format.
     - Library patterns are all note data today, so nothing authored-only is lost. A future code-only pattern would need the transpiler outside playback.
5. **Editions: consistent families, with Shuffle as the default** (Burooj, 2026-10-09: "shuffle look is default. App starts with that. Makes sense to have consistency between various parts. Some things like keys make sense the way they are.").
   - **The new model:**
     - Editions are grouped into families that span parts. Each family sets one edition for Tabs, Knob, Joystick and the other rotating parts together.
     - Shuffle is the default Look: each load picks one family for the whole instrument, not an independent roll per part.
     - Players can pin any family.
     - Keys keep their own key-shape variation as it is.
   - **What this does to the QA load:** it shrinks from about 140 independent combinations to the number of families.
   - **Costs:**
     - Since any family can appear by default, every edition must meet the accessibility floor: a 44px target, a visible focus ring, and contrast. Today only Tabs Marquee does, so the other Tabs editions need that work before Shuffle can include them.
     - A family that fails the floor stays out of Shuffle until fixed.
   - **Why:**
     - Today each part rolls its own edition independently, so the adopted Tabs Marquee shows on one load in seven.
     - Marquee is the only Tabs edition with a 44px target and a visible focus ring.
     - The independent rolls make about 140 combinations nobody can QA.
     - The rotation code exists in three copies.
   - Cut-paper randomness that doesn't change function (Sticker silhouettes, small tilts) stays.
   - The earlier proposal (one canonical edition per unit, Shuffle never the default) is superseded.

## Test seams

Use the fewest seams, as high as possible. Five carry this spec. Four already exist in some form; one is a new browser harness.

1. **Musical identity (extends the existing pure harmony domain).** One pure module answers: given tonic, mode and a pitch or degree, what is its spelling, syllable, interval from the tonic, borrowed status, and the chord symbol of a set of pitches? Keys, chord row, Stage labels, phrase contours, humming import, MIDI and Looper bending all consume it. Tested as pure functions, like the harmony and phrase-book tests.
2. **Performance (extends the existing voice-group lifecycle).** One performer takes note and chord intents (press, release, release-all-for-owner) from every input adapter. Tested by driving adapters with synthetic events and asserting intents and voice lifetimes.
3. **Persistence codecs.** Each saved store has a versioned encode/decode/migrate codec. Tested with captured real payloads. Prior art: the instrument persistence and phrase migration tests.
4. **Style-guide routes in a real browser (the one new harness).** Playwright over the guide routes at 390×844, with editions pinned by query. It runs axe, keyboard walks and screenshot comparison. The guide already mounts the real production sources, so this checks production components. The Stage canvas stays out of pixel diffs.
5. **Stage scene (later).** A pure scene built per frame from notes, audio frame, settings and time, which renderers only draw. Tested by scene snapshots. The existing pixel tests stay for the field renderer.

CI is the enforcement layer over all five. The audio checks (golden PCM, the parity suite, the Looper receipts) run on the existing audio-lab harness; they are not a sixth seam. Seam 4 starts with axe and keyboard walks in CI, with screenshots uploaded as artifacts. Committed screenshot baselines come later, and only if visual drift recurs, because baselines cost a solo maintainer upkeep every week.

**Glossary.** *UIBeat* is the shared beat clock that drives UI pulses. *Members* are the patterns currently playing in the Looper. *Cyclist* is Strudel's scheduler loop. The *collar* and *chads* are the LED ring and segments around a Knob and the Beat Indicator. A *Sticker* is a cut-paper label primitive. A *Look* is a saved set of visual settings a player can pick.

## User Stories

### Verification and enforcement

1. As Burooj, I want every PR to run type-check, tests and lint automatically, so that "green" means the same thing on every machine and no agent self-reports it.
2. As a coding agent, I want ESLint to run on the repo, so that lint stops being reported as "broken on main" in PR after PR.
3. As Burooj, I want CI and Vercel to skip the host verification lock while bjslab keeps it, so that cloud runs aren't queued behind local agents and the shared host stays protected.
4. As a coding agent, I want the suite to have a wall-time budget per project, so that slow tests show up as budget failures rather than as load-dependent timeouts.
5. As Burooj, I want timing-sensitive component tests to stop failing when the host is busy, so that a red run means a regression.
6. As Burooj, I want the browser audio invariants run on a schedule and fail loudly, so that an audio regression is a failed check, not a missing receipt. The invariants are: repeat survives a 650 ms stall, settlement under 1 s, exact release silence, one AudioContext, one transport, zero browser warnings, and the Looper transport's zero-loss join/leave.
7. As a maintainer, I want new raw benchmark captures kept out of commits while their summaries stay, so that diffs show code rather than hundreds of thousands of lines of JSON.
8. As Burooj, I want axe run over every style-guide route at phone size, so that accessibility regressions fail CI.
9. As Burooj, I want reviewed screenshots of each guide route at 390px with editions pinned, so that visual acceptance is a snapshot in git, not a prose receipt or a folder outside the repo.
10. As a coding agent, I want lint to stop primitives and compounds importing stores, so that layering is enforced instead of audited.
11. As Burooj, I want a check that fails when brand colours, raw hex/rgb/hsl or new easing curves appear in playing-zone components, so that the colour and motion law holds without vigilance.
12. As a maintainer, I want a check that lists components, modules and tokens with no consumer, so that dead code stops accumulating.
13. As Burooj, I want a second-model review on every PR that touches audio, music theory or persistence, so that a second mind finds defects before main, as it did in #134.
14. As a coding agent, I want tests that observe behaviour rather than match source text, so that refactors don't break tests and real bugs do.
15. As Burooj, I want golden-PCM tests that render the worklet core offline, so that DSP regressions are caught without a browser.

### Licence, content, records and docs

16. As a coding agent, I want the root agent docs to describe the current app (Strudel, superdough and the worklet, the phrase book, the Looper, the Stage, the design system and the verify launcher), so that I don't build on Tone.js and files that no longer exist.
17. As a coding agent, I want the repository router to orient product, audio and music-theory work as well as design work, so that non-design sessions start oriented.
18. As Burooj, I want stale docs removed or corrected (the Warp doc, the one-line README, the "exploration" status on the pattern-system doc), so that the records agree with main.
19. As a visitor to the public repo, I want a licence file that matches the code's obligations, so that I know my rights and Strudel's licence is honoured.
20. As a player, I want a Source and Credits link inside the app, so that the AGPL network clause is met and the people the instrument stands on are credited.
21. As Burooj, I want the Let's Jazz font's licence checked for web embedding and public redistribution, so that the identity doesn't rest on a licence breach.
22. As Burooj, I want the default library free of transcriptions of copyrighted works, so that the public app doesn't ship someone else's melodies.
23. As Burooj, I want stale PRs closed with their still-valid intent filed as issues, so that the open list reflects real work and the board matches the repo.
24. As Burooj, I want the Hilbert scope's GPL attribution merged, so that the credit owed is on main.
25. As a hummer, I want to be told before my voice recording is sent to the analysis service, so that nothing about my voice leaves the device without my knowing.

### Musical identity: the cues are true

26. As a learner in F major, I want the fourth degree called Bb, so that the names I learn are the names musicians use.
27. As a learner, I want the Stage to label a minor third as a minor third in every key, so that interval labels teach the right thing.
28. As a learner, I want chord symbols in conventional form (C/E, Cm, B°, Bø7), so that the chord row and the Stage read like a lead sheet.
29. As a learner, I want one chord namer for the keys and the Stage, so that one chord is never named two ways on one screen.
30. As a learner using the Joystick, I want borrowed notes named with chromatic syllables (Di, Ri, Fi, Si, Li ascending; Ra, Me, Se, Le, Te descending), so that the moment I meet a borrowed tone teaches its function.
31. As a learner, I want one syllable table used everywhere (keys, chord members, phrase contours, Stage), so that Lydian's raised fourth isn't Fi in one place and Se in another.
32. As a learner, I want chord-row members shown in solfège, so that the chord row teaches Do-Mi-Sol rather than letter names.
33. As a learner taught la-based minor, I want to choose la-based or do-based minor, so that syllables match how I learned (default do-based, and documented as such).
34. As a learner, I want a loaded melody switched to another mode to keep its contour by pitch, so that Twinkle doesn't change notes when the scale gets smaller.
35. As a Looper player, I want bending a playing pattern to a new mode to follow the same rule as the mode switch, so that loops and patterns agree.
36. As a learner, I want library tunes stored with their canonical syllables (Hot Cross Buns is Mi-Re-Do), so that examples teach correctly.
37. As a QWERTY player, I want the number row to play the chords the Joystick is showing, so that physical and on-screen chords match.
38. As a QWERTY player, I want a modifier on the number row to play inversions, so that I can voice chords from the keyboard.
39. As a learner, I want the Joystick to offer the key's own diatonic sevenths (G7 and Bø7 in C major), so that I hear the key's harmony before borrowed colour.
40. (Proposed, Burooj's taste.) As a learner, I want chords labelled with Roman numerals beside their names, so that function (I, IV, V) is visible.
41. As a MIDI pianist, I want notes outside the scale to sound and carry chromatic syllables, so that playing F# in C major isn't silent.
42. As a hummer, I want an off-key note marked as borrowed, or snapped within a cents tolerance, instead of failing the take, so that humming works with a real voice.
43. As a hummer, I want the live pitch to hold steady near a semitone boundary and ignore octave jumps, so that the Stage doesn't flicker.
44. As a hummer on a 120 Hz phone, I want pitch stability judged in time, not animation frames, so that behaviour doesn't depend on display rate.
45. As a player, I want the option to snap a take (hummed or played) to the loop grid with a chosen strength, so that it lines up with the loop.
46. As a hummer, I want recordings bounded with a visible limit, so that memory and upload size stay safe.
47. As a hummer, I want note loudness taken from my voice rather than the detector's confidence, so that dynamics mean something.
48. As a player, I want the Visuals switch to turn the Stage off, so that I can practise on a quiet screen and save battery.

### Performance input

49. As a player, I want every input (touch, glissando, QWERTY, number row, MIDI and Joystick) to go through one press/release path, so that behaviour can't drift between them.
50. As a QWERTY player, I want key shortcuts to work whenever the instrument is on screen, not only while the production Keyboard is mounted.
51. As a macOS player, I want notes released when a key-up never arrives (Cmd held), so that notes don't stick.
52. As a screen-reader user, I want each key to announce its keyboard shortcut, so that I can learn the layout.
53. As a QWERTY player in a seven-note mode, I want unused keys to continue into the next octave, so that the row has no dead keys.
54. As a fast glissando player, I want hit-testing done from the key grid, not by measuring every key on every pointer sample, so that long swipes stay smooth on phones.
55. As Burooj, I want the Keyboard split into a pure view, a production container, glissando geometry, roving focus and chord hold, so that each part can be changed and tested alone.

### Accessibility and touch

56. As a keyboard-only user, I want arrow, Home and End keys to move between tabs, so that I can reach the Instrument and Config panels.
57. As a keyboard or screen-reader user, I want BPM, Octave and every range knob to be focusable sliders with announced values and arrow-key control.
58. As a screen-reader user dragging a control, I want its value announced on the control itself, not only shown in the hidden Readout.
59. As a low-vision player, I want note labels coloured by their fill's lightness, so that labels read on bright and dark notes alike.
60. As a low-vision player, I want inactive tab labels, unlit collar and crown marks, and focus rings on Ivory and Brass caps to meet contrast minimums, so that the redesigned parts stay legible.
61. As a phone player, I want every control to take a 44px touch even when it looks 32px, so that I don't miss taps.
62. As a phone player, I want Play/Stop to keep its touch size during playback.
63. As an iOS user, I want text inputs at 16px or larger and banner text legible, so that focusing search doesn't zoom the page.
64. As a reduced-motion user, I want one reduced-motion behaviour across all controls, including the knob's hold animation, so that nothing still moves.
65. As a reduced-motion user, I want the beat shown as a still step or a haptic pulse, so that I can still follow it.
66. As a Forced Colors user, I want the guide-only motion and contrast simulation props removed from production components, so that there is one accessibility truth.
67. (Proposed, Burooj's taste.) As a player, I want a touch-size setting (compact or comfortable), so that I can choose density.
68. As a learner, I want the Stage to announce single notes to assistive technology, not only chords.

### Mobile runtime

69. As a phone player, I want the Stage drawn at device pixel ratio (capped), so that lettering and scope lines are sharp.
70. As a 120 Hz phone player, I want Stage motion to run at the same speed as at 60 Hz, with one clock for frame and lifecycle time.
71. As a phone player, I want the Stage loop to idle when silent, hidden or switched off, so that the battery lasts.
72. As a phone player, I want visual quality to drop automatically when frames run slow, so that audio and touch stay responsive.
73. As an iPhone player, I want audio to come back after a call or Siri (the "interrupted" state), so that the instrument doesn't go silent.
74. As an iPhone player with the ringer switch off, I want the instrument still to sound.
75. As a phone player, I want the audio context suspended when idle, so that the audio thread doesn't drain the battery.
76. As a phone player, I want the default piano to fit phone memory, measured on a real iPhone, so that the tab isn't killed.
77. As a phone player, I want less code loaded up front, so that first play comes sooner.
78. As a player, I want app updates offered in-app rather than through a blocking browser confirm.
79. (Proposed, Burooj's taste.) As a phone player, I want a firmer haptic on the tonic and the downbeat, so that the instrument's feel carries structure.

### Persistence

80. As a returning player, I want new defaults to reach me for settings I never changed.
81. As a returning player, I want settings I did change kept across updates.
82. As a player, I want to be told when the instrument can't save, so that no take is lost silently.
83. As a player who records long bends, I want the phrase book to have a byte budget, including Kept phrases and expression curves, with a visible "shelf full" state.
84. As Burooj, I want every saved format to carry a version and a tested migration, so that format changes are deliberate.
85. As Burooj, I want a backup of saved data kept before any migration rewrites it, so that a bad migration can be undone.
86. As Burooj, I want migrations tested against real saved data from my own devices, not only synthetic JSON.
87. As Burooj, I want the play-along latency calibration saved per device, so that it survives a reload.

### Stage model and Music Color

88. As Burooj, I want the Scope Size knob to change the scope across its whole range.
89. As Burooj, I want one Stage scene built per frame from notes, audio and settings, with renderers that only draw it, so that specimens are honest and lifecycle bugs can't appear one layer at a time.
90. As Burooj, I want Music Color passed to renderers as numbers and memoised, so that the Stage stops round-tripping colour through pixels and strings every frame.
91. As Burooj, I want the complementary-hue accent removed from the colour authority, since Flecks are retired and complements are rejected.
92. As Burooj, I want dead Stage code removed (the legacy body renderer fallback, the overwritten circle-of-fifths placement, historical size constants, a migration inside the render loop), so that sizes are designed rather than inherited.
93. (Proposed, Burooj's taste.) As a learner, I want Config split into what helps me learn (notation, mapping, labels) and how the Stage looks (Looks, plus an Advanced disclosure for the detailed knobs), so that settings read as an instrument's, not a tuning panel's.
94. As a learner, I want a tap-to-explain legend for what position, lightness and room colour mean on the Stage.
95. As a learner, I want the emotion of what I'm playing surfaced: the interval descriptions the app already has, and an emotion label whose default is reconsidered.
96. As Burooj, I want to decide whether colour follows the scale wheel or the circle of fifths, so that colour neighbours and position neighbours agree.

### Cues

97. (Proposed, Burooj's taste.) As a learner, I want unstable degrees (Ti, Fa, borrowed notes) to look more charged than stable ones, so that tension is visible.
98. As a learner, I want a visible resolution when Ti goes to Do or Fa goes to Mi, so that I see tension release.
99. As a learner, I want simple ratios shown as aligned pulses (a fifth pulsing 3:2 when vibration phase is locked), so that consonance is visible.
100. As a learner, I want chord-function hints (tonic, subdominant and dominant grouping, and a subtle "likely next" glow), so that I learn how chords move.
101. As a learner, I want a drone on Do I can switch on, built as a pinned one-bar loop, so that I hear every note against home.
102. As a player, I want a count-in and an optional click on the loop clock, so that I come in on time.
103. As a learner, I want chord-to-chord voicings that keep common tones, so that the chord row teaches voice leading.
104. (Proposed, Burooj's taste.) As a learner, I want Curwen hand signs available as note marks, so that syllables carry their gesture.
105. As a learner, I want the chord-progression library (#122) reviewed and offered as a path through the Joystick's harmony.
106. As a hummer, I want the instrument to suggest the key of what I hummed, so that movable-do starts from my own key.
107. As a hummer, I want a cents readout while I hum, so that I can see my intonation.
108. As a learner, I want a trail between successive notes on the Stage, so that melodic motion is visible.
109. As a learner, I want defined key and note states for target, correct, off and hint, so that future cues share one visual language within the playing zone.

### Audio stack and the Looper

110. As a Looper player, I want joining and leaving to keep phase with no lost notes on my phone, proven by the phone gate before "Play is the loop" ships.
111. As a Looper player, I want live Repeat and Arp locked to the loop's bar grid, so that they don't drift against the loop.
112. As a Looper player, I want mute and solo to take effect within an agreed time, so that a tap feels immediate.
113. As a player who plays along, I want a one-time latency calibration, so that recorded notes land where I heard them.
114. As a MIDI or ROLI player, I want velocity, pitch bend, sustain pedal and per-note expression to reach the voice.
115. As a player, I want bends wide enough to reach the neighbouring semitone (a Me↔Mi blue note).
116. As a player of square or saw synths, I want the same stall protection and expression as other sounds.
117. As Burooj, I want one engine for live play styles, so that a rhythm change lands once.
118. As Burooj, I want superdough owned as source and pinned exactly, with its generic fixes offered upstream, so that a lockfile refresh can't silently drop the patch.
119. As Burooj, I want the Strudel packages on one version line.
120. As Burooj, I want the Code Strip to follow and show the loop that's playing, with its text as the loop's export, so that code and sound never disagree.
121. As Burooj, I want an in-app audio diagnostics view (backend, memory, scheduler skips), so that phone problems are visible without a console.
122. As a coding agent, I want note events typed in one place, so that five listeners stop parsing a loose event payload.

### Design process and visual drift

123. As Burooj, I want adoptions to fix the accessibility defects their lab found, so that a written fix is never dropped again.
124. As Burooj, I want each lab to run axe and a keyboard pass beside the taste comparison.
125. As Burooj, I want editions grouped into families that Shuffle picks one of per load (the default) and that players can pin, with a query parameter for review, so that parts stay consistent with each other and every look can be QA'd.
126. As a maintainer, I want one edition helper and one collar recipe instead of copies, so that editions and collars behave consistently.
127. As Burooj, I want the remaining colour drift fixed (Tomato MIDI error LED, Bone lit cap, raw colours in error banners and the Code Strip frame, brand papers admitted by the Sticker type, the Brass Tabs edition on applied paper), so that the playing zone is Ink, Ivory, Brass and Music Color only.
128. As Burooj, I want Brass sheen to answer sound (sweep on hit, still at rest), so that the bible's "no perpetual decorative motion" holds.
129. As Burooj, I want the beat shown with hierarchy rather than on every control at once, so that the beat display reads as the beat.
130. As Burooj, I want the Compositions lab to start from the whole 390px playing screen and be allowed to send changes back to parts, so that the whole is judged before parts are frozen.
131. As Burooj, I want the design log frozen at a dated line and the tracker cut to one line per unit, with the PR body as the receipt, so that records stop being a merge bottleneck.
132. As a coding agent, I want the design skill cut to its durable rules, so that a session doesn't read 96 KB before touching a button.
133. As a maintainer, I want the "primatives" directory renamed "primitives".
134. As Burooj, I want the guide's Tabs page to show the embedded panel production uses, not the retired glass chrome.
135. As a maintainer, I want the design-route list defined once.
136. As Burooj, I want Tailwind either mapped to the tokens or retired.
137. As a maintainer, I want Knob on pointer events like Tabs and Keyboard.

### Added after completeness verification

138. As a coding agent, I want the product stance ("an instrument that teaches through its cues") written into the design bible and the repository router, so that every session judges work against it.
139. As a player, I want UIBeat and the Stage to take their beat from the transport's phase, so that live Repeat/Arp, edited patterns and loops all pulse the UI, not only generated code.
140. As a maintainer, I want PerformanceDeck, the Code Strip Bar and the Code Strip split into pure views plus production composables like the Keyboard, so that the import-boundary lint can pass.
141. As a hummer, I want the live lane to show out-of-key pitches as borrowed rather than drop them, so that what I see matches what I sang.
142. As a learner, I want switching modes and back to restore my melody exactly, with borrowed notes staying borrowed, so that mode changes are explorations, not edits.
143. As a player in a long session, I want note times anchored to the audio clock without drifting, so that late-session recordings line up as well as early ones.
144. As Burooj, I want a frame-budget check on one named phone and one mid-range laptop, with recorded frame pacing, so that Stage performance claims are measured.
145. As a coding agent, I want failed receipts and negative controls kept as evidence when the ledgers shrink, so that honest negative results survive the cut.

## Implementation Decisions

### W1 Verification and enforcement

- GitHub Actions runs type-check, the Vitest suite and ESLint on every PR. The ESLint fix is the invalid typescript-eslint rule name plus the lint script's legacy flags for flat config.
- The verify launcher stays the default on bjslab. CI and Vercel skip it through an environment flag rather than through a second code path in every script. It is proportionate to the incident on the shared host, not to cloud runners.
- The suite gets a per-project wall-time budget (target: Node project under 15 s, DOM project under 45 s on CI hardware), measured from the Vitest JSON report. Timing-sensitive component tests get explicit timeouts or are made faster; they are not deleted.
- **Scheduled browser audio job** (nightly and on demand) asserts the invariants in story 6, plus the Looper transport receipts. Raw captures become build artifacts. New raw captures are gitignored; the small derived summaries stay committed. History is not rewritten.
- **Lint and checks:**
  - Import boundary: primitives and compounds may not import stores or production services.
  - Colour and motion law: no brand tokens outside the brand zone's units and the guide; no raw colour literals or easing curves outside the token file.
  - An orphan report for components, modules and tokens. It fails CI only on new orphans, measured against a committed baseline list. Today the baseline would hold the live-listening composable, the instrument-category data and the audio-diagnostics service, plus the orphan design tokens.
- **The new browser seam:** a Playwright harness over the style-guide routes at 390×844 and 1280×900, with editions pinned by query parameter. It runs axe with no serious or critical violations allowed and a scripted keyboard walk per route, and uploads screenshots as CI artifacts. Committed `toHaveScreenshot` baselines are added only if visual drift recurs. The Stage canvas and animated beat surfaces are masked or excluded from pixel diffs.
- **Golden-PCM tests** render the worklet core offline for representative instruments and compare against stored short fixtures within a tolerance.
- **Second-model review policy:** PRs touching audio, music theory or persistence get an independent model review before merge, recorded in the PR. Design adoptions keep Burooj's own review.
- **Prose receipts stop being the acceptance mechanism.** A PR body states what ran and what didn't; CI is the authority. The honest-evidence habit stays: failed receipts, negative controls and "not established" lists are kept, as summaries in the PR and as artifacts (S145).
- **Costs:**
  - CI minutes.
  - A second-model review on audio, theory and persistence PRs costs time and quota; Opus and Sonnet share Burooj's limit.
  - Screenshot baselines need care when fonts or anti-aliasing change.

### W2 Musical identity

- **The module.** A musical-identity module joins the pure domain, beside the harmony module.
  - **Internal note identity:** degree plus chromatic offset relative to the tonic.
  - **What it derives:**
    - spelling, from the key signature via Tonal;
    - the syllable, from the interval to the tonic through one table that includes both the ascending and descending chromatic syllables;
    - interval names and borrowed status;
    - chord symbols, through one formatter (major as bare letter, m, °, ø, inversions as slash chords) for the keys, the Stage and screen-reader text.

  Sharps-only pitch classes may stay as internal lookup keys, but never reach a label.
- **Minor syllables.** The syllable table is parameterised by a minor convention: do-based by default, la-based selectable. The choice lives in learn settings.
- **Mode remap.** Remapping a melody to another mode is by pitch. When the two scales have the same number of degrees, map by degree. Otherwise:
  - snap each note to the nearest tone of the target scale;
  - ties go to the lower pitch, as #140 already does;
  - a note with no near target becomes borrowed, keeping its pitch and taking its chromatic syllable.

  The pattern mode switch, phrase-book follow, and Looper bending all call this one function. If Looper slices merge first, a follow-up replaces their local bending policy with it.
- **Stored formats are not changed by this workstream.** Identity is derived at read time from what is already stored (pitch plus context). Moving stored notes to a degree-first format is a separate, migration-gated decision (W6).
- **Mode switches apply to the original.** The mode switch keeps the loaded base melody and applies the remap to it, never to the previous result. Switching modes and back therefore restores the melody exactly, and borrowed status is preserved rather than cleared (S142).
- **Costs:**
  - Remapping by pitch changes what a mode switch means musically compared with today's degree mapping.
  - It also overrides #140's local degree policy for Looper bending.
- **Library tunes** are corrected where their syllables are wrong (Hot Cross Buns becomes Mi-Re-Do).
- **The number row** reads the Joystick alteration from shared state (see W3) rather than rebuilding chords without it.
- **The Joystick's character set** gains a diatonic-sevenths option; the current jazz character remains. Roman numerals are derived from the degree and the chord quality.
- **MIDI** plays out-of-scale notes and labels them through the identity module.
- **Humming.**
  - Import never throws on an out-of-key pitch. Notes within ±40 cents of a scale tone snap to it; others become borrowed. The live lane uses the same rule instead of dropping pitches (S141).
  - The live pitch gate confirms a new semitone only past about 60 cents of hysteresis, over a time window rather than a frame count, and suppresses single-frame octave jumps.
  - Velocity comes from the voice's RMS, not the detector's confidence.
  - Recording length is capped (default 60 s) with a visible countdown.
  - Import offers snap-to-grid with strength.
  - The key of a hum is estimated by a key-finding profile over its pitch histogram, showing the top two readings to choose from.
- **The Visuals switch** reads the store through reactive refs, so toggling mounts and unmounts the Stage and stops its loop.

### W3 Performance input

- **One performer.** One service exposes press, release and release-all-for-owner for notes and chords. It owns voice groups, touch registration, logging and note events.
  - **Its inputs are adapters:** pointer and glissando, QWERTY, number row, MIDI, the Joystick-modified chord row, and the Looper's latch.
  - **Its owners:** every physical contact or note gets an owner, using the existing voice-group lifecycle.
  - **Where state lives:** the Joystick alteration moves from a component-local value into a store the performer reads.
  - **When it releases:** window blur, page hide, and a missing key-up for longer than its key-repeat window (the macOS Cmd case) all release the owning group.
  - **What it doesn't own:** expression (bends, tremolo) stays owned per note in the worklet core, as #92 built it. The performer forwards expression intents and doesn't duplicate them.
  - **Dead code it replaces:** the unused keyboard custom events, the write-only note-id map, and the unused letter lookup are deleted.
- **QWERTY shortcuts are registered by the performance surface**, not by the Keyboard component, so they work whenever the instrument is on screen.
- **Each key's aria-keyshortcuts is filled in**, and unused QWERTY keys continue the scale into the next octave.
- **The Keyboard compound becomes a pure view.** It is fed by:
  - a production container composable (the store wiring that is in the component today);
  - pure glissando geometry, which maps pointer segments to key intents and hit-tests by grid arithmetic from one cached rect;
  - roving focus;
  - chord hold and snapshots.

  Chord edition styling moves to the chord key. The guide's motion and contrast simulation moves into guide-only wrappers. The component follows the repo's own block order (script before template).
- **The same split applies to PerformanceDeck, the Code Strip Bar and the Code Strip.** Each takes the same production/controlled switch today. Each becomes a pure view plus a production composable (S140). The import-boundary lint (W1) lands after these splits, or with an allowlist that shrinks as they land.
- **Stale PRs:**
  - #35 (held-note ownership) and #40 (MIDI session owner) are closed. Their behaviour lists become the acceptance tests for this workstream's MIDI adapter and MIDI session.
  - #33 and #34 are closed. Their intent is carried by #140's shared recorded plan (verify it removed the duplicated overlap grouping) and by W6's field rules.

### W4 Accessibility and touch

- **Tabs** gets roving-tabindex keyboard handling (arrows, Home, End), ported from lab #102. The test that asserts the broken state is rewritten to assert keyboard reachability.
- **Range Knobs** get slider semantics: role, tabindex, value now/min/max/text, arrows and Page keys, and Home/End. Option Knobs keep theirs. The Readout stays decorative; the value is announced through aria-valuetext on the control.
- **Note label colour** is chosen from the fill's OKLCH lightness via the Music Color authority (ink below a threshold, ivory above), not from whether the note is an accidental.
- **Contrast floor:** text that is inactive but enabled moves to the 4.5:1 token. LED and crown marks meet 3:1 against their surround. Focus rings use a dual ring (inner Ink, outer Ivory) that reaches 3:1 on every cap material.
- **Touch size:** a hit-size token (44px) is applied as an invisible hit area on Buttons and other small controls, separate from the visual size. Play/Stop keeps the invariant hit box while its face scales. A compact/comfortable setting changes visual density but never goes below the hit minimum.
- **Inputs** use at least 16px text on iOS, and banners use readable sizes and tokens.
- **Reduced motion** has one owner composable plus a motion-scale token. Every control, including the knob's hold animation, reads it. Under reduced motion the beat is shown as a discrete step without animation, or as a haptic pulse where supported.
- **The Stage's live region** announces single notes as well as chords, at most once every 500 ms.
- **Cost of 44px hit areas:** they will overlap in dense rows (PatternStrip's actions sit 6px apart; chord keys are about 24px wide at 320px). Overlapping areas resolve to the nearest control centre, and the densest rows get layout changes rather than overlap.

### W5 Mobile runtime

- **The Stage canvas** backs its drawing at CSS size × min(devicePixelRatio, 2), with the transform set once. The scope's history and swap canvases follow the same rule.
- **All Stage motion uses elapsed time** (dt) from the frame clock. Lifecycle timestamps use the same clock rather than wall time.
- **The render loop idles** when there are no notes and no audio energy, when the page is hidden, and when Visuals are off.
- **Adaptive quality.** The performance monitor's "poor" tier lowers the field resolution, drops blur filters, and turns off non-essential layers. The cost of the body-subtree mutation observer and of canvas filter support on iOS Safari are measured, and fallbacks are added where filters are unsupported.
- **Frame budget.** A frame-budget check runs on one named phone and one mid-range laptop. It records frame pacing for an idle Stage, a held chord, and a playing loop (S144). The audio phone gate does not cover frames, so this runs beside it.
- **Audio context:**
  - It resumes from any non-running state, including iOS "interrupted", on the next user gesture or visibility return.
  - The audio session is set to playback where the API exists.
  - The context suspends after 30 s of silence with nothing playing or held, and resumes on the next input.
- **Memory (measure first):** the piano's real-device memory is measured on an iPhone. Then the two copies of its samples are reduced, by one or more of:
  - one PCM owner (worklet-held samples with the Superdough copy released when no authored pattern needs it);
  - compact sample storage in the worklet;
  - a phone-specific smaller default bank.

  The sample copy into the worklet moves off the interaction path (chunked transfer).
- **Bundle:** the main bundle is split. The style guide, the soundfont catalog, the Config panel and the instrument picker load on demand. The startup sample download that #95 brought back (when a sampled instrument is persisted) is deferred until after first input.
- **Updates and haptics:** the service-worker update prompt becomes an in-app Sticker. Haptics gain a tonic/downbeat accent.

### W6 Persistence

Burooj signs off once on the codec design and on the backup-and-restore rule. After that, migrations are ordinary PRs under second-model review. They are reversible through the backup key and tested on captured real payloads. The exception is any migration that drops a backup or changes the backup rule; that needs his sign-off again.

- **Versioned codecs.** Every persisted store gets a codec with a version, encode, decode, and a migration table. The stores are visual config, phrase book, instrument, keyboard drawer and the Looper's saved Loops.
- **Visual config saves sparse overrides** (only values that differ from defaults). Effective config is defaults plus overrides.
  - A one-time reconciliation treats stored values equal to a known previous default as untouched, so later defaults reach returning players.
  - BPM, octave and drawer rows move out of the visual config into their own small stores.
- **Visible save failures.** The persistence plugin's write errors go to an explicit handler that shows a Sticker ("Can't save, storage full") and keeps the in-memory state.
- **Phrase book budget.** It gets a byte budget measured on the encoded payload, covering Kept phrases and expression curves. The starting figure is 3 MB, below the roughly 5 MB per-origin localStorage limit shared with the other stores. It is re-measured on Burooj's real data before the budget is enforced.
  - Curves are decimated at save to at most 100 points per second per curve.
  - Over budget, the reel shows "Shelf full" and offers the oldest Recent phrases for release. Kept phrases are never silently dropped.
  - Moving the phrase book to IndexedDB is the follow-up if the budget proves too small. It is not in this slice.
- **Migration safety.** Before any migration rewrites a store, the previous payload is copied to a dated backup key and kept for one version. Migrations are tested against captured payloads from Burooj's own devices, plus synthetic edge cases.
- **Latency calibration** (#140 has it in memory only) is persisted per device.
- **A degree-first stored note format is not adopted here.** If it is ever proposed, it is its own migration with its own sign-off.
- **Costs:**
  - The reconciliation rule will reset a player who deliberately chose a value that equals an old default. This is rare, but it is a real override.
  - Decimating expression curves at save is lossy.
  - Each migration is a one-way rewrite of player data, softened only by the backup key.

### W7 Stage model and Music Color

- **Scope Size:** one radius rule (size ratio × half the short edge, clamped). The two historical scale constants and the test that locks in the saturation are replaced.
- **The Stage scene.** One pure scene builder per frame receives notes, the audio frame, settings, key/mode and time. It returns bodies, strings, scope, ambient band and lettering with numeric colours. Renderers draw only that scene and import no stores.
  - Note ingestion has one path (the timeline), replacing the mix of events and polling.
  - Specimens drive the same builder without a second app.
  - This is the largest refactor in the spec. It lands after W2 and W4.
- **Colour plumbing.** The Music Color authority returns numeric colour to renderers. Colours are memoised per (degree, octave, phase bucket). The one-pixel colour readback and the string alpha edits are removed.
- **The complementary accent** is removed from the colour authority and its types. Open #136 is the place for it.
- **Dead Stage code is deleted:** the legacy body fallback, the circle-of-fifths placement overwritten after every attack, and the migration inside the render loop. That migration moves to the store's codec.
- **Config is regrouped into Learn and Look.**
  - **Learn:** notation, syllable convention, mapping, labels, emotion.
  - **Look:** Stage Looks, plus an Advanced disclosure that holds the detailed knobs.
  - The projection layer from #63/#80 is kept.
- **The legend.** A tap-to-explain overlay in the playing zone (Ink/Ivory) says what position, lightness and room colour mean.
- **Emotion.** The interval descriptions are surfaced as a cue (in the legend and on chord hold). The default for the emotion label is revisited with Burooj.
- **One wheel.** Whether colour hue follows the scale wheel or the circle of fifths is Burooj's decision. Until he decides, nothing changes. Cost of changing: every colour players have learned for keys and the strip shifts.
- **Hue motion.** It is on by default and sweeps each hue by half a cell, so Do periodically wears Re's edge. Either its amplitude drops to a fraction of a cell, or it moves into a Look that is off by default. Burooj chooses.
- **Cost of Learn and Look:** the Advanced disclosure hides knobs Burooj uses daily. A developer flag in the URL opens Advanced by default.

### W8 Design process and visual drift

- **Skill rule change:** an adoption must fix every accessibility or behaviour defect its lab recorded in the unit it reopens. "Preserve behaviour" no longer covers known defects. The Plan stops recording 32px targets as an invariant.
- **Labs run checks.** Each lab mounts its directions under axe and a keyboard walk and reports the results beside the visual comparison.
- **Editions (decision 5):**
  - Families of editions span parts.
  - Shuffle is the default Look and picks one family per load.
  - Families can be pinned in Config.
  - A query parameter pins any family for review and snapshots.
  - Every edition meets the accessibility floor before it joins Shuffle.
  - One edition helper replaces the three copies, and one seeded-random helper replaces the two copies in the keyboard deck and the Stage Looks.
  - The Keyboard's key-shape variation stays as it is (Burooj, 2026-10-09).
  - The collar/chad geometry has one owner, and the Beat Indicator consumes it.
- **Colour drift fixes:**
  - The MIDI error LED uses an Ink/Ivory/Brass treatment, not Tomato.
  - The Ivory cap's lit state uses an Ivory token, not Bone.
  - Raw colours in the instrument picker banner and the Code Strip frame become tokens.
  - The Sticker paper type for playing-zone consumers admits only Ink, Ivory and Music Color.
  - The Brass edition of Tabs is removed or moved to the brand zone.
- **Motion:**
  - Brass sheen plays on interaction or sound and rests otherwise.
  - Proposed, for Burooj to decide: UIBeat defaults off for ordinary Buttons. It stays on for Play, the Beat Indicator, Loop Dials and the selected instrument, which gives the beat a hierarchy.
  - Cost: this partly reverses the adopted "light answers sound" chassis, in which every cap breathes with the beat.
- **Compositions (step 5) runs top-down** from the whole 390px playing screen, and its prompt allows a change to flow back to a part. It starts after decision 5 is confirmed.
- **Bible §12 is settled before Compositions.** That section asks whether the top-menu panel is chassis or poster. #129 already brought the poster's highlight band and label tape into the menus, so the question is being settled piece by piece. Settle it deliberately.
- **Records:**
  - The design log is frozen at a dated line; new entries stop.
  - The tracker becomes one line per unit: unit, layer, source, specimen route, consumers, open defects.
  - The bible remains the only prose law.
  - The PR body is the receipt.
  - The design skill shrinks to its durable rules (real-source specimens, exact evidence names, one unit per session, defect-fixing adoptions) and is marked permanent or retired, as Burooj chooses. The tracker's ten-plus layer labels collapse to the bible's four layers plus Unique, and folders match them.
  - Cost: freezing the log loses verbatim-quote provenance, which Burooj values. PR bodies and comments keep quotes from now on.
- **Housekeeping:**
  - The directory rename to "primitives" lands as its own mechanical PR.
  - The guide's Tabs page uses the embedded panel.
  - The design-route list is defined once.
  - Tailwind is either mapped to the tokens or removed with its remaining utilities.
  - Knob moves to pointer events.

### W9 Audio stack and the Looper

**Superseded in part on 2026-10-09** (see Decision 3). The bullets below that keep Strudel or superdough (the conditions, owned superdough source, one Strudel version line) no longer apply. These still apply:

- One tempo authority read by live play styles and loops.
- Mute and solo under 150 ms on the phone.
- Persisted latency calibration.
- MIDI expression and the wider bend range.
- Typed note events and the diagnostics view.
- UIBeat from the transport.
- The one audio-clock anchor.

The engine track is ticketed separately.


- **Strudel is the single musical clock** (decision 3). The conditions that apply to Looper slices #139–#142 and onward:
  - Members are built from note data; the transpiler and mini parser never run while playing.
  - **The phone gate** reruns the #140 receipts on iOS Safari and Android Chrome with sampled and soundfont instruments in Phase 0, before any further Looper slice merges. It counts scheduler skips under touch load.
  - **One tempo authority.** One {bar origin, bpm} is owned by the transport. Live Repeat and Arp read it, quantised to the next subdivision by default, instead of anchoring their phase at the press.
  - **Mute/solo acceptance** is under 150 ms from tap to audible change on the phone. If immediate swaps can't meet it, mute uses a per-member gain owned by the output path.
  - **Latency calibration** is a one-time, per-device tap-along that is persisted (W6).
- **One live rhythm engine.** The main-thread play-style engine is retired where the worklet can carry the sound. Square and saw move into the worklet (its band-limited oscillators already exist), so they get stall protection and expression. Sounds that can't move into the worklet are triggered by the worklet's plan events, so there is one grid.
- **Expression:**
  - MIDI velocity reaches the voice gain, channel pitch bend maps to the owner-keyed bend, CC64 sustains, and MPE per-note channels are supported.
  - The bend range rises to ±2 semitones, with the current ±50 cents as the default for touch.
- **Superdough:**
  - The patch becomes owned source: a workspace package built from source, or a source alias with the audio-worklet bundler plugin. The version is pinned exactly.
  - Generic fixes are offered upstream: polyphony parsing, eviction of failed loads, finite-voice fades.
  - The Strudel packages move to one version line.
- **The Code Strip is the app's own read-only view** (decision 4). The CodeMirror editor and the Strudel CodeMirror extensions are removed, along with the pinned CodeMirror patch and the reveal workarounds.
  - The notation generator emits text plus a span for each note id.
  - The highlight lights spans from the transport's note events, so a Looper member highlights the same way as a lone pattern.
  - "Open in Strudel" hands the current code to strudel.cc.
  - The Strudel export keeps its documented approximation of expression.
- **Typed note events and diagnostics.** Note events are defined once as a typed event contract, which removes the two builders of the same event. An audio diagnostics panel shows the backend, PCM held, worklet state and Cyclist skips.
- **UIBeat from the transport.** UIBeat and the Stage read their phase from the transport, so live Repeat/Arp, edited patterns and loops all pulse the UI (S139). #140 already keeps a single UIBeat generation for Looper members; this extends that to every playing source.
- **One audio-clock anchor.** The anchor from epoch time to the audio clock is refreshed periodically (and on resume), not only when the context changes state, so long sessions don't drift (S143).
- **Owned-source review.** When superdough becomes owned source, the review also covers:
  - allocation on every rhythmic pulse in the worklet core (low risk at today's rates; pooled when the play-style engine is consolidated);
  - the per-admission voice scan added for recorded fidelity;
  - the soundfont package's use of `eval`.

  The other dependency patches (soundfont variant ordering and the CodeMirror selection fix) were judged sound and need no action.
- **Costs:**
  - Owning superdough means tracking upstream by hand.
  - Moving square and saw into the worklet changes their sound slightly; this was the reason #90 routed them back to Superdough for parity. Parity is re-checked with the existing parity suite.
  - Holding Looper merges for the phone gate costs about a day. Skipping it would risk reworking slices 3–4 onto the fallback.

### W10 Licence, content and docs

- **Licence.** Add a LICENSE file for AGPL-3.0-or-later and a NOTICE listing:
  - Strudel/superdough (AGPL-3.0-or-later);
  - Tonal and other permissive dependencies;
  - the Hilbert scope's sources (merge #64);
  - the font.

  The app gets a Source and Credits entry in the brand zone, linking to the exact deployed commit.
- **Font.** The Let's Jazz licence is checked for web embedding and public redistribution. If the licence does not allow it, the font files leave the public tree and a licensed delivery replaces them. Scrubbing git history is a separate decision for Burooj.
- **Transcriptions.** The five Epic: The Musical transcriptions leave the default library. Their history stays.
- **Humming notice.** Humming shows a one-line notice the first time ("Your recording is sent to the pitch-analysis service and not kept"), worded to match what that service actually does, which is to be verified.
- **Docs:**
  - The product stance (Decision 2) goes into the design bible and the repository router (S138).
  - The Looper brief marks Strudel as decided.
  - The root agent doc is rewritten for the current architecture.
  - The Warp doc is deleted, or reduced to a pointer.
  - The README gets a short description.
  - The repository router gains product, audio and music-theory routing plus the verification rules.
  - The pattern-system doc's status is updated.
- **Stale PRs:** #33, #34, #35 and #40 are closed with comments linking to this spec. #64 is merged. #67 is re-validated against main, then merged or closed. #122 is reviewed. The matching Linear issues (BJS-413/414/415 and the MIDI session) are updated.

### Sequencing

1. **Phase 0, this week:** the executable list at the top of this document.
   - CI and lint.
   - The phone gate and a first iPhone memory reading, before any further Looper slice merges.
   - Licence, transcriptions, #64 and the stale PRs, plus the font check.
   - The one-line fixes.
   - Freezing the design log and the defect-fixing rule.
   - The "moats" question.
   - Removing the colour accent rides along with #136.
2. **Phase 1, the cues are true (before Looper slice 4 ships bending):** W2, plus surfacing the interval descriptions (S95), the feeling-first moat. Also the W1 items not in Phase 0: the test budget, the colour-law check, and the orphan report.
3. **Phase 2, reach:**
   - W4.
   - The W5 items that need no device: DPR, dt, idle, iOS resume and session, bundle split.
   - W8's colour drift, the edition decision, and cutting the tracker.
4. **Phase 3, saving:** W6. Burooj signs off once on the codec design and the backup rule.
5. **Phase 4, structure:**
   - W3's performer, with the Joystick alteration moved into a store.
   - The Keyboard, PerformanceDeck and Code Strip splits, followed by the import-boundary lint.
   - The "primitives" rename.
   - The Stage scene.
   - The W9 rhythm-engine consolidation, UIBeat from the transport, the anchor fix and superdough ownership.
   - On devices: the frame budget and W5's memory work. These use what the Phase 0 phone gate measured.
6. **Phase 5, cues:** the cue stories (97–109), and the Compositions lab top-down.

The Looper slices continue in parallel under W9's conditions. No further slice merges before the Phase 0 phone gate.

This sequencing changes the plan proposed on 2026-10-06 in one place:
- **Phase 1's deadline** was "before Looper slice 2". Slices 2 and 3 are already open (#139, #140), so the gate is now "before slice 4 ships bending".
- The 10-06 plan's "pass the real-phone check first" is kept and moved earlier than the Looper brief has it. The brief puts the gate at slice 5; this spec puts it in Phase 0. A day of measurement decides whether slices 3–4 stand or move to the fallback transport.

**Execution routing:**
- Mechanical work goes to Sol 6.1, once its Codex credit returns on 2026-10-10.
- Visual and design work goes to Opus.
- Judgment reviews go to Opus and Fable.
- Burooj reviews and merges design adoptions and #136 himself.

## Testing Decisions

- **What makes a good test here:** it observes behaviour at the highest available seam (the five above) and fails when the behaviour breaks. It is mutation-checked when it replaces an older test, as #94 did. It never asserts source text, a variable's spelling or a mock's canned answer. Missing prerequisites fail rather than pass vacuously.
- **Musical identity:** table and property tests across all 12 tonics × every mode.
  - Heptatonic spellings use each letter once.
  - Interval names agree with semitone and letter distance.
  - Syllables round-trip.
  - Chord symbols match a fixture lead sheet.
  - Mode remaps preserve contour, including fewer-degree targets and borrowed fallbacks.
  - Switching to any mode and back restores the original exactly, with borrowed status kept.
  - Humming import never throws on any pitch, and the live lane classifies out-of-key pitches the same way import does.

  Prior art: the harmony domain tests and the phrase-book invariant tests.
- **Performance:** adapters are driven with synthetic pointer, key, MIDI and Joystick events. Tests assert performer intents, voice-group lifetimes, release on blur/hide/missing key-up, and the number row's equality with the on-screen chord row under every alteration. Prior art: the voice-group lifecycle tests and the deterministic glissando tests.
- **Persistence:** each codec is round-tripped with captured real payloads and migration fixtures. Tests cover sparse-override reconciliation against known old defaults, an over-budget phrase book showing "Shelf full", and a simulated quota error surfacing to the UI. Prior art: the instrument persistence and phrase migration tests.
- **Browser seam:** Playwright, axe and keyboard walks, plus reviewed screenshots at 390px with editions pinned, the Stage masked. Prior art: the audio lab's headless Chrome harness and the style guide's real-source specimens.
- **Stage:** scene snapshot tests for the pure scene builder. Dt tests run at 60 Hz and 120 Hz and assert equal motion per second. A DPR test asserts the backing store size. Prior art: the stage runtime tests and the canvas pixel tests (kept).
- **Audio:** golden-PCM tests of the worklet core rendered offline. UIBeat-phase tests assert that live Repeat/Arp and loop members pulse the UI on the transport grid. An anchor-drift test simulates a long session and asserts recorded positions stay on the audio clock. The existing parity suite and the Looper transport receipts run on schedule. The phone gate runs the same receipts on devices. Prior art: the core and bridge unit tests, the parity suite, and #140's receipts.
- **Accessibility units:** keyboard tests for Tabs and range Knobs in the DOM project. Contrast tests compute ratios from the real tokens and from the Music Color authority's output for label colours.

## Out of Scope

- **A curriculum:** quizzes, scored exercises, progress tracking, and sing-back scoring. The product stance is to teach through the instrument's moats and cues. Call-and-response from the phrase book stays an idea for later.
- **Running the Looper on a transport other than Strudel.** It is the fallback only if the phone gate fails.
- **A WebGL renderer for the Stage field.** Revisit only if the DPR fix makes the CPU field look coarse.
- **Rewriting git history** to remove committed receipts, the purged evidence pack, the transcriptions or the font. Each would be a separate, explicit decision.
- **A headless accessibility component library** (such as Reka UI). In-place fixes are smaller. It remains the fallback if the Tabs and Knob work grows.
- **A degree-first stored note format.** Identity is derived at read time. Any format change is its own migration decision.
- **Two free tempos at once in the Looper.** This is per the Looper brief.
- **Editions tied to content** (a pattern carrying its own paper edition), **spectral-centroid colour on the scope**, and **visual lab directions inside the product** (beyond the review query parameter). These are ideas noted, not planned.
- **Desktop-specific layouts.** The app remains mobile-first.

## Further Notes

- **Confirmed by Burooj on 2026-10-09:**
  - "Moats" means moats, and the four-moat list is correct.
  - Decision 4: leave the code editor; keep the highlight and "Open in Strudel".
  - Decision 5: Shuffle is the default, families are consistent across parts, and Keys stay as they are.
  - #136 merges before anything.
- **Still his to decide:**
  - The colour-wheel question (story 96) and the emotion-label default (story 95) are his.
- **What "editions" means.** Several parts pick a different look on each load (Tabs, Knob, Joystick, Keyboard keys). Decision 5 groups them into families, which Shuffle picks between by default.
- **Strudel.** Two reviewers proposed worklet-based transports, and the 2026-10-06 summary asked Burooj to choose. Decision 3 records the answer: Strudel stays, the alternatives become the fallback, and the phone gate is the condition. Separately, Burooj chose to leave the Strudel code editor (Decision 4).
- **What the 2026-10-06 plan left out, which this spec restores:**
  - Device work: DPR, frame-rate-independent motion, idle and adaptive quality, iOS audio, memory, bundle size.
  - Ownership of superdough and the single live rhythm engine.
  - The Stage scene model, numeric colour and the colour-wheel question.
  - MIDI expression and the bend range.
  - Taking raw receipts out of commits.
  - Docs and font licensing.
  - Every "idea not considered" (stories 97–109 and the out-of-scope ideas).
  - The costs behind each recommendation.

  The appendix maps each one.
- **Publishing.** This spec is a markdown file, as Burooj asked. Once he accepts it, its workstreams can be filed as Linear issues with `ready-for-agent`. No Linear issue currently tracks the teaching-correctness bugs. The five test seams are proposed and need his confirmation.
- **Process facts behind W1 and W8:**
  - In retrospective #1's window, 15 of 53 PRs had no verification section, including the riskiest (#79, #82, #83, #84).
  - 10 of 53 were self-merged within an hour.
  - Review effort followed visuals rather than musical correctness: #85 had no reviews, while #54 had 57.
  - In retrospective #2's window, the Compounds lab skipped its screenshot pass, and the latest playing-screen capture (09-29) predates #125–#134.
- **In-flight work this spec touches:**
  - #136 (Flecks; also remove the accent there).
  - #138–#142 (Looper; W9 conditions, W2 bending).
  - #122 (progressions; story 105).
  - #137 and #132 stay unmerged as research and prototype.
- **Process notes carried from both retrospectives:**
  - Keep PRs singular. #27 was 23k lines over 194 files and sat open for 102 days.
  - Don't stack design units on unmerged lower layers.
  - Declare a programme closed only when nothing is about to reopen it.
- **Risks:**
  - The bundle split and the scene refactor touch many files; land them behind tests from W1 first.
  - The persistence migrations are the irreversible part of this spec.
  - The phone gate may fail on low-end Android because of main-thread starvation; the worklet-scheduled fallback in W9 is the plan for that.

## Appendix: traceability

Every finding, direction and idea from the two retrospectives, the verifiers, and the health and process reports, mapped to a story (S#), a workstream decision (W#) or Out of Scope (OoS). "Done" means already fixed on main.

### Retrospective #1 (2026-09-23)

| Source | Item | Disposition |
| --- | --- | --- |
| Process facts | No human review on 53 PRs | S13 |
| Process facts | Root docs describe Tone.js and missing files; README "Boop" | S16, S18 |
| Process facts | Dead components (AudioInitializer, AppHeader, FloatingDropdown, Sequencer controls, StickyBottom) | Done (#96, #106) |
| Process facts | Remaining orphans: live-listening composable, instrument categories, audio diagnostics | S12 |
| Process facts | Mixed Strudel versions | S119 |
| Process facts | Superdough patch edits minified output; pinned to 1.3.0 under a caret range | S118 |
| Process facts | Evidence paths referenced but never committed; 380k lines of receipts | S7, S9 |
| Process facts | Ledger-only commits (22%), ledgers touched by 32 PRs | S131 |
| Process facts | Large PRs (median ~1.75k lines; #27 23k) | Further Notes |
| Process facts | Card churn (#46 → #93); Brand Cover was a legitimate cleanup of a May leftover, not churn | S130 (top-down), Further Notes |
| Process facts | 15 of 53 PRs had no verification section; 10 self-merged within an hour; #85 had 0 reviews vs #54's 57 | Further Notes, S13 |
| Process facts | Other dependency patches (soundfonts ordering, CodeMirror selection) | W9: judged sound, no action |
| Health | ESLint config broken | S2 |
| Health | Red suite (14 failures across 11 files, 2 unhandled rAF errors; the validation doc recorded 11 failures plus collection errors) | Done (#94); S5 for the remaining timeout |
| Health | Main bundle 3 MB; dynamic plus static import warning | S77 |
| Health | Strudel soundfonts uses eval | W9 owned-source review |
| Health | Largest files (Keyboard, ConfigPanel, MIDI controls, blob field, patterns) | S55, S93, S49, S89 |
| Audio, Opus | Per-note purge and whole-store persistence; quota silent | Purge done (#103); S82, S83 |
| Audio, Opus | Two renderers; play-style logic twice; square/saw on fallback | S116, S117 |
| Audio, Opus | Strudel Cyclist drops windows when late | S110 (phone gate counts skips) |
| Audio, Opus | makeVoiceRoom per-admission scan | W9 owned-source review |
| Audio, Opus | Memory 138+138 MiB plus reservations; main-thread clone; no suspend | S75, S76 |
| Audio, Opus | Superdough patch: fork or upstream | S118 |
| Audio, Opus | Evidence apparatus versus regression harness; no CI | S1, S6, S7 |
| Audio, Opus | iOS "interrupted"; no audio session | S73, S74 |
| Audio, Opus | Allocation on the audio thread per pulse | W9 owned-source review |
| Audio, Opus | Epoch anchor drifts over long sessions | S143, W9 (one audio-clock anchor) |
| Audio, Opus | Direction: fix UI cost first, stay native | Superseded: purge removed (#103); Strudel chosen |
| Audio, Opus | Direction: worklet as only renderer | OoS unless phone gate fails |
| Audio, Opus | Ideas: velocity and sustain; phase-locked arps; latency calibration; drone and count-in; diagnostics panel | S114, S111, S113, S101, S102, S121 |
| Audio, Fable | Two rhythm engines | S117 |
| Audio, Fable | Layered fix cycle #76→#90 | S117, S118 |
| Audio, Fable | Patch pinned by caret | S118 |
| Audio, Fable | Scheduled CI assertions (pulses through stall, settlement, release, one context, one transport, no warnings) | S6 |
| Audio, Fable | Mobile memory | S76 |
| Audio, Fable | UIBeat beats only for generated text | S139, W9 (UIBeat from the transport) |
| Audio, Fable | Note event built twice; loosely typed event detail; no velocity | S122, S114 |
| Audio, Fable | Directions: worklet as transport; fork superdough; golden PCM | OoS unless phone gate fails; S118; S15 |
| Audio, Fable | Ideas: velocity/touch force; latency calibration; quantise on record; count-in in worklet; mono/Int16 piano | S114, S113, S45, S102, S76 |
| Design, Opus | Paperwork outgrew checking | S131, S132 |
| Design, Opus | Tabs and range Knob keyboard access | S56, S57 |
| Design, Opus | Note label contrast | S59 |
| Design, Opus | Instrument picker 10px input, 8–9px banners | S63 |
| Design, Opus | 32px buttons; Play/Stop shrinks | S61, S62 |
| Design, Opus | Layering nominal at top (Keyboard, PerformanceDeck, Code Strip Bar, Code Strip); guide-only props in production | S55, S140, S66, S10 |
| Design, Opus | Taxonomy and folders disagree | W8 records (layer labels collapse to four plus Unique) |
| Design, Opus | Orphan audit missed components and 57 tokens; static note palette; glass token; Tailwind ring colour; Tailwind unmapped | S12, S136 |
| Design, Opus | Guide Tabs page shows retired glass | S134 |
| Design, Opus | Source-text tests; no browser tooling | S14, S8, S9 |
| Design, Opus | Formalised before fitted (Pattern Card); Badge shim | S130; Badge noted, no action |
| Design, Opus | Three edition rotators; duplicated route list; Knob mouse/touch events; "primatives"; #27 too big | S126, S135, S137, S133, Further Notes |
| Design, Opus | Directions: enforce in code; build in context; headless a11y library | S10–S12, S8; S130; OoS (fallback) |
| Design, Opus | Ideas: label colour from lightness; Curwen signs; editions tied to content; touch-size setting; haptic vocabulary; in-app update prompt | S59, S104, OoS, S67, S79, S78 |
| Design, Fable | Governance cost (21% ledger-only commits) | S131, S132 |
| Design, Fable | Keyboard fused with its host | S55 |
| Design, Fable | Accessibility gaps; reduced motion has no owner; knob hold ignores reduced motion | S56, S57, S61, S64 |
| Design, Fable | Second token set and font-face in global styles | Done (#96) |
| Design, Fable | Raw easing in Loading Screen; rgba in Note; brass sheen string copied five times | S11, S59, S128 |
| Design, Fable | Tailwind configured but unused by primitives | S136 |
| Design, Fable | Card churn | S130 |
| Design, Fable | Four randomisers, no user control | S125, S126 |
| Design, Fable | Directions: style guide as executable record; fewer, thicker units; skill to a page | S9; S132; S132 |
| Design, Fable | Ideas: semantic feedback states; layering lint; edition pinning; hit-size token; Tailwind decision | S109, S10, S125, S61, S136 |
| Stage, Fable | Persisted config freezes defaults | S80, S81 |
| Stage, Fable | Scope Size saturates and a test locks it in | S88 |
| Stage, Fable | No DPR | S69 |
| Stage, Fable | Frame-rate motion; two clocks | S70 |
| Stage, Fable | Renderers reach stores; colour readback; no memo | S89, S90 |
| Stage, Fable | Config is a tuning panel; #72 evidence left 36 MiB in the pack | S93; OoS (history rewrite) |
| Stage, Fable | Blob fix loop; legacy fallback | S92, S89 |
| Stage, Fable | Colour decorative; Ti and Do hue-adjacent; two wheels disagree; emotion label off | S97, S96, S95 |
| Stage, Fable | Directions: pick one wheel; two-tier settings; scene model then WebGL | S96; S93; S89, OoS (WebGL) |
| Stage, Fable | Ideas: tension as chroma; voice-leading trails; spectral centroid on scope; battery tier; pause when hidden; numeric colours and cache | S97, S108, OoS, S72, S71, S90 |
| Stage, Fable | Body-subtree mutation observer cost unmeasured | W5 (measured) |
| Stage, Opus | Persistence; BPM, octave and drawer in the same object | S80, W6 (split stores) |
| Stage, Opus | Two note-ingestion paths; store reach-ins; dead placement; specimens need a second app | S89, S92 |
| Stage, Opus | Orchestrator test fails to import | Done (fixed by #94) |
| Stage, Opus | Per-frame CPU cost (metaballs, readbacks, ambient re-resolve, grain); loop never idles; empty "poor" tier | S90, S71, S72; grain and gradient cache done (#134) |
| Stage, Opus | Visuals switch broken | S48 |
| Stage, Opus | iOS canvas filter support | W5 (measured, fallback) |
| Stage, Opus | Fix loops; sizing encodes history; migration in the render loop; "preserve" lists push toward multipliers | S88, S92, S131 |
| Stage, Opus | Hue motion sweeps into a neighbour's cell; flecks use the complement; emotion label off; single notes not announced | W7 (hue motion), S91, S95, S68 |
| Stage, Opus | Real-device frame-budget harness | S144, W5 (frame budget) |
| Stage, Opus | Directions: scene model; WebGL metaballs; fewer layers, more meaning | S89; OoS; S97–S99 |
| Stage, Opus | Ideas: phase-locked vibration; resolution events; tension in chroma; same-hue flecks; adaptive quality and idle; legend | S99, S98, S97, moot (Flecks retired), S71, S72, S94 |
| Interaction, Opus | Sharp spelling; wrong intervals; raw Tonal chord names | S26–S29 |
| Interaction, Opus | Chromatic syllables missing; fallback to Do; borrowed letter names; MIDI drops out-of-scale; live humming ignores; final humming throws | S30, S31, S41, S141, S42 |
| Interaction, Opus | Mode change by degree index; Hot Cross Buns | S34, S36 |
| Interaction, Opus | Number row ignores the Joystick | S37 |
| Interaction, Opus | Four input paths; dead events; unused letter lookup; empty aria-keyshortcuts; macOS Cmd key-up | S49, S52, S51 |
| Interaction, Opus | Keyboard god component; daily key-shape edition costs muscle memory | S55, S125 |
| Interaction, Opus | Pitch gate margin, frame count, octave jumps; no quantise | S43, S44, S45 |
| Interaction, Opus | Directions: interval-from-tonic model; humming as lesson start with key-finding; Joystick as harmony teacher | W2 (derived identity); S106; S39, S40 |
| Interaction, Opus | Ideas: call-and-response; resolution drills; drone; chord-function hints; progress; la/do minor | OoS; drills OoS under Decision 2, the visual resolution cue is S98; S101; S100; OoS; S33 |
| Interaction, Fable | Humming throws; velocity from confidence; frames not time; 45 s cap removed | S42, S47, S44, S46 |
| Interaction, Fable | Three lifecycles drifting; QWERTY needs the production Keyboard | S49, S50 |
| Interaction, Fable | Spelling and chord-symbol formatting | S26, S28 |
| Interaction, Fable | Solfège stops at the melody row; do-based minor undocumented | S32, S30, S33 |
| Interaction, Fable | Keyboard god component; per-key bounding-rect reads | S55, S54 |
| Interaction, Fable | Mode mutation lossy (clears borrowed status) and cumulative (round trips don't restore) | S34, S142, W2 (remap from the original) |
| Interaction, Opus | Keyboard template before script, against the repo's standard | W3 (block order) |
| Interaction, Fable | Copyrighted transcriptions | S22 |
| Interaction, Fable | Dead live-listening composable | S12 |
| Interaction, Fable | Directions: one input bus; degree-first pattern model; humming as sing-back scorer | S49; OoS (format), W2 (derived); OoS |
| Interaction, Fable | Ideas: Roman numerals with solfège members; voice-led voicings; number-row inversions; quiz; cents meter; ascending chromatic syllables; scale continues across unused QWERTY keys | S40, S32; S103; S38; OoS; S107; S30; S53 |
| Synthesis | Licence, AGPL | S19, S20 |
| Synthesis | Keep the honest-evidence habit while cutting the ledgers | S145, W1 |

### Retrospective #2 (2026-10-06)

| Source | Item | Disposition |
| --- | --- | --- |
| Design, Fable | Lab found accessibility defects; adoption kept them; rule exception needed | S123 |
| Design, Fable | Readout hidden from assistive technology | S58 |
| Design, Fable | Marquee inactive labels 2.17:1; Note labels fixed white | S60, S59 |
| Design, Fable | Ledgers grew after the freeze advice; quoting chat verbatim | S131 |
| Design, Fable | Bar Tape lived under three days; programme closed then reopened; Compounds lab skipped screenshots | S130, S124, Further Notes |
| Design, Fable | Drift: Tomato LED, Bone cap, perpetual brass sheen, Code Strip colours, picker hex, brand papers in the Sticker type | S127, S128 |
| Design, Fable | Edition module ×3, collar recipe ×2, seeded random ×2; chord editions in Keyboard | S126, W8 (one seeded-random helper), S55 |
| Design, Fable | Skill marked temporary but extended | S132 |
| Design, Fable | Directions: Log→PR and Plan→bible; lab inside product; accessibility as a lab step | S131; OoS (query pin only, S125); S124 |
| Design, Fable | Ideas: zone type and stylelint; one edition helper; per-pitch label colour; axe per guide page; sheen as sounding response | S11, S127; S126; S59; S8; S128 |
| Design, Opus | Lab's Tabs fix dropped; test asserts the bug; range Knobs | S56, S57 |
| Design, Opus | Focus ring invisible on Ivory/Brass; unlit chads 1.5:1; 32px recorded as invariant | S60, S123 |
| Design, Opus | Bottom-up churn; Compositions prompt forbids touching parts | S130 |
| Design, Opus | Bible §12 (is the top-menu panel chassis?) settled piecemeal by #129 | W8 (settle before Compositions) |
| Design, Opus | Editions as a lottery; Marquee only 44px edition; Brass Tabs edition on paper | S125, S127 |
| Design, Opus | Complement accent still computed; small colour leftovers; Knob HSL greys; no test | S91, S127, S11 |
| Design, Opus | Records growth; screenshots outside the repo | S131, S9 |
| Design, Opus | Beat everywhere; Crown faint | S129, S60 |
| Design, Opus | Directions: top-down screen; one edition per unit; executable checks | S130; Decision 5, S125; S8, S9, S11 |
| Design, Opus | Ideas: label from lightness; guide as test harness; axe in labs; beat cue under reduced motion; announce dragged value | S59; Seam 4; S124; S65; S58 |
| Product, Fable | Teaching bugs untouched; no pedagogy | W2, S97–S109 |
| Product, Fable | Product work stopped 09-28; #122 unreviewed | Sequencing; S105 |
| Product, Fable | No CI; lint script flags; Vercel builds but never tests | S1, S2 |
| Product, Fable | Verify launcher disproportionate and wraps the Vercel build | S3 |
| Product, Fable | New persisted keys without versions; quota swallowed; count-based cap | S84, S82, S83 |
| Product, Fable | Keyboard grew with expression | S55 |
| Product, Fable | #92 reach: no expression on fallback; MIDI parses only on/off; export approximates | S116, S114, W9 |
| Product, Fable | Stale PRs: close four, merge #64 and #67 | S23, S24 |
| Product, Fable | #95 adds a sample download to boot | W5 (deferred to first input) |
| Product, Fable | Directions: correctness-first; decide instrument or teacher and write it into the bible; Strudel with direct Patterns, export-only notation, UIBeat and Stage on the scheduler clock | Sequencing; Decision 2, S138; Decisions 3 and 4, S139 |
| Product, Fable | Ideas: sing-back from the phrase book; drone as a pinned member; byte cap with "shelf full"; degree-plus-accidental identity; suite wall-time budget | OoS; S101; S83; W2; S4 |
| Product, Opus | Third syllable table (Se vs Fi); follow uses the degree remap; Looper bending planned on it; no tracker issue | S31, S34, S35, Further Notes (publishing) |
| Product, Opus | Green depends on host; 0 vs 36 failures reported the same day; lock serialises agents | S1, S3, S5 |
| Product, Opus | Stale PRs conflict; MIDI lacks velocity and bend; overlap grouping duplicated; BJS-414 still In Review | S23, S114, W3 (verify #140 removed it) |
| Product, Opus | Kept phrases exempt from cap; curves up to 8,192 points | S83 |
| Product, Opus | Records drift: pattern-system status; #103 merged as big-bang with synthetic migration tests; root doc; router routes design only | S18, S86, S16, S17 |
| Product, Opus | Directions: data-first transport; one tempo grid including live play styles; name the pivot | OoS unless phone gate fails; S111; Decision 2 |
| Product, Opus | Ideas: AGPL licence; MPE; ±50 cent bend too narrow; emotion content unrendered; #122 as a path; mute latency criterion | S19, S20; S114; S115; S95; S105; S112 |
| Verification run | One timeout under host load; build waits on the lock for 10 minutes | S5, S3 |

### Raised in this spec

| Item | Disposition |
| --- | --- |
| Let's Jazz font files in a public repo; licence unverified | S21 |
| Voice audio sent to the analysis service without notice | S25 |
| #140 mode bending is degree-based and should share the identity module | S35 |
| #140 latency calibration not persisted | S87 |
| The Looper brief (#138) still says "Proposed" for Strudel | W10 docs |
| Costs of each decision, per Burooj's "never make a tradeoff silently" | Decisions 1–5 and the "Costs" bullets in W1, W2, W4, W6, W7, W8, W9 |
