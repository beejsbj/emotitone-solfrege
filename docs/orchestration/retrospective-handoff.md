# Orchestrator handoff: the retrospective spec (BJS-476)

Written 2026-10-17 by the outgoing orchestrator (Claude Opus 5.5, a local Claude Code session on bjslab) for the next orchestrator, a Claude Code cloud session on this branch (`orchestrate/retrospective-spec`). Read this file in full first. Then read `docs/retrospective-spec.md` (the spec, on main) and the three briefs in `docs/orchestration/briefs/`.

"Burooj" is the owner and only user of EmotiTone. "You" is the incoming orchestrator.

---

## 1. Your job

You are the orchestrator for the EmotiTone retrospective spec. You coordinate; workers implement. Carry the Linear tickets under **BJS-476** (project `emotitone-solfrege`) to Done by working the frontier, meaning tickets whose blockers are all Done.

The rules, from Burooj's original instruction (still binding):

- **One ticket, one focused PR** from current `origin/main`, on its own branch. Squash-merge.
- **Verify with package scripts only:** `bun run type-check`, `bun run test:run <files>`, `bun run lint`, `bun run build`.
  - Never call `vitest`, `vue-tsc` or `vite build` directly.
  - **Never run `bun run test` (watch mode) or `bun run test:ui`.** On bjslab they hold the shared verify lock until stopped; one did that overnight on 2026-10-16 and blocked every worker for 12 hours.
- **CI must be green.** The checks are type-check, test, lint and bundle, plus the Vercel preview. Branch protection is on; never use `--admin`.
- **Independent review.** Every PR touching **audio, music theory or persistence** gets one by a second model (Fable or Opus, not the builder's model where possible). Then it goes through `finish-pr` (fix or answer every review thread, resolve them all), then squash-merge.
- **Review threads.** Merge only when the PR has **zero unresolved review threads**, including those from the `chatgpt-codex-connector` bot.
- **After merge:**
  - Move the ticket to Done with a resolution comment.
  - Post a status comment on BJS-476 when a batch closes.
- **Concurrency:** run at most about 3 builders at once.
- **Burooj's gates.** Stop and brief him for:
  - design looks, which he reviews on the Vercel preview;
  - the BJS-494 phone gate;
  - taste calls;
  - anything the spec marks "Proposed".
- **Hard limits:**
  - No force-pushes to shared branches, no history rewrites.
  - Merge `origin/main` into a branch; never rebase pushed commits.
  - Don't close or rewrite BJS-476.
  - Don't touch issues unrelated to this project.
  - Never use bare `git stash`.
- **Plan changes** go into the spec's Further Notes through a small docs PR.

**Settled decisions; don't reopen them:**
- **The stance:** "an instrument that teaches through its moats and cues". The moats are feeling first, sketch speed (everything played is kept, no record button), loops as play, and a pocket instrument.
- **The engine:** move off Strudel and superdough to the app's own AudioWorklet engine (`src/audio/live/`).
- **The Code Strip** is now the read-only HighlightStrip, with "Open in Strudel" (done).
- **Editions** are families, Shuffle is the default, and families now also set the keys (BJS-561, in review).
- **Licence:** AGPL-3.0-or-later.
- **Note-label colour** follows accidentals by design (natural or accidental). Contrast is not enforced there (Burooj, 2026-10-15).
- **Pre-v1, Burooj is the only user.** Discarding old saved data is acceptable where a migration would be costly. Recorded phrases are his sketches, so silent loss matters most there.

## 2. How to talk to Burooj

- **Briefs and questions go in chat:** **one message, one numbered list**, with letters for sections (A, B, C…).
- **Each question** is self-contained, with plain-language context (he doesn't share your context), the **preview link** for anything visual, what to look for, and options with **the recommendation first, marked (recommended)**.
- **He answers tersely:** "1 A, 3 B, 4 approved". Act on each answer. If he answers a different question than you asked, follow his intent.
- **Report outcomes plainly:** done, unverified, blocked. Name costs and tradeoffs; don't make them silently. He'd rather be convinced than agreed with. If you think his choice costs something, say so once with reasons, then do what he decides.
- His global instructions are in his `CLAUDE.md`. In short: warm and honest, no flattery, no grovelling. Calibrate to reversibility: reversible calls you make and flag; irreversible or outward-facing ones you bring to him.

## 3. How the work loop runs

1. **Pick the frontier ticket.** Read its body and comments; carried design notes live in comments.
2. **Write a self-contained brief:**
   - `docs/orchestration/briefs/worker.md` (the rules)
   - plus the ticket text
   - plus "settled since / carried in" notes
   - plus a scope guard (which nearby tickets own what)
3. **Dispatch a builder** with the Agent tool.
   - **Routing that worked:**
     - **Opus** for frontier and design work (engine, design adoptions);
     - **Sonnet** for mechanical implementation and fixes;
     - **Fable** for short independent reviews.
   - Keep review reports under about 600 words.
   - **Fable and Codex hit usage limits** on 2026-10-17. If Fable is unavailable, use a fresh Opus as reviewer and tell it to be adversarial.
4. **Builder output:** the builder opens ONE PR to main and doesn't merge. You link nothing outside GitHub/Linear; the T3 link tool doesn't exist in the cloud.
5. **Independent review** (`docs/orchestration/briefs/review.md`) when the PR touches audio, theory or persistence.
   - Save the review text.
   - Have the finisher **post it verbatim as a PR comment** first.
6. **Finisher** (`docs/orchestration/briefs/finish.md`):
   - fixes the findings with tests that fail first;
   - merges `origin/main` if needed;
   - resolves every thread;
   - waits for green CI;
   - squash-merges when authorised.
   - For PRs waiting on Burooj's look, the finisher fixes but **does not merge** until he approves.
7. **Close out in Linear:**
   - a work-log comment;
   - a resolution comment (what changed, the merge SHA, what's unverified, follow-ups);
   - move to Done;
   - unblock dependents (move them to Ready for agent);
   - carry review items that belong elsewhere onto the owning ticket as a comment.

**Preview links:** the Vercel bot comments the preview URL on each PR. The pattern is `https://emotitone-solfrege-git-<branch-slug>-beejsbjs-projects.vercel.app`, with long branch names shortened plus a hash. Copy it from the bot comment. Families can be tried with `?edition=<family>`.

**Images for PRs** go on `pr-assets/bjs-NNN` branches, never on main.

## 4. Linear

**Use the Linear connector**, not the `cockpit linear` CLI, which only exists on bjslab.

- **Workflow states in use:** Inbox, Ready for agent, Ready for Burooj, Blocked, In Progress, In Review, Done, Canceled.
- **Work-log comments** use this format: `Work log · <role> · <machine> · <harness> · <model> · <session> — <outcome>`. Roles: builder, reviewer, finisher, orchestrator. For you, the machine is `cloud`.
- **Resolution comment on Done:** what changed, the merge SHA, what is not verified, follow-ups.

### Board state (2026-10-17)

**Done:**
- Spec children: 477–484, 486–490, 492, 497–500, 502–512, 514–516.
- Follow-ups: 517–520, 522–524, 528, 530, 531, 539, 557, 562.

**Canceled:**
- 501, because interval feelings already show on the Stage via the emotion toggle.
- 413 and 415, superseded.
- 470.

**In Progress (PRs open, waiting on Burooj):**

| Ticket | PR | State |
|---|---|---|
| BJS-485 Play patterns on the worklet clock | #195 | Review done (Opus, changes fixed); CI green at `ccfb8614`. Waits on questions 4–6. |
| BJS-513 Phrase book shelf limit | #192 | Review done (Opus), findings 2–7 fixed; CI green at `34a57090`. Waits on question 3 (finding 1). |
| BJS-561 Families set the keys' shape and colour | #194 | Built; a read-only Opus review during the build found nothing blocking. CI green at `6c3aa545`. Waits on questions 1–2. |

**Blocked:**
- **BJS-491** Looper transport on the worklet. Blocked by 485.
- **BJS-493** Play is the loop on the worklet transport. Blocked by 491.
- **BJS-494** Phone gate on the worklet engine. **This is Burooj's gate.** Blocked by 493.
- **BJS-495** Remove Strudel and superdough. Blocked by 493 and 494.
- **BJS-496** Decide the licence once Strudel code is gone. **Burooj's.** Blocked by 495.
- **BJS-556** Play each take back at full level. Burooj chose "normalise each take". Blocked by 485.
- **BJS-563** Pause the strip highlight while audio is suspended. Blocked by 485.
- **BJS-414** One performer owns every press and release (spec W3). Re-scoped 2026-10-15. Blocked by 491.

**Critical path:** 485 → 491 → 493 → 494 (phone gate) → 495 → 496.

**Carried notes already on tickets** (check comments before starting):
- **BJS-491:**
  - the bar-boundary lookahead `TODO(BJS-491)` in `src/audio/live/transport.ts` `collectTo`;
  - #188 nit 2: a bank refused for budget drops input; decide fallback or error once the Looper pins banks;
  - #151 thread 51: integrate transport recovery with the existing interruption gate.
- **BJS-495:**
  - retire the unused `musicStore.playNote`/`playNoteWithDuration`;
  - #151 thread 53: exclude historical receipts from the dependency-removal grep.
- **BJS-496:** device-cached instrument files have no versioning; plan cache freshness when self-hosting changes URLs.
- **BJS-486 (Done)** owns audio-thread zero-allocation. #195 still allocates per onset; this needs a follow-up ticket if it matters.

**Outside the spec, untouched (leave them):**
- **Inbox:** BJS-468, 469 and 471, which are Stage tickets.
- **Old open PRs:** #122, #132, #138–#142 (the Looper stack on the Strudel transport, likely superseded by 491/493), and draft #150 (a spike, not for merge).
- **Optional:** mention the Looper stack to Burooj once 491 lands.

## 5. Burooj's open questions (the last batch; he will answer in your session)

He saw these exactly as below. Act on his answers.

**A. Keys in families, #194.**
- **Preview:** https://emotitone-solfrege-git-feature-bjs-561-59fbeb-beejsbjs-projects.vercel.app (add `?edition=rip`, `tile`, `marquee`, etc.)
- **Proposed families:**

  | Family | Key shape | Chord shape | Surface |
  |---|---|---|---|
  | Tab | Tab | Standard | colour |
  | Offcut | Offcut | Pill | colour |
  | Rip | Offcut | Pill | monochrome |
  | Brass | Standard | Offcut | colour |
  | Tile | Tile | Tab | colour |
  | Sharp | Tile | Tab | monochrome |
  | Marquee | Pill | Tile | colour |

- **Settings:** Note Surface gains Family (the default); a player's own Color or Monochrome choice wins.

1. Approve the key shapes and the two monochrome families (Rip, Sharp)?
   - A: approve (recommended)
   - B: change a shape (one line per family)
   - C: change which are monochrome
2. Monochrome natural keys are now dark grey (4:1) instead of near-black (1.1:1). This also changes the existing Monochrome setting.
   - A: keep (recommended)
   - B: back to near-black

   → **On approval:** run finish-pr on #194 and merge. Then close BJS-561. No further independent review is needed beyond the in-build one unless the diff changes, though a short Fable pass on the persistence bit (the new noteSurface value) is cheap if Fable is back.

**B. Phrase book, #192.**
- **Banner screenshot:** https://raw.githubusercontent.com/beejsbj/emotitone-solfrege/pr-assets/bjs-513/bjs-513/shelf-full-390.png

3. At 3 MB, should the shelf keep saving?
   - A: warn but keep saving new takes and Keeps; refuse only when the phone's storage is actually full (recommended)
   - B: stop saving at 3 MB
   - Also: does the banner look OK?

   → **On A:** change the single rule `shelfRefuses(bytes)` in `src/services/phrasePersistence.ts` so the 3 MB budget only warns (the banner) and a save is refused only on a real quota/write failure. Add a test that a new take and a new Keep still save above 3 MB. Answer the open bot thread about real-device budget validation. Then finish and merge.

**C. The engine move, #195.**
- **Preview:** https://emotitone-solfrege-git-feature-bjs-485-4c5255-beejsbjs-projects.vercel.app

4. Listen on the phone: loop a take and a library pattern, and play live over them.
   - A: sounds right
   - B: something's off (timing, a dropped note, volume)
   - Square and saw are now about 1.4 dB louder, both live and in patterns (the old 0.85 gain was removed).
5. Six synths can't play on the new engine (supersaw, pulse, four z_* synths); a pattern using one fails Play with a clear error.
   - A: remove them from the instrument list for now (recommended)
   - B: build them for the worklet
   - C: keep a temporary Strudel fallback just for them
6. If you edit a take while it loops, should the loop update?
   - A: no; it rebuilds on the next key, mode, octave, instrument or tempo change, since playing over a loop records into the take (recommended)
   - B: yes, swap on every change

→ **On 4 A, plus 5 and 6:**
- Apply 5 (if A: remove them from the catalog with a test that the picker no longer offers them; parity with the "188 picker names" list changes, so note it).
- Merge #195 and close BJS-485.
- Unblock 491, 556 and 563, and dispatch them: **491 is Opus frontier work**; 556 and 563 go to Sonnet, each with an audio review.
- **If 4 B:** diagnose before merging.

## 6. Repo facts you'll need

- **Spec:** `docs/retrospective-spec.md` (main). **Engine design:** `docs/research/worklet-engine.md`. **Persistence:** `docs/persistence-codec.md` (versioned codec, backup-first rule, sparse visual overrides).
- **Design law:** lint in `lint/` (designZones, ESLint plugin, Stylelint), with per-file/per-rule baselines that can only shrink. The `no-bespoke-button` rule means using the Button primitive (`src/components/primatives/`, sic). There are two zones: brand (jazz poster) and playing (chrome hardware; colour only from music). The in-repo design skill is `.agents/skills/emotitone-design-system/SKILL.md`.
- **Root `CLAUDE.md` and `AGENTS.md`** are current for agents. Older docs that describe a Tone.js sequencer are stale; trust the code.
- **Attribution:** commit trailers and PR footers per your harness's instructions.
- **CI:** `.github/workflows/ci.yml`. Locally, `scripts/verify.mjs` takes a shared lock in `.git/emotitone-verify.lock`. Set `EMOTITONE_VERIFY_BYPASS_LOCK=1` if your environment has no sibling worktrees.

## 7. Things on bjslab you can't see

- Local worktrees under `/mnt/server-ssd/BJsWorkspace/Projects/emotitone-worktrees/` for #192 (`bjs-513-shelf`), #194 (`bjs-561-keys`) and #195 (`bjs-485-patterns`) are clean and fully pushed. Work from the remote branches:
  - `feature/bjs-513-shelf-limit`
  - `feature/bjs-561-family-keys`
  - `feature/bjs-485-worklet-patterns`
- The local scratch notes (`/tmp/bjs/…`) are gone for you. Everything needed is in this file, `docs/orchestration/briefs/`, the PR comments and Linear.
- Burooj can clean the bjslab worktrees later; you don't need to.

## 8. First moves

1. Read this file, the briefs, and `docs/retrospective-spec.md` (skim; use it as a reference).
2. Check that the three PRs (#192, #194, #195) are still green and have no unresolved threads.
3. Post a short work-log comment on BJS-476 saying the orchestrator moved to a cloud session.
4. Wait for Burooj's answers to questions 1–6 (he'll give them in your session), then act per §5.
5. After merges, keep the frontier moving: 491 (Opus), then 556 and 563, then 493. Brief Burooj for the BJS-494 phone gate when 493 lands.
