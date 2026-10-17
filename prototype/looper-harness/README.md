# Looper prototype harness (throwaway)

Headless Playwright scripts used on bjslab while prototyping the Looper
(PR #132) and checking the real build (PR #142). Kept here only so the work
survives the move off bjslab; nothing imports them.

- Run against a local dev server (`bun run dev`, port varies by script).
  Each script passes the "Play EmotiTone" loading gate, plays QWERTY keys
  A S D F G H J, and reads Pinia stores via
  `document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get(...)`.
- `play-slice.mjs` and `play-slice-hold.mjs` drove PR #142's rules
  (tap to join, fresh take over a loop, pinned reel pattern, hold-Play latch,
  Stop All). `screenshots/` holds that run's captures.
- The other scripts drove prototype iterations (dials, latch, Stage radar,
  Looper config tab, mic layouts).
- Setup: `bun install` here, then `bunx playwright install chromium`.
