# Design System Tracker

Current-truth map for design-unit review and integration. File existence does not imply definition or implementation acceptance.

## Layers

- **Tokens:** shared visual values and recipes consumed by source units.
- **Primitives:** reusable, non-interactive presentation units with one focused visual responsibility.
- **Compounds:** reusable assemblies that coordinate primitives, behavior, or interaction.
- **Uniques:** app-specific reusable or singular modules reviewed as their own design units.
- **Specimens:** style-guide displays of real source units; a specimen is not a product taxonomy layer.
- **Compositions:** product-level arrangements of defined units into a complete experience or region.

## Unit status

| Unit | Layer | Definition status | Formalized/source-component status | Style-guide specimen status | Production integration status | Config/store work | Music/composable dependencies | Feeds/consumers | Next gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sticker | Primitive | Accepted | Real primitive is authoritative | Real specimen imports the primitive | Integrated where accepted | None currently identified | None currently identified | Accepted consumers | Maintain parity |
| Note | Primitive | Identity/presentation definition accepted; musical-state visual language is draft and unaccepted | Restorative correction required: approved playing-card text layout, natural/accidental text semantics, geometry x proportion variants, and other lost variants must return | Existing specimen requires the same restoration; state specimens remain proposals | Current downstream use is not proof of acceptance | Primary identity is not persisted/wired; geometry x proportion is not configurable | Receives externally supplied note identity, music color, and activity state | Key; may feed future CodeStrip only after CodeStrip is defined | Restore accepted visuals and variants, then separately accept state language |
| Key | Compound | Accepted: physical interaction around Note | Depends on repaired Note; interaction must remain outside Note | Compound specimen should demonstrate real interaction and feedback | Production migration is provisional until Note is repaired | Preserve existing input/config behavior | Keyboard/input and audio-trigger adapters; Note handles presentation | Keyboard | Repair against authoritative Note and verify interaction parity |
| Keyboard | Compound | Taxonomy agreed; not fully interviewed or defined | Current source is provisional, not accepted or formalized | Current specimen is provisional | Existing production keyboard behavior must be preserved during later definition | Verify relevant keyboard settings against the store | Global keyboard/MIDI routing, note activity, audio trigger, music color | Future composition; hosts Key | Complete its definition interview before further formalization |
| Drawer | Unique | Not defined | `DrawerKeyboard` is a legacy production host, not an accepted composition | Current unique display is reference material, not acceptance | Legacy host remains in production | Unknown until definition | Unknown until definition | May later combine with Keyboard in a composition | Interview and accept Drawer independently |
| CodeStrip | Unique | Not defined | Current Note integration is premature and should be parked or reverted | Existing display is reference material, not acceptance | Do not mark Note integration complete | Unknown until definition | Existing music/composable behavior must be audited during definition | May later consume Note | Define CodeStrip before migrating it to Note |
| Music Color Recipe | Token/visual concern | Under review | Runtime JavaScript resolver consolidation is useful; authority and preserved visuals still require correction | Specimen must use the accepted recipe and preserve approved visuals | Verify actual production consumption before marking complete | Confirm persisted movable/fixed mode reaches production | Runtime resolver, key/scale context, CSS token presentation | Note and other musical visuals | Settle one authoritative recipe and verify config-to-production flow |
| Future Keyboard + Drawer composition | Composition | Pending both unit definitions | No source interface accepted; do not pre-name the final interface | None accepted | Not integrated | Pending component definitions | Pending component definitions | Product-level keyboard/drawer experience | Define Keyboard and Drawer first |

## Dependency map

```text
Tokens / Music Color -> Note -> Key -> Keyboard
                         `-> future CodeStrip (after definition)

Keyboard + Drawer -> future composition (after both definitions)
```

## Current config and state gaps

- Primary identity is not persisted or wired.
- Geometry x proportion is not configurable; tall, stocky/squary, and wide are viewport proportions that combine with cuts/geometries.
- Production currently supplies only `sounding`.
- `sustained`, `played-recently`, `selected`, and `ghosted` are props/specimen-only proposals.
- Natural/accidental text semantics need restoration: note text follows piano-key white/black semantics for naturals/accidentals.
- Verify actual production consumption of persisted movable/fixed music-color mode before marking it complete.

## Design-unit PR checklist

- [ ] Definition accepted.
- [ ] Source unit is authoritative.
- [ ] Style-guide specimen imports the real source unit.
- [ ] No unaccepted downstream consumer was migrated.
- [ ] Visual config/store metadata is wired.
- [ ] Relevant music/composable adapters are verified.
- [ ] Relevant tests and live views are checked.
- [ ] This tracker is updated to current truth.
