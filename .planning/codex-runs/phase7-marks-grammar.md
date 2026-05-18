Updated [components-marks.html](/Users/burooj/Projects/emotitone-design-system/project/preview/components-marks.html).

Verification:
- Grammar hooks present: `Anatomy`, `anatomy-wrap`, `Families`, `variants-full`.
- SVG `path`/`polygon` count: `20` before, `20` after.
- Hex literal swaps made: `6` total.
- No mapped hex literals remain; no `#` literals remain in the file.
- No SVG strokes remain, so the butt-cap requirement is satisfied.
- `git diff --check` passed.

HTTP caveat: `bun` is already listening on port `3000` from this repo, but sandboxed `curl` to localhost fails with `Operation not permitted`, returning `000`, so I could not confirm the requested `200` from inside this environment.