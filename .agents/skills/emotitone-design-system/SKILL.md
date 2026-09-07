---
name: emotitone-design-system
description: Guide focused EmotiTone visual-design-system work. Use for style-guide review, design-unit definition, token or component promotion, production adoption, visual verification, system planning, or lineage audit; exclude standalone functionality and bug fixes.
---

# EmotiTone Design System

Finish the current visual pass one unit at a time. The design already exists in substantial form; tighten it, recover liked ideas, resolve drift, and promote it into a coherent production system. Do not redesign the product from zero.

This skill is temporary. Retire it after the Plan records the visual pass and final lineage audit as complete.

## Start from current truth

Resolve the repository root and verify that the work belongs to `emotitone-solfrege`. Read:

1. `src/style-guide/DESIGN_SYSTEM_TRACKER.md` completely — the current Plan, dependencies, collision points, and next gates.
2. `src/style-guide/DESIGN_LOG.md` only when the current unit needs an acceptance, implementation, or verification receipt.

Inspect live Git state. Recompute the current branch, mainline, dirty files, worktrees, tests, and active sessions. When editing, create a focused branch from the current mainline, normally the latest `origin/main`; do not infer branch state from the Plan or Log.

Use this truth order when sources disagree:

1. Burooj's current explicit instruction.
2. The Plan's mission, unit row, dependencies, and active frontier.
3. Current production code and observed live behavior.
4. The Log for chronological evidence.
5. Linear `BJS-35` for workflow state and external receipts.
6. Git history for archaeology.

Raise a material contradiction instead of quietly choosing a convenient source. The external design-system repository, style-guide specimens, screenshots, and old preview HTML are reference evidence, not acceptance authority.

## Hold one unit

One session owns one design unit. It starts at that unit's earliest unresolved mode—**Define**, **Formalize and adopt**, or **Verify and hand off**—and may continue through later modes once their gates are genuinely met. Derive the unit from the Plan unless Burooj names it.

If Burooj names a later unit, proceed unless an unresolved dependency would change its visual definition. Name that dependency and risk in the unit brief.

Before acting, state a compact unit brief:

- current definition, source, specimen, and production-adoption status;
- production authority and consumers;
- reference surfaces worth comparing;
- unresolved visual deltas that require taste;
- behavior and unrelated-file preservation boundary;
- observable completion condition.

Adjacent units may run concurrently when their files and lineage do not overlap. Follow the Plan's lane ordering and collision table. A shared lower-layer dependency gets one owner and merges before dependent units close; central tokens, guide registration, Plan, and Log are serialized integration files.

## The lineage gate

The reusable complexity path is:

```text
tokens -> primitives -> compounds -> compositions
```

`Unique` is an orthogonal classification for a singular artifact, not a complexity rung. A Unique may be primitive-like or compound-scale, may consume the appropriate lower reusable layers—including primitives or compounds—and may feed a compound or composition.

Compositions are complete production surfaces. System-wide token/protocol families such as UIBeat are not components or compositions.

For every changed visual rule, answer:

- Who owns it at the lowest useful layer?
- Is it duplicated above or beside that owner?
- Which real guide and production consumers use it?
- If it has no upward consumer, should it be adopted, merged, removed, or explicitly deferred?

Promote reusable grammar before a higher unit closes. Keep a rule local when no second consumer or coherent family exists. Style-guide staging, captions, tiles, controls, and hard-coded demo states remain specimen-local.

Lineage is a completion criterion.

## Define

Compare three surfaces before questioning Burooj:

- current production anatomy, density, motion, interaction, and consumer contracts;
- the current `/style-guide/` specimen;
- relevant external reference material or earlier accepted visual evidence.

Autonomously reconcile omissions, source drift, taxonomy, and preservation constraints. Ask only where plausible visual outcomes remain and Burooj's taste changes the result. Keep questions visual and concrete, and show the actual surfaces whenever possible.

Record liked ideas as constraints. Update the Plan after each settled batch: replace resolved frontier questions with current truth and expose the next unresolved gate. Keep transcript, commit, and verification history in the Log or Git. Agent recommendations become definition truth only after Burooj explicitly accepts the shared-understanding summary.

No component implementation begins before that acceptance. When one request covers definition through adoption, queue later modes behind their gates and continue when each gate is met.

## Formalize and adopt

Require an acceptance receipt and characterize current production behavior before changing presentation.

The authoritative source component is also the component production uses. The guide imports and drives that source through inert or controlled inputs. A thin provisional adapter is allowed only when an undefined downstream unit requires it; name it in the Plan and keep that downstream definition unaccepted.

Change only accepted presentation and the ownership required for lineage. Preserve interaction, audio, routing, state, persistence, APIs, accessibility behavior, haptics, and motion unless the definition expressly governs them.

When a functional defect or idea appears, describe it accurately, leave a durable pointer outside this visual slice, and continue without making it an acceptance condition.

Specimens use real sources, realistic values, and real states. Gallery markup never becomes production anatomy by accident.

Commit coherent checkpoints on the focused branch. Keep the branch singular and stage only owned files.

## Verify and hand off

Verify production at `/` and the guide at `/style-guide/`. Use a matrix proportional to the unit: relevant responsive widths, variants, states, themes, Reduced Motion, forced colors, motion, and live interaction. Run focused touched tests first, then type-check and build. Report unrelated repository-wide failures separately.

Describe evidence exactly. A failed capture does not become screenshot verification; DOM, computed-style, motion-state, or live-interaction evidence keeps its own name.

Before closure, run a fresh read-only lineage audit—normally with one bounded subagent—against the diff and unit brief. It checks:

- every token, primitive, compound, or Unique has a real consumer or explicit disposition;
- higher layers compose lower sources instead of copying CSS or markup;
- production and the guide cross the same public component seam;
- specimen scaffold and demo state stay out of production;
- behavior changes have separate authorization and evidence;
- provisional adapters and duplicated recipes remain visible in the Plan.

Fix findings in a separate atomic slice. Then update the Plan's four gates independently and append one concise Log receipt. If Cockpit/Linear is active, leave the corresponding `BJS-35` receipt without changing lifecycle beyond the evidence.

End with exact branch, commits, pushed status, checks, visual evidence, residual risk, and next unit. Do not push unless Burooj explicitly authorizes it.

## Boundaries

- Use this Plan and Log; add no third design-system ledger.
- Keep standalone functionality, bugs, broad accessibility redesign, audio, routing, and state architecture in separate work.
- Reopen a closed unit only for a concrete contradiction or Burooj's request.
- Respect dirty worktrees and adjacent sessions; coordinate every shared-file edit.
- Use at most one bounded scout before definition and one bounded lineage auditor after implementation. Orchestration must shorten the loop.
