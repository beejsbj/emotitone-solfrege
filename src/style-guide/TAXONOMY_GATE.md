# Taxonomy Gate

Date: 2026-05-26

## Scope

Classify the remaining style-guide unique and composition artifacts after primitive extraction closure.

Artifacts inspected:

- `src/style-guide/uniques/UniqueBrandCover.vue`
- `src/style-guide/uniques/UniqueBrandLogo.vue`
- `src/style-guide/uniques/UniqueCodeStrip.vue`
- `src/style-guide/uniques/UniqueDrawer.vue`
- `src/style-guide/compositions/CompositionLoadingScreen.vue`
- `src/style-guide/compositions/CompositionTopDrawer.vue`
- `src/components/TopDrawer.vue`
- `src/components/LoadingSplash.vue`

## Decision Summary

| Artifact | Current path | Candidate layer | Decision | Next gate |
|---|---|---|---|---|
| Brand cover | `UniqueBrandCover.vue` | unique | Source-extracted as singular `BrandCover.vue`; not a reusable primitive/compound | closed for unique source extraction |
| Brand logo / wordmark | `UniqueBrandLogo.vue` | unique | Source-extracted as singular `BrandLogo.vue`; not a generic component family | closed for unique source extraction |
| Code strip | `UniqueCodeStrip.vue` | primitive specimen | Already reclassified; keep as legacy specimen path only | Naming/Navigation Gate |
| Drawer anatomy | `UniqueDrawer.vue` | primitive, not unique | Promoted to `DrawerShell`; `UniqueDrawer.vue` is now a legacy specimen/prototype path | App Integration Gate for production `TopDrawer.vue` |
| Loading screen preview | `CompositionLoadingScreen.vue` | composition specimen | Imports `LoadingScreen.vue` as the loading composition inspection surface | App Integration Gate resolved 2026-05-27 |
| Top drawer preview | `CompositionTopDrawer.vue` | composition | Keep as composition proof; compose promoted `DrawerShell`; local controls remain composition-local until reuse is proven | App Integration Gate |
| Current app top drawer | `src/components/TopDrawer.vue` | app source | Existing behavior source, visually simpler than style-guide drawer grammar | App Integration Gate |
| Current app loading splash | `src/components/LoadingSplash.vue` | app source | Behavior source now feeds state/actions into `LoadingScreen.vue` | App Integration Gate resolved 2026-05-27 |

## Taxonomy Gate: Brand Cover

Candidate layer: unique

Evidence:

- Renders a one-off cover/page artifact with headline, body copy, meta grid, stamp, and a fixed SVG collage.
- Its value is the specific brand-opening composition, not a reusable shell.
- Raw SVG fills and exact transforms encode brand artwork, not a repeated primitive recipe.

Why not lower:

- The collage can use token colors later, but the arrangement is not a token, primitive, or compound by itself.
- The local headline/body/meta content is part of the artifact identity.

Why not higher:

- It is not an app screen with state or orchestration; it is a singular brand cover specimen.

Alternatives rejected:

- Promoting the cover layout into a compound: rejected because no second use proves the layout travels.
- Treating the collage as a generic mark primitive: rejected because `Mark.vue` already owns reusable mark grammar and this collage is fixed art.

Promotion result:

- `BrandCover` is promoted under `src/components/uniques/`.
- `UniqueBrandCover.vue` imports `BrandCover` and keeps only specimen inspection labels/anatomy.

Unblocks:

- Unique extraction may formalize the cover source without changing app behavior.

## Taxonomy Gate: Brand Logo / Wordmark

Candidate layer: unique

Evidence:

- Renders a singular product identity system: wordmark, monogram, tagline lockup, brass signal, inverted lockup, and note-mark lockup.
- The variants belong to the Emotitone brand rather than to a generic text/logo component family.

Why not lower:

- Typography, note colors, and brass signal are lower-layer dependencies, but the wordmark itself is brand identity.
- Monogram and tagline are lockup variants, not reusable primitives.

Why not higher:

- It is not a screen or app state; it is a singular brand artifact with variants.

Alternatives rejected:

- Promoting wordmark tiles into generic cards: rejected because `CardShell` and guide helpers already cover generic shells.
- Treating note-mark lockup as a new music primitive: rejected until the music-color model gate decides computed `.note` versus legacy aliases.

Promotion result:

