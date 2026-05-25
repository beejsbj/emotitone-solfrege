# Style Guide Schema

Date: 2026-05-24

## Tokens

- Source of truth: `src/emotitone-design-system.css`.
- Doctrine reference: `/Users/burooj/Projects/emotitone-design-system/project/design-doctrine.md`.
- Specimens: `src/style-guide/tokens/*.vue`.
- Status: ported, not closed. Token promotion decisions from `TOKEN_PROMOTION_AUDIT.md` still need normalization into `PROMOTION_AUDIT.md`.

## Primitives

- Source of truth path: `src/components/primatives/`.
- Extracted source components:
  - `src/components/primatives/Sticker.vue`
  - `src/components/primatives/BarTape.vue`
  - `src/components/primatives/IconButton.vue`
  - `src/components/primatives/CodeStrip.vue`
- Primitive specimens: `src/style-guide/primatives/*.vue`.
- Status: Sticker, BarTape, IconButton, and CodeStrip follow the intended source-first pattern. Other primitive specimens remain raw recipe sources until extracted or explicitly kept local.

## Compounds

- Current specimens:
  - `src/style-guide/compounds/CompoundPatternCard.vue`
  - `src/style-guide/compounds/CompoundPatternReel.vue`
- Status: preview/specimen layer only. They now compose `BarTape`, `IconButton`, and `CodeStrip`, but still copy stack-card and active-card grammar instead of composing named lower layers.

## Uniques

- Current specimens:
  - `src/style-guide/uniques/UniqueBrandCover.vue`
  - `src/style-guide/uniques/UniqueBrandLogo.vue`
  - `src/style-guide/uniques/UniqueCodeStrip.vue`
  - `src/style-guide/uniques/UniqueDrawer.vue`
- Status: preview/specimen layer only. `UniqueCodeStrip` is now a legacy specimen path for the promoted `CodeStrip` primitive and should be renamed/moved only after a navigation/file-organization gate.

## Compositions

- Current specimens:
  - `src/style-guide/compositions/CompositionLoadingScreen.vue`
  - `src/style-guide/compositions/CompositionTopDrawer.vue`
- Status: preview/specimen layer only. `CompositionTopDrawer` contains real drawer/control recipes that need taxonomy decisions before closure.

## Specimen Helpers (Inspection Only, Not A Layer)

- `src/style-guide/guide/AnatomyDisplay.vue`
- `src/style-guide/guide/VariantGrid.vue`
- `src/style-guide/guide/VariantCell.vue`
- `src/style-guide/preview-card.css`
- `src/style-guide/StyleGuide.vue`

## Naming Rules

- Preserve `primatives`.
- Use `Primitive*` only for style-guide specimens.
- Use concise source names under `src/components/primatives/`, for example `Sticker.vue`.
- Do not create `src/components/primitives/` during this run.
- Do not call specimen helpers a taxonomy layer.

## Artifact Ledger

| Source artifact | Layer | Source of truth | Resolution | Notes |
|---|---|---|---|---|
| `src/emotitone-design-system.css` | token | yes | promote | Branch-local token source; open decisions remain. |
| `src/style-guide/tokens/*.vue` | token specimen | no | keep local | Documentation surfaces for token groups. |
| `src/components/primatives/Sticker.vue` | primitive | yes | promote | Model extracted primitive. |
| `src/style-guide/primatives/PrimitiveSticker.vue` | primitive specimen | no | keep local | Imports and inspects `Sticker.vue`; badge decision remains. |
| `src/components/primatives/BarTape.vue` | primitive | yes | promote | Owns segment color, major/equal proportions, size, dim/downbeat/playhead, and boxed/flush frame. |
| `src/style-guide/primatives/PrimitiveBarTape.vue` | primitive specimen | no | keep local | Imports and inspects `BarTape.vue`; panel/tick staging remains specimen-only. |
| `src/components/primatives/IconButton.vue` | primitive | yes | promote | Owns icon-only control size, geometry, tone, simulated states, disabled, pressed, and brass treatments. |
| `src/components/primatives/CodeStrip.vue` | primitive | yes | promote | Owns notation row, note glyph modes, rests, durations, grouping, lit state, density, and wrapping. |
| `src/style-guide/primatives/PrimitiveBeatIndicator.vue` | primitive candidate/specimen | no | unresolved | Needs extraction and beat keyframe decision. |
| `src/style-guide/primatives/PrimitiveButtons.vue` | primitive specimen | no | keep local | Imports and inspects `IconButton.vue`; paired-control wrappers remain specimen-only. |
| `src/style-guide/primatives/PrimitiveCard.vue` | primitive candidate/specimen | no | unresolved | Needs card shell primitive boundary. |
| `src/style-guide/primatives/PrimitiveKeys.vue` | primitive candidate/specimen | no | unresolved | Dense Promotion Gate: geometry, mapping, formats. |
| `src/style-guide/primatives/PrimitiveKicker.vue` | primitive candidate/specimen | no | unresolved | Needs role/typography boundary. |
| `src/style-guide/primatives/PrimitiveKnobsAnalog.vue` | primitive candidate/specimen | no | unresolved | Needs shared knob anatomy decision. |
| `src/style-guide/primatives/PrimitiveKnobsDigital.vue` | primitive candidate/specimen | no | unresolved | Needs shared knob/stroke/glow decisions. |
| `src/style-guide/primatives/PrimitiveMarks.vue` | primitive candidate/specimen | no | unresolved | Needs mark API before extraction. |
| `src/style-guide/primatives/PrimitiveSpineCard.vue` | primitive/compound candidate specimen | no | unresolved | `preset-row` may be compound. |
| `src/style-guide/primatives/PrimitiveTabs.vue` | primitive candidate/specimen | no | unresolved | Needs timing and variant cleanup. |
| `src/style-guide/compounds/CompoundPatternCard.vue` | compound specimen | no | unresolved | Composes BarTape, IconButton, and CodeStrip; still depends on pattern-card boundary decisions. |
| `src/style-guide/compounds/CompoundPatternReel.vue` | compound specimen | no | unresolved | Composes BarTape, IconButton, and CodeStrip; adds stack/promote behavior; depends on PatternCard boundary. |
| `src/style-guide/uniques/UniqueCodeStrip.vue` | legacy primitive specimen path | no | keep local | Imports and inspects `CodeStrip.vue`; file location/name remains a later organization gate. |
| `src/style-guide/uniques/*.vue` | unique specimen | no | unresolved | Needs singular-role justification. |
| `src/style-guide/compositions/*.vue` | composition specimen | no | unresolved | Needs lower-layer residue proof. |
| `src/style-guide/guide/*.vue` | specimen helper | yes, for inspection UI only | keep local | Not a taxonomy layer. |
| `src/style-guide/preview-card.css` | specimen helper CSS | yes, for guide chrome only | keep local | Do not promote as component grammar without a gate. |
