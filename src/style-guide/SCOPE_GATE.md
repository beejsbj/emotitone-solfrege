# Scope Gate

Date: 2026-05-24

Current status, 2026-05-27: this packet records the original Scope Gate and the midstream recovery map that started the run. After user review, the design-system scope remains open for a further doctrine-correction pass before main-app implementation. The current corrections are recorded in `DESIGN_LOG.md`, `PROMOTION_AUDIT.md`, `STYLE_GUIDE_SCHEMA.md`, and `RAW_RECIPE_INVENTORY.md`.

## Evidence

- `src/style-guide/WORKFLOW.md` says this branch ports source preview HTML into the app's local styleguide, then turns useful pieces into reusable Vue components.
- `WORKFLOW.md` names `src/components/primatives/` as the reusable primitive home and explicitly preserves the `primatives` spelling.
- `src/style-guide/StyleGuide.vue` already renders token collections, primitives, compounds, uniques, and compositions as one local sink surface.
- `src/components/primatives/Sticker.vue` was the only extracted reusable primitive at recovery start; the current primitive source set is recorded in `STYLE_GUIDE_SCHEMA.md`.
- `src/style-guide/primatives/PrimitiveSticker.vue` imports `Sticker.vue` and guide helpers, making it the trustworthy extraction pattern.
- `src/style-guide/TOKEN_PROMOTION_AUDIT.md` recorded the initial token and primitive recipe gaps; its current header now marks it as historical audit context with resolutions folded into `PROMOTION_AUDIT.md`.
- Read-only subagent audits found that higher layers copied `BarTape`, icon-button, code-strip, stack-card, and active-card grammar; those copied recipes have since been promoted or pruned through source-first components.
- Upstream doctrine in `/Users/burooj/Projects/emotitone-design-system/project/design-doctrine.md` defines the five-tier model, two-layer palette law, one brass-lit signal rule, and "lifted, not paraphrased" component composition rule.

## Shortest Midstream Recovery Map

### Current Layer

- Historical starting point: the branch entered this run between raw recipe inventory and primitive extraction.
- Current note, 2026-05-27: token doctrine, primitive extraction, compounds, brand uniques, DrawerShell, top-drawer app alignment, loading composition integration, sticker badge taxonomy, preset-row compound promotion, production knob migration parking, and final residue sweeps have all been recorded in closure artifacts.
- The user accepted the current decomposed scope as complete; future work should continue through a named migration gate.

### Trustworthy Existing Artifacts

- `src/emotitone-design-system.css`: branch-local token source.
- `/Users/burooj/Projects/emotitone-design-system/project/design-doctrine.md`: taste/doctrine source.
- `src/style-guide/StyleGuide.vue`: current style-guide entry.
- `src/style-guide/WORKFLOW.md`: branch-local extraction rules.
- `src/style-guide/TOKEN_PROMOTION_AUDIT.md`: prior audit evidence.
- `src/components/primatives/Sticker.vue`: reusable primitive source-of-truth pattern.
- `src/style-guide/primatives/PrimitiveSticker.vue`: specimen-imports-source pattern.
- `src/style-guide/guide/AnatomyDisplay.vue`, `VariantGrid.vue`, `VariantCell.vue`: specimen helpers, not layer source of truth.

### Initial Suspected Drift, Now Resolved Or Parked

- Primitive specimens now import source components from `src/components/primatives/`; specimen staging remains inspection chrome.
- Pattern compounds now compose source components instead of copying lower-level CSS.
- `UniqueCodeStrip.vue` now inspects the source unique `CodeStrip`.
- Key/button/tab/knob/bar/pattern recipes are named in source components or explicitly kept local/parked in the promotion ledger.
- Older repo/app conventions remain reference material; branch-local design-lab conventions are recorded in `REPOSITORY_CONVENTIONS.md`.

### Current Gate

- Repository Conventions, Taxonomy, Doctrine/Token Closure, Promotion, App Integration, and residue sweeps are recorded in `DESIGN_LOG.md`.
- Finish Gate is accepted for current scope.

### Completed First Extraction / Audit Slice

- Durable recovery artifacts were created and updated under `src/style-guide/`.
- `BarTape` was extracted first, then copied compound residue was pruned.
- IconButton, CodeStrip, PatternCard, PatternReel, BeatIndicator, CardShell, Kicker, SpineCard, Mark, ChipTabs, Knob, Key, DrawerShell, BrandCover, BrandLogo, LoadingScreen, and Sticker badge decisions have been recorded in the durable ledgers; PresetRow has been pruned as over-extraction.

## Included

