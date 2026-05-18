Rewrote `project/preview/components-buttons.html` into the PRIMITIVE specimen grammar:

- Anatomy section with `.anatomy-wrap`
- Single `Variants / Roles / Sizes` section with `.variants-full`
- One-line caption
- Shared grammar CSS copied verbatim
- Preserved existing button variants, including icon roles, sizes, `ico-pair`, play-toggle, ghost-instrument, and paper-pill from existing references
- Removed `--bone` usage from this card; play-toggle active now uses ivory
- Added reduced-motion handling

Verification:
- Required file strings are present.
- `git diff --check` passes.
- `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/preview/components-buttons.html` returned `000` here. `bun` is listening on port 3000, but this sandbox blocks loopback connection attempts with `Operation not permitted`, so I could not get the requested `200` from inside this session.