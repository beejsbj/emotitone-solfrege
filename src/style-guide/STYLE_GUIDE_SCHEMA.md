# Style Guide Schema

Date: 2026-05-26

## Tokens

- Source of truth: `src/emotitone-design-system.css`.
- Doctrine reference: `/Users/burooj/Projects/emotitone-design-system/project/design-doctrine.md`.
- Specimens: `src/style-guide/tokens/*.vue`.
- Status: `Note.vue` now owns solfege/degree/raw identity presentation and consumes the runtime music-color resolver. Fixed and movable remain global modes with movable as the default; the Music Color Recipe specimen demonstrates that same authority.

## Primitives

- Source of truth path: `src/components/primatives/`.
- Extracted source components:
  - `src/components/primatives/Sticker.vue`
  - `src/components/primatives/BarTape.vue`
  - `src/components/primatives/BeatIndicator.vue`
  - `src/components/primatives/CardShell.vue`
  - `src/components/primatives/IconButton.vue`
  - `src/components/primatives/Kicker.vue`
  - `src/components/primatives/SpineCard.vue`
  - `src/components/primatives/Mark.vue`
  - `src/components/primatives/ChipTabs.vue`
  - `src/components/primatives/Knob.vue`
  - `src/components/primatives/Note.vue`
  - `src/components/primatives/DrawerShell.vue`
- Primitive specimens: `src/style-guide/primatives/*.vue`.
- Status: Sticker, BarTape, BeatIndicator, CardShell, IconButton, Kicker, SpineCard, Mark, ChipTabs, Knob, Note, and DrawerShell follow the intended source-first pattern. Note is controlled and noninteractive; musical activity is supplied from outside. DrawerShell is demonstrated from the legacy `UniqueDrawer.vue` path and wrapped by production `TopDrawer.vue`; the style-guide top-drawer composition has been removed.

## Uniques

- Source of truth path: `src/components/uniques/`.
- Extracted source components:
  - `src/components/uniques/BrandCover.vue`
  - `src/components/uniques/BrandLogo.vue`
  - `src/components/uniques/CodeStrip.vue`
- Current specimens:
  - `src/style-guide/uniques/UniqueBrandCover.vue`
  - `src/style-guide/uniques/UniqueBrandLogo.vue`
  - `src/style-guide/uniques/UniqueCodeStrip.vue`
  - `src/style-guide/uniques/UniqueDrawer.vue`
- Status: `BrandCover`, `BrandLogo`, and `CodeStrip` are source-first true unique artifacts. `UniqueBrandCover.vue`, `UniqueBrandLogo.vue`, and `UniqueCodeStrip.vue` import those sources as inspection specimens. `UniqueDrawer.vue` is a legacy drawer-shell specimen path that imports `DrawerShell.vue`.

## Compounds

- Source of truth path: `src/components/compounds/`.
- Extracted source components:
  - `src/components/compounds/PatternCard.vue`
  - `src/components/compounds/PatternReel.vue`
  - `src/components/compounds/Key.vue`
  - `src/components/compounds/Keyboard.vue`
- Current specimens:
  - `src/style-guide/compounds/CompoundPatternCard.vue`
  - `src/style-guide/compounds/CompoundPatternReel.vue`
  - `src/style-guide/compounds/CompoundKey.vue`
  - `src/style-guide/compounds/CompoundKeyboard.vue`
- Status: `Key` composes `Note` with local interaction semantics; `Keyboard` owns the octave grid and app integration. `DrawerKeyboard` remains the drawer/composition shell. `PatternCard` and `PatternReel` remain source-first; `PresetRow` was removed after user review because it was just SpineCard usage with a button.

## Compositions

- Source of truth path: `src/components/compositions/`.
- Extracted source components:
  - `src/components/compositions/LoadingScreen.vue`
- Current specimens:
  - `src/style-guide/compositions/CompositionLoadingScreen.vue`
- Related app sources:
  - `src/components/LoadingSplash.vue`
  - `src/components/TopDrawer.vue`
