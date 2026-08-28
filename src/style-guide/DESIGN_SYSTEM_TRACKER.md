# Design System Tracker

Current truth for the temporary EmotiTone production visual-design pass. Read this file with `$emotitone-design-system`; do not reconstruct the workflow from chat or old design-lab documents.

## Mission

Tighten, touch up, and promote the visual design already present in production, the style guide, and the external reference material. Burooj remains the taste authority where a real visual choice survives the evidence; the agent should autonomously reconcile obvious omissions and drift.

```text
tokens -> primitives -> compounds + uniques -> compositions
```

Compositions are production surfaces. Reusable visual grammar must live at its lowest appropriate layer and be consumed upward. A higher unit cannot close while it silently owns a reusable token or primitive recipe.

This is a visual migration. Preserve existing interaction, audio, routing, state, persistence, APIs, accessibility behavior, haptics, and motion. Park functional changes as separate work.

## Truth and gates

Truth has two repository homes:

- This tracker holds current definition, source, specimen, production-adoption, dependencies, and frontier truth.
- `DESIGN_LOG.md` holds chronological acceptance and implementation receipts.

Linear `BJS-35` holds workflow state and external receipts. `/Users/burooj/BJsWorkspace/Projects/emotitone-design-system`, style-guide specimens, screenshots, and Git history are reference evidence, not acceptance authority.

Each unit advances through four independent claims:

1. **Defined** — Burooj explicitly accepted the visual definition.
2. **Authoritative source** — one real source owns the accepted visual grammar.
3. **Real specimen** — the style guide imports and drives that source.
4. **Production adoption** — the production surface consumes that source.

None implies the next. A file existing or already being used in production does not make its design accepted.

## Current checkpoint — 2026-08-28

- Branch: `implementing-design-system`; recompute dirty/ahead/push state live.
- Accepted and authoritative: Note, Key, and the Analog Ring + Digital Arc Knob family.
- Sticker's non-badge definition is accepted. Badge's brass-only identity is accepted, while whether it remains a Sticker variant or becomes its own primitive is open.
- Keyboard is the single production compound and is mounted in the guide, but its exact visual density remains **Under review**.
- CodeStrip + action bar is the next fresh definition session.
- Drawer follows as its own definition session.
- `DrawerKeyboard.vue` becomes the composition only after CodeStrip + action bar, Keyboard, and Drawer are defined.
- Music Color remains an independent later visual gate.
- Do not re-grill Note, Key, or Knob without a concrete contradiction or explicit request.

## Active frontiers and dependencies

Two unit sessions are ready and may proceed independently:

- visually inspect and accept the Keyboard density matrix in its existing workbench;
- define, formalize, adopt, and verify CodeStrip + action bar.

Drawer follows CodeStrip + action bar. `DrawerKeyboard.vue` becomes the production composition only after CodeStrip + action bar, Keyboard, and Drawer are defined. Then resume the remaining queue one unit per session and finish with a fresh lineage audit across the completed pass.

Adjacent sessions are allowed when their files and lineage do not overlap. Shared token or primitive promotion must be coordinated before dependent sessions close.

## Unit map

| Unit | Layer | Definition | Source / specimen / production truth | Next gate |
| --- | --- | --- | --- | --- |
| Sticker | Primitive | **Accepted outside Badge boundary** | `components/primatives/Sticker.vue` is the source and its real specimen imports it; no production consumer exists | Preserve outline/fill identity while Badge taxonomy is settled |
| Badge | Candidate primitive; currently a Sticker variant | **Brass-only identity accepted; taxonomy under review** | Current `Sticker.vue` exposes Badge through the shared color API and the specimen shows tomato/pine examples; this is implementation drift, not accepted Badge identity | Visually compare Badge as its own identity; choose extraction or retained variant before formalizing |
| Note | Primitive | **Accepted** | `components/primatives/Note.vue` is authoritative; real specimen and production Keyboard consume it through Key | Finish five geometry token recipes; define new consumers separately |
| Key | Compound | **Accepted** | `components/compounds/Key.vue` is authoritative; real specimen and production Keyboard consume it | Maintain Note/Key ownership boundary |
| Knob — Ring + Arc | Primitive deep module | **Accepted** | `components/primatives/Knob/index.vue` is the sole public production/specimen interface after `5da92b2` | Maintain the one public seam; treatment assignment remains per consumer |
| Keyboard | Compound | **Under review** | `components/compounds/Keyboard.vue` is the single production source; guide drives it with `usage="controlled"` | Burooj accepts or adjusts the visual-density matrix |
| CodeStrip + action bar | Unique + related controls | **Next** | CodeStrip has a source and real specimen; the production action bar has no separate specimen and the final coupled-unit boundary is unsettled | Inventory each artifact, declare the session boundary, then run a compact visual definition |
| Drawer | Unique | **Undefined** | Current DrawerShell/specimen/production hosts are evidence, not accepted Drawer doctrine | Define after CodeStrip + action bar |
| DrawerKeyboard | Composition | Relationship accepted; definition pending | Current file is mixed production evidence, not the final composition | Compose only after its three inputs are defined |
| Music Color Recipe | Token recipe | **Under review; later** | Runtime resolver is calculation authority; current swatch presentation is unaccepted drift | Reconcile the original wheel intent with one runtime recipe |

Remaining queue, not current authority:

- **Tokens:** UI Colors, Brand Colors, Spacing + Radius, Spacing Scale, Typography, Motion, Geometry.
- **Primitives:** Bar Tape, Beat Indicator, IconButton, Card, Kicker, Marks, Spine Card, Tabs.
- **Uniques:** Brand Cover, Brand Logo.
- **Compounds:** Pattern Card, Pattern Reel.
- **Compositions:** Loading Screen.

## Accepted visual contracts

### Note and Key

- Note owns noninteractive musical identity and presentation; Key owns the native momentary physical wrapper.
- Accepted Note geometry families: `standard`, `tile`, `offcut`, `tab`, `pill`; proportions: `tall`, `medium`, `stocky`, `wide`; surfaces: `colored`, `monochrome`.
- Physical `pressed` and musical `sounding` remain independent.
- Promote all five geometry families into coherent named token recipes before dependent randomization closes. This does not reopen their visual acceptance.

### Keyboard

- Bare responsive twelve-pitch grid; its parent owns shell, framing, resizing, and action composition.
- Main octave has strongest hierarchy. Requested rows are 1, 3, 5, and 7; unavailable octave-edge rows clip rather than forcing symmetry.
- Every row keeps all twelve pitches visible without horizontal scrolling or pitch removal.
- Local date chooses one shared geometry family from a deterministic shuffled five-day deck. Each load creates bounded family-specific cut, rotation, shadow, overlap, and stable layer variation while rectangular hit targets remain stable.
- Labels remain accessible and visually scale rather than disappear. `colored | monochrome` remains a presentation choice.
- Still unaccepted: exact gap, main/outer proportions, inset, narrow typography, overlap, and responsive variation amplitude. Inspect at 320, 390, 768, and 960 CSS px plus relevant rows, octave edges, families, labels, surfaces, states, Reduced Motion, and forced colors.

### Knob

- `components/primatives/Knob/index.vue` is the only public interface. Its adjacent role, face, and type files are private implementation.
- Ring and Arc are visual treatments of one production-led family. Brass and Ivory are semantic per-consumer treatments, not active/inactive states.
- Preserve compact bottom-label anatomy, Range/Boolean/Options/Button grammar, values, gestures, haptics, compatibility events, disabled/display behavior, arbitrary and per-option colors, and tactile production motion.
- Range uses the accepted 270-degree sweep. Boolean and Button are full-circle. Options use real count/current-position geometry. The old layered/perpetually moving Digital Button specimen remains rejected.
- Gallery cells, top captions, dividers, and footers are specimen scaffolding.
- Verification at `5da92b2` / `a6c55ed`: 17/17 focused public-consumer tests, type-check, and production build pass. Live Chrome captures show nine 42px production action-row Knobs plus 18 42px specimens split evenly across Ring and Arc; all four roles and Brass/Ivory active/off/loading states are present. Active Button transforms changed across a 350ms sample. In a forced-overflow production row, a horizontal BPM gesture moved `scrollLeft` from 100 to about 69.83 while BPM remained 120. Happy DOM cannot deliver that positive native document-event handoff, so the public regression test keeps an observable setter, asserts no value/haptic emission, and records the browser evidence boundary.

## Cross-cutting truth and lineage watchlist

- Badge is brass-only. Tomato, pine, and other brand colors remain valid for non-badge Stickers. Its current implementation as a colorable Sticker variant is evidence to replace or constrain after deciding whether Badge deserves its own primitive.
- Brand colors are decorative. Semantic color aliases such as `--danger` are legacy cleanup, not design doctrine.
- Prefer filled surfaces where possible and minimize borders; treat an outline as intentional visual grammar, not default structure.
- Glassmorphism is rejected across the app. Purge the obsolete persisted/config surface in a separately scoped cleanup; do not present glass as a Keyboard or Drawer option.
- Music Color's original mounted intent was a segmented chromatic wheel with fixed/movable, root, octave 0–8, scale-count, and hue-sweep controls. `b140654` replaced it with linear swatches and octave 2–8 while consolidating calculation authority. The resolver consolidation is useful; the visual replacement was never accepted.
- Motion token specimens must not turn Reduce Motion into an `opacity-blink` fallback. Resolve that during the Motion unit.
- Glissando is absent and tracked separately as `BJS-371`; it is not a visual regression or acceptance condition.
- QWERTY remapping, roving focus, Space/Enter lifecycle, source coordination, remap cancellation, sounding announcements, and revised haptics are product/accessibility ideas outside this visual pass.
- Reconcile style-guide `primatives/IconButton.vue` with production `ui/IconButton.vue`, `ChipTabs.vue` with production `ui/Tabs*`, and `compounds/PatternCard.vue` with production `patterns/PatternCard.vue` in their own units.
- LoadingScreen reached production before visual acceptance. Preserve Kicker -> SpineCard and PatternCard -> PatternReel as dependency chains rather than copying their lower-level grammar.
- The Drawer specimen uses `DrawerShell`, and production `TopDrawer.vue` already imports it; Drawer definition remains open, not source integration.

## Session handoff

End every unit session by updating only current truth here and appending one concise `DESIGN_LOG.md` receipt. Record:

- unit and gate reached;
- source, specimen, and production status independently;
- lineage promotions or deliberately local rules;
- commits and exact checks;
- visual evidence and its limits;
- dirty/pushed state;
- unresolved visual frontier and next unit.

A spoken “done,” a mounted specimen, or a passing build is not a handoff.
