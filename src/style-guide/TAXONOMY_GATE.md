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
| Brand cover | `UniqueBrandCover.vue` | unique | Keep as singular brand-cover artifact; not a reusable primitive/compound | Unique Extraction Gate |
| Brand logo / wordmark | `UniqueBrandLogo.vue` | unique | Keep as singular brand identity system; not a generic component family | Unique Extraction Gate |
| Code strip | `UniqueCodeStrip.vue` | primitive specimen | Already reclassified; keep as legacy specimen path only | Naming/Navigation Gate |
| Drawer anatomy | `UniqueDrawer.vue` | primitive/compound candidate, not unique | Reclassify as drawer-shell promotion evidence; it is a specimen/prototype for reusable drawer behavior | Promotion Gate |
| Loading screen preview | `CompositionLoadingScreen.vue` | composition | Keep as composition proof/design target; reconcile against app `LoadingSplash.vue` later | App Integration Gate |
| Top drawer preview | `CompositionTopDrawer.vue` | composition | Keep as composition proof; drawer shell and local controls must be promoted/pruned before composition closure | Promotion Gate |
| Current app top drawer | `src/components/TopDrawer.vue` | app source | Existing behavior source, visually simpler than style-guide drawer grammar | App Integration Gate |
| Current app loading splash | `src/components/LoadingSplash.vue` | app source | Existing behavior source, visually divergent from style-guide composition | App Integration Gate |

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

Unresolved risk:

- If the brand cover must ship in the app, it will need a source location such as `src/components/uniques/BrandCover.vue`; that source path is not established yet.

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

Unresolved risk:

- Inline note-mark styles and image usage should be pruned or justified during unique extraction.

Unblocks:

- Unique extraction may create a brand-logo source artifact and keep this file as the specimen.

## Taxonomy Gate: Drawer

Candidate layer: primitive/compound promotion candidate, not unique

Evidence:

- `UniqueDrawer.vue` demonstrates top/bottom anchors, scrim, torn handle, drag-to-resize, click close, Escape close, snap points, and reduced-motion behavior.
- `CompositionTopDrawer.vue` repeats top drawer mechanics and adds pane switching plus product-specific content.
- `src/components/TopDrawer.vue` already owns app drawer behavior with slots and Teleport, but it does not yet express the style-guide torn-edge/scrim/push-down grammar.

Why not lower:

- Drawer shell renders and owns behavior, so it is not a token.
- The product panes, triggers, instrument grid, preset rows, and app keyboard content are not drawer-shell primitive anatomy.

Why not higher:

- A drawer shell can stand without the specific instrument/settings panes.
- The shell behavior appears in both a specimen and a composition.

Alternatives rejected:

- Keeping `UniqueDrawer.vue` as a unique: rejected because drawer behavior is reusable UI infrastructure.
- Rewriting `src/components/TopDrawer.vue` immediately: rejected because that is app integration and could change unrelated app behavior.

Unresolved risk:

- The next implementation slice must decide whether to promote a visual `DrawerShell` primitive under `src/components/primatives/`, align existing `TopDrawer.vue`, or create a compound that wraps current app behavior.

Unblocks:

- Promotion Gate for drawer shell extraction/alignment.

## Taxonomy Gate: Loading Screen

Candidate layer: composition

Evidence:

- `CompositionLoadingScreen.vue` is a full app-state proof: fixed stage, file mark, scatter, brand headline, sticker, progress row, chromatic tape, and loading copy.
- `src/components/LoadingSplash.vue` is the current app source and owns loading state, audio/MIDI decisions, progress, errors, ready state, and dev skip behavior.
- The two artifacts are visually divergent: the app source is monochrome/staff/waveform-based, while the style-guide composition is cut-paper jazz with chromatic progress.

Why not lower:

- Loading owns app state and orchestration, not just a reusable primitive.
- The chromatic progress strip may promote to `BarTape` later, but the screen is still a composition.

Why not higher:

- It is already a concrete app screen/state, not only doctrine or a moodboard.

Alternatives rejected:

- Calling the style-guide loading screen the source of truth: rejected because current app behavior lives in `LoadingSplash.vue`.
- Rewriting `LoadingSplash.vue` in this taxonomy slice: rejected because app integration must preserve behavior and verify states.

Unresolved risk:

- App integration must map loading states onto approved lower layers without losing audio/MIDI/error behavior.

Unblocks:

- Composition/App Integration Gate for loading splash alignment.

## Taxonomy Gate: Top Drawer Composition

Candidate layer: composition with lower-layer promotion debt

Evidence:

- `CompositionTopDrawer.vue` proves a meaningful app region: triggers, drawer panes, product settings, app content behind the drawer, chromatic keyboard row, and dismiss behavior.
- It repeats drawer shell grammar and includes local controls (`seg`, search bar, instrument buttons, preset rows, settings rows, icon buttons, parameter tiles).

Why not lower:

- The whole artifact coordinates product content and pane state, so it is not a primitive.
- Individual controls inside it may be primitive/compound candidates, but they are not the composition itself.

Why not higher:

- It is a concrete screen region, not merely an app concept.

Alternatives rejected:

- Treating every local control as reusable now: rejected until repetition outside this composition is proven.
- Keeping drawer shell local: rejected because drawer shell mechanics repeat in `UniqueDrawer.vue` and overlap `TopDrawer.vue`.

Unresolved risk:

- Composition closure cannot pass until drawer shell is promoted/pruned and composition-only content is separated from component grammar.

Unblocks:

- Drawer-shell Promotion Gate, then composition closure proof.
