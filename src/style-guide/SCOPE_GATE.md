# Scope Gate

Date: 2026-05-24

## Evidence

- `src/style-guide/WORKFLOW.md` says this branch ports source preview HTML into the app's local styleguide, then turns useful pieces into reusable Vue components.
- `WORKFLOW.md` names `src/components/primatives/` as the reusable primitive home and explicitly preserves the `primatives` spelling.
- `src/style-guide/StyleGuide.vue` already renders token collections, primitives, compounds, uniques, and compositions as one local sink surface.
- `src/components/primatives/Sticker.vue` is the only extracted reusable primitive currently present under `src/components/primatives/`.
- `src/style-guide/primatives/PrimitiveSticker.vue` imports `Sticker.vue` and guide helpers, making it the trustworthy extraction pattern.
- `src/style-guide/TOKEN_PROMOTION_AUDIT.md` records unresolved token and primitive recipe gaps; many primitive recipes still live only in specimen files.
- Read-only subagent audits found that higher layers already copy `BarTape`, icon-button, code-strip, stack-card, and active-card grammar, so residue is not limited to primitive specimens.
- Upstream doctrine in `/Users/burooj/Projects/emotitone-design-system/project/design-doctrine.md` defines the five-tier model, two-layer palette law, one brass-lit signal rule, and "lifted, not paraphrased" component composition rule.

## Shortest Midstream Recovery Map

### Current Layer

- Historical starting point: the branch entered this run between raw recipe inventory and primitive extraction.
- Current note, 2026-05-26: token doctrine, primitive extraction, PatternCard/PatternReel compounds, DrawerShell, and brand uniques have since been recorded in closure artifacts.
- Remaining unclosed work is the final all-layer Finish Gate audit after top-drawer and loading composition integration.

### Trustworthy Existing Artifacts

- `src/emotitone-design-system.css`: branch-local token source.
- `/Users/burooj/Projects/emotitone-design-system/project/design-doctrine.md`: taste/doctrine source.
- `src/style-guide/StyleGuide.vue`: current style-guide entry.
- `src/style-guide/WORKFLOW.md`: branch-local extraction rules.
- `src/style-guide/TOKEN_PROMOTION_AUDIT.md`: prior audit evidence.
- `src/components/primatives/Sticker.vue`: reusable primitive source-of-truth pattern.
- `src/style-guide/primatives/PrimitiveSticker.vue`: specimen-imports-source pattern.
- `src/style-guide/guide/AnatomyDisplay.vue`, `VariantGrid.vue`, `VariantCell.vue`: specimen helpers, not layer source of truth.

### Suspected Drift

- Most `src/style-guide/primatives/Primitive*.vue` files still define real component internals inside specimens.
- Compounds copy lower-level CSS for `.ico`, `.bar-tape`, `.cs`, `.stack-card`, and `.active-card`.
- `UniqueCodeStrip` is likely misclassified or at least reusable inside pattern compounds.
- Generic clip and motion tokens exist, but key/button/tab/knob/bar/pattern component-specific recipes are not named consistently.
- Some repo docs still describe older Tailwind-era app conventions; the design-lab branch conventions are more authoritative for this run.

### Next Gate

- Repository Conventions Gate is required before extraction changes component locations, shared constants, token files, or routes.
- Taxonomy Gate follows once the schema and coverage audit classify all current artifacts.
- Promotion Gate is expected during the first primitive extraction slice because several recipe gaps require decisions.

### Recommended First Extraction / Audit Slice

- First finish durable recovery artifacts: schema, repository conventions, coverage audit, raw recipe inventory, promotion audit, residue proof scaffold, layer closure scaffold, and design log.
- Recommended first extraction slice: `BarTape`, because primitive, compound card, and compound reel all duplicate it, and it unlocks pattern-card cleanup.
- Treat `IconButton`, `CodeStrip`, `PatternCard`, and `PatternReel` as near-following slices. `Keys` remains important but should not be first because it carries denser music-map, geometry, and format decisions.

## Included

- Target repo: `/Users/burooj/Projects/emotitone-solfrege`.
- Style-guide surface: `src/style-guide/`.
- Token source: `src/emotitone-design-system.css` plus token specimens.
- Reusable primitive source path: `src/components/primatives/`.
- Current style-guide layers: tokens, primitives, compounds, uniques, compositions, and specimen helpers.
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
- Tokens: `src/emotitone-design-system.css`, with unresolved token decisions tracked before promotion.
- Specimens/documentation: `src/style-guide/**`.
- Specimen helpers: `src/style-guide/guide/**`; these inspect and present components but are not taxonomy layers.
- Reference-only material: ported preview specimens until each is extracted into a real component or explicitly kept local/unique.

## Target Layer Depth

- Full style-guide completion for this branch: tokens, primitives, compounds, uniques, compositions, and specimen helpers.
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

- Continue from midstream recovery and do not reopen a broad Intent Gate unless existing doctrine conflicts with implemented taste.
- Establish Repository Conventions Gate before component extraction.
- Treat current primitive, compound, unique, and composition specimens as raw recipe sources, not implementation sources.
- Use `Sticker.vue` / `PrimitiveSticker.vue` as the extraction pattern.
- Start extraction with `BarTape` unless the user redirects at Taxonomy or Promotion Gate.

## Alternatives Rejected

- Greenfield design interview: rejected because the repo already contains doctrine, a style-guide surface, tokens, specimens, workflow, and audit history.
- Style-guide specimen as source of truth: rejected by workflow, doctrine, and user instructions.
- Rename `primatives`: rejected by explicit user constraint and local workflow.
- Jump to compounds/compositions first: rejected because lower-layer residue has already leaked upward.
- Full Vitest suite as primary proof: rejected because prior evidence showed unrelated existing failures for this temporary style-guide branch.

## Unresolved Risk

- Token doctrine conflicts may force an Intent or Doctrine Gate later.
- Existing `TOKEN_PROMOTION_AUDIT.md` is useful but not yet fully normalized into design-lab artifact tables.
- The style-guide page may build while still containing taxonomy residue; build success is necessary but not sufficient.

## Requires User Decision

- Accept full style-guide completion as the run scope, with layer-gated extraction.
- Confirm or redirect the recommended first extraction slice: `BarTape` first.
- Decide later Promotion Gate items when extraction exposes system-level grammar choices.

## Allowed Autonomy

- Agent may decide: documentation wording, schema normalization, coverage rows, proof scaffolds, local audit structure, and extraction ordering when evidence clearly favors a low-risk slice.
- Agent may implement: reversible extraction that follows repo conventions and preserves visual intent.
- User decides: taxonomy ambiguity, taste direction, promotions that change shared grammar, pruning that discards visual material, and doctrine changes.

## Pending Scope Decisions

| Decision | Gate | Owner | Date | Unblock Condition |
|---|---|---|---|---|
| Confirm first primitive extraction slice as `BarTape` | Taxonomy Gate / Promotion Gate | user + agent | 2026-05-24 | Proceeded under continuation objective; source-first extraction completed |
| Decide whether token doctrine conflicts require an Intent/Doctrine Gate | Intent Gate / Doctrine Gate | user + agent | 2026-05-24 | Contradiction survives recovery audit |
| Decide whether `Sticker` badge remains a variant or becomes another primitive | Promotion Gate | user | 2026-05-24 | Sticker follow-up extraction or shared badge evidence |
| Decide whether `CodeStrip` is unique, primitive, compound part, or pattern-card-private slot | Taxonomy Gate | user | 2026-05-24 | Pattern-card/code-strip extraction planning |

## Unblocks

- Repository Conventions Gate.
- Schema and coverage audit creation.
- Raw recipe inventory normalization.
- First primitive extraction plan.
