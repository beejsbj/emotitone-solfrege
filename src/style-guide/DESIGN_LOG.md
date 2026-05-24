# Design Log

Append-only gate and decision record for the Emotitone design-lab run.

| Date | Gate | Decision | Evidence | Next |
|---|---|---|---|---|
| 2026-05-24 | Scope Gate | Packet produced; recommended scope is full style-guide completion with layer-gated extraction, starting from midstream recovery rather than greenfield doctrine. | `SCOPE_GATE.md`; `WORKFLOW.md`; `StyleGuide.vue`; `TOKEN_PROMOTION_AUDIT.md`; `Sticker.vue`; `PrimitiveSticker.vue`; read-only subagent audits | Establish Repository Conventions Gate, then normalize schema/audits. |
| 2026-05-24 | Repository Conventions Gate | Continue under existing branch conventions: tokens in `src/emotitone-design-system.css`, reusable primitives in `src/components/primatives/`, specimens in `src/style-guide/**`, style-guide shell via `App.vue`, verification via `bun run type-check` and `bun run build`. | `REPOSITORY_CONVENTIONS.md`; `package.json`; local command hook; `WORKFLOW.md`; upstream `design-doctrine.md` | Build schema, coverage, inventory, promotion, residue, and closure artifacts before extraction edits. |
