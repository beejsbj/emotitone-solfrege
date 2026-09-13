# Config Menu hosted verification

Captured 2026-09-13 from the production alias `https://emotitone-solfrege.vercel.app` and the exact-head local Vite fallback on `127.0.0.1:5181`.

Provenance:

- source revision: `dc5734617107136e00fdabda38c473aa55b601f0` (`origin/main` at session start; deployment source `dc57346`)
- hosted guide route: `/style-guide/config-menu`
- hosted production route: `/`
- hosted bundle: `assets/index-372029c0.js`, SHA-256 `08f0714fc17d0d794009c64ba6cbe7840971ebed17754ebe14deda47bca3637c`; CSS `assets/index-128c7174.css`, SHA-256 `128c7174da1c95924c28e5e0627a860049293719111a68a87e7405a37c5cb4cc`
- browser: Google Chrome for Testing `153.0.8010.12`; screenshots use CSS viewports 1440×900 and 1366×768 desktop, 390×844 phone, with DPR 1 desktop and DPR 2 phone

The hosted captures exercise the four public destinations and capture Global/Stage/Deck/MIDI tab state, Stage Looks preview status, and production startup/config rendering. The exact-head local captures add scroll-to-control, live Knob pointer drag, persistence boundary, Reduced Motion, and Forced Colors evidence. `verification.json`, `production-verification.json`, and `hosted-verification.json` contain the DOM/state receipts. The hosted production Look probe reports: preview leaves persisted config unchanged; Discard restores the baseline; Keep changes persisted config; reload shows the expected transient seeded Look when New Look on Reload is enabled.

## Settled hosted supplement

`settled-hosted-4997c46/` supersedes the original `hosted-*` tab screenshots as evidence of settled tab content. The original files remain unchanged as the historical `dc57346` capture; in particular, the original phone Stage and MIDI screenshots caught their panels during the tab transition. The supplement waits until the shared settling class is absent, requires the active page to contain the destination-specific Global, Stage, Deck, or MIDI surface, and then captures all 16 route/viewport/destination combinations.

The supplement was captured after production advanced to `4997c46b27c16216e71b0bf3b2b0ca73c212e388`, as recorded by GitHub production deployment `6423620721`. Its hosted entry assets are `assets/index-23ff2ff7.js`, SHA-256 `8ea45fd6e2019e56582a22dd977882d96cedae7ee062d8ecf47121055839ef06`, and `assets/index-966b0f42.css`, SHA-256 `966b0f427a6f6dc925de716a65ee1ebae4cb26bb55aa3daf7bad1c3c28ca8d96`. A clean tracked-source build at `4997c46` reproduced the CSS asset byte-for-byte. It emitted a different JavaScript bundle under local Bun 1.3.14, so the source-revision attribution comes from the GitHub deployment record; the script guard establishes the hosted asset baseline and does not independently infer a deployment revision.

## Assertion probe supplement

`assertion-probes-4997c46/` records fresh JSON receipts for the tightened success conditions. `hosted-route-verification.json` requires the exact requested pathname and `.config-menu-page` guide or `.performance-deck-drawer` production marker in addition to the settled destination checks. `production-look-verification.json` proves Discard removes the transient status and restores the live Stage controls; Keep commits the previewed Stage controls and the expected Luminous persistence fields while preserving Visuals Enabled and Stage reload preferences; reload preserves those persisted fields. `guide-verification.json` proves the focused specimen leaves storage unchanged after Discard, Keep, and a Knob update sampled after the 500 ms save debounce. These receipts supplement the settled screenshots; they do not replace or alter the historical JSON files.

## Contract probe supplement

`contract-probes-4997c46/` supersedes the assertion-probe JSON for the claims it repeats. The production Look receipt compares every source-defined Luminous-owned value recursively across Blobs, Ambient, Particles, Strings, and Hilbert Scope, while separately requiring all eight learner-owned Connections and Explanations fields to survive. Its live Stage snapshots include `aria-pressed` for the Stage master and boolean controls as well as the displayed range and option values. The guide receipt proves Soft Preview changes those live controls, Luminous Preview changes the baseline and differs from Soft, and Keep retains that Luminous preview while the ephemeral guide store remains isolated through the 500 ms save debounce.

The hosted route receipt hashes the response bodies the browser actually loaded for every executable script and stylesheet on each of the four route/viewport pages. It requires the pinned entry, Workbox, Style Guide, guide-defaults, and Config Menu chunks appropriate to that page. The production Look receipt applies the same loaded-byte check independently on initial navigation and reload. This closes the interval in which a mutable alias could move after the preliminary document fetch; the earlier entry-asset preflight remains a fail-fast guard.

The committed scripts rerun focused subsets of this verification:

```sh
bun install --frozen-lockfile
bun run dev -- --host 127.0.0.1 --port 5181
node src/style-guide/evidence/config-hosted-verification-2026-09-13/capture-guide-receipt.mjs
node src/style-guide/evidence/config-hosted-verification-2026-09-13/capture-hosted.mjs
node src/style-guide/evidence/config-hosted-verification-2026-09-13/capture-production-look.mjs
```

`capture-guide-receipt.mjs` reruns the local Stage Look, Knob drag, persistence-isolation, responsive-width, Reduced Motion, and Forced Colors DOM/state probe and writes `verification.json`. `capture-hosted.mjs` reruns the four tab destinations on the verified guide and production routes and writes 16 PNGs plus `hosted-verification.json`. `capture-production-look.mjs` checks live Look behavior and the independently compared persisted fields, then emits JSON to stdout. The archived `guide-*` and `production-*` PNGs, `production-verification.json`, closed-state captures, and Look-preview screenshots came from ad hoc capture steps that are not committed here; these scripts do not reproduce them.

The directory-writing scripts default to `/tmp` and print the fresh output directory; pass `--output <fresh-directory>` when a specific destination is useful. They refuse to write in this archived evidence directory or replace an existing output directory. A failed directory-writing run publishes `capture-failed.json` rather than a complete receipt. The hosted scripts first require the live production document to reference the two supplemental-baseline entry assets above and verify both SHA-256 hashes. A differing deployment stops before output; a passing guard establishes only that the current assets match the baseline documented at `4997c46`, not the current deployment revision. Fresh receipts record that distinction explicitly.

The scripts default to `/tmp/uibeat-pw-node_modules/playwright-core` and Chrome for Testing at `/home/admin/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`. Set `PLAYWRIGHT_MODULE` to an absolute Playwright module path and `CHROME_PATH` to a compatible browser executable on another machine. These tools are external prerequisites, not application dependencies. The committed PNG/JSON files are the authoritative historical receipt and remain unchanged by reruns. Fresh results can vary in timestamps, seeded Look values, and local storage state; the local probe also records that its served source revision is caller-managed.

The hosted Vercel deployment URL from the GitHub deployment record redirected unauthenticated requests to SSO; the public Vercel production alias above served the same deployed assets and was used for hosted captures.

The browser ran headless. Phone widths and Reduced Motion/Forced Colors settings are browser emulation, not physical-device or native assistive-technology evidence. The production persistence probe excludes the `lastSaved` timestamp and compares the Stage appearance, `visualsEnabled`, and `stagePreferences` independently; `capture-production-look.mjs` emits a fresh result to stdout.

Validation: 84 focused ConfigPanel/public-surface/visual-config tests and an independent 26-test ConfigPanel/public-surface/Stage-appearance pass succeeded; type-check and production build passed. Build warnings remain the existing Browserslist, dependency eval, mixed imports, and bundle-size notices. The final hosted sweep selected all four destinations on both routes at 1440×900 and 390×844, with zero horizontal document overflow.

Residual finding: `guide-phone-forced-colors.png` captures unreadable selected and icon-only labels in the shared Tabs rail. This is evidence of an existing visual/accessibility defect, not a passing Forced Colors result. A focused correction belongs to the shared Tabs owner and is left outside this verification-only slice; Config interaction, state, and presentation source remain unchanged.
