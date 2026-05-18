Rewrote [components-knobs.html](/Users/burooj/Projects/emotitone-design-system/project/preview/components-knobs.html) to the PRIMITIVE grammar.

Anatomy rows chosen: `Atom`, `Roles`, `Cuts`, `Track`, `Signal`, `Center`, `Motion`.

Variants axis: `visual × role`, with all 8 preserved: `arc/ring × range/boolean/options/button`. `variants-full` is explicit: `repeat(8, 1fr)`.

Verification:
- Required class strings present.
- `grep -c 'panel-floating-label\|knob-rotary' ...` returns `11`.
- `git diff --check` clean.
- No raw hex/rgba/hsla, cream/paper/bone, or invented `--p` style token remains in the file.
- `curl ... localhost:3000` returns `000` here because this sandbox blocks loopback connects with `Operation not permitted`; Bun reports port 3000 is already occupied by a listener.

Forced bit: the 8-up grid is tight at 700px, so I compacted the tiles and labels rather than hiding any variant.