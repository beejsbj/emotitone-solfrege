# Compositions lab (step 4) — run prompt

Temporary. Burooj runs this with `$emotitone-design-system` in its own session. Delete this file when the step closes.

## This lab's units
- **PerformanceDeck**: the bottom drawer composition (PatternReel, CodeStrip Bar, Control Bar, Keyboard).
- **Instrument Picker** and **Config Menu**: the top-drawer compositions. Open question from the bible: is the panel behind the Tabs chip and Stickers chassis or something else?
- **Stage**: the unified canvas (Hilbert scope, bodies, strings, flecks). Canvas studies should drive the real renderer seams.
- **Leave alone:** the Loading Screen is decided (Count-In, #104).

## Known context
- Compositions assemble the primitives, uniques, and compounds from steps 1–3. Reimagine how they sit together (layout, rhythm, density, how the brand zone meets the playing zone), not the parts again. Any part change belongs back in its own layer.

## How to run this lab

You are running one **layer lab** in EmotiTone's reimagining pass. Use the `emotitone-design-system` skill. The Plan (`src/style-guide/DESIGN_SYSTEM_TRACKER.md`, section "Reimagining pass") is the source of truth; `src/style-guide/DESIGN_LOG.md` is append-only. Read the design bible `src/style-guide/WIP-bible.md` before designing anything.

**Gate:** only start if every earlier step in the Plan's reimagining-pass table is marked Closed. If one is still open, stop and tell Burooj which step blocks this one.

### What Burooj wants
Genuine reimagining, not polish: 2–3 **genuinely different directions** per unit that deserves it — ideas, not variations — mounted beside the real production unit, for Burooj to compare and pick. The voice is "cut-paper jazz, lit by a synth." Say which units you would leave alone and why.

### The bible's rules that decide most calls
- **Two zones.** The brand zone (Brand Logo, Loading Screen, the style guide) is jazzy cut-paper poster and may use brand papers. The **playing zone** is hardware whose only colour comes from the music (Music Color); everything else is Ink, Ivory, and Brass.
- **Chassis or applied paper.** In the playing zone, first ask whether a part is chassis (hardware: Knobs, Joystick, Buttons/Lit Keycaps, bars, Drawers) or applied paper stuck onto it (Keys, Tabs chips, Stickers). Chassis gets hardware treatment; applied paper gets the cut treatment. Neither gets brand colour.
- **Brass** is the single instrument metal; only masters and the things you play with. Only Brass is a Badge.
- No glassmorphism, no default borders or housings, light answers sound or touch, Reduced Motion is fully still, 390px first and still right at 1440.
- Music Color only from the numeric OKLCH resolver (`src/services/musicColor*.ts`), never a new palette. Design tokens only; propose (never silently retune) any token change.

### Build
- Branch from the latest `origin/main` (e.g. `design/lab-compositions`). **No production changes** in the lab PR. Nothing stacks on the lab, and the lab stacks on nothing.
- Register the lab at `/style-guide/lab/compositions` following the Primitives lab pattern (`src/style-guide/lab/primitives/` on the `design/lab-primitives` branch, PR #102): a registry of units → directions (idea in two lines, "better because", risks, and a bible reading: zone, chassis/applied paper, fits/caution), a bench per unit that mounts production and every direction through the **same real states**, `?unit=<id>` to isolate one unit, and a **side-by-side strip** of production plus every direction when Burooj needs to feel them together.
- Keep every real behaviour: states, touch targets, keyboard and ARIA, Reduced Motion, Forced Colors. When a unit's behaviour is deep (like Knob), keep the real component mounted and swap only its face.
- Reuse Primitives-pass decisions: Lit Keycap Buttons, the LED-collar Analog Knob, the Readout, Marquee Tabs, Piano Roll Bar Tape, and Tape/Stamp Sticker papers are the current primitives once their PRs land.

### Verify
- Every heavy command and browser check goes through `/home/admin/.local/bin/t3-test-run COMMAND ARGS`. It holds a global lock: if it prints "Another guarded test is running" or "deferred" (any exit code), wait ~20s and retry; never bypass it. Give each worktree a real `bun install` (not a symlinked `node_modules`).
- `bun run type-check`, `bun run test` (full suite, exact totals), `bun run build`.
- Screenshot every direction at 390 and 1440 with headless Chrome over CDP, and **look at every capture**. For motion, capture frames at several times after the trigger (a still can't show a fade). Iterate until it's right.

### Report and check in
- Open the lab PR against `main`, link it to the thread, and give Burooj the Vercel branch preview link (`https://emotitone-solfrege-git-<branch-with-slashes-as-dashes>-beejsbjs-projects.vercel.app/style-guide/lab/compositions`; it sits behind Vercel login).
- Per unit: its directions, each idea in two lines, what it beats, its risks, and your pick. Then **stop and wait for Burooj's picks.** Iterate on his feedback inside the lab until he approves.

### After Burooj picks
- **One adoption PR per pick**, each based on `main`, never containing lab files. Each changes the production source, updates the real guide specimen, reopens and recloses the unit's four gates in the Plan, and appends one Log receipt quoting Burooj's acceptance. Verify, capture real consumers, open it, and link it.
- Adoptions all append to the Log, so after each merge rebase the others and re-verify before merging the next.
- When every pick has landed, close the lab PR as a record, mark this step Closed in the Plan, and delete this prompt file in that same Plan update.
