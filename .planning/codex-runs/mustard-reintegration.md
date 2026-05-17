Added mustard back as a brand-tier token and preview swatch, scoped to the requested surfaces.

Edited:
- [project/colors_and_type.css](/Users/burooj/Projects/emotitone-design-system/project/colors_and_type.css:7): TOC includes mustard; brand comment says five colors; `--mustard: #f0b137;` added after `--bone` at line 84.
- [project/preview/tokens-brand-colors.html](/Users/burooj/Projects/emotitone-design-system/project/preview/tokens-brand-colors.html:5): `.grid` and `.applied` are both `repeat(5, 1fr)`; mustard marker rule at line 84; caption updated at line 100; mustard swatch starts line 127; mustard demo starts line 159.
- [sink.js](/Users/burooj/Projects/emotitone-design-system/sink.js:610): added the `--mustard` swatch after `--bone`.

`.planning/atoms.json` was searched but left unchanged: there is no `brand_color_set` finding, and no entry that actually defines the brand 4-set/count.

Verification:
- Ran `grep -n "mustard\|--mustard" project/colors_and_type.css project/preview/tokens-brand-colors.html sink.js`.
- `--mustard: #f0b137;` appears exactly once in `colors_and_type.css`, in the brand section after `--bone`.
- `grid-template-columns` was bumped 4 -> 5 in both `.grid` and `.applied`.
- `--brass`, music, note, ivory, and ink tokens were not changed.

Mustard reference counts:
- `project/colors_and_type.css`: 2
- `project/preview/tokens-brand-colors.html`: 6
- `sink.js`: 2
- `.planning/atoms.json`: 0