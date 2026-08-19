# Coverage Audit

Date: 2026-08-19

## Scope

- Current branch style-guide artifacts under `src/style-guide/`.
- Branch-local token file `src/emotitone-design-system.css`.
- Reusable primitive source folder `src/components/primatives/`.
- Reusable composition source folder `src/components/compositions/`.
- Reusable unique source folder `src/components/uniques/`.
- Existing app sources that correspond to remaining composition proofs.
- Upstream doctrine and preview tier names as reference evidence.

## Coverage Table

| Artifact | Current role | Target layer | Source of truth? | Resolution | Proof / Next |
|---|---|---|---:|---|---|
| `src/emotitone-design-system.css` | Token file | tokens | yes | promote | Token source; token doctrine closed for current style-guide scope. |
| `src/style-guide/StyleGuide.vue` | Sink page | specimen helper | yes, for guide entry | keep local | Renders all current layer specimens. |
| `src/style-guide/preview-card.css` | Shared preview chrome | specimen helper | yes, for guide chrome | keep local | Guide-only staging CSS. |
| `src/style-guide/guide/*.vue` | Anatomy/variant helpers | specimen helper | yes, for inspection | keep local | Used by `PrimitiveSticker.vue`; should replace duplicate guide chrome. |
| `src/style-guide/tokens/*.vue` | Token specimens | tokens | no | keep local | Token documentation; specimen-only rules and app migrations are tracked separately. |
| `src/components/primatives/Sticker.vue` | Extracted primitive | primitives | yes | promote | Source-first pattern exists. |
| `src/style-guide/primatives/PrimitiveSticker.vue` | Primitive specimen | primitives | no | keep local | Imports `Sticker.vue`; badge is resolved as the fixed-geometry Sticker variant with shared color vocabulary. |
| `src/components/primatives/BarTape.vue` | Extracted primitive | primitives | yes | promote | Source-first component for strip, segments, proportions, size, dim/downbeat/playhead, and frame. |
| `src/style-guide/primatives/PrimitiveBarTape.vue` | Primitive specimen | primitives | no | keep local | Imports `BarTape.vue`; keeps panel/tick staging local. |
| `src/components/primatives/BeatIndicator.vue` | Extracted primitive | primitives | yes | promote | Source-first component for beat cells, meter count, size, loop duration, downbeat/even/static states, and reduced motion. |
| `src/style-guide/primatives/PrimitiveBeatIndicator.vue` | Primitive specimen | primitives | no | keep local | Imports `BeatIndicator.vue`; keeps stage labels and variant captions local. |
| `src/components/primatives/CardShell.vue` | Extracted primitive | primitives | yes | promote | Source-first component for dark card panel, floating label, mark slot placement, title/body rhythm, compact mode, and border toggle. |
| `src/style-guide/primatives/PrimitiveCard.vue` | Primitive specimen | primitives | no | keep local | Imports `CardShell.vue`; keeps demo marks and light inversion local. |
| `src/components/primatives/IconButton.vue` | Extracted primitive | primitives | yes | promote | Source-first component for icon-only controls, geometry, tone, state, pressed, disabled, and brass treatments. |
| `src/components/uniques/CodeStrip.vue` | Extracted unique | uniques | yes | promote | Source-first singular notation-strip artifact for glyph modes, durations, rests, grouping, lit state, density, and wrapping. |
| `src/components/primatives/Kicker.vue` | Extracted primitive | primitives | yes | promote | Source-first component for dot+label marker anatomy, tone, dot geometry, density, inverse, and form variants. |
| `src/style-guide/primatives/PrimitiveKicker.vue` | Primitive specimen | primitives | no | keep local | Imports `Kicker.vue`; keeps guide staging and captions local. |
| `src/components/primatives/SpineCard.vue` | Extracted primitive | primitives | yes | promote | Source-first component for brand spine panel, matching Kicker child, stamped headline, body copy, compact mode, and one-color rule. |
| `src/style-guide/primatives/PrimitiveSpineCard.vue` | Primitive specimen | primitives | no | keep local | Imports `SpineCard.vue`; action/status examples stay ordinary SpineCard usage. |
| `src/components/primatives/Mark.vue` | Extracted primitive | primitives | yes | promote | Source-first component for flat SVG mark paths, named glyph API, tone, size, and fill/wire treatment. |
| `src/style-guide/primatives/PrimitiveMarks.vue` | Primitive specimen | primitives | no | keep local | Imports `Mark.vue`; family panels, legends, and scale/treatment staging remain local. |
| `src/components/primatives/ChipTabs.vue` | Extracted primitive | primitives | yes | promote | Source-first component for chip-slide rail, streak, active chip, selected/disabled state, geometry, density, and ivory/brass tone. |
| `src/style-guide/primatives/PrimitiveTabs.vue` | Primitive specimen | primitives | no | keep local | Imports `ChipTabs.vue`; keeps anatomy/variant/density explanation local. |
| `src/components/primatives/Knob.vue` | Extracted primitive | primitives | yes | promote | Source-first component for analog ring and digital arc visuals, role variants, label/footer frame, brass/ivory tone, disabled/played/lit states, SVG stroke grammar, and button motion. |
| `src/style-guide/primatives/PrimitiveKnobsAnalog.vue` | Primitive specimen | primitives | no | keep local | Imports `Knob.vue` with ring visual; keeps role/treatment grouping local. |
| `src/style-guide/primatives/PrimitiveKnobsDigital.vue` | Primitive specimen | primitives | no | keep local | Imports `Knob.vue` with arc visual; keeps role/treatment grouping local. |
| `src/components/primatives/Note.vue` | Accepted primitive | primitives | yes | promote | Source-first controlled Note primitive for runtime music color, centered-primary playing-card labels, equal rank typography, natural/accidental text semantics, octave value, token-driven geometry, responsive proportion, colored/monochrome surfaces, and sole `sounding` activity. |
| `src/style-guide/primatives/PrimitiveNote.vue` | Accepted primitive specimen | primitives | no | keep local | Imports `Note.vue`; proves identity ranks, chromatic/subset/contrast, every geometry, every proportion, the complete 5 x 4 matrix, surfaces, rest/sounding, and reduced-motion behavior while keeping replay/release controls local. |
| `src/components/primatives/DrawerShell.vue` | Extracted primitive | primitives | yes | promote | Source-first component for bounded drawer frame, top/bottom anchors, scrim, torn handle, open/close, optional resize snaps, and reduced motion. |
| `src/components/compounds/PatternCard.vue` | Extracted compound | compounds | yes | promote | Source-first component for sleek/active pattern-card shapes; composes BarTape, IconButton, and CodeStrip. |
| `src/components/compounds/PatternReel.vue` | Extracted compound | compounds | yes | promote | Source-first component for pattern stack order, active id, promotion interaction, stack depth, and active-rise motion; composes PatternCard. |
| `src/components/uniques/BrandCover.vue` | Extracted unique | uniques | yes | promote | Source-first singular cover artifact for cover copy, meta grid, stamp, and fixed cut-paper collage. |
| `src/components/uniques/BrandLogo.vue` | Extracted unique | uniques | yes | promote | Source-first singular identity system for wordmark, monogram, tagline, brass, inverted, and note-mark lockups. |
| `src/style-guide/primatives/PrimitiveButtons.vue` | Primitive specimen | primitives | no | keep local | Imports `IconButton.vue`; paired-control wrapper and demo icons stay specimen-local. |
| `src/style-guide/compounds/CompoundPatternCard.vue` | Compound specimen | compounds | no | keep local | Imports `PatternCard.vue`; specimen staging only. |
| `src/style-guide/compounds/CompoundPatternReel.vue` | Compound specimen | compounds | no | keep local | Imports `PatternReel.vue`; specimen data and variant staging only. |
| `src/style-guide/uniques/UniqueBrandCover.vue` | Unique specimen | uniques | no | keep local | Imports `BrandCover.vue`; specimen keeps inspection labels/anatomy only. |
| `src/style-guide/uniques/UniqueBrandLogo.vue` | Unique specimen | uniques | no | keep local | Imports `BrandLogo.vue`; specimen keeps anatomy and variant grid only. |
| `src/style-guide/uniques/UniqueCodeStrip.vue` | Unique specimen | uniques/specimen | no | keep local | Imports and inspects the source unique `CodeStrip.vue`. |
| `src/style-guide/uniques/UniqueDrawer.vue` | Legacy drawer-shell specimen path | primitives/specimen | no | keep local | Imports `DrawerShell.vue`; no longer defines drawer shell behavior locally. |
| `src/components/compositions/LoadingScreen.vue` | Composition source | compositions | yes | promote | Source loading-screen visual grammar and state display API. |
| `src/style-guide/compositions/CompositionLoadingScreen.vue` | Composition specimen | compositions | no | keep local | Imports `LoadingScreen.vue`; caption stays specimen-local. |
| `src/components/LoadingSplash.vue` | App loading source | compositions/app source | yes, for current app | app integration resolved | Behavior adapter preserves loading/audio/MIDI/error/dev-skip behavior while feeding `LoadingScreen.vue`. |
| `src/components/TopDrawer.vue` | App drawer source | app source | yes, for current app | app integration resolved | Production wrapper now composes `DrawerShell.vue` while preserving trigger/panel slots, Teleport, public methods, and consumer offsets. |

