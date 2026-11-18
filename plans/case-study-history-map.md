# EmotiTone Solfege Case Study History Map

This is a working research document for a future blog post or case study. It is not the blog post itself. The goal is to map the real development story with enough detail that the final writeup can show actual turns, reversals, and design pressure instead of flattening everything into a clean retrospective.

## Working Thesis

This project did not move in a straight line from idea to implementation. It kept changing shape as the core question sharpened:

- Act zero: how do I make it easy and pleasurable to play notes and melodies without a giant DAW UI?
- Next question: what if solfege could make interval relationships emotionally and visually legible?
- Next temptation: what if the app itself became a striking audiovisual object?
- Next expansion: what if it could sequence and record ideas too?
- Major correction: custom sequencing added power but also drag.
- Late convergence: Strudel became the right abstraction for pattern playback, which let the app move closer to its real center.

## What Pulled The Direction

Some of these pulls are visible in git. Some come from the author's own recollection and should be treated as first-person source material for the eventual post.

- Koala and Ableton Note influenced the desire for immediacy, playability, and low-friction UX.
- The real origin problem was vocal: the author was singing melodies and wanting a quick way to find or reconstruct them without opening a full DAW, setting up samples, or pulling out a piano.
- The throat and voice were treated as the most immediate musical interface, which is why microphone input appeared early and still matters conceptually now.
- Sonofield influenced the attempt to connect pitch relations, feeling, and color.
- Solfege became the conceptual bridge: same interval relationships across keys, different literal notes.
- The syllables themselves started to feel intuitive and embodied, not just theoretical labels.
- Semantic and emotional language was used to give each scale degree a felt identity.
- Some of that semantic language was generated with AI by asking how intervals and chords are typically described emotionally or culturally.
- The floating popup became a key interpretive UI: real-time notes, intervals, chords, and emotion.
- The popup was not meant as neutral analysis. It was meant to build grooves of connection between semantic ideas and musical feel while the author was learning music for himself.
- Visual experiments were not decoration after the fact; they were part of the learning model and part of the instrument feel.
- Hilbert scope work suggests a deep interest in representing musical structure spatially, not just sonically.
- Hilbert scope specifically came from Google's "Creatively Seeing Music" work and stood out because it felt organic, audio-reactive, and like "actually playing" in a way the heuristic visuals did not.
- Haptics and keyboard feel mattered because the app was always trying to be touched and played, not merely configured.
- Strudel marked a late but decisive shift: stop carrying the burden of a custom sequencer where a better pattern language already exists.
- The pattern system was not only for this repo. It was entangled with adjacent work on a MIDI-to-Strudel project, where note-on / note-off architecture and edge cases were being explored in parallel.

## Timeline

