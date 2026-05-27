# Layer Closure

Date: 2026-05-26

## Layer

current recovery state across token, primitive, compound, unique, and composition layers

## Source Artifacts

- `src/emotitone-design-system.css`
- `src/style-guide/tokens/*.vue`
- `src/components/primatives/Sticker.vue`
- `src/components/uniques/*.vue`
- `src/style-guide/primatives/*.vue`
- `src/style-guide/compounds/*.vue`
- `src/style-guide/uniques/*.vue`
- `src/style-guide/compositions/*.vue`
- `src/style-guide/guide/*.vue`
- `src/components/TopDrawer.vue`
- `src/components/LoadingSplash.vue`

## Source Of Truth

- Tokens: `src/emotitone-design-system.css`.
- Primitives: `src/components/primatives/`.
- Compounds: `src/components/compounds/`.
- Uniques: `src/components/uniques/`.
- Specimens: `src/style-guide/**`.
- Specimen helpers: `src/style-guide/guide/**`.

## Closure Checklist

| Check | Status | Proof | Linked Artifacts |
|---|---|---|---|
| source artifacts listed | pass | Schema and coverage audit list current artifacts | `STYLE_GUIDE_SCHEMA.md`, `COVERAGE_AUDIT.md` |
| raw recipes resolved or gate-parked | pass | Token doctrine, primitive extraction, DrawerShell promotion, brand unique extraction, top-drawer app alignment, and loading composition integration are resolved or gate-parked for current scope | `RAW_RECIPE_INVENTORY.md`, `PROMOTION_AUDIT.md` |
| source of truth named | pass | Tokens, primitives, PatternCard/PatternReel compounds, brand uniques, and current compositions have source paths or explicit keep-local status | `REPOSITORY_CONVENTIONS.md` |
| specimens demonstrate, not define | pass | Current primitive, brand unique, and loading composition specimens import source components; top-drawer composition composes DrawerShell | `COVERAGE_AUDIT.md` |
| coverage rows have Resolution | pass | Initial coverage rows include non-empty resolution state | `COVERAGE_AUDIT.md` |

## Per-Layer Closure Proof

### Token Closure

| Check | Status | Proof | Linked Artifacts |
|---|---|---|---|
| token groups documented | pass | CSS names UI, brand, music, geometry, motion, semantic, and typography groups; specimens render those groups | `src/emotitone-design-system.css`, `STYLE_GUIDE_SCHEMA.md` |
| semantic aliases documented | pass | Semantic `--danger` may alias tomato while brand colors remain decorative; music `.note` is source recipe while legacy aliases are parked | `PROMOTION_AUDIT.md` |
| naming rules documented | pass | CSS comments and token specimens document spacing roles, typography exceptions, music hue math, brass timing, and geometry recipes | `TOKEN_PROMOTION_AUDIT.md`, `PROMOTION_AUDIT.md` |
| allowed raw-value exceptions documented | pass | Guide/spec inspection labels, specimen-only skew recipes, and legacy note aliases are named exceptions or gates; Sticker badge timing is resolved | `RESIDUE_PROOF.md` |
| token candidates from raw recipe inventory resolved | pass | Clip/rotation/stroke/brass/brand/music/note-map candidates are promoted, pruned, or parked behind app/component gates | `RAW_RECIPE_INVENTORY.md` |
| next layer has enough token vocabulary | pass | Current source primitives, compounds, and brand uniques consume named token source or documented parked legacy aliases | `PROMOTION_AUDIT.md` |

### Primitive Closure

| Check | Status | Proof | Linked Artifacts |
|---|---|---|---|
| primitive families have anatomy | pass | Sticker, BarTape, BeatIndicator, CardShell, IconButton, CodeStrip, Kicker, SpineCard, Mark, ChipTabs, Knob, Key, and DrawerShell have anatomy; Sticker badge is resolved as a fixed-geometry Sticker variant | `PrimitiveSticker.vue`, `PrimitiveBarTape.vue`, `PrimitiveBeatIndicator.vue`, `PrimitiveCard.vue`, `PrimitiveButtons.vue`, `PrimitiveKicker.vue`, `PrimitiveSpineCard.vue`, `PrimitiveMarks.vue`, `PrimitiveTabs.vue`, `PrimitiveKnobsAnalog.vue`, `PrimitiveKnobsDigital.vue`, `PrimitiveKeys.vue`, `UniqueCodeStrip.vue`, `UniqueDrawer.vue`, `COVERAGE_AUDIT.md` |
| APIs, states, and variants are named | pass | Current primitive APIs are named; unresolved variant/doctrine choices are parked behind named gates | `PROMOTION_AUDIT.md` |
| token dependencies are named | pass | Primitive slice audits name dependencies; wider token doctrine conflicts are not hidden inside primitive source | `TOKEN_PROMOTION_AUDIT.md`, `PROMOTION_AUDIT.md` |
| primitives consume tokens or approved lower-level constants | pass | Current source primitives consume tokens/current lower-level constants; music-color, typography, and app-alignment questions are gate-parked | `Sticker.vue`, `BarTape.vue`, `BeatIndicator.vue`, `CardShell.vue`, `IconButton.vue`, `CodeStrip.vue`, `Kicker.vue`, `SpineCard.vue`, `Mark.vue`, `ChipTabs.vue`, `Knob.vue`, `Key.vue`, `DrawerShell.vue` |
| specimens import/demonstrate primitive source files | pass | Current primitive specimens import source components; `UniqueCodeStrip.vue` is a legacy primitive specimen path that also imports source | `PrimitiveSticker.vue`, `PrimitiveBarTape.vue`, `PrimitiveBeatIndicator.vue`, `PrimitiveCard.vue`, `PrimitiveButtons.vue`, `PrimitiveKicker.vue`, `PrimitiveSpineCard.vue`, `PrimitiveMarks.vue`, `PrimitiveTabs.vue`, `PrimitiveKnobsAnalog.vue`, `PrimitiveKnobsDigital.vue`, `PrimitiveKeys.vue`, `UniqueCodeStrip.vue` |

### Compound Closure

| Check | Status | Proof | Linked Artifacts |
|---|---|---|---|
| child primitive dependencies are explicit | pass | Current compound scope contains `PatternCard`, `PatternReel`, and `PresetRow`; PatternCard names BarTape/IconButton/CodeStrip, PatternReel composes PatternCard, and PresetRow composes Kicker | `PatternCard.vue`, `PatternReel.vue`, `PresetRow.vue`, `COVERAGE_AUDIT.md` |
| slot contracts are explicit | pass | PatternCard, PatternReel, and PresetRow prop/event contracts exist for the current compound scope | `PatternCard.vue`, `PatternReel.vue`, `PresetRow.vue` |
| compounds compose children instead of duplicating internals | pass | PatternCard composes primitive children, PatternReel composes PatternCard, and PresetRow composes Kicker; old pattern-card/reel/preset-row copies are pruned | `RESIDUE_PROOF.md` |
| repeated child patterns are promoted or gate-parked | pass | PatternCard, PatternReel, and PresetRow are promoted for current compound scope | `PROMOTION_AUDIT.md` |

### Unique Closure

| Check | Status | Proof | Linked Artifacts |
|---|---|---|---|
| singular-role justification exists | pass | Brand cover and brand logo are justified and extracted as source uniques; CodeStrip is reclassified as primitive specimen; drawer is reclassified as primitive specimen | `TAXONOMY_GATE.md`, `STYLE_GUIDE_SCHEMA.md` |
| reusable material inside unique is resolved downward | pass | `UniqueCodeStrip` imports `CodeStrip`; `UniqueDrawer` imports `DrawerShell`; brand specimens import `BrandCover` and `BrandLogo` | `RESIDUE_PROOF.md`, `PROMOTION_AUDIT.md` |
| unique is marked to prevent accidental generalization | pass | Brand cover/logo live in `src/components/uniques/`; CodeStrip and Drawer remain legacy specimen paths for lower layers | `STYLE_GUIDE_SCHEMA.md`, `COVERAGE_AUDIT.md` |

### Composition Closure

| Check | Status | Proof | Linked Artifacts |
|---|---|---|---|
| compositions use approved lower layers | pass | Top-drawer composition and production `TopDrawer.vue` compose/wrap `DrawerShell`; loading specimen and app adapter share `LoadingScreen` | `src/style-guide/compositions/*.vue`, `src/components/LoadingSplash.vue`, `src/components/TopDrawer.vue` |
| composition-only content/orchestration/app state is separated from component grammar | pass | Top drawer product panes/controls stay local; loading app orchestration remains in `LoadingSplash.vue`; visual loading grammar lives in `LoadingScreen.vue` | `RESIDUE_PROOF.md`, `TAXONOMY_GATE.md` |
| residue proof has no unresolved cross-cutting grammar | pass | Finish Gate audit pruned remaining guide-stage hex and top-drawer raw HSL note colors; remaining decisions are named parked gates, not hidden residue | `RESIDUE_PROOF.md` |

## Promote / Prune / Keep-Local Decisions

| Item | Decision | Reason | Gate |
|---|---|---|---|
| Style-guide sink page | keep local | Documentation entry surface | Repository Conventions Gate |
| Guide helpers | keep local | Inspection helpers, not taxonomy layer | Repository Conventions Gate |
| Sticker primitive | promote | Existing source-first pattern | Primitive Closure |
| BarTape primitive | promote | Source-first component extracted and specimen imports it | Promotion Gate |
| BeatIndicator primitive | promote | Source-first component extracted and specimen imports it | Promotion Gate |
| CardShell primitive | promote | Source-first component extracted and specimen imports it | Promotion Gate |
| Kicker primitive | promote | Source-first component extracted and specimen imports it | Promotion Gate |
| SpineCard primitive | promote | Source-first component extracted and specimen imports it | Promotion Gate |
| Mark primitive | promote | Source-first component extracted and specimen imports it | Promotion Gate |
| ChipTabs primitive | promote | Source-first component extracted and specimen imports it | Promotion Gate |
| Knob primitive | promote | Source-first component extracted and analog/digital specimens import it | Promotion Gate |
| Key primitive | promote | Source-first component extracted and specimen imports it | Promotion Gate |
| Drawer shell | promote | Source-first component extracted; unique and composition specimens import it | Promotion Gate |
| Sticker badge | keep as variant | Fixed-geometry Sticker variant; color controls edge/text and timing follows global brass sweep | Promotion Gate 2026-05-27 |
| Code strip | promote | Reused code-strip grammar now lives in `CodeStrip.vue` | Taxonomy Gate |
| Brand cover | promote as unique source | Singular brand artifact, not reusable component grammar | Unique Extraction Gate |
| Brand logo | promote as unique source | Singular brand identity system | Unique Extraction Gate |
| App top-drawer alignment | promote wrapper adoption | Production `TopDrawer.vue` wraps `DrawerShell` while preserving Teleport, trigger/panel slots, offsets, and public methods | App Integration Gate |
| Loading screen composition | promote source composition | `LoadingScreen.vue` owns visual grammar; app `LoadingSplash.vue` preserves behavior and feeds state/actions | App Integration Gate |
| Top drawer composition | keep local / app integrated | Composition proof composes `DrawerShell`; local controls remain composition-local and production `TopDrawer.vue` wraps the shell | App Integration Gate 2026-05-27 |
| PatternCard compound | promote | Source-first component extracted and specimens import it | Repository Conventions + Promotion Gate |
| PatternReel compound | promote | Source-first component extracted and specimen imports it | Taxonomy + Promotion Gate |
| PresetRow compound | promote | Source-first action/status row extracted from SpineCard specimen and composes Kicker | Taxonomy + Promotion Gate 2026-05-27 |
| Compound pattern artifacts | promote | PatternCard and PatternReel boundaries resolved for current pattern family | Taxonomy Gate |
| Composition artifacts | keep local / source aligned | `CompositionTopDrawer` composes `DrawerShell`; `CompositionLoadingScreen` imports `LoadingScreen`; production app wrappers are aligned | Composition Gate + App Integration Gate |

## Gate-Parked Decisions

