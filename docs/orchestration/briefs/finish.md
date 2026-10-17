# finish-pr brief (EmotiTone retrospective spec)

Invoke the `finish-pr` skill (Skill tool, skill name `finish-pr`) and follow it for the PR(s) named below. If that skill isn't installed in your environment, the rules in this brief are the procedure: review the diff, fix or answer every review thread, keep CI green, then squash-merge. Authorization from the orchestrator (on Burooj's standing instruction for this programme): you may **squash-merge** once the PR has passed independent review and all GitHub checks (if any exist) are green; delete the remote branch after merge only if the skill's cleanup step calls for it. Constraints:
- No force-push, no history rewrite, no `--admin` merges, no bypassing failed or pending checks.
- If the branch is behind `main` and conflicts, resolve them in the PR's own worktree with a normal merge commit from `origin/main` (not a rebase of pushed commits), re-run the package-script checks named in the PR, push, and wait for checks.
- Verification uses only package scripts (`bun run type-check`, `bun run test:run <files>`, `bun run build`); never call vitest/vue-tsc directly, never `bun run test` watch mode.
- Clean up only what was created for this ticket (its feature branch after merge). Keep `pr-assets/*` branches; PR images link to them.
- Do not write to Linear; the orchestrator does.
- Squash commit message: PR title + ` (#N)`, body summarising the change, ending with the Co-Authored-By line your harness specifies.
- If review finds a real defect you can fix in under ~30 lines within the ticket's scope, fix it, push, and re-verify; otherwise stop and report without merging.

Report: merged yes/no, merge commit SHA, check results, review findings and how each was handled, cleanup done.
- Before merging, every review thread on the PR (including the chatgpt-codex-connector bot's) must be either fixed (reply with the commit, then resolve the thread) or answered with a reason (reply, then resolve). Merge only when `reviewThreads` has no unresolved thread. If a thread raises a real issue outside the ticket's scope, reply naming the follow-up and tell the orchestrator so it gets ticketed.
