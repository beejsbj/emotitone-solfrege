Rewrote [.planning/unification-data.json](/Users/burooj/Projects/emotitone-design-system/.planning/unification-data.json) to schema v3.

Verified:
- JSON parse passed with the requested `bun -e ...` command.
- Required card-count command passed at validation time: `cards_in_schema=49 cards_on_disk=49`, `missing_from_schema=[]`.
- `_meta.layer_order` is unchanged.
- No `SURFACE` groups remain.
- No duplicate card entries.
- All blurbs are ≤ 90 chars.
- `_meta.drift_candidates` contains the drift cards from the draft with short reasons.
- `project/preview/*.html` and `colors_and_type.css` were not modified by me.

One important workspace note: after the validation, another worker appears to have added untracked `project/preview/tokens-geometry.html`. I left it out of the schema per your instruction to exclude new parallel-worker cards, so rerunning the exact disk-count command now will see 50 files and report `tokens-geometry.html` missing.