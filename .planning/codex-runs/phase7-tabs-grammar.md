Updated `project/preview/components-tabs.html`.

Done:
- Rewrote to PRIMITIVE grammar: `Anatomy` → `States` → caption.
- Preserved current states: rest, active, hover, disabled.
- Kept scope to off-cut tabs; segmented atoms are noted as out of scope, not demoed.
- Shared grammar CSS copied verbatim, with card-specific grid rule outside it.
- Reduced-motion guard disables `cut-slide-in`.

Verified:
- Required strings present.
- No `--paper`, `--cream`, `--brass`, raw hex, or `width: 700` added.
- `git diff --check` passes.

Blocked:
- Exact curl returned `000`, not `200`: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/preview/components-tabs.html`
- Port 3000 is already held by a Bun server from this repo, but this sandbox is denied socket/process control, so I couldn’t restart or connect to it.