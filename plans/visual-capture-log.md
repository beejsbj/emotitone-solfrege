# Visual Capture Log

This log records which milestone captures were successfully generated during the first visual archaeology pass, along with the command strategy and any blockers.

## Capture Root

- Desktop screenshots: [plans/visual-captures/desktop](plans/visual-captures/desktop)
- Mobile screenshots: [plans/visual-captures/mobile](plans/visual-captures/mobile)

## Worktrees Created

- `~/.codex/worktrees/28a0-milestones/note-pads-origin` at `ffacd59`
- `~/.codex/worktrees/28a0-milestones/circular-sequencer` at `d0394e1`
- `~/.codex/worktrees/28a0-milestones/hilbert-era` at `9aff808`
- `~/.codex/worktrees/28a0-milestones/post-pruning` at `bb62f4d`
- `~/.codex/worktrees/28a0-milestones/strudel-convergence` at `705c6a2`

## Build Status

- `ffacd59` Note Pads: builds successfully with `bun run build`
- `d0394e1` Circular sequencer era: builds successfully with `bun run build`
- `9aff808` Hilbert era: `bun run build` blocked by `vue-tsc` / test typing issues, but `vite` dev server works for visual inspection
- `bb62f4d` Post-pruning era: builds successfully with `bun run build`
- `705c6a2` Strudel convergence era: builds successfully with `bun run build`

## Successful First-Pass Captures

### Strong

- [01-note-pads-origin.png](plans/visual-captures/desktop/01-note-pads-origin.png)
  - commit: `ffacd59`
  - quality: strong
  - notes: captures original instrument-first Note Pads interface clearly, including note tiles, melody controls, octave carousel, and mic button

- [02-circular-sequencer-ui.png](plans/visual-captures/mobile/02-circular-sequencer-ui.png)
  - commit: `d0394e1`
  - quality: strong
  - notes: captures the sequencer/keyboard era past the splash screen on mobile; visually useful for the blog

- [03-hilbert-standalone.png](plans/visual-captures/desktop/03-hilbert-standalone.png)
  - source: standalone `hilbert-scope-tone.html` from the Hilbert-era worktree
  - quality: medium
  - notes: not integrated into the app shell, but valuable as proof of the visual experiment itself

- [04-post-pruning-capture-ui.png](plans/visual-captures/mobile/04-post-pruning-capture-ui.png)
  - commit: `bb62f4d`
  - quality: strong
  - notes: captured with a temporary `?capture=1` loading bypass in the isolated worktree; shows the simplified keyboard-first era clearly

- [05-strudel-convergence-capture-ui.png](plans/visual-captures/mobile/05-strudel-convergence-capture-ui.png)
  - commit: `705c6a2`
  - quality: strong
  - notes: captured with a temporary `?capture=1` loading bypass in the isolated worktree; shows the Strudel-era control strip and keyboard layout

### Usable But Limited

- [02-circular-sequencer.png](plans/visual-captures/desktop/02-circular-sequencer.png)
  - commit: `d0394e1`
  - quality: limited
  - notes: mostly shows the loading splash; useful only as supplementary context

- [04-post-pruning.png](plans/visual-captures/desktop/04-post-pruning.png)
  - commit: `bb62f4d`
  - quality: limited
  - notes: authentic loader-state capture retained on purpose

- [05-strudel-convergence.png](plans/visual-captures/desktop/05-strudel-convergence.png)
  - commit: `705c6a2`
  - quality: limited
  - notes: authentic loader-state capture retained on purpose

- [04-post-pruning-ui.png](plans/visual-captures/mobile/04-post-pruning-ui.png)
  - commit: `bb62f4d`
  - quality: limited
  - notes: earlier failed attempt before adding the capture bypass; loader stalls around 65% in headless mode

- [05-strudel-convergence-ui.png](plans/visual-captures/mobile/05-strudel-convergence-ui.png)
  - commit: `705c6a2`
  - quality: limited
  - notes: earlier failed attempt before adding the capture bypass; loader stalls around 65% in headless mode

## Loader / Capture Notes

- The later eras appear to preload audio resources and remain in an intermediate loading state under headless automation.
- This may be due to audio initialization expectations, service worker behavior, or sample/resource loading that does not fully settle in the automated environment.
- For the first pass, a temporary `?capture=1` bypass was added in the isolated `post-pruning` and `strudel-convergence` worktrees so the UI could be captured without deleting the historical loader state.
- This is acceptable for archaeology because the authentic loader visuals were also preserved separately.

## Commands Used

### Build checks

- `bun install`
- `bun run build`

### Preview / dev

- `bunx vite preview --host 127.0.0.1 --port <port>`
- `bunx vite --host 127.0.0.1 --port <port>` for the Hilbert-era app shell

### Screenshots

- `npx playwright screenshot ...` for simple first-pass captures
- local temporary Playwright environment in `~/.codex/tmp-playwright` for click-through mobile captures

## Recommended Next Capture Pass

1. Keep the existing strong captures as anchor images.
2. Capture one explicit popup/analysis state if possible.
3. Capture one current app state from `main` for contrast against the historical shots.
4. If needed, repeat the `?capture=1` trick on other loader-heavy eras rather than fighting headless preload behavior.
