# EmotiTone Solfege

## What This Is

EmotiTone Solfege is a browser-based pocket instrument for quickly playing notes and sketching patterns without needing a full DAW. It is built for felt, intuitive musical exploration first, then uses solfege, color, and responsive visuals to help musical understanding emerge through play instead of requiring theory up front.

The product is already feature-rich and close to done. The remaining work is a finishing pass: pruning drift, tightening the UI and visual language, fixing misleading or rough behavior, and making the whole instrument feel smooth, coherent, and trustworthy.

## Core Value

It should feel immediate and alive: a quick-play, quick-sketch instrument that teaches through touch, sound, and visual feeling without getting in the way.

## Requirements

### Validated

- ✓ User can play notes quickly in a browser-based instrument surface without a DAW install — existing
- ✓ User can sketch and capture musical note patterns during live play — existing
- ✓ User can save and revisit patterns as musical artifacts inside the app — existing
- ✓ User can explore solfege and interval feeling through color-linked and sound-linked visual feedback — existing
- ✓ User can customize the visual system through a substantial configuration surface and presets — existing
- ✓ User can use external MIDI-oriented integrations such as ROLI/Blocks-related workflows alongside the instrument surface — existing

### Active

- [ ] Make the instrument feel finished through UI/UX polish, bug fixing, pruning, and performance tightening
- [ ] Upgrade the pattern list/cards so saved and live patterns feel authored, legible, and central to the workflow
- [ ] Make the shell and color language more cohesive, with calmer UI chrome and music color reserved for musical surfaces
- [ ] Make loading, config behavior, and interaction feedback more trustworthy so the app does what it seems to promise
- [ ] Revisit the harmonic teaching surface near the action after the polish pass, including whether `FloatingPopup` should be reintegrated, absorbed into the live strip, or replaced by a more grounded interaction surface

### Out of Scope

- Interval bridges and chord-geometry explorations for this stretch — promising idea, but it expands product scope before the current instrument is fully polished
- New major interaction models such as swipe keys, circular keyboard layouts, or chord-row expansion — interesting, but they are invention work rather than finishing work
- Turning this into a fuller DAW-like production environment — contrary to the product's core value of immediacy and simplicity

## Context

This is a brownfield Vue 3 + Pinia + Vite browser app with a single-screen instrument shell, a Strudel-backed live strip, pattern capture, visual subsystems, and audio/MIDI integrations. The codebase map in `.planning/codebase/` shows that the app already has most of the functionality the product needs, but it also shows architectural accumulation from iterative "garden" growth: broad config surfaces, older or rough edges, and a few places where runtime behavior, tests, and UI intent have drifted apart.

The product was built for personal use rather than a generic market abstraction. The motivating problem is not "learn music theory" in the abstract; it is having a lightweight instrument for immediate note play and pattern sketching, then letting intuition connect to solfege, intervals, color, and feeling over time. That personal origin matters because many design choices should stay in service of direct musical contact rather than expanding toward feature-heavy software.

The current finishing conversation clarified that the near-term goal is not more effects or more novel features. It is to make the existing instrument bug-free in practice, buttery smooth in feel, and visually/interactionally coherent enough to feel done. The largest explicitly in-scope design questions are the pattern workflow presentation and the eventual reintegration of the harmonic teaching surface currently associated with `FloatingPopup`, but that second thread should follow the base polish pass rather than derail it.

## Constraints

- **Tech stack**: Keep the existing browser-first Vue 3 / Pinia / Vite architecture — the product is already mature enough that stack churn would distract from finishing
- **Product scope**: Prioritize finishing and refinement over new feature invention — the app is already close to feature complete for its intended purpose
- **Experience**: Preserve immediacy and playfulness — any change that makes the app feel more like a generic web page or a mini-DAW is a regression
- **Visual language**: Reserve vivid chromatic language mainly for musical surfaces and music-coupled visuals — calmer neutrals should carry more of the shell UI
- **Performance**: Interactions, sample loading feedback, and live visual response should feel smooth and honest — hidden work or laggy ambiguity undermines trust
- **Teaching surface timing**: Do not overcommit to a `FloatingPopup` redesign until the core polish pass clarifies what kind of near-action harmonic guidance the app actually needs

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep the product framed as a pocket instrument, not a stripped-down DAW | The original motivation is quick play and sketching with minimal friction | — Pending |
| Treat current work as a polish-and-finish stretch, not a feature-expansion phase | The app is already close to feature complete and needs coherence more than novelty | — Pending |
| Sequence popup/harmonic-teaching redesign after the base polish pass | The current `FloatingPopup` question is real product/design work and should not blur the finishing scope | — Pending |
| Keep interval bridges out of the current stretch | Strong idea, but it belongs after the base instrument feels complete | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after initialization*