| Date | Commit(s) | Era | What Changed | Why It Matters | Candidate Media |
| --- | --- | --- | --- | --- | --- |
| 2025-05-15 | `69b061d` | Note Pads origin | First `note-pads` app lands with pads, melody player, octave control, and Web Audio. | This is act zero: compact playable instrument, not yet a solfege theory environment. | Screenshot of the original pad grid and deep red UI. |
| 2025-05-18 to 2025-05-19 | `d97d8b8`, `b37a4fa`, `ffacd59` | Instrument-first refinement | Adds instrument selector, keyboard pad grid, microphone control, more melodies, octave carousel. | Shows the original problem clearly: easy note access, melody play, compact mobile-ish interaction. | Clip of instrument switching, melody playback, octave carousel. |
| 2025-06-22 to 2025-06-28 | `9006b72`, `13edc77`, `46b6c76`, `b10171b`, `de0228c`, `b348e79` | Solfege and visual system turn | Dynamic colors, visual system work, music fixes, new instruments, haptics, and major refactors begin appearing. | This is where the app stops being only a note toy and starts becoming a music-learning-feeling system. | Before/after visual comparison showing plain pads vs expressive visual treatment. |
| 2025-06-26 | `1b89b4b`, `516d184` | Theory infrastructure | Tonal.js integration lands. | Important conceptual milestone: interval/key logic gets stronger, which supports the solfege framing. | Diagram or code excerpt showing relation between key, scale degree, and note output. |
| 2025-06-30 to 2025-07-03 | `03de438`, `1092524`, `784978c`, `9307a1b`, `d0394e1` | Circular sequencer expansion | Circular sequencer, knobs, sequencer controls, sticky bottom UI, melody library, tooltip system, Lets Jazz styling assets. | This is the first large feature bloom. The app gets more ambitious and more DAW-adjacent. | Screen recording of the circular sequencer and knob-heavy interface. |
| 2025-07-01 to 2025-07-05 | `cc85468`, `c99a2ec`, `f043546`, `bf05cd4` | Reflection and self-analysis | Refactoring docs, architecture analysis, performance strategy, color system cleanup work. | The codebase had become rich enough to need interpretation. This is not just implementation; it is the project noticing its own complexity. | Pull quote from architecture doc or PR screenshot. |
| 2025-07-26 to 2025-07-29 | `9aff808`, `356265e`, `4de67c7`, `1846c45` | Visual deepening | Hilbert scope arrives, roadmap added, config panel expanded, visual metadata evolves. | This looks like the period where visual representation became a serious design question, not a side flourish. | Hilbert scope screenshot, config panel screenshot, visual controls clip. |
| 2025-07-31 | `2946814`, `7263ed5` | Ship impulse, immediate recoil | PWA support is added, then reverted the same day. | Strong signal that the app was not ready to be "finished" in that form. A useful blog moment because it shows timing and mismatch, not just success. | Tiny sidebar anecdote: "the day I tried to package the wrong version of the app." |
| 2025-08-18 to 2025-08-23 | `50673cc`, `feca15a`, `9e7d068`, `bb62f4d`, `5951ee7` | Ruthless pruning | Canvas palette becomes DOM drawer. Then the sequencer runtime and large test surface are removed. Sticky bottom is fixed and the palette becomes the center again. | This is the sharpest pivot in the repo. The project rejects its own overgrowth. | Diff stat screenshot showing the huge deletion, plus UI comparison before and after. |
| 2025-08-25 to 2025-09-02 | `233d462`, `4600410`, `7bb6ad9`, `29fd36b`, `1fc7fda` | Pattern rebuild | New DOM keyboard, Pattern System V2 architecture, live rendering, pattern recording, bracket notation, then a dramatic "clean slate?" wipe, then `patterns`. | This is a rebuild phase, not polish. It shows the difficulty of replacing one mental model with another. | Series of annotated snapshots: keyboard-only, pattern V2, clean slate, restored pattern flow. |
| 2025-09-06 to 2025-11-11 | `ac4210f`, `15901d4`, `00775a1`, `08d1d89`, `362dcb8` | Long tail and partial holding pattern | Manual/controlled attempts, strings/blobs/styling, touch fixes, smaller nudges. | This feels like the project carrying unfinished questions forward without yet resolving them. | Optional montage if visuals changed enough; otherwise summarize lightly. |
| 2026-03-01 | `705c6a2`, `e732426`, `71fbe0b`, `6d14990`, `c3df8da`, `c3b8b7c` | Strudel convergence | Strudel playback, DAW-style pattern list, colored notation tokens, then replacement of Tone.js live notes with superdough and a card-deck pattern UI. | This is the late convergence point. The project regains momentum by replacing a custom sequencing burden with a more fitting system. | Clip of live pattern playback, card deck browsing, and colored notation in sync. |
| 2026-03-03 to 2026-03-06 | `a1dd155`, `692100e` | Product-feel consolidation | PWA audio pre-caching, granular loading, splash redesign, preload fixes, instrument switching fixes. | This is where the app starts feeling less like an experiment bundle and more like a product with onboarding and runtime care. | Loading splash clip and "first note drop" fix anecdote. |
| 2026-03-12 to 2026-03-16 | `9496049`, `758aa32`, `e2adf72`, `2432445`, `90b17a1`, `55a5d80` | Near-finish synthesis | Strudel runtime bootstrap unifies, current sketch playback lands, keyboard undo is added, workspace/sketch flow aligns, and note-pads history is merged back in. | This is both technically and narratively satisfying: the origin story gets reattached to the current project. | Side-by-side framing: original Note Pads vs current live sketch flow. |

## The PR Story

The merge history shows that some of the most important project moves were not just code changes but moments of explicit reflection.

- PR `#1` on 2025-07-03, merged as `d0394e1`, marks the circular sequencer surge. It adds the circular sequencer, knob system, sequencer store/composables, melody library, tooltip infrastructure, and styling assets.
- PR `#4` on 2025-07-01, merged as `cc85468`, centers refactoring opportunities, color system cleanup, typed melody store migration, and stronger internal organization.
- PR `#12` on 2025-07-04, merged as `c99a2ec`, adds `ARCHITECTURE_ANALYSIS.md`. This is a strong clue that the project had become conceptually dense enough to need a written map.
- PR `#13` on 2025-07-04, merged as `f043546`, adds animation performance strategy docs. This suggests mobile feel and rendering smoothness were active constraints, not afterthoughts.

## Narrative Spine For The Blog

This is the strongest story shape so far:

