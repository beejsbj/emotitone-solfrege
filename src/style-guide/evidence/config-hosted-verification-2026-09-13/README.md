# Config Menu hosted verification

Captured 2026-09-13 from the production alias `https://emotitone-solfrege.vercel.app` and the exact-head local Vite fallback on `127.0.0.1:5181`.

Provenance:

- source revision: `dc5734617107136e00fdabda38c473aa55b601f0` (`origin/main` at session start; deployment source `dc57346`)
- hosted guide route: `/style-guide/config-menu`
- hosted production route: `/`
- hosted bundle: `assets/index-372029c0.js`, SHA-256 `08f0714fc17d0d794009c64ba6cbe7840971ebed17754ebe14deda47bca3637c`; CSS `assets/index-128c7174.css`, SHA-256 `128c7174da1c95924c28e5e0627a860049293719111a68a87e7405a37c5cb4cc`
- browser: Google Chrome for Testing `153.0.8010.12`; screenshots use CSS viewports 1440×900 and 1366×768 desktop, 390×844 phone, with DPR 1 desktop and DPR 2 phone

The hosted captures exercise the four public destinations and capture Global/Stage/Deck/MIDI tab state, Stage Looks preview status, and production startup/config rendering. The exact-head local captures add scroll-to-control, live Knob pointer drag, persistence boundary, Reduced Motion, and Forced Colors evidence. `verification.json`, `production-verification.json`, and `hosted-verification.json` contain the DOM/state receipts. The hosted production Look probe reports: preview leaves persisted config unchanged; Discard restores the baseline; Keep changes persisted config; reload shows the expected transient seeded Look when New Look on Reload is enabled.

Commands used:

```sh
bun install --frozen-lockfile
bun run dev -- --host 127.0.0.1 --port 5181
node src/style-guide/evidence/config-hosted-verification-2026-09-13/capture-guide-receipt.mjs
node src/style-guide/evidence/config-hosted-verification-2026-09-13/capture-hosted.mjs
node src/style-guide/evidence/config-hosted-verification-2026-09-13/capture-production-look.mjs
```

The committed capture scripts are exact-machine reproductions for this environment: their defaults use `/tmp/uibeat-pw-node_modules/playwright-core` and Chrome for Testing at `/home/admin/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`. Set `PLAYWRIGHT_MODULE` to an absolute Playwright module path and `CHROME_PATH` to a compatible browser executable on another machine. These tools are external prerequisites, not new application dependencies. The generated PNG/JSON evidence above is the authoritative receipt; rerunning the scripts can vary timestamps, seeded Look values, and local storage state.

The hosted Vercel deployment URL from the GitHub deployment record redirected unauthenticated requests to SSO; the public Vercel production alias above served the same deployed assets and was used for hosted captures.

The browser ran headless. Phone widths and Reduced Motion/Forced Colors settings are browser emulation, not physical-device or native assistive-technology evidence. The production persistence probe compares parsed `config`, `visualsEnabled`, and `stagePreferences`, excluding the `lastSaved` timestamp; its result is `hosted-production-look.json`, and `capture-production-look.mjs` emits a fresh result to stdout.

Validation: 84 focused ConfigPanel/public-surface/visual-config tests and an independent 26-test ConfigPanel/public-surface/Stage-appearance pass succeeded; type-check and production build passed. Build warnings remain the existing Browserslist, dependency eval, mixed imports, and bundle-size notices. The final hosted sweep selected all four destinations on both routes at 1440×900 and 390×844, with zero horizontal document overflow.

Residual finding: `guide-phone-forced-colors.png` captures unreadable selected and icon-only labels in the shared Tabs rail. This is evidence of an existing visual/accessibility defect, not a passing Forced Colors result. A focused correction belongs to the shared Tabs owner and is left outside this verification-only slice; Config interaction, state, and presentation source remain unchanged.
