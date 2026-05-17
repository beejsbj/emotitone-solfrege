Done. Edited only:

- [composition-motion-overview.html](/Users/burooj/Projects/emotitone-design-system/project/preview/composition-motion-overview.html)
- [composition-spacing-overview.html](/Users/burooj/Projects/emotitone-design-system/project/preview/composition-spacing-overview.html)
- [composition-music-marks.html](/Users/burooj/Projects/emotitone-design-system/project/preview/composition-music-marks.html)

Token block deletion: 10 diff lines removed per file at the top, covering the original 9-line `.v2-card` local token definition block plus the separating blank line.

Verification greps: all requested patterns returned `0` matches for all three files:

```text
composition-motion-overview.html: stage/panel 0, wire 0, ink mute/faint 0, paper 0, jazz 0, notes 0
composition-spacing-overview.html: stage/panel 0, wire 0, ink mute/faint 0, paper 0, jazz 0, notes 0
composition-music-marks.html: stage/panel 0, wire 0, ink mute/faint 0, paper 0, jazz 0, notes 0
```

Also verified `composition-motion-overview.html` has no raw `cubic-bezier(...)` values inside the CSS block. The visible documentation strings were left untouched.

No token reference failed the provided mapping. The only special handling was the requested `--tracking-*` substitution to raw `0.02em` / `0.06em`.