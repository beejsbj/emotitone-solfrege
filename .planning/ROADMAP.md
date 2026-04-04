# Roadmap: EmotiTone Solfege

## Overview

This v1 roadmap is a finishing pass for an already capable browser instrument. The sequence hardens the core play flow first, then fixes color-system correctness and parity, then curates shell chrome, visual config, and themes into a more deliberate whole, and only after that makes pattern work feel central inside the finished instrument. The harmonic teaching surface and any `FloatingPopup` redesign stay in v2 unless the requirements change.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Instrument Trust & Flow** - Remove misleading or rough behavior from the main play, capture, and playback loop.
- [ ] **Phase 2: Color System Correctness** - Make chromatic color behavior and Hilbert scope behavior consistent, intentional, and trustworthy.
- [ ] **Phase 3: Visual Config & Theme Cohesion** - Prune stale visual controls and turn the shell and theme system into a calmer, curated presentation.
- [ ] **Phase 4: Pattern Workflow Cohesion** - Make saved patterns and the live strip feel authored, legible, and central to the instrument.

## Phase Details

### Phase 1: Instrument Trust & Flow
**Goal**: Users can move through the main instrument flow without dead interactions, hidden loading, or browser-level friction.
**Depends on**: Nothing (first phase)
**Requirements**: FEEL-01, FEEL-02, FEEL-03, FEEL-04
**Success Criteria** (what must be TRUE):
  1. User can distinguish transport, edit, and commit actions at a glance from instrument/configuration controls within the keyboard working area.
  2. User sees an explicit loading or warming state after changing instruments until the selected sound is actually ready to play.
  3. User can move between live play, capture, and playback without misleading dead interactions or obvious roughness in the main instrument flow.
  4. User can use the main instrument surface without accidental page-style scrolling during normal play.
**Plans**: 4 plans
Plans:
- [x] 01-01-PLAN.md — Split config controls from live-strip and pattern commit actions, then make delete/send mutations visibly legible.
- [ ] 01-02-PLAN.md — Add a selected-versus-ready instrument contract, route playback plus selector UI through honest warming state, and block on browser warming verification.
- [ ] 01-03-PLAN.md — Guard the live workspace during warming and lock body scrolling while preserving local scroll regions.
- [ ] 01-04-PLAN.md — Move pattern capture onto the emitted ready-instrument note contract and add focused downstream consumer verification.
**UI hint**: yes

### Phase 2: Color System Correctness
**Goal**: Users can trust the app's chromatic color mapping and Hilbert scope behavior to be musically coherent across surfaces and outputs.
**Depends on**: Phase 1
**Requirements**: COLR-01, COLR-02, COLR-04
**Success Criteria** (what must be TRUE):
  1. User can switch between the fixed chromatic color mode and the movable chromatic color mode without ambiguity about which mapping is active.
  2. User sees the active color mode applied consistently across the keyboard, music-coupled visuals, and ROLI or Blocks output.
  3. User can rely on the Hilbert scope behaving with option and rendering parity to the reference implementation in the Codeberg Strudel fork, with any app-specific deviations made explicit and intentional.
**Plans**: TBD
**UI hint**: yes

### Phase 3: Visual Config & Theme Cohesion
**Goal**: Users experience a calmer shell and a curated visual system whose controls and themes feel deliberate instead of accumulated.
**Depends on**: Phase 2
**Requirements**: COLR-03, CFG-01, CFG-02, CFG-03, CFG-04
**Success Criteria** (what must be TRUE):
  1. User experiences calmer neutral shell chrome while vivid chromatic color remains focused on musical surfaces and music-linked indicators.
  2. User sees a visual-config panel whose available controls feel relevant to the current visual system instead of noisy or stale.
  3. User can trust that each visible visual-config control changes the behavior its label implies.
  4. User can choose built-in themes that coordinate multiple visual subsystems into deliberate cohesive moods instead of arbitrary parameter bundles.
  5. User sees the default beating-shapes presentation use a reduced, more intentional shape vocabulary that feels musical rather than ugly or noisy.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Pattern Workflow Cohesion
**Goal**: Users experience patterns and the live strip as a central, readable part of the instrument rather than a detached side utility.
**Depends on**: Phase 3
**Requirements**: PATT-01, PATT-02, PATT-03, PATT-04
**Success Criteria** (what must be TRUE):
  1. User can scan saved patterns through cards or list items with clear hierarchy, stronger musical identity, and easier visual comparison.
  2. User can open a saved pattern directly into the live Strudel editing surface from its pattern card.
  3. User can read the live strip as an integrated part of the instrument shell rather than a detached utility panel.
  4. User can keep newly captured notes in view while live sketching because the strip follows or scrolls smoothly as notes are added.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Instrument Trust & Flow | 1/4 | In Progress | 01-01 |
| 2. Color System Correctness | 0/TBD | Not started | - |
| 3. Visual Config & Theme Cohesion | 0/TBD | Not started | - |
| 4. Pattern Workflow Cohesion | 0/TBD | Not started | - |
