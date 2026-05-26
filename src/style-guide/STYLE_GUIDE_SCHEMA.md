# Style Guide Schema

Date: 2026-05-26

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
  - `src/components/primatives/BeatIndicator.vue`
  - `src/components/primatives/CardShell.vue`
  - `src/components/primatives/IconButton.vue`
  - `src/components/primatives/CodeStrip.vue`
  - `src/components/primatives/Kicker.vue`
  - `src/components/primatives/SpineCard.vue`
  - `src/components/primatives/Mark.vue`
  - `src/components/primatives/ChipTabs.vue`
  - `src/components/primatives/Knob.vue`
  - `src/components/primatives/Key.vue`
  - `src/components/primatives/DrawerShell.vue`
- Primitive specimens: `src/style-guide/primatives/*.vue`.
- Status: Sticker, BarTape, BeatIndicator, CardShell, IconButton, CodeStrip, Kicker, SpineCard, Mark, ChipTabs, Knob, Key, and DrawerShell follow the intended source-first pattern. DrawerShell is demonstrated from the legacy `UniqueDrawer.vue` path and composed by `CompositionTopDrawer.vue`; app `TopDrawer.vue` alignment remains parked.

## Compounds

- Source of truth path: `src/components/compounds/`.
- Extracted source components:
  - `src/components/compounds/PatternCard.vue`
  - `src/components/compounds/PatternReel.vue`
- Current specimens:
  - `src/style-guide/compounds/CompoundPatternCard.vue`
  - `src/style-guide/compounds/CompoundPatternReel.vue`
- Status: `PatternCard` and `PatternReel` are source-first. `PatternCard` composes `BarTape`, `IconButton`, and `CodeStrip`; `PatternReel` composes `PatternCard` and owns stack depth / click-promotion choreography.

## Uniques

- Current specimens:
  - `src/style-guide/uniques/UniqueBrandCover.vue`
  - `src/style-guide/uniques/UniqueBrandLogo.vue`
  - `src/style-guide/uniques/UniqueCodeStrip.vue`
  - `src/style-guide/uniques/UniqueDrawer.vue`
- Status: taxonomy audited, not source-extracted. `UniqueBrandCover.vue` and `UniqueBrandLogo.vue` are true singular brand artifacts. `UniqueCodeStrip.vue` is a legacy specimen path for the promoted `CodeStrip` primitive and should be renamed/moved only after a navigation/file-organization gate. `UniqueDrawer.vue` is now a legacy drawer-shell specimen path that imports `DrawerShell.vue`.

## Compositions

- Current specimens:
  - `src/style-guide/compositions/CompositionLoadingScreen.vue`
  - `src/style-guide/compositions/CompositionTopDrawer.vue`
- Related app sources:
  - `src/components/LoadingSplash.vue`
  - `src/components/TopDrawer.vue`
