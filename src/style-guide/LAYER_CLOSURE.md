# Layer Closure

Date: 2026-05-25

## Layer

current recovery state across token, primitive, compound, unique, and composition layers

## Source Artifacts

- `src/emotitone-design-system.css`
- `src/style-guide/tokens/*.vue`
- `src/components/primatives/Sticker.vue`
- `src/style-guide/primatives/*.vue`
- `src/style-guide/compounds/*.vue`
- `src/style-guide/uniques/*.vue`
- `src/style-guide/compositions/*.vue`
- `src/style-guide/guide/*.vue`

## Source Of Truth

- Tokens: `src/emotitone-design-system.css`.
- Primitives: `src/components/primatives/`.
- Compounds: `src/components/compounds/`.
- Specimens: `src/style-guide/**`.
- Specimen helpers: `src/style-guide/guide/**`.

## Closure Checklist

| Check | Status | Proof | Linked Artifacts |
|---|---|---|---|
| source artifacts listed | pass | Schema and coverage audit list current artifacts | `STYLE_GUIDE_SCHEMA.md`, `COVERAGE_AUDIT.md` |
| raw recipes resolved or gate-parked | partial | Primitive extraction recipes are resolved or gate-parked; token doctrine, unique, and composition decisions remain | `RAW_RECIPE_INVENTORY.md`, `PROMOTION_AUDIT.md` |
| source of truth named | partial | Tokens/primitives/PatternCard compound/specimens named; uniques deferred | `REPOSITORY_CONVENTIONS.md` |
| specimens demonstrate, not define | partial | Current primitive specimens now import source components; uniques/compositions still need lower-layer audits | `COVERAGE_AUDIT.md` |
| coverage rows have Resolution | pass | Initial coverage rows include non-empty resolution state | `COVERAGE_AUDIT.md` |

## Per-Layer Closure Proof

### Token Closure

| Check | Status | Proof | Linked Artifacts |
|---|---|---|---|
| token groups documented | partial | Token groups exist in CSS and specimens | `src/emotitone-design-system.css`, `STYLE_GUIDE_SCHEMA.md` |
| semantic aliases documented | partial | Some aliases documented; conflicts remain | `PROMOTION_AUDIT.md` |
| naming rules documented | partial | CSS comments document groups; unresolved music/brass/type/brand semantics | `TOKEN_PROMOTION_AUDIT.md` |
| allowed raw-value exceptions documented | fail | Not normalized yet | `RESIDUE_PROOF.md` |
| token candidates from raw recipe inventory resolved | fail | Several token candidates pending | `RAW_RECIPE_INVENTORY.md` |
| next layer has enough token vocabulary | partial | Enough for current primitive source components; wider token doctrine conflicts remain for music colors/type/brand semantics | `PROMOTION_AUDIT.md` |

### Primitive Closure

| Check | Status | Proof | Linked Artifacts |
|---|---|---|---|
| primitive families have anatomy | pass | Sticker, BarTape, BeatIndicator, CardShell, IconButton, CodeStrip, Kicker, SpineCard, Mark, ChipTabs, Knob, and Key have anatomy; Sticker badge is explicitly gate-parked | `PrimitiveSticker.vue`, `PrimitiveBarTape.vue`, `PrimitiveBeatIndicator.vue`, `PrimitiveCard.vue`, `PrimitiveButtons.vue`, `PrimitiveKicker.vue`, `PrimitiveSpineCard.vue`, `PrimitiveMarks.vue`, `PrimitiveTabs.vue`, `PrimitiveKnobsAnalog.vue`, `PrimitiveKnobsDigital.vue`, `PrimitiveKeys.vue`, `UniqueCodeStrip.vue`, `COVERAGE_AUDIT.md` |
| APIs, states, and variants are named | pass | Current primitive APIs are named; unresolved variant/doctrine choices are parked behind named gates | `PROMOTION_AUDIT.md` |
| token dependencies are named | pass | Primitive slice audits name dependencies; wider token doctrine conflicts are not hidden inside primitive source | `TOKEN_PROMOTION_AUDIT.md`, `PROMOTION_AUDIT.md` |
| primitives consume tokens or approved lower-level constants | pass | Current source primitives consume tokens/current lower-level constants; music-color, brass timing, typography, and app-alignment questions are gate-parked | `Sticker.vue`, `BarTape.vue`, `BeatIndicator.vue`, `CardShell.vue`, `IconButton.vue`, `CodeStrip.vue`, `Kicker.vue`, `SpineCard.vue`, `Mark.vue`, `ChipTabs.vue`, `Knob.vue`, `Key.vue` |
| specimens import/demonstrate primitive source files | pass | Current primitive specimens import source components; `UniqueCodeStrip.vue` is a legacy primitive specimen path that also imports source | `PrimitiveSticker.vue`, `PrimitiveBarTape.vue`, `PrimitiveBeatIndicator.vue`, `PrimitiveCard.vue`, `PrimitiveButtons.vue`, `PrimitiveKicker.vue`, `PrimitiveSpineCard.vue`, `PrimitiveMarks.vue`, `PrimitiveTabs.vue`, `PrimitiveKnobsAnalog.vue`, `PrimitiveKnobsDigital.vue`, `PrimitiveKeys.vue`, `UniqueCodeStrip.vue` |

### Compound Closure

| Check | Status | Proof | Linked Artifacts |
|---|---|---|---|
| child primitive dependencies are explicit | partial | PatternCard names BarTape, IconButton, and CodeStrip; other compounds not closed | `PatternCard.vue`, `COVERAGE_AUDIT.md` |
| slot contracts are explicit | partial | PatternCard and PatternReel prop contracts exist; other compounds not audited | `PatternCard.vue`, `PatternReel.vue` |
| compounds compose children instead of duplicating internals | partial | PatternCard composes children and PatternReel composes PatternCard; other compounds not audited | `RESIDUE_PROOF.md` |
| repeated child patterns are promoted or gate-parked | partial | PatternCard and PatternReel promoted | `PROMOTION_AUDIT.md` |

### Unique Closure

| Check | Status | Proof | Linked Artifacts |
|---|---|---|---|
| singular-role justification exists | fail | Not written yet | `src/style-guide/uniques/*.vue` |
| reusable material inside unique is resolved downward | fail | `UniqueCodeStrip` is resolved downward to `CodeStrip`; other uniques remain unaudited | `RESIDUE_PROOF.md` |
| unique is marked to prevent accidental generalization | fail | Not audited yet | `STYLE_GUIDE_SCHEMA.md` |

### Composition Closure

| Check | Status | Proof | Linked Artifacts |
|---|---|---|---|
| compositions use approved lower layers | fail | Primitive layer is closed for extraction, but unique/composition lower-layer dependency audits have not run | `src/style-guide/compositions/*.vue` |
| composition-only content/orchestration/app state is separated from component grammar | fail | Top drawer contains local control recipes | `RESIDUE_PROOF.md` |
| residue proof has no unresolved cross-cutting grammar | fail | Residue remains | `RESIDUE_PROOF.md` |

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
| Sticker badge | gate-parked | Existing source-first Sticker component contains unresolved badge variant/taxonomy | Promotion Gate |
| Code strip | promote | Reused code-strip grammar now lives in `CodeStrip.vue` | Taxonomy Gate |
| PatternCard compound | promote | Source-first component extracted and specimens import it | Repository Conventions + Promotion Gate |
| PatternReel compound | promote | Source-first component extracted and specimen imports it | Taxonomy + Promotion Gate |
| Compound pattern artifacts | promote | PatternCard and PatternReel boundaries resolved for current pattern family | Taxonomy Gate |
| Composition artifacts | gate-parked | Depend on lower-layer closure and residue proof | Composition Gate |

## Gate-Parked Decisions

| Decision | Gate | Owner | Date | Unblock Condition | May Advance? |
|---|---|---|---|---|---:|
| Full style-guide scope acceptance | Scope Gate | user | 2026-05-24 | User accepts/redirects packet | yes, recovery docs only |
| Primitive layer closure | Promotion Gate | agent + user | 2026-05-25 | Every current primitive specimen imports source components; old raw primitive class families are gone from primitive/compound specimens; unresolved primitive-adjacent items are parked below | yes, advance to unique/composition audits |
| Token doctrine conflicts | Doctrine Gate if needed | user + agent | 2026-05-24 | Contradictions resolved or localized | yes for unique/composition archaeology; no for token final closure |
| Sticker badge taxonomy | Promotion Gate | user + agent | 2026-05-25 | Decide variant versus separate primitive/unique when badge work becomes active | yes |
| Music color computed `.note` migration | Doctrine/Promotion Gate | user + agent | 2026-05-25 | Decide whether to replace legacy `--note-*` aliases with computed note recipes | yes |
| Brass timing model | Promotion Gate | user + agent | 2026-05-25 | Decide one shared duration/easing versus component-specific timings | yes |
| Kicker/spec marker typography exception | Doctrine Gate | user + agent | 2026-05-25 | Decide whether mono marker labels remain a named exception | yes |
| Brand/danger semantics | Doctrine Gate | user + agent | 2026-05-25 | Decide whether brand colors may carry functional status meaning | yes |
| SpineCard preset row | Taxonomy Gate | user + agent | 2026-05-25 | Decide whether the action/status row becomes a compound/control-row source component | yes |
| Production knob alignment | App Integration Gate | user + agent | 2026-05-25 | Decide whether behavior-heavy app knobs adopt the visual primitive | yes |

## Primitive Closure Decision Packet

Evidence:

- All 12 current primitive specimen files under `src/style-guide/primatives/` import from `src/components/primatives/`.
- `UniqueCodeStrip.vue` remains a legacy specimen path, but it imports `CodeStrip.vue` and no longer defines the reusable code-strip grammar.
- Residue search for old raw primitive class families in primitive/compound specimens now returns only expected source-component styling hooks (`:deep(.mark)`), source component usage, and unresolved unique/composition surfaces.
- Prior browser DOM proofs in `RESIDUE_PROOF.md` show old local primitive class families rendering 0 nodes for each extracted primitive slice.

Recommendation:

- Treat the primitive extraction layer as closed for current style-guide scope.
- Advance to the unique/composition Taxonomy Gate next, starting with `UniqueBrandCover.vue`, `UniqueBrandLogo.vue`, `UniqueDrawer.vue`, `CompositionLoadingScreen.vue`, and `CompositionTopDrawer.vue`.

Alternatives rejected:

- Continue polishing primitive specimens before taxonomy: rejected because remaining primitive-adjacent work is gate-parked and would blur the next-layer audit.
- Rename/move `UniqueCodeStrip.vue` now: rejected because file/navigation organization is a separate gate from source-of-truth closure.

Unresolved risk:

- Token doctrine gates can still affect final token closure, but they no longer hide raw primitive implementation inside specimens.

Unblocks:

- Taxonomy audit for uniques/compositions and residue proof against raw unique/composition recipes.
