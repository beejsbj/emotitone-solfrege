# Design Log

Chronological receipts for the current EmotiTone production visual-design pass. This is evidence, not current truth; `DESIGN_SYSTEM_TRACKER.md` supersedes older rows when architecture or sequencing changes.

Design-lab-era extraction and audit history remains recoverable in Git through `85c63fd` and the deleted ledger files. It is historical reference, not authority for this pass.

| Date | Gate | Receipt | Evidence / next |
| --- | --- | --- | --- |
| 2026-05-27 | Doctrine correction | Burooj rejected the apparent design-lab finish: more visual-system work remained; CodeStrip is unique; brand colors are decorative; brass is instrument metal; semantic color aliases are legacy cleanup; Sticker badge is brass-only; filled surfaces are preferred and borders minimized | `85c63fd`; begin user-led unit definitions before production migration |
| 2026-08-12 | Review workflow | Style guide established as a user-led interview/inspection surface; external design repo is reference-only; no autonomous design-lab or extraction | `BJS-35`; `ce937f6` restores production at `/` and guide at `/style-guide/` |
| 2026-08-18 | Note definition and formalization | Accepted Note as the controlled noninteractive owner of musical identity/presentation, including geometry, proportion, surface, labels, runtime color, and `sounding` | `2178916`, `25dac1a`, `32a7dc7`, `9b0a688`; next consumer Key |
| 2026-08-19 | Key formalization | Accepted and formalized Key as the native momentary interaction wrapper around complete Note | `c81558d`, `e67ff69`, `1df13bc`; keep routing/audio/store concerns outside Key |
| 2026-08-19 | Note + Key production adoption | Production Keyboard consumes accepted Key -> Note; legacy `KeyboardKey.vue` removed while current config, audio, haptics, stores, MIDI, and QWERTY were preserved | `57bc6dd`; Keyboard remains a separate definition gate |
| 2026-08-25 | Keyboard definition and workbench | Grilling concluded, then production `Keyboard.vue` became the single source and the guide mounted it through inert controlled usage. Exact visual density remains unaccepted | `52267c3`, `3e4690d`, `ebb0014`, `8038665`, `a301139`; inspect the matrix before acceptance |
| 2026-08-25 | Mission and separation | Made production visual migration with inspectable lineage explicit; compositions are production surfaces; separated glissando and other functionality from visual acceptance | `3de77e5`, `7f283de`, `89eed59` |
| 2026-08-25 | Music Color drift recovery | Recorded that `b140654` changed the unaccepted visual presentation from segmented wheel/octave 0–8 to swatches/octave 2–8 while consolidating runtime calculation authority | `7614537`, `694e8d4`; later independent Music Color gate |
| 2026-08-26 | Knob definition | Accepted one production-led Ring/Arc family, per-consumer Brass/Ivory, real role/state geometry, full-circle Boolean/Button, and preserved production interaction/motion | `0c6b3ff`; gallery framing excluded |
| 2026-08-26 | Knob formalization and adoption | Shared accepted visuals reached production and real specimens with focused tests, type-check/build, and live DOM/motion evidence | `c14c8d0`, `21659fc`; screenshot/recording unavailable and not claimed |
| 2026-08-28 | Knob architecture correction | Replaced split visual/behavior authority with one public deep module; every production and specimen caller now imports `components/primatives/Knob/index.vue` | `5da92b2`; private adjacent helpers; preserve public-interface-only lineage |
| 2026-08-28 | Workflow reset | Created temporary `$emotitone-design-system`, made lineage a unit completion gate, limited visual HITL questioning, routed cold agents through root `AGENTS.md`, and reduced repository doctrine to this log plus the tracker | Skill repo `3b32179`; stale ledgers removed; next visual unit CodeStrip + action bar |
| 2026-08-28 | Doctrine-loss audit | Restored unsuperseded visual corrections before retiring the old ledgers and recorded Sticker's source/specimen contradiction without reopening its broader accepted definition | Historical correction `85c63fd`; bounded Sticker correction remains open |
