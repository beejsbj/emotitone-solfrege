Created [g13-pattern-reel-merge-DRAFT.html](/Users/burooj/Projects/emotitone-design-system/.planning/codex-runs/g13-pattern-reel-merge-DRAFT.html).

1. From `composition-pattern-reel-deck.html`: kept the cleaner deck treatment: compact stacked cards, tall active card, mini-rolls, dark cut-paper panel, floating panel label, and bottom active composition.
2. From `composition-pattern-reel-populated.html`: used the active-at-bottom mechanic, but implemented it with data-driven re-rendering instead of class-swapping incompatible markup. Clicking a stacked card promotes it to the active bottom card; the previous active demotes into the stack.
3. From `components-pattern-reel.html`: kept only the surface grammar as context. I did not merge or modify it.

Verification done: source files untouched, new file only; no `--paper`, `--bone`, raw `cubic-bezier`, raw hex colors, `v2-card`, or `width: 700` override in the draft; HTML parser accepted it; inline script syntax checks. I could not do a live browser visual pass because local server binding is blocked in this sandbox (`PermissionError`).

Human-review flag: I added an `@import` fallback to `../../project/preview/_card.css` inside the style block so the draft can resolve card chrome from `.planning/codex-runs/` while still preserving the required first `<link rel="stylesheet" href="_card.css">`.

