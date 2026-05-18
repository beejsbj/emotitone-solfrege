Updated [components-badge.html](/Users/burooj/Projects/emotitone-design-system/project/preview/components-badge.html).

I kept the badge as a PRIMITIVE card with Anatomy only: Wordmark, Box, Padding, Size. I did not include a variants section because the badge’s meaningful contract is the single ivory wire wordmark; the previous grids mixed decorative treatments, sizes, and states into more taxonomy than the primitive earns.

Verified:
- `class="section-head">Anatomy<` present
- `class="anatomy-wrap"` present
- no `variants-full`
- shared `.section-head`, `.anatomy-wrap`, `.anatomy` CSS copied verbatim
- no new tokens, no width override, ivory badge visual preserved

Could not complete the exact curl verification from this sandbox: `curl` to localhost returned `000` with `Operation not permitted`. A Bun process is already listening on port 3000, but loopback connections are blocked here.