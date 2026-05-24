# Coverage Audit

Date: 2026-05-24

## Scope

- Current branch style-guide artifacts under `src/style-guide/`.
- Branch-local token file `src/emotitone-design-system.css`.
- Reusable primitive source folder `src/components/primatives/`.
- Upstream doctrine and preview tier names as reference evidence.

## Coverage Table

| Artifact | Current role | Target layer | Source of truth? | Resolution | Proof / Next |
|---|---|---|---:|---|---|
| `src/emotitone-design-system.css` | Token file | tokens | yes | promote | Token source; unresolved token decisions in promotion audit. |
| `src/style-guide/StyleGuide.vue` | Sink page | specimen helper | yes, for guide entry | keep local | Renders all current layer specimens. |
| `src/style-guide/preview-card.css` | Shared preview chrome | specimen helper | yes, for guide chrome | keep local | Guide-only staging CSS. |
| `src/style-guide/guide/*.vue` | Anatomy/variant helpers | specimen helper | yes, for inspection | keep local | Used by `PrimitiveSticker.vue`; should replace duplicate guide chrome. |
| `src/style-guide/tokens/*.vue` | Token specimens | tokens | no | keep local | Token documentation; unresolved rules tracked separately. |
| `src/components/primatives/Sticker.vue` | Extracted primitive | primitives | yes | promote | Source-first pattern exists. |
| `src/style-guide/primatives/PrimitiveSticker.vue` | Primitive specimen | primitives | no | keep local | Imports `Sticker.vue`; badge/color decisions remain. |
| `src/style-guide/primatives/PrimitiveBarTape.vue` | Raw primitive specimen | primitives | no | unresolved | Recommended first extraction; duplicated in compounds. |
| `src/style-guide/primatives/PrimitiveBeatIndicator.vue` | Raw primitive specimen | primitives | no | unresolved | Needs beat primitive extraction. |
| `src/style-guide/primatives/PrimitiveButtons.vue` | Raw primitive specimen | primitives | no | unresolved | Duplicated in compounds; overlaps app `IconButton`. |
| `src/style-guide/primatives/PrimitiveCard.vue` | Raw primitive specimen | primitives | no | unresolved | Needs card shell extraction. |
| `src/style-guide/primatives/PrimitiveKeys.vue` | Raw primitive specimen | primitives | no | unresolved | Needs mapping/geometry/format gates. |
| `src/style-guide/primatives/PrimitiveKicker.vue` | Raw primitive specimen | primitives | no | unresolved | Needs role and typography gate. |
| `src/style-guide/primatives/PrimitiveKnobsAnalog.vue` | Raw primitive specimen | primitives | no | unresolved | Needs shared knob anatomy. |
| `src/style-guide/primatives/PrimitiveKnobsDigital.vue` | Raw primitive specimen | primitives | no | unresolved | Needs shared knob/stroke/glow decisions. |
| `src/style-guide/primatives/PrimitiveMarks.vue` | Raw primitive specimen | primitives | no | unresolved | Needs mark component API. |
| `src/style-guide/primatives/PrimitiveSpineCard.vue` | Raw primitive/compound specimen | primitives/compounds | no | unresolved | Needs spine-card versus preset-row split. |
| `src/style-guide/primatives/PrimitiveTabs.vue` | Raw primitive specimen | primitives | no | unresolved | Needs chip-slide tab extraction. |
| `src/style-guide/compounds/CompoundPatternCard.vue` | Raw compound specimen | compounds | no | unresolved | Copies stack/active cards, icon buttons, bar tape, code strip. |
| `src/style-guide/compounds/CompoundPatternReel.vue` | Raw compound specimen | compounds | no | unresolved | Adds reel stack/promotion behavior around copied pattern-card grammar. |
| `src/style-guide/uniques/UniqueBrandCover.vue` | Unique specimen | uniques | no | unresolved | Needs singular-role justification. |
| `src/style-guide/uniques/UniqueBrandLogo.vue` | Unique specimen | uniques | no | unresolved | Needs singular-role justification. |
| `src/style-guide/uniques/UniqueCodeStrip.vue` | Unique? specimen | unique/primitive/compound part | no | unresolved | Reused in compounds; taxonomy suspect. |
| `src/style-guide/uniques/UniqueDrawer.vue` | Unique specimen | uniques/composition | no | unresolved | Needs unique versus composition decision. |
| `src/style-guide/compositions/CompositionLoadingScreen.vue` | Composition specimen | compositions | no | unresolved | Needs lower-layer dependency audit. |
| `src/style-guide/compositions/CompositionTopDrawer.vue` | Composition specimen | compositions | no | unresolved | Contains drawer/control recipes that need taxonomy. |

## Coverage Gaps

- No source components yet for most primitive specimens.
- No reusable source locations established yet for compounds or uniques.
- No layer has closure proof yet.
- Promotion decisions exist in prose in `TOKEN_PROMOTION_AUDIT.md`, but need normalized decision rows in `PROMOTION_AUDIT.md`.
- Residue proof has not yet been run.

## Current Coverage Verdict

- Coverage map exists, but completion is not proven.
- Primitive extraction should not advance past one slice at a time until promotion decisions are tracked and layer closure is updated.