| Decision | Gate | Owner | Date | Unblock Condition | May Advance? |
|---|---|---|---|---|---:|
| Full style-guide scope acceptance | Scope Gate | user | 2026-05-24 | User accepts/redirects packet | yes, recovery docs only |
| Primitive layer closure | Promotion Gate | agent + user | 2026-05-25 | Every current primitive specimen imports source components; old raw primitive class families are gone from primitive/compound specimens; unresolved primitive-adjacent items are parked below | yes, advance to unique/composition audits |
| Token doctrine conflicts | Doctrine Gate | agent + user | 2026-05-26 | Contradictions resolved/localized; app/component migrations are parked separately | yes |
| Sticker badge taxonomy | Promotion Gate | agent + user | 2026-05-27 | Resolved as fixed-geometry Sticker variant with shared color vocabulary and global brass timing | yes |
| Music color computed `.note` migration | Doctrine/Promotion Gate | user + agent | 2026-05-26 | `.note` computed recipe is token source; legacy `--note-*` aliases remain parked for app/component migration | yes |
| Brass timing model | Promotion Gate | agent + user | 2026-05-27 | Global brass timing resolved; Sticker badge timing now matches the global 6.5s sweep | yes |
| Kicker/spec marker typography exception | Doctrine Gate | agent + user | 2026-05-26 | Product labels are Jazz; guide/spec inspection labels may be mono | yes |
| Brand/danger semantics | Doctrine Gate | agent + user | 2026-05-26 | Brand colors decorative; semantic status aliases may map to brand values | yes |
| SpineCard preset row | Taxonomy/Promotion Gate | agent + user | 2026-05-27 | Promoted as `PresetRow` compound and composed by `PrimitiveSpineCard.vue` | yes |
| Production knob alignment | App Integration Gate | user + agent | 2026-05-27 | Production `src/components/knobs/*` controls are behavior-heavy inputs with gestures, haptics, GSAP arc animation, display mode, and compatibility events; adoption of the visual primitive is parked as a future production migration, not current style-guide residue | yes |
| App top-drawer alignment | App Integration Gate | agent + user | 2026-05-27 | Production `TopDrawer.vue` wraps promoted `DrawerShell` without changing consumer slot contracts | yes |
| Loading splash alignment | App Integration Gate | agent + user | 2026-05-27 | `LoadingScreen.vue` promoted; `LoadingSplash.vue` keeps loading/audio/MIDI/error behavior as adapter | yes |

## Unique / Composition Taxonomy Decision Packet

Evidence:

- `UniqueBrandCover.vue` is fixed brand cover art/copy/meta, not reusable shell grammar.
- `UniqueBrandLogo.vue` is the Emotitone identity lockup system, not a generic logo component family.
- `UniqueDrawer.vue` demonstrates drawer shell behavior now promoted to `DrawerShell`; the promoted source still overlaps existing app `src/components/TopDrawer.vue`.
- `CompositionLoadingScreen.vue` is now an inspection specimen for `LoadingScreen.vue`, while app `src/components/LoadingSplash.vue` owns current loading/audio/MIDI/error behavior and feeds the source composition.
- `CompositionTopDrawer.vue` is a product region proof with drawer panes, app context, and local controls; its reusable shell now comes from `DrawerShell`.

Recommendation:

- Treat brand cover and brand logo as true uniques.
- Treat `UniqueCodeStrip.vue` as a legacy primitive specimen path.
- Reclassify drawer as lower-layer source plus app-alignment debt, not a unique.
- Keep loading/top-drawer previews as compositions; app integration gates have since aligned production wrappers.
- Present the Finish Gate packet for user accept/continue/pause after current verification.

Alternatives rejected:

- Promote brand cover/logo to generic compounds: rejected because their identity is singular and brand-specific.
- Promote top-drawer panes/controls into compounds now: rejected because they remain composition-local and are not repeated outside this product-region proof.
- Rewrite app `TopDrawer.vue` or `LoadingSplash.vue` during taxonomy: rejected because taxonomy is the naming gate, not app integration.

Unresolved risk:

