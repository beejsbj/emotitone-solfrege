# Residue Proof

Date: 2026-05-24

## Status

Initial scaffold only. Residue is not cleared.

## Pattern Checks

| Pattern | Check Method | Current Result | Resolution |
|---|---|---|---|
| Raw hex colors in specimens/components | `rg "#[0-9a-fA-F]{3,8}" src/style-guide src/components/primatives src/emotitone-design-system.css` | not yet run for closure | pending |
| Raw px values in higher layers | inspect extracted components and specimens per slice | known many in specimens | keep local/promote/prune per slice |
| Raw durations/easings | inspect CSS for `ms`, `s`, `cubic-bezier` outside tokens | known brass/tabs/knobs conflicts | Promotion Gate |
| Repeated clip-path polygons | inspect `clip-path` in primitives | IconButton offcut/tile now use existing tokens; known duplicates remain in keys/tabs | prune to tokens where exact |
| Duplicated primitive internals in compounds/compositions | inspect compounds/compositions after primitive extraction | code strip and stack/active cards remain copied; BarTape and IconButton copies are pruned from pattern compounds | extract or gate-park |
| One-offs not marked unique | inspect unique and composition specimens | `UniqueCodeStrip` is suspect because reused in compounds | Taxonomy Gate |
| Specimens defining source behavior | compare `src/style-guide/primatives` to `src/components/primatives` | known: Sticker, BarTape, and IconButton pass; other primitive specimens still define behavior | extract or keep-local decision |
| Guide helpers copied instead of composed | inspect primitive specimens for anatomy/variant chrome | known duplicates | prune into helpers during specimen cleanup |

## Current Residue Verdict

- Residue remains unresolved.
- The run cannot be called complete.
- Primitive layer cannot close until every primitive specimen is extracted, pruned, or explicitly kept local behind a named gate.
- Compound layer cannot close while it copies lower-layer internals instead of composing source components.

## Slice Proof: BarTape

| Pattern | Before | After | Remaining |
|---|---|---|---|
| Specimen defines bar tape internals | `PrimitiveBarTape.vue` owned `.bar-tape`, segment classes, sizes, dim, downbeat, and playhead CSS | `PrimitiveBarTape.vue` imports `src/components/primatives/BarTape.vue` and keeps only panel/tick staging | pass for primitive specimen |
| Source component exists | none | `src/components/primatives/BarTape.vue` | pass |
| Compound copies | Pattern card/reel copied `.bar-tape` CSS | Pattern card/reel compose `BarTape`; copied `.bar-tape` CSS removed | pass for pattern compounds |
| Music color migration | Legacy `--note-*` aliases in specimen/compounds | `BarTape.vue` preserves legacy aliases | gate-parked behind music color model decision |

## Next Proof Step

- After Repository Conventions Gate, run command-based residue scans and attach concrete counts.
- For each extraction slice, update this file with before/after residue evidence.

## Slice Proof: Pattern Compounds Compose BarTape

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `CompoundPatternCard.vue` bar tape | Inline `.bar-tape` markup and copied CSS | Imports and renders `BarTape` with specimen data arrays | pass |
| `CompoundPatternReel.vue` bar tape | `innerHTML` string assembly emitted copied `.bar-tape` markup and relied on copied CSS | Vue template/state renders `BarTape` components | pass |
| Compound primitive residue | BarTape, icon button, code strip, stack/active card grammar copied | BarTape and IconButton removed from copied-residue list | CodeStrip and PatternCard/Reel boundaries remain |

## Slice Proof: IconButton

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `PrimitiveButtons.vue` source behavior | Specimen owned `.ico`, `.ico-pair`, geometry, state, tone, brass, and toggle CSS | Specimen imports `IconButton` and guide helpers; source component owns button grammar | pass for primitive specimen |
| Source component exists | none under `src/components/primatives/` | `src/components/primatives/IconButton.vue` | pass |
| Compound copies | Pattern card/reel copied `.ico` CSS and button classes | Pattern card/reel compose `IconButton` and keep only transport rail layout | pass for pattern compounds |
| Clip polygon duplicates | Button specimen repeated offcut/tile polygons | Source component uses `--clip-offcut` and `--clip-tile` | pass for IconButton; keys/tabs still pending |
| Paired controls | `.ico-pair` existed only in the button specimen | Kept as specimen-local wrapper around `IconButton` until reused elsewhere | accepted keep-local |

Browser DOM proof, 2026-05-25:

- `primitive-buttons.html` frame renders 32 `.icon-button` nodes and 0 `.ico` nodes.
- `CompoundPatternCard` renders 8 `.icon-button` nodes and 0 `.ico` nodes.
- `CompoundPatternReel` renders 4 `.icon-button` nodes and 0 `.ico` nodes.