- Status: `LoadingScreen.vue` owns the loading visual composition, `CompositionLoadingScreen.vue` imports it as an inspection specimen, and app `LoadingSplash.vue` preserves loading/audio/MIDI/error behavior while feeding state/actions into it. The style-guide top-drawer composition was removed; app `TopDrawer.vue` still wraps `DrawerShell.vue` for the main app.

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
| `src/emotitone-design-system.css` | token | yes | promote | Branch-local token source; doctrine closed for current style-guide scope. |
| `src/style-guide/tokens/*.vue` | token specimen | no | keep local | Documentation surfaces for token groups; specimen-only recipes remain marked local. |
| `src/components/primatives/Sticker.vue` | primitive | yes | promote | Model extracted primitive. |
| `src/style-guide/primatives/PrimitiveSticker.vue` | primitive specimen | no | keep local | Imports and inspects `Sticker.vue`; badge is a fixed-geometry Sticker variant. |
| `src/components/primatives/BarTape.vue` | primitive | yes | promote | Owns segment color, major/equal proportions, size, dim/downbeat/playhead, and boxed/flush frame. |
| `src/style-guide/primatives/PrimitiveBarTape.vue` | primitive specimen | no | keep local | Imports and inspects `BarTape.vue`; panel/tick staging remains specimen-only. |
| `src/components/primatives/BeatIndicator.vue` | primitive | yes | promote | Owns beat cell count, size, loop duration, downbeat/even/static states, and reduced-motion behavior. |
| `src/style-guide/primatives/PrimitiveBeatIndicator.vue` | primitive specimen | no | keep local | Imports and inspects `BeatIndicator.vue`; stage labels and variant captions remain specimen-only. |
| `src/components/primatives/CardShell.vue` | primitive | yes | promote | Owns dark card panel, floating label, optional mark slot placement, title/body rhythm, compact mode, and border toggle. |
| `src/style-guide/primatives/PrimitiveCard.vue` | primitive specimen | no | keep local | Imports and inspects `CardShell.vue`; demo marks and light inversion remain specimen-local. |
| `src/components/primatives/IconButton.vue` | primitive | yes | promote | Owns icon-only control size, geometry, tone, simulated states, disabled, pressed, and brass treatments. |
| `src/components/uniques/CodeStrip.vue` | unique | yes | promote | Owns the singular notation-strip artifact: note glyph modes, rests, durations, grouping, lit state, density, and wrapping. |
| `src/components/primatives/Kicker.vue` | primitive | yes | promote | Owns dot+label marker anatomy, tone, dot geometry, density, inverse, and form variants. |
| `src/style-guide/primatives/PrimitiveKicker.vue` | primitive specimen | no | keep local | Imports and inspects `Kicker.vue`; grid staging remains specimen-local. |
| `src/components/primatives/SpineCard.vue` | primitive | yes | promote | Owns brand spine panel, matching Kicker child, stamped headline, body copy, compact mode, and one-color rule. |
| `src/style-guide/primatives/PrimitiveSpineCard.vue` | primitive specimen | no | keep local | Imports and inspects `SpineCard.vue`; action examples are ordinary SpineCard usage, not a separate compound. |
| `src/components/primatives/Mark.vue` | primitive | yes | promote | Owns flat SVG mark paths, named glyph API, tone, size, and fill/wire treatment. |
| `src/style-guide/primatives/PrimitiveMarks.vue` | primitive specimen | no | keep local | Imports and inspects `Mark.vue`; family panels, legends, and scale/treatment staging remain specimen-local. |
| `src/components/primatives/ChipTabs.vue` | primitive | yes | promote | Owns chip-slide rail, active chip measurement, streak, selected/disabled tab state, geometry, density, and ivory/brass tone. |
| `src/style-guide/primatives/PrimitiveTabs.vue` | primitive specimen | no | keep local | Imports and inspects `ChipTabs.vue`; explanatory groupings remain specimen-local. |
| `src/components/primatives/Knob.vue` | primitive | yes | promote | Owns analog ring and digital arc visual grammar, source frame/label/footer anatomy, roles, tone, disabled/played/lit states, SVG stroke grammar, and beat-timed button motion. |
| `src/style-guide/primatives/PrimitiveKnobsAnalog.vue` | primitive specimen | no | keep local | Imports and inspects `Knob.vue` with `visual="ring"`; ring role/treatment groupings remain specimen-local. |
| `src/style-guide/primatives/PrimitiveKnobsDigital.vue` | primitive specimen | no | keep local | Imports and inspects `Knob.vue` with `visual="arc"`; arc role/treatment groupings remain specimen-local. |
| `src/components/primatives/Note.vue` | primitive | yes | promote | Owns controlled music identity/presentation, runtime color, label hierarchy, octave value, geometry, and musical visual states. |
| `src/style-guide/primatives/PrimitiveNote.vue` | primitive specimen | no | keep local | Imports and inspects `Note.vue`; identity, state, octave, and geometry groupings remain specimen-local. |
| `src/components/primatives/DrawerShell.vue` | primitive | yes | promote | Owns bounded drawer frame, top/bottom anchors, scrim, torn handle, open/close, optional resize snaps, and reduced-motion behavior. |
| `src/components/compounds/PatternCard.vue` | compound | yes | promote | Owns sleek/active pattern card anatomy and composes BarTape, IconButton, and CodeStrip. |
| `src/components/compounds/PatternReel.vue` | compound | yes | promote | Owns stack order, active id, promotion interaction, stack depth, and active-rise motion; composes PatternCard. |
| `src/components/compounds/Key.vue` | compound | yes | promote | Composes Note with native button semantics, local input events, cleanup, focus, lock, and physical press feedback. |
| `src/components/compounds/Keyboard.vue` | compound | yes | promote | Owns octave-grid layout, app state/audio/haptic adaptation, and one global QWERTY controller. |
| `src/components/uniques/BrandCover.vue` | unique | yes | promote | Owns singular cover copy, meta grid, stamp, and fixed cut-paper collage. |
| `src/components/uniques/BrandLogo.vue` | unique | yes | promote | Owns singular Emotitone identity lockups: wordmark, monogram, tagline, brass, inverted, and note marks. |
| `src/style-guide/primatives/PrimitiveButtons.vue` | primitive specimen | no | keep local | Imports and inspects `IconButton.vue`; paired-control wrappers remain specimen-only. |
| `src/style-guide/compounds/CompoundPatternCard.vue` | compound specimen | no | keep local | Imports and inspects `PatternCard.vue`. |
| `src/style-guide/compounds/CompoundPatternReel.vue` | compound specimen | no | keep local | Imports and inspects `PatternReel.vue`. |
| `src/style-guide/compounds/CompoundKey.vue` | compound specimen | no | keep local | Imports and inspects `Key.vue`; live interaction staging remains specimen-local. |
| `src/style-guide/compounds/CompoundKeyboard.vue` | compound specimen | no | keep local | Imports and inspects the production `Keyboard.vue`. |
| `src/style-guide/uniques/UniqueCodeStrip.vue` | unique specimen | no | keep local | Imports and inspects the source unique `CodeStrip.vue`. |
| `src/style-guide/uniques/UniqueBrandCover.vue` | unique specimen | no | keep local | Imports and inspects `BrandCover.vue`; specimen labels/anatomy remain local. |
| `src/style-guide/uniques/UniqueBrandLogo.vue` | unique specimen | no | keep local | Imports and inspects `BrandLogo.vue`; variant grid/anatomy remain local. |
| `src/style-guide/uniques/UniqueDrawer.vue` | legacy drawer-shell specimen path | no | keep local | Imports and inspects `DrawerShell.vue`; file location/name remains a later organization gate. |
| `src/components/compositions/LoadingScreen.vue` | composition source | yes | promote | Owns loading-screen visual grammar, chromatic progress tape, ready/error/audio states, and source composition layout. |
| `src/style-guide/compositions/CompositionLoadingScreen.vue` | composition specimen | no | keep local | Imports and inspects `LoadingScreen.vue`; caption remains specimen-local. |
| `src/components/LoadingSplash.vue` | app source | yes, for current app behavior | app integration resolved | Behavior adapter for loading/audio/MIDI/error state; feeds source `LoadingScreen.vue`. |
| `src/components/TopDrawer.vue` | app source | yes, for current app drawer behavior | app integration resolved | Production wrapper composes `DrawerShell.vue` while preserving trigger/panel slots, Teleport, offsets, and exposed open/close/toggle methods. |
| `src/style-guide/guide/*.vue` | specimen helper | yes, for inspection UI only | keep local | Not a taxonomy layer. |
| `src/style-guide/preview-card.css` | specimen helper CSS | yes, for guide chrome only | keep local | Do not promote as component grammar without a gate. |