## Coverage Gaps

- Primitive source components are extracted for current style-guide primitive specimens and the primitive closure proof is recorded in `LAYER_CLOSURE.md` / `RESIDUE_PROOF.md`.
- Reusable compound source location is established for `PatternCard` and `PatternReel`.
- Unique source location is established for singular brand artifacts under `src/components/uniques/`.
- Token closure, primitive closure, compound closure, unique closure, and composition app integration are recorded for current style-guide scope.
- Promotion decisions exist in `PROMOTION_AUDIT.md`; remaining token-adjacent work is parked as app/component migration rather than open token doctrine.
- Unique/composition taxonomy is recorded in `TAXONOMY_GATE.md`; brand unique source extraction, top-drawer app integration, and loading app integration are complete.
- Residue proof has run for primitive extraction, pattern compounds, brand uniques, current compositions, and the final all-layer Finish Gate audit.

## Current Coverage Verdict

- Coverage map is current for the accepted Note-definition scope and every listed row has a resolution.
- Note is formalized without migrating Key, Keyboard, Drawer, or CodeStrip; Key is the next independent gate.
- Brand unique extraction, DrawerShell promotion, token closure, app `TopDrawer.vue` alignment, loading composition integration, and Finish Gate residue audit are recorded; user Finish Gate acceptance is still required before calling the run complete.
