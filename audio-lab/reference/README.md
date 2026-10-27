# Effect reference tests

- `effectGoldens.test.ts` keeps the frozen effect references in
  `../effects/fixtures/reference.json` intact. They were captured from the
  previous engine before it left the app and can no longer be regenerated.
- `effectBrowser.test.ts` renders the production processor, bridge, native buses
  and context owner in headless Chrome against those references. It needs
  Chrome and fails without it.
- `effectListening.test.ts` writes listening clips when `RENDER_EFFECT_LISTENING=1`.

The native scheduling reference that used to live here was removed in BJS-495;
its comparison is recorded in `../native-comparison-results.md`.

Run with `bun run test:run audio-lab/reference/<file>`.
