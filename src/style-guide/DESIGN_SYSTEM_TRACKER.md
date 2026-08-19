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
| Note | Primitive | Accepted | Real primitive owns centered-primary playing-card anatomy, natural/accidental text semantics, runtime color, final geometry x proportion axes, two surface treatments, and the accepted `sounding` state | Real specimen imports the primitive and proves identity ranks, chromatic aliases, label subsets, contrast, all five geometries, all four proportions, the complete 5 x 4 matrix, surfaces, and rest/sounding motion | Production Key/Keyboard adoption remains deferred until those units pass their own gates | Primary identity is persisted as `keyboard.primaryLabel`; geometry x proportion remains intentionally responsive presentation rather than a production config surface | Receives externally supplied note identity, music color, and `sounding`; owns no input, timer, store, or audio engine | Future Key; may feed future CodeStrip only after CodeStrip is defined | Define and formalize Key independently around this accepted Note |
| Key | Compound | Accepted in interview only | Not formalized in this branch; interaction must remain outside Note | No real compound specimen on this branch yet | Production keyboard remains unchanged in this Note slice | Preserve existing input/config behavior for later work | Keyboard/input and audio-trigger adapters; Note handles presentation | Keyboard | Formalize separately after Note acceptance |
| Keyboard | Compound | Taxonomy agreed; not fully interviewed or defined | Current source is provisional, not accepted or formalized | Current specimen is provisional | Existing production keyboard behavior must be preserved during later definition | Verify relevant keyboard settings against the store | Global keyboard/MIDI routing, note activity, audio trigger, music color | Future composition; hosts Key | Complete its definition interview before further formalization |
| Drawer | Unique | Not defined | `DrawerKeyboard` is a legacy production host, not an accepted composition | Current unique display is reference material, not acceptance | Legacy host remains in production | Unknown until definition | Unknown until definition | May later combine with Keyboard in a composition | Interview and accept Drawer independently |
| CodeStrip | Unique | Not defined | Current Note integration is premature and should be parked or reverted | Existing display is reference material, not acceptance | Do not mark Note integration complete | Unknown until definition | Existing music/composable behavior must be audited during definition | May later consume Note | Define CodeStrip before migrating it to Note |
| Music Color Recipe | Token/visual concern | Under review | Runtime JavaScript resolver consolidation is useful; authority and preserved visuals still require correction | Specimen must use the accepted recipe and preserve approved visuals | Persisted `musicColorMode` reaches production through Note -> `useColorSystem` -> `useVisualConfig` -> `visualConfigStore` | Movable/fixed persistence and production wiring are verified | Runtime resolver, key/scale context, CSS token presentation | Note and other musical visuals | Settle one authoritative recipe and correct specimen/preserved visuals |
| Future Keyboard + Drawer composition | Composition | Pending both unit definitions | No source interface accepted; do not pre-name the final interface | None accepted | Not integrated | Pending component definitions | Pending component definitions | Product-level keyboard/drawer experience | Define Keyboard and Drawer first |

## Dependency map

```text
Tokens / Music Color -> Note -> Key -> Keyboard
                         `-> future CodeStrip (after definition)

Keyboard + Drawer -> future composition (after both definitions)
```

## Current config and state gaps

- Geometry x proportion is not configurable: `tall`, `medium`, `stocky`, and `wide` are responsive proportions that combine with `standard`, `tile`, `offcut`, `tab`, and `pill`. Persisted `keyboard.keyShape` is wired as border radius, not as this geometry axis.
- `sounding` is Note's sole accepted musical activity prop. `sustained`, `playedRecently`, `selected`, and `ghosted` are tracker candidates only and are not in the component API or specimen.
- Natural/accidental text follows piano-key white/black semantics. Syllable, degree, and raw pitch share the same display typography at each primary or auxiliary rank.
- Note supports only `colored` and `monochrome`. The broad app-wide glassmorphism purge is deferred beyond this Note slice.

## Design-unit PR checklist

- [x] Definition accepted.
- [x] Source unit is authoritative.
- [x] Style-guide specimen imports the real source unit.
- [x] No unaccepted downstream consumer was migrated.
- [x] Visual config/store metadata is wired.
- [x] Relevant music/composable adapters are verified.
- [x] Relevant tests are checked; final browser screenshot review is handed to the parent after preview automation timed out.
- [x] This tracker is updated to current truth.
