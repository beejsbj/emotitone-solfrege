# Requirements: EmotiTone Solfege

**Defined:** 2026-03-30
**Core Value:** It should feel immediate and alive: a quick-play, quick-sketch instrument that teaches through touch, sound, and visual feeling without getting in the way.

## v1 Requirements

### Pattern Workflow

- [ ] **PATT-01**: User can scan saved patterns through cards/list items with clear hierarchy, stronger musical identity, and easier visual comparison
- [ ] **PATT-02**: User can open a saved pattern directly into the live Strudel editing surface from its pattern card
- [ ] **PATT-03**: User can read the live strip as an integrated part of the instrument shell rather than a detached utility panel
- [ ] **PATT-04**: User can keep newly captured notes in view while live sketching because the strip follows/scrolls smoothly as notes are added

### Instrument Feel

- [x] **FEEL-01**: User can distinguish transport, edit, and commit actions at a glance from instrument/configuration controls within the keyboard working area
- [ ] **FEEL-02**: User sees an explicit loading or warming state after changing instruments until the selected sound is actually ready to play
- [x] **FEEL-03**: User can move between live play, capture, and playback without misleading dead interactions or obvious roughness in the main instrument flow
- [ ] **FEEL-04**: User can use the main instrument surface without accidental page-style scrolling during normal play

### Color & Visual Coherence

- [ ] **COLR-01**: User can switch between a fixed chromatic color mode (`360 / 12`, `C = 0`) and a movable chromatic color mode (`360 / scaleCount`, `keyRoot = 0`)
- [ ] **COLR-02**: User sees the active color mode applied consistently across the keyboard, music-coupled visuals, and ROLI/Blocks output
- [ ] **COLR-03**: User experiences calmer neutral shell chrome while vivid chromatic color remains focused on musical surfaces and music-linked indicators
- [ ] **COLR-04**: User can rely on the Hilbert scope behaving with option and rendering parity to the reference implementation in the Codeberg Strudel fork, with any app-specific deviations made explicit and intentional

### Visual Config & Themes

- [ ] **CFG-01**: User sees a visual-config panel whose available controls feel relevant to the current visual system instead of noisy or stale
- [ ] **CFG-02**: User can trust that each visible visual-config control changes the behavior its label implies
- [ ] **CFG-03**: User can choose built-in themes that coordinate multiple visual subsystems into deliberate cohesive moods instead of arbitrary parameter bundles
- [ ] **CFG-04**: User sees the default beating-shapes presentation use a reduced, more intentional shape vocabulary that feels musical rather than ugly or noisy

## v2 Requirements

### Harmonic Teaching Surface

- **HARM-01**: User receives near-action solfege, interval, or chord feedback while playing without relying on a detached floating overlay
- **HARM-02**: The chosen harmonic teaching surface integrates coherently with the keyboard, live strip, and visual system

### Extended Visual System

- **VIS-01**: User can choose subsystem-level visual presets for particles, strings, blobs, Hilbert scope, and ambient layers
- **VIS-02**: Particle marks feel music-native and intentional rather than generic decorative shapes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Interval bridges / chord geometry | Strong idea, but it adds invention scope before the current instrument is fully polished |
| Chord row expansion | Interesting exploration, but not part of the finishing pass |
| Swipe-key interaction model | Novel interaction work, not required to finish the current instrument |
| Circular keyboard layout | High design and cognition risk for this stretch |
| DAW-like sequencing or production expansion | Conflicts with the product's quick-play, quick-sketch core value |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PATT-01 | Phase 4 | Pending |
| PATT-02 | Phase 4 | Pending |
| PATT-03 | Phase 4 | Pending |
| PATT-04 | Phase 4 | Pending |
| FEEL-01 | Phase 1 | Complete |
| FEEL-02 | Phase 1 | Pending |
| FEEL-03 | Phase 1 | Complete |
| FEEL-04 | Phase 1 | Pending |
| COLR-01 | Phase 2 | Pending |
| COLR-02 | Phase 2 | Pending |
| COLR-03 | Phase 3 | Pending |
| COLR-04 | Phase 2 | Pending |
| CFG-01 | Phase 3 | Pending |
| CFG-02 | Phase 3 | Pending |
| CFG-03 | Phase 3 | Pending |
| CFG-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-04-02 after plan 01-01 completion*