- `BrandLogo` is promoted under `src/components/uniques/`.
- Inline note-mark styling moved from the specimen into source classes.
- `UniqueBrandLogo.vue` imports `BrandLogo` and keeps only specimen anatomy/variant staging.

Unblocks:

- Unique extraction may create a brand-logo source artifact and keep this file as the specimen.

## Taxonomy Gate: Drawer

Candidate layer: primitive, not unique

Evidence:

- `UniqueDrawer.vue` demonstrates top/bottom anchors, scrim, torn handle, drag-to-resize, click close, Escape close, snap points, and reduced-motion behavior.
- `CompositionTopDrawer.vue` repeats top drawer mechanics and adds pane switching plus product-specific content.
- `src/components/TopDrawer.vue` already owned app drawer behavior with slots and Teleport; as of the App Integration Gate on 2026-05-27 it wraps `DrawerShell` for torn-edge/scrim/push-down grammar.

Why not lower:

- Drawer shell renders and owns behavior, so it is not a token.
- The product panes, triggers, instrument grid, and app keyboard content are not drawer-shell primitive anatomy; preset rows are now promoted separately as `PresetRow`.

Why not higher:

- A drawer shell can stand without the specific instrument/settings panes.
- The shell behavior appears in both a specimen and a composition.

Alternatives rejected:

- Keeping `UniqueDrawer.vue` as a unique: rejected because drawer behavior is reusable UI infrastructure.
- Rewriting `src/components/TopDrawer.vue` immediately: rejected because that is app integration and could change unrelated app behavior.

Promotion result:

- `DrawerShell` is promoted under `src/components/primatives/`.
- `UniqueDrawer.vue` and `CompositionTopDrawer.vue` compose `DrawerShell` for style-guide surfaces.
- Existing app `TopDrawer.vue` was left untouched during taxonomy and was aligned in the later App Integration Gate on 2026-05-27.

Unblocks:

- App Integration Gate for production top-drawer alignment.

## Taxonomy Gate: Loading Screen

Candidate layer: composition

Evidence:

- `CompositionLoadingScreen.vue` began as a full app-state proof: fixed stage, file mark, scatter, brand headline, sticker, progress row, chromatic tape, and loading copy.
- `src/components/LoadingSplash.vue` is the current app source and owns loading state, audio/MIDI decisions, progress, errors, ready state, and dev skip behavior.
- App Integration Gate 2026-05-27 resolved the visual split by promoting `src/components/compositions/LoadingScreen.vue`; the style-guide specimen imports it and app `LoadingSplash.vue` feeds state/actions into it.

Why not lower:

- Loading owns app state and orchestration, not just a reusable primitive.
- The chromatic progress strip may promote to `BarTape` later, but the screen is still a composition.

Why not higher:

- It is already a concrete app screen/state, not only doctrine or a moodboard.

Alternatives rejected:

- Calling the style-guide loading screen the source of truth: rejected because current app behavior lives in `LoadingSplash.vue`.
- Rewriting `LoadingSplash.vue` in this taxonomy slice: rejected because app integration must preserve behavior and verify states.

Resolved risk:

- App integration maps loading states onto `LoadingScreen.vue` without moving audio/MIDI/error behavior out of `LoadingSplash.vue`.

Unblocks:

- Finish Gate residue audit.

## Taxonomy Gate: Top Drawer Composition

Candidate layer: composition with lower-layer promotion debt

Evidence:

- `CompositionTopDrawer.vue` proves a meaningful app region: triggers, drawer panes, product settings, app content behind the drawer, chromatic keyboard row, and dismiss behavior.
- It composes promoted drawer shell grammar and `PresetRow`, while keeping local controls (`seg`, search bar, instrument buttons, settings rows, icon buttons, parameter tiles).

Why not lower:

- The whole artifact coordinates product content and pane state, so it is not a primitive.
- Individual controls inside it may be primitive/compound candidates, but they are not the composition itself.

Why not higher:

- It is a concrete screen region, not merely an app concept.

Alternatives rejected:

- Treating every local control as reusable now: rejected until repetition outside this composition is proven.
- Keeping drawer shell local: rejected because drawer shell mechanics repeat in `UniqueDrawer.vue` and overlap `TopDrawer.vue`; resolved for style-guide surfaces by `DrawerShell`.

Unresolved risk:

- Composition closure cannot pass until production app alignment and composition-only control boundaries are decided.

Unblocks:

- App top-drawer alignment, then composition closure proof.
