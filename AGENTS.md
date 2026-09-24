# EmotiTone Repository Router

For any `implementing-design-system` work that reviews, defines, tightens, promotes, adopts, or verifies a visual-design unit, invoke `$emotitone-design-system` and follow it before asking questions or editing.

The visual pass has two durable repository records:

- `src/style-guide/DESIGN_SYSTEM_TRACKER.md` — current design truth and next gate.
- `src/style-guide/DESIGN_LOG.md` — chronological acceptance and implementation receipts.

Do not use `design-lab` for this pass. Keep standalone functionality and bug fixes outside the visual-system slice. Respect the dirty tree and coordinate with adjacent unit sessions before touching shared lineage or files.

## Historical Documentation & Plans Archive

Archived design evidence, historical research, early audit notes, and completed plans (e.g. modes expansion, Tone.js-era refactor PRP, stack review triage, and original notes) are preserved on the `archive/docs-and-plans` branch.

## Verification

Use the package scripts for typechecks, builds, and tests. They serialize expensive checks across this repository's worktrees; direct compiler/runner invocations bypass that protection. Run focused tests while editing, then one full verification at a coherent checkpoint. A build already includes its typecheck. Use watch/UI mode only when requested, and close it before another verification job. See [testing.md](docs/testing.md) for commands, limits, and test-quality guidance.
