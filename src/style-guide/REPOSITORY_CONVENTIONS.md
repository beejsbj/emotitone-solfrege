# Repository Conventions

Date: 2026-05-24

## Token Source Format

- CSS custom properties and global utility classes.
- Current branch token source: `src/emotitone-design-system.css`.
- Token specimens demonstrate token groups, but do not define token source.

## Token Source Location

- `src/emotitone-design-system.css`.
- Imported by `src/main.ts`.
- Upstream taste/doctrine reference: `/Users/burooj/Projects/emotitone-design-system/project/design-doctrine.md`.

## Primitive Component Location

- `src/components/primatives/`.
- Preserve the existing `primatives` spelling.
- Current extracted model: `src/components/primatives/Sticker.vue`.

## Compound / Unique Component Location

- No reusable compound/unique source directory has been established for this design-lab branch yet.
- Current compound/unique artifacts live as specimens under `src/style-guide/compounds/` and `src/style-guide/uniques/`.
- Recommendation: do not create reusable compound/unique locations until primitive closure proves the lower-layer grammar.

## Specimen / Style-Guide Location

- `src/style-guide/`.
- Layer specimen folders: `tokens`, `primatives`, `compounds`, `uniques`, `compositions`.
- Specimen helpers: `src/style-guide/guide/AnatomyDisplay.vue`, `VariantGrid.vue`, `VariantCell.vue`.

## Style-Guide Route Or Entry

- `src/App.vue` renders `src/style-guide/StyleGuide.vue` directly on this branch.
- No app route integration is in scope for this branch.

## Verification Command

- Primary static verification:
  - `bun run type-check`
  - `bun run build`
- Render verification:
  - `bun run dev`
  - Open `http://localhost:5175/`
- Full test suite:
  - `bun run test:run` is not the primary design-lab signal for this branch because prior evidence showed unrelated existing failures.

## Naming Case And File Pattern

- Vue components use PascalCase filenames.
- Vue files use `<script setup lang="ts">` when they need script logic.
- Style-guide specimen files use layer prefixes: `Token*`, `Primitive*`, `Compound*`, `Unique*`, `Composition*`.
- Extracted primitive files should use concise component names without the specimen prefix, for example `Sticker.vue`.
- Scoped CSS is acceptable inside extracted components, but reusable grammar discovered during extraction must resolve through promote/prune/keep-local.

## Evidence

- `WORKFLOW.md` defines the preview-to-component extraction loop and says the styleguide demonstrates components, not the source of truth.
- `WORKFLOW.md` preserves the `primatives` spelling.
- `PrimitiveSticker.vue` imports `Sticker.vue` and guide helpers.
- `package.json` defines `dev`, `type-check`, and `build`; local hooks require Bun command forms.
- Doctrine says compounds/compositions should use child components rather than paraphrasing primitive CSS.

## Recommendation

- Accept these conventions for extraction work until the user explicitly changes them.
- Keep extraction Vue-native and source-first: component under `src/components/primatives/`, then specimen imports and inspects it.
- Record any new shared constants, data maps, or helper locations in this file before using them broadly.

## Alternatives Rejected

- Moving primitives into `src/components/primitives/`: rejected by user constraint.
- Treating `src/style-guide/primatives/` as implementation source: rejected by workflow and design-lab doctrine.
- Adding route infrastructure for the style guide: rejected by branch intent and current `App.vue` shell.
- Creating compound/unique implementation folders now: deferred until lower-layer closure.

## Unresolved Risk

- Shared TS constants do not yet have a design-system-specific location.
- Existing `src/components/ui` contains app UI components that may overlap with future primitives but do not yet follow the new token grammar.
- Compounds and uniques may eventually need reusable source locations, but creating them before primitive closure would invite drift.

## Decision Needed

- Repository Conventions Gate recommendation: continue using the current branch conventions above for the next extraction slice.
- Any new directory category for constants or compound sources requires a later gate.

## Unblocks

- Creating schema, coverage, inventory, promotion, residue, and closure docs.
- Beginning the first primitive extraction without path ambiguity.

## Gate Decision

continue under existing branch conventions; no file moves approved beyond documented primitive extraction pattern