- Target repo: `/Users/burooj/Projects/emotitone-solfrege`.
- Style-guide surface: `src/style-guide/`.
- Token source: `src/emotitone-design-system.css` plus token specimens.
- Reusable primitive source path: `src/components/primatives/`.
- Current style-guide order: tokens, primatives, uniques, compounds, compositions, and specimen helpers.
- Durable design-lab artifacts under `src/style-guide/`.
- Verification through the repo's closest style-guide commands.

## Excluded

- Rewriting unrelated app behavior outside the style-guide branch goal.
- Renaming `primatives`.
- Integrating the style guide into production routes.
- Treating upstream preview HTML as production source.
- Fixing unrelated app test failures unless they block type-check/build for the style guide.

## Source Of Truth

- Reusable primitives: `src/components/primatives/`.
- Tokens: `src/emotitone-design-system.css`, with remaining app/component migrations parked behind named gates rather than hidden inside current style-guide decomposition.
- Specimens/documentation: `src/style-guide/**`.
- Specimen helpers: `src/style-guide/guide/**`; these inspect and present components but are not taxonomy layers.
- Reference-only material: ported preview specimens after each source/keep-local/unique decision is recorded.

## Target Layer Depth

- Full style-guide completion for this branch: tokens, primatives, uniques, compounds, compositions, and specimen helpers.
- Advancement must be layer-gated: each layer needs closure proof before the next layer is treated as complete.

## Completion Proof

- `STYLE_GUIDE_SCHEMA.md` classifies artifacts and source-of-truth boundaries.
- `REPOSITORY_CONVENTIONS.md` records paths, naming, route/entry, and verification.
- `COVERAGE_AUDIT.md` maps source artifacts to layer and resolution state.
- `RAW_RECIPE_INVENTORY.md` captures raw recipes before extraction.
- `PROMOTION_AUDIT.md` records promote/prune/keep-local decisions and gates.
- `RESIDUE_PROOF.md` proves no unresolved residue remains, or parks residue behind named gates.
- `LAYER_CLOSURE.md` records closure evidence per layer.
- `DESIGN_LOG.md` records gate decisions.
- The style-guide page passes `bun run type-check` and `bun run build`; render verification uses `bun run dev` on port 5175 when needed.

## Recommendation

- Treat the original scope as fully decomposed for current style-guide surfaces.
- Do not reopen a broad Intent Gate unless future work changes doctrine or taste direction.
- Treat production knob visual adoption, legacy note alias migration, and file/navigation cleanup as future named migration gates rather than hidden completion blockers.

## Alternatives Rejected

- Greenfield design interview: rejected because the repo already contains doctrine, a style-guide surface, tokens, specimens, workflow, and audit history.
- Style-guide specimen as source of truth: rejected by workflow, doctrine, and user instructions.
- Rename `primatives`: rejected by explicit user constraint and local workflow.
- Jump to compounds/compositions first: rejected because lower-layer residue has already leaked upward.
- Full Vitest suite as primary proof: rejected because prior evidence showed unrelated existing failures for this temporary style-guide branch.

## Unresolved Risk

- Future app migrations may still need Intent/Doctrine/Taste gates if they change product behavior or doctrine.
- Build success remains necessary but not sufficient; current finish proof also includes residue, coverage, layer closure, and render/test evidence.

## Requires User Decision

- No remaining user decision for the current scope. Future work should name a new migration gate before expanding the scope.

## Allowed Autonomy

- Agent may decide: documentation wording, schema normalization, coverage rows, proof scaffolds, local audit structure, and extraction ordering when evidence clearly favors a low-risk slice.
- Agent may implement: reversible extraction that follows repo conventions and preserves visual intent.
- User decides: taxonomy ambiguity, taste direction, promotions that change shared grammar, pruning that discards visual material, and doctrine changes.

## Scope Decisions

| Decision | Gate | Owner | Date | Unblock Condition |
|---|---|---|---|---|
| Confirm first primitive extraction slice as `BarTape` | Taxonomy Gate / Promotion Gate | user + agent | 2026-05-24 | Resolved; source-first extraction completed |
| Decide whether token doctrine conflicts require an Intent/Doctrine Gate | Intent Gate / Doctrine Gate | user + agent | 2026-05-26 | Resolved/localized; token doctrine closed for current style-guide scope |
| Decide whether `Sticker` badge remains a variant or becomes another primitive | Promotion Gate | user + agent | 2026-05-27 | Resolved as fixed-geometry `Sticker` variant |
| Decide whether `CodeStrip` is unique, primitive, compound part, or pattern-card-private slot | Taxonomy Gate | user + agent | 2026-05-27 | Resolved as unique; compounds may compose uniques plus primitives |
| Decide whether to call the current decomposed scope complete | Finish Gate | user | 2026-05-27 | Resolved; user accepted current scope complete |

## Unblocks

- PR creation for secure review.
