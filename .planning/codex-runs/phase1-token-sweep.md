Done. Edited 21 files, all under `project/preview/`.

Verification greps after edits:

```text
var(--saffron) => 0
var(--grape) => 0
var(--coral) => 0
rgba(240,\s*177,\s*55 => 0
rgba(75,\s*30,\s*120 => 0
rgba(233,\s*106,\s*74 => 0
#f0b137\|#F0B137 => 0
#4b1e78\|#4B1E78 => 0
#e96a4a\|#E96A4A => 0
```

`git diff --check -- project/preview` is clean.

One judgment call: four unlisted preview files had `#F0B137` literals: `components-marks.html`, `composition-spacing-overview.html`, `composition-motion-overview.html`, and `composition-music-marks.html`. I treated those as documentation/chrome accent contexts and mapped saffron hex to brass `#e0a93a`.