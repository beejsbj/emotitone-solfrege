# Compounds lab (step 3) — run prompt

Temporary. Burooj runs this with `$emotitone-design-system` in its own session. Delete this file when the step closes.

## This lab's units
- **Key**, **Chord**, and **Keyboard** (`components/compounds/`): Keys are applied paper in Music Color. The Keyboard's density was accepted and closed; a direction that changes it must say so plainly.
- **Beat Indicator**: the ring around Play in the CodeStrip Bar. Since Button became the Lit Keycap (#114), a **circular** ring now wraps a **square** keycap — reimagine the ring for the keycap.
- **Control Bar** and **CodeStrip Bar**: the playing-zone hardware rails.
- **Pattern Strip / Pattern Reel**: Burooj suggested the Ransom cut-letter treatment (retired as a Sticker) might look good on the pattern row; try it there, in Ink and Ivory only because the reel sits in the playing zone. Since Piano Roll Bar Tape landed (#107), the collapsed deck's peeking strips each carry a 6px contour; judge the stack's busyness.
- **Overlay Panel Header**: the shared header of the top menus.

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
- Branch from the latest `origin/main` (e.g. `design/lab-compounds`). **No production changes** in the lab PR. Nothing stacks on the lab, and the lab stacks on nothing.
- Register the lab at `/style-guide/lab/compounds` following the Primitives lab pattern (`src/style-guide/lab/primitives/` on the `design/lab-primitives` branch, PR #102): a registry of units → directions (idea in two lines, "better because", risks, and a bible reading: zone, chassis/applied paper, fits/caution), a bench per unit that mounts production and every direction through the **same real states**, `?unit=<id>` to isolate one unit, and a **side-by-side strip** of production plus every direction when Burooj needs to feel them together.
- Keep every real behaviour: states, touch targets, keyboard and ARIA, Reduced Motion, Forced Colors. When a unit's behaviour is deep (like Knob), keep the real component mounted and swap only its face.
- Reuse Primitives-pass decisions: Lit Keycap Buttons, the LED-collar Analog Knob, the Readout, Marquee Tabs, Piano Roll Bar Tape, and Tape/Stamp Sticker papers are the current primitives once their PRs land.

### Verify
- Every heavy command and browser check goes through `/home/admin/.local/bin/t3-test-run COMMAND ARGS`. It holds a global lock: if it prints "Another guarded test is running" or "deferred" (any exit code), wait ~20s and retry; never bypass it. Give each worktree a real `bun install` (not a symlinked `node_modules`).
- `bun run type-check`, `bun run test` (full suite, exact totals), `bun run build`.
- Screenshot every direction at 390 and 1440 with headless Chrome over CDP, and **look at every capture**. For motion, capture frames at several times after the trigger (a still can't show a fade). Iterate until it's right.

### Report and check in
- Open the lab PR against `main`, link it to the thread, and give Burooj the Vercel branch preview link (`https://emotitone-solfrege-git-<branch-with-slashes-as-dashes>-beejsbjs-projects.vercel.app/style-guide/lab/compounds`; it sits behind Vercel login).
- Per unit: its directions, each idea in two lines, what it beats, its risks, and your pick. Then **stop and wait for Burooj's picks.** Iterate on his feedback inside the lab until he approves.

### After Burooj picks
- **One adoption PR per pick**, each based on `main`, never containing lab files. Each changes the production source, updates the real guide specimen, reopens and recloses the unit's four gates in the Plan, and appends one Log receipt quoting Burooj's acceptance. Verify, capture real consumers, open it, and link it.
- Adoptions all append to the Log, so after each merge rebase the others and re-verify before merging the next.
- When every pick has landed, close the lab PR as a record, mark this step Closed in the Plan, and delete this prompt file in that same Plan update.