- Status: taxonomy audited, not closed. `CompositionLoadingScreen.vue` is a composition proof/design target that must reconcile with app `LoadingSplash.vue`; `CompositionTopDrawer.vue` now composes `DrawerShell.vue`, but app `TopDrawer.vue` alignment and local composition controls remain open.

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
| `src/components/primatives/BeatIndicator.vue` | primitive | yes | promote | Owns beat cell count, size, loop duration, downbeat/even/static states, and reduced-motion behavior. |
| `src/style-guide/primatives/PrimitiveBeatIndicator.vue` | primitive specimen | no | keep local | Imports and inspects `BeatIndicator.vue`; stage labels and variant captions remain specimen-only. |
| `src/components/primatives/CardShell.vue` | primitive | yes | promote | Owns dark card panel, floating label, optional mark slot placement, title/body rhythm, compact mode, and border toggle. |
| `src/style-guide/primatives/PrimitiveCard.vue` | primitive specimen | no | keep local | Imports and inspects `CardShell.vue`; demo marks and light inversion remain specimen-local. |
| `src/components/primatives/IconButton.vue` | primitive | yes | promote | Owns icon-only control size, geometry, tone, simulated states, disabled, pressed, and brass treatments. |
| `src/components/primatives/CodeStrip.vue` | primitive | yes | promote | Owns notation row, note glyph modes, rests, durations, grouping, lit state, density, and wrapping. |
| `src/components/primatives/Kicker.vue` | primitive | yes | promote | Owns dot+label marker anatomy, tone, dot geometry, density, inverse, and form variants. |
| `src/style-guide/primatives/PrimitiveKicker.vue` | primitive specimen | no | keep local | Imports and inspects `Kicker.vue`; grid staging remains specimen-local. |
| `src/components/primatives/SpineCard.vue` | primitive | yes | promote | Owns brand spine panel, matching Kicker child, stamped headline, body copy, compact mode, and one-color rule. |
| `src/style-guide/primatives/PrimitiveSpineCard.vue` | primitive specimen plus parked compound specimen | no | keep local / gate-park | Imports and inspects `SpineCard.vue`; preset-row demo remains parked behind a compound Taxonomy Gate. |
| `src/components/primatives/Mark.vue` | primitive | yes | promote | Owns flat SVG mark paths, named glyph API, tone, size, and fill/wire treatment. |
| `src/style-guide/primatives/PrimitiveMarks.vue` | primitive specimen | no | keep local | Imports and inspects `Mark.vue`; family panels, legends, and scale/treatment staging remain specimen-local. |
| `src/components/primatives/ChipTabs.vue` | primitive | yes | promote | Owns chip-slide rail, active chip measurement, streak, selected/disabled tab state, geometry, density, and ivory/brass tone. |
| `src/style-guide/primatives/PrimitiveTabs.vue` | primitive specimen | no | keep local | Imports and inspects `ChipTabs.vue`; explanatory groupings remain specimen-local. |
| `src/components/primatives/Knob.vue` | primitive | yes | promote | Owns analog ring and digital arc visual grammar, source frame/label/footer anatomy, roles, tone, disabled/played/lit states, SVG stroke grammar, and beat-timed button motion. |
| `src/style-guide/primatives/PrimitiveKnobsAnalog.vue` | primitive specimen | no | keep local | Imports and inspects `Knob.vue` with `visual="ring"`; ring role/treatment groupings remain specimen-local. |
| `src/style-guide/primatives/PrimitiveKnobsDigital.vue` | primitive specimen | no | keep local | Imports and inspects `Knob.vue` with `visual="arc"`; arc role/treatment groupings remain specimen-local. |
| `src/components/primatives/Key.vue` | primitive | yes | promote | Owns music key face, legacy note alias fill, syllable/degree/raw stack, format axis, shape/cut variants, pressed/disabled states, and sheen. |
| `src/style-guide/primatives/PrimitiveKeys.vue` | primitive specimen | no | keep local | Imports and inspects `Key.vue`; chromatic, format, state, cut, and proportion groupings remain specimen-local. |
| `src/components/primatives/DrawerShell.vue` | primitive | yes | promote | Owns bounded drawer frame, top/bottom anchors, scrim, torn handle, open/close, optional resize snaps, and reduced-motion behavior. |
| `src/components/compounds/PatternCard.vue` | compound | yes | promote | Owns sleek/active pattern card anatomy and composes BarTape, IconButton, and CodeStrip. |
| `src/components/compounds/PatternReel.vue` | compound | yes | promote | Owns stack order, active id, promotion interaction, stack depth, and active-rise motion; composes PatternCard. |
| `src/style-guide/primatives/PrimitiveButtons.vue` | primitive specimen | no | keep local | Imports and inspects `IconButton.vue`; paired-control wrappers remain specimen-only. |
| `src/style-guide/compounds/CompoundPatternCard.vue` | compound specimen | no | keep local | Imports and inspects `PatternCard.vue`. |
| `src/style-guide/compounds/CompoundPatternReel.vue` | compound specimen | no | keep local | Imports and inspects `PatternReel.vue`. |
| `src/style-guide/uniques/UniqueCodeStrip.vue` | legacy primitive specimen path | no | keep local | Imports and inspects `CodeStrip.vue`; file location/name remains a later organization gate. |
| `src/style-guide/uniques/UniqueBrandCover.vue` | unique specimen | no | keep local / extract source later | Singular brand cover; needs unique source path/extraction gate before unique closure. |
| `src/style-guide/uniques/UniqueBrandLogo.vue` | unique specimen | no | keep local / extract source later | Singular brand identity system; needs unique source path/extraction gate before unique closure. |
| `src/style-guide/uniques/UniqueDrawer.vue` | legacy drawer-shell specimen path | no | keep local | Imports and inspects `DrawerShell.vue`; file location/name remains a later organization gate. |
| `src/style-guide/compositions/CompositionLoadingScreen.vue` | composition specimen | no | keep local / app integration gate | Composition proof and visual target; app behavior source is `LoadingSplash.vue`. |
| `src/components/LoadingSplash.vue` | app source | yes, for current app behavior | app integration gate | Behavior-heavy current loading splash; visually divergent from style-guide composition. |
| `src/style-guide/compositions/CompositionTopDrawer.vue` | composition specimen | no | keep local / app integration gate | Composition proof; composes `DrawerShell.vue` while keeping local product panes/controls as composition content. |
| `src/components/TopDrawer.vue` | app source | yes, for current app drawer behavior | app integration gate | Current behavior source; style-guide drawer grammar is not yet integrated. |
| `src/style-guide/guide/*.vue` | specimen helper | yes, for inspection UI only | keep local | Not a taxonomy layer. |
| `src/style-guide/preview-card.css` | specimen helper CSS | yes, for guide chrome only | keep local | Do not promote as component grammar without a gate. |
