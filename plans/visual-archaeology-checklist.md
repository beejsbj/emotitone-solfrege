# Visual Git Archaeology Checklist

This document tracks whether we have the resources needed to reconstruct the major visual eras of EmotiTone Solfege for a Substack post and optional case study.

## Status Summary

We have enough to begin visual archaeology, but not everything needed to finish it cleanly.

What is already gathered:

- A milestone timeline with candidate commits in [plans/case-study-history-map.md](plans/case-study-history-map.md)
- A blog-focused narrative outline in [plans/blog-case-study-outline.md](plans/blog-case-study-outline.md)
- Interview prompts and author recollections in:
  - [plans/interview-prompts-round-1.md](plans/interview-prompts-round-1.md)
  - [plans/interview-prompts-round-2.md](plans/interview-prompts-round-2.md)
- Branch topology and merge points
- Core milestone commits for major eras
- Evidence of deployment setup via [vercel.json](vercel.json)
- Some visual artifacts inside git history, including:
  - [src/assets/new-sequencer.svg](src/assets/new-sequencer.svg)
  - historical `hilbert-scope-tone.html` in commit `356265e^`
  - configuration and architecture docs that describe intended visuals and interactions

What is not yet gathered:

- Actual screenshots for each milestone era
- Short clips or recordings of milestone builds
- Verified surviving preview/live deployment URLs from past PRs or branches
- A tested reconstruction procedure for each milestone commit
- A "best representative commit" selection for each visual era after actually running them
- Notes on dependency/build breakage per era

## Milestone Eras To Reconstruct

### 1. Note Pads Origin

- Candidate commits:
  - `69b061d`
  - `ffacd59`
- What to capture:
  - pad layout
  - melody player
  - octave carousel
  - microphone control if it runs
- Status: timeline known, media not captured

### 2. Solfege + Popup + Early Visual System

- Candidate commits:
  - `57149dd`
  - `46b6c76`
  - `55c193d`
  - `9347baf`
  - `7344d2a`
- What to capture:
  - first emotional popup version
  - transition from single-note to chord/interval display
  - early color-feel mapping
- Status: code traced, media not captured

### 3. Circular Sequencer / Knob Era

- Candidate commits:
  - `03de438`
  - `1092524`
  - `d0394e1`
- What to capture:
  - circle sequencer
  - knob interactions
  - sticky bottom app-like feel
  - any melody library UI
- Status: code and docs traced, media not captured

### 4. Hilbert / Visual Experiment Era

- Candidate commits:
  - `9aff808`
  - `356265e^` for standalone Hilbert prototype
  - `4de67c7`
- What to capture:
  - Hilbert scope visuals
  - config panel options
  - contrast between heuristic visuals and audio-reactive ones
- Status: prototype file found, media not captured

### 5. Post-Sequencer Simplification

- Candidate commits:
  - `9e7d068`
  - `bb62f4d`
  - `233d462`
- What to capture:
  - DOM palette / keyboard
  - reduced interface weight
  - what the app felt like after pruning
- Status: pivot identified, media not captured

### 6. Pattern Rebuild

- Candidate commits:
  - `4600410`
  - `7bb6ad9`
  - `29fd36b`
  - `1fc7fda`
- What to capture:
  - live strip / notation changes
  - pattern emergence
  - any signs of instability or reset
- Status: architecture traced, media not captured

### 7. Strudel Convergence

- Candidate commits:
  - `705c6a2`
  - `6d14990`
  - `a1dd155`
  - `9496049`
  - `2432445`
  - `55a5d80`
- What to capture:
  - Strudel playback
  - pattern cards
  - live strip
  - sketch flow
  - current near-finish shape
- Status: strong timeline, media not captured

## Resource Inventory

### Local Repo Resources

- `vercel.json` confirms deployment intent
- current source tree still contains important surviving visual systems:
  - `src/components/FloatingPopup.vue`
  - `src/components/UnifiedVisualEffects.vue`
  - `src/components/LoadingSplash.vue`
  - `src/components/DrawerKeyboard.vue`
  - `src/components/patterns/LiveStrip.vue`
  - `src/components/patterns/PatternCard.vue`
  - `src/components/patterns/LiveCard.vue`

### Git-History Resources

- merged `note-pads` history is accessible through commits
- old standalone Hilbert prototype is recoverable from git
- old architecture docs and roadmap snapshots are recoverable from git
- branch names still hint at exploratory eras:
  - `new-sequencer`
  - `new-visualization`
  - `rework-pallete`
  - `patterns-clean-slate`
  - `wip/patterns-rebuild`
  - `before-patterns`

### Missing External Resources

- old Vercel preview URLs, if any still exist
- PR screenshots or attached media, if any exist outside git
- any locally saved screenshots, demos, or recordings not committed into the repo

## What We Need Next

### High Priority

- Reconstruct milestone commits locally and capture screenshots
- Verify which milestones still build with minimal surgery
- Record notes on exact commands and blockers for each era

### Medium Priority

- Search PR pages or deployment history for surviving preview URLs
- Check whether you have local screenshots, recordings, or browser bookmarks from previous versions

### Low Priority

- Build a visual comparison board once raw captures exist

## Bottom Line

No, we do not yet have all resources needed for the full visual git archaeology.

We do have:

- the narrative map
- the milestone commit list
- the branch and merge context
- key code and doc artifacts

We still need:

- the actual visual captures
- verified preview links if they exist
- a reproducible reconstruction workflow for each era
