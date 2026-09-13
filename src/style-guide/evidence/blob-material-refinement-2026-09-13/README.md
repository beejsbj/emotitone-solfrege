# Blob material refinement — 2026-09-13

Runtime source revision: `e602d8d` on `fix/merge-body-web-strands` (PR #75). These are local Chromium captures, not hosted or physical-device evidence.

- `organic-material-comparison.png` and `material-vibration.gif`: actual prepared Blob contours and renderer, fixed note positions/colors, 32 frames at 16 fps. Merge stays filled while its free edges move; Web keeps thin spans attached to softly tapered roots. `material-motion-checks.json` confirms both animate and both remain still when contour vibration is zero.
- `production-*` and `harmonic-guide.png`: actual production B diminished chord and the real Harmonic Geometry specimen at desktop/phone widths. `production-checks.json` records note identity, overflow, and runtime errors.
- `stage-*`: real Stage specimen, including Reduced Motion and release. `browser-checks.json` records stillness and runtime errors. `renderer-comparison.png` is an additional controlled geometry fixture.
- `hold-before.*`: pre-fix piano F4, Merge, minimum public Body Size, phone viewport. The active note remains held while visible pixels fall to zero.
- `hold-after-{mouse,touch}-*`: same public minimum-size hold, held mode switch, release, and three repeat presses after the fix. Touch uses trusted Chromium touch dispatch. JSON records actual sample/event times; these captures do not measure frame pacing. The native-canvas test separately covers prepared held notes through 30 seconds.

Replay against a local Vite server with Playwright available:

```bash
APP_URL=http://127.0.0.1:5187 PHONE=1 INPUT=touch node src/style-guide/evidence/blob-material-refinement-2026-09-13/verify-hold.mjs
APP_URL=http://127.0.0.1:5187 node src/style-guide/evidence/blob-material-refinement-2026-09-13/capture-material.mjs
```

Omit `INPUT=touch` for mouse. Optional `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `OUTPUT_DIR`, and `SOURCE_REVISION` select local tooling/output and identify the hold run. The material script writes PNG frames; the GIF uses a 192-color palette at 16 fps.

Validation: 91 focused tests across nine renderer/lifecycle/Stage/consumer suites; `npm run build` (including type-check); diff check; bounded independent correction audit. Initial concurrent browser captures timed out during a busy build; the recorded production/guide captures are completed reruns. Physical-device appearance/performance and user acceptance of the revised finish remain open.
