# EmotiTone Solfege Blog Post Outline

This document is for a future Substack post and optional case-study version. It exists to turn repo archaeology and interview material into a publishable narrative, not to preserve every detail for its own sake.

## End Goal

Primary deliverable:

- A personal Substack post about the journey of building EmotiTone Solfege: the original desire, the turns, the overbuilding, the pauses, the discoveries, and what feels close now.

Secondary deliverable:

- A more visual case study version using screenshots, clips, and selected commit milestones.

This means future research should prioritize:

- moments of changed understanding
- reversals and pivots
- representative UI eras
- motivations behind design and architecture changes
- the relationship between personal music learning and product decisions

This means future research should deprioritize:

- exhaustive commit coverage for its own sake
- minor fixes unless they reveal a deeper struggle
- technical details that matter only to implementation and not to the story

## Working Title Ideas

- I Was Not Building A DAW: The Long Way To EmotiTone Solfege
- Building EmotiTone Solfege: From Note Pads To Pattern Language
- Finding The Shape Of A Music App By Building The Wrong Versions First
- Solfege, Color, Feel: The Journey Behind EmotiTone Solfege

## Core Angle

This should not read like a polished product launch post. The strength of the story is that the project kept changing shape as the real problem became clearer.

The central thread:

I started wanting a playful, immediate way to play notes and melodies without the overhead of a DAW. More specifically, I wanted something almost like texting, but for music: a quick interface where I could sketch ideas and hear them back. Learning more music theory, especially solfege and interval relationships, changed the goal. Then visuals, sequencing, and pattern systems pulled the project outward. Eventually I had to learn which complexity was serving the idea and which complexity was replacing it. Strudel became the turning point because it let me stop hand-building the wrong abstraction.

## Suggested Structure

### 1. The First App Was About Touch, Not Theory

- Describe the original Note Pads goal.
- Mention Koala and Ableton Note as UX references.
- Show that the earliest version was about direct play: pads, melodies, octave movement, minimal friction.
- Use the "texting but for music" metaphor.
- Use an early screenshot or reconstructed clip from `ffacd59`.

### 2. Solfege Changed The Question

- Explain the moment interval relationships started to click.
- Introduce the idea that different keys preserve relational shape.
- Bring in the desire to map solfege to color, feeling, and semantic language.
- Mention Sonofield as inspiration.

### 3. I Wanted The App To Explain What The Music Felt Like

- Introduce the floating popup as a key concept.
- Explain how it showed notes, intervals, chords, and emotional descriptions in real time.
- Talk about why this mattered: not just analysis, but making relationships legible while playing.
- Note that this was primarily for the author himself while learning, not initially for an imagined user base.

### 4. Then I Started Chasing The Right Visual Language

- Explain the visual experiments, especially the Hilbert scope work and color systems.
- Talk about why this was not just cosmetic work.
- Tie visuals to learning, feel, and musical identity.

### 5. The Sequencer Era: Ambitious, Exciting, Too Heavy

- Show the circular sequencer / custom sequencing period.
- Acknowledge what was exciting about it.
- Also explain the cost: complexity, UI weight, and drift from the original tactile simplicity.
- This is a good place to use the large deletion / simplification phase as a narrative hinge.

### 6. The Project Kept Correcting Me

- Use the PWA add-then-revert moment and the sequencer removal as examples.
- Frame this as learning, not failure.
- Emphasize that removing systems was one of the main ways the project got better.

### 7. Strudel Let The Project Breathe Again

- Explain how discovering Strudel reframed sequencing.
- Mention side explorations like MIDI + Strudel if relevant.
- Clarify that MIDI-to-Strudel work mattered mainly as an enabling side-thread for note-on / note-off to pattern conversion, not as the core story of this app.
- Show how replacing the custom sequencer with Strudel changed the architecture and momentum.
- Use the March 2026 commits as the beginning of the current form.

### 8. What The App Is Becoming Now

- Describe the near-finish shape: live sketch flow, pattern cards, current sketch playback, visual configuration, unified runtime.
- Be honest that the project is not done.
- Mention what still feels unfinished: visuals, popup reintegration, haptics, maybe the last stretch of UX fit and finish.

### 9. What This Project Taught Me

- You can build the wrong version of the right idea and still be making progress.
- UX feel is not separate from musical intent.
- Visual language can teach, not just decorate.
- Some systems are worth inventing; others are worth adopting.
- The end of a project often feels less like triumph and more like finally recognizing the shape that was there all along.

## Scenes Worth Writing Vividly

- The first small Note Pads prototype.
- The realization that keys preserve relationships even when literal notes change.
- The moment the floating popup started making theory visible in play.
- Falling into visual experimentation and Hilbert scope thinking.
- The period when the app started to resemble a custom mini-DAW.
- The decision to remove major sequencing systems.
- Discovering Strudel and realizing it solved the right problem.
- Merging the old Note Pads history back in near the end.

## Tone Notes

- Keep the voice personal and process-oriented.
- Avoid pretending every iteration was intentional from the start.
- Let the false starts stay visible.
- Treat deletions, rewrites, and pauses as real milestones.
- Let the reader feel the difference between "feature growth" and "clarity."

## Media To Gather

- Original Note Pads UI.
- Circular sequencer era.
- Floating popup showing intervals/chords/emotion.
- Hilbert scope / visual experiments.
- Post-sequencer simplified keyboard flow.
- First Strudel pattern playback UI.
- Current near-finish live sketch workflow.

## Before Drafting Full Prose

- Reconstruct milestone commits and capture screenshots or clips.
- Pull 2-3 short excerpts from docs or PRs that show the project reflecting on itself.
- Decide whether the post should end with "what's left" or "what finally clicked."

## Working Filter For Future Questions

When asking future questions, prefer ones that help answer:

- What was the original desire?
- What changed the author's understanding of the project?
- Which features were true expressions of the idea, and which were attractive detours?
- What did the project teach about music, interface, and abstraction?
- Why does the current version feel close?
