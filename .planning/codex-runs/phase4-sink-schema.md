Implemented the Phase 4 sink schema/render rewrite.

Changed:
- Replaced [.planning/unification-data.json](/Users/burooj/Projects/emotitone-design-system/.planning/unification-data.json:1) with the new `_meta` + `groups[]` layer/family schema.
- Reworked [sink.js](/Users/burooj/Projects/emotitone-design-system/sink.js:92) to render by `TOKEN → PRIMITIVE → PART → SURFACE → COMPOSITION`, with family sub-sections, sidebar anchors, inline cards, and `CONSUMES` rows.
- Added the requested summary at [.planning/codex-runs/phase4-sink-schema.md](/Users/burooj/Projects/emotitone-design-system/.planning/codex-runs/phase4-sink-schema.md:1).

Validation:
- Schema check passes: 49 unique cards, no missing preview files, no duplicate card refs, every `consumes` atom exists in `atoms.json`, no orphan atoms.
- `git diff --check` passes.
- Non-executing module syntax check passes via `node --input-type=module --check < sink.js`.
- I did not run `bun sink.js`. I tried `bun --check sink.js`, but Bun evaluated the module and hit `EADDRINUSE` on port 3000, so I stopped there.

I did not modify `project/preview/*.html`, `project/colors_and_type.css`, `project/preview/_card.css`, or `project/ui_kits/`. Note: untracked Phase 5 files appeared during the run, including `project/preview/composition-app-reference-index.html`; I left the file untouched but included it in the schema so every existing preview card remains reachable.