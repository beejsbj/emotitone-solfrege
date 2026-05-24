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
| Repeated clip-path polygons | inspect `clip-path` in primitives | known duplicates in buttons/keys/tabs | prune to tokens where exact |
| Duplicated primitive internals in compounds/compositions | inspect compounds/compositions after primitive extraction | known copies of icon buttons, bar tape, code strip, stack/active cards | extract or gate-park |
| One-offs not marked unique | inspect unique and composition specimens | `UniqueCodeStrip` is suspect because reused in compounds | Taxonomy Gate |
| Specimens defining source behavior | compare `src/style-guide/primatives` to `src/components/primatives` | known: all primitive specimens except Sticker define source behavior | extract or keep-local decision |
| Guide helpers copied instead of composed | inspect primitive specimens for anatomy/variant chrome | known duplicates | prune into helpers during specimen cleanup |

## Current Residue Verdict

- Residue remains unresolved.
- The run cannot be called complete.
- Primitive layer cannot close until every primitive specimen is extracted, pruned, or explicitly kept local behind a named gate.
- Compound layer cannot close while it copies lower-layer internals instead of composing source components.

## Next Proof Step

- After Repository Conventions Gate, run command-based residue scans and attach concrete counts.
- For each extraction slice, update this file with before/after residue evidence.