- User must still accept, continue, or pause at the Finish Gate before the design-lab run is called complete.

Unblocks:

- Finish Gate user decision.

## Unique Extraction Decision Packet

Evidence:

- `UniqueBrandCover.vue` and `UniqueBrandLogo.vue` were accepted as true uniques, but their implementation still lived in specimen files.
- Unique closure requires singular artifacts to be marked so future work does not accidentally generalize them.
- The repo already has source-first locations for primitives and compounds; brand uniques needed the same source/specimen separation without becoming reusable families.

Recommendation:

- Establish `src/components/uniques/` for true unique source artifacts after taxonomy accepts singular role.
- Promote `BrandCover.vue` and `BrandLogo.vue` as source uniques.
- Keep `UniqueBrandCover.vue` and `UniqueBrandLogo.vue` as inspection specimens that import the source uniques.

Alternatives rejected:

- Leave brand uniques style-guide-local: rejected because specimens would remain the implementation source of truth.
- Promote brand cover/logo to primitives or compounds: rejected because their identity is singular and brand-specific.

Unresolved risk:

- App usage for these brand uniques is not established; this slice only closes style-guide unique source ownership.

Unblocks:

- Unique closure can now treat brand cover/logo as source-first and focus remaining residue on loading integration.

## DrawerShell Promotion Decision Packet

Evidence:

- `UniqueDrawer.vue` and `CompositionTopDrawer.vue` both needed the same bounded drawer frame, scrim, torn handle, anchor axis, close behavior, and resize/snap language.
- Product panes, triggers, and settings content belong to the top-drawer composition, not to the reusable shell.
- Existing `src/components/TopDrawer.vue` was production behavior source and needed a later app-integration slice to adopt the promoted shell safely.

Recommendation:

- Promote `DrawerShell` under `src/components/primatives/`.
- Make `UniqueDrawer.vue` a legacy specimen path that inspects `DrawerShell`.
- Make `CompositionTopDrawer.vue` compose `DrawerShell` while keeping product panes/controls local.
- Parked production `TopDrawer.vue` alignment behind App Integration Gate; resolved 2026-05-27 by wrapping `DrawerShell` inside the production component.

Alternatives rejected:

- Keep shell behavior in specimens: rejected because the same behavior crossed unique/composition boundaries.
- Rewrite app `TopDrawer.vue` now: rejected because app behavior alignment needs its own verification.

Unresolved risk:

- Production top-drawer behavior uses an adapter/wrapper rather than a direct primitive swap.

Unblocks:

- Composition closure can now discuss app integration and local controls without hidden drawer-shell debt.

## Primitive Closure Decision Packet

Evidence:

- All 12 current primitive specimen files under `src/style-guide/primatives/` import from `src/components/primatives/`.
- `UniqueCodeStrip.vue` remains a legacy specimen path, but it imports `CodeStrip.vue` and no longer defines the reusable code-strip grammar.
- Residue search for old raw primitive class families in primitive/compound specimens now returns only expected source-component styling hooks (`:deep(.mark)`) and source component usage; unique/composition surfaces have since been classified and aligned or kept local.
- Prior browser DOM proofs in `RESIDUE_PROOF.md` show old local primitive class families rendering 0 nodes for each extracted primitive slice.

Recommendation:

- Treat the primitive extraction layer as closed for current style-guide scope.
- Advance to the unique/composition Taxonomy Gate next, starting with `UniqueBrandCover.vue`, `UniqueBrandLogo.vue`, `UniqueDrawer.vue`, `CompositionLoadingScreen.vue`, and `CompositionTopDrawer.vue`.

Alternatives rejected:

- Continue polishing primitive specimens before taxonomy: rejected because remaining primitive-adjacent work is gate-parked and would blur the next-layer audit.
- Rename/move `UniqueCodeStrip.vue` now: rejected because file/navigation organization is a separate gate from source-of-truth closure.

Unresolved risk:

- Token doctrine is closed for current style-guide scope; remaining risk is app/component migration, not hidden primitive implementation inside specimens.

Unblocks:

- Taxonomy audit for uniques/compositions and residue proof against raw unique/composition recipes.