1. I wanted an instrument, not a DAW.
2. More specifically, I wanted a fast bridge between singing and finding notes.
3. Solfege gave me a way to think about relationships instead of isolated notes.
4. Color, emotion, and interval language became part of the teaching model.
5. The app started trying to tell me what I was doing while I was doing it.
6. I kept trying to make the interface worthy of the idea.
7. I overbuilt sequencing because it was exciting and because I was still learning what the app wanted to be.
8. The project repeatedly corrected me by becoming too heavy.
9. Strudel let me stop solving the wrong problem.
10. Near the end, the project began to reconnect its original tactile simplicity with its later conceptual depth.

## Interview Insights Added March 19, 2026

These are direct memory-based insights from the author and should be treated as especially valuable.

- The original app was driven by a concrete frustration: there was no lightweight phone-first tool that felt immediate enough for quickly sketching melodies from the voice.
- Voice was not just an optional input method. It was the earliest internal model of musical intuition. Playing on keys was partly about translating something already felt in the throat.
- The microphone feature matters again now because a future loop is visible: hum a melody, detect notes, convert them into a Strudel pattern.
- The floating popup emerged because the author started asking: if multiple notes are playing, what does that mean emotionally and intervallically right now?
- The semantic layer was partly AI-assisted and partly self-teaching. It was for the author first, even while acknowledging that these emotional descriptions are culturally shaped conventions rather than universal truths.
- The popup now likely wants to become a persistent, time-rooted layer inside the LiveStrip instead of literally floating.
- The circular sequencer was loved as an object and metaphor. It resembled a record player, with notes rotating through a playback line, but it remained disconnected from the embodied act of keyboard playing.
- The sequencer era also carried heavy technical debt: manual Tone.js instrument handling, manually assembled music datasets, and many bugs.
- Discovering Strudel seems to have changed the author's sense of what should remain custom. Sequencing logic, note mapping, samples, playback, highlighting, and tonal relationships all suddenly had another home.
- The pattern system became the architectural bridge between this project and a separate MIDI-to-Strudel project. The base unit became explicit: note-on plus note-off, attack plus release, then conversion into pattern language.
- There was a long period where this repo moved more slowly because adjacent Strudel/MIDI work was clarifying the architecture elsewhere.
- The current feeling is not "done," but "close enough that the remaining gaps are sharply visible": cohesion, popup reintegration, LiveStrip styling, normalization, BPM logic, and deeper cleanup around Strudel.

## Details Worth Pulling Into The Final Case Study

- The current `FloatingPopup` still carries much of the original interpretive ambition: it computes displayed notes, chords, intervals, and emotional descriptions in real time.
- `src/data/solfege.ts` still contains explicit emotional and textural language for each scale degree in major and minor.
- The repository contains both visual ambition and repeated simplification. The interesting story is in the tension between those, not in pretending one side "won."
- The commit messages themselves are useful evidence. Messages like `so cool`, `fix i guess`, and `clean slate?` preserve the emotional weather of the build.
- The merged `note-pads` history matters because it proves the current app did not spring out of nowhere. It grew from a much tighter, more tactile original tool.

## Candidate Media Capture Plan

- Reconstruct and run `ffacd59` for the original Note Pads experience.
- Reconstruct and run `d0394e1` for the circular sequencer / knob-heavy era.
- Reconstruct and run `9aff808` or nearby July 2025 commits for Hilbert scope visuals.
- Reconstruct and run `bb62f4d` for the post-sequencer simplification.
- Reconstruct and run `705c6a2` for the first Strudel-powered pattern playback UI.
- Reconstruct and run `2432445` or `55a5d80` for the current near-finish shape.

If Vercel preview deployments from old PRs are still alive, they should be checked and archived. If not, local reconstruction from commit hashes should be enough for screenshots and short clips.

## Open Questions For The Final Writeup

- When did solfege stop being "content inside the app" and become the app's main conceptual frame?
- Which visual experiments felt like genuine discovery, and which felt like beautiful detours?
- What did the custom sequencer teach that made Strudel feel obviously right later?
- Which current features are still carrying old assumptions that no longer fit?
- Does the floating popup belong in the final experience as a core learning layer, not a decorative overlay?
- What part of the original Note Pads immediacy is still missing in the current build?

## Next Research Moves

- Capture screenshots or clips from the milestone commits listed above.
- Inspect surviving Vercel preview URLs from old PRs and archive any that still work.
- Pull short excerpts from `ARCHITECTURE_ANALYSIS.md`, `docs/performance-strategy.md`, and related planning docs for quote-worthy lines.
- Start a separate blog-post draft once the milestone media exists.
