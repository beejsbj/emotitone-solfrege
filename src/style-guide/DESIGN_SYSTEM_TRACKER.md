# Design System Tracker

Current-truth map for design-unit review and integration. A mounted specimen or a source file is reference material until its definition is explicitly accepted.

## Status legend

- **Accepted:** the interview definition is settled.
- **Under review:** the interview is active and the definition is not settled.
- **Taxonomy only:** its architectural layer/relationship is agreed, but its definition is not.
- **Reference source:** code exists so the style guide can show the idea; it is not yet authoritative.
- **Authoritative source:** the accepted component owns the design and the style-guide specimen imports it.
- **Production use (pre-acceptance):** current app code uses the source, but that does not make its design accepted.

## Mechanical summary

| Scope | Tokens | Primitives | Uniques | Compounds | Compositions | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mounted by `StyleGuide.vue` | 8 | 12 | 4 | 2 | 1 | **27** |
| Accepted definitions among mounted units | 0 | 2 | 0 | 0 | 0 | **2** |
| Authoritative source + real specimen | 0 | 2 | 0 | 0 | 0 | **2** |
| Mounted reference/pending units | 8 | 10 | 4 | 2 | 1 | **25** |

Three additional architecture units are tracked but not mounted: **Key**, **Keyboard**, and **Keyboard + Drawer composition**. Across all 30 tracked units, 3 definitions are accepted (`Sticker`, `Note`, `Key`), 2 are formalized (`Sticker`, `Note`), and 27 still need a definition gate. `Music Color Recipe` is the one active token review.

## Mounted inventory

### Token collections

All eight specimens are mounted references over the globally loaded `emotitone-design-system.css`. Global availability is not collection acceptance.

| Unit | Definition | Source/specimen truth | Current production/dependencies | Next gate |
| --- | --- | --- | --- | --- |
| UI Colors | Not reviewed | Mounted token reference | Variables are globally active; the app-wide glassmorphism purge remains separate work | Define the surviving UI palette and glass purge boundary |
| Brand Colors | Not reviewed | Mounted token reference | Variables are globally active | Review against accepted brand units |
| Music Color Recipe | **Under review** | Mounted specimen still contains its own JavaScript/CSS demonstration; no single authority is accepted | Production color is currently calculated through `useColorSystem`/`services/musicColor`; feeds Note, current keys, live strip, and visual renderers | Reconcile CSS recipe, runtime resolver, movable/fixed semantics, and preserved visuals |
| Spacing + Radius | Not reviewed | Mounted token reference | Variables are globally active | Define scale and radius contract |
| Spacing Scale | Not reviewed | Mounted token reference | Variables are globally active | Define scale contract |
| Typography | Not reviewed | Mounted token reference | Variables are globally active; accepted Note typography constrains its consumer, not this whole collection | Review the collection without regressing Note identity ranks |
| Motion | Not reviewed | Mounted token reference | Variables are globally active; accepted Note `sounding` motion consumes the current tokens | Review collection and consumer semantics |
| Geometry | Not reviewed | Mounted token reference | Variables are globally active; the mirrored offcut token is an accepted Note-level correction, not acceptance of the whole collection | Review the complete geometry vocabulary |

### Primitives

| Unit | Definition | Source/specimen truth | Current production/dependencies | Next gate |
| --- | --- | --- | --- | --- |
| Sticker | **Accepted** | `components/primatives/Sticker.vue` is authoritative; mounted specimen imports it | No production consumer found outside the guide/tests | Maintain parity; integrate only through a defined consumer |
| Bar Tape | Not reviewed | Reference source exists; mounted specimen imports it | Feeds reference `PatternCard`; no production consumer found | Interview before formalization/integration |
| Beat Indicator | Not reviewed | Reference source exists; mounted specimen imports it | No production consumer found | Interview |
| Buttons (`IconButton`) | Not reviewed | Reference source exists; mounted specimen imports it | Feeds reference `PatternCard`; production uses a separate `components/ui/IconButton.vue` | Interview and reconcile the parallel button sources |
| Card | Not reviewed | Reference `CardShell` source exists; mounted specimen imports it | No production consumer found | Interview |
| Note | **Accepted** | `components/primatives/Note.vue` is authoritative; mounted specimen imports it | Not yet adopted by production `KeyboardKey`; future Key and later CodeStrip consumer | Final visual sign-off, then focused Note PR |
| Kicker | Not reviewed | Reference source exists; mounted specimen imports it | Feeds reference `SpineCard`; no production consumer found | Interview |
| Knob — Analog | Not reviewed | Reference source exists; mounted specimen imports shared primitive `Knob.vue` | Production uses the separate `components/knobs` family | Interview and reconcile ownership |
| Knob — Digital | Not reviewed | Reference source exists; mounted specimen imports shared primitive `Knob.vue` | Production uses the separate `components/knobs` family | Interview and reconcile ownership |
| Marks | Not reviewed | Reference source exists; mounted specimen imports it | No production consumer found | Interview |
| Spine Card | Not reviewed | Reference source exists; mounted specimen imports it | Consumes reference Kicker; no production consumer found | Define after or with Kicker |
| Tabs (`ChipTabs`) | Not reviewed | Reference source exists; mounted specimen imports it | Production uses a separate `components/ui/Tabs*` family | Interview and reconcile the parallel tab sources |

### Uniques

| Unit | Definition | Source/specimen truth | Current production/dependencies | Next gate |
| --- | --- | --- | --- | --- |
| Brand Cover | Not reviewed | Reference source exists; mounted specimen imports it | No production consumer found | Interview |
| Brand Logo | Not reviewed | Reference source exists; mounted specimen imports it | No production consumer found | Interview |
| CodeStrip | **Undefined** | Reference source exists; mounted display is not acceptance | Feeds reference `PatternCard`; no production Note migration is authorized | Interview before consuming Note or changing production strips |
| Drawer | **Undefined** | Mounted reference currently demonstrates `DrawerShell`, not an accepted Drawer definition | `DrawerShell` is used by production `TopDrawer`; legacy `DrawerKeyboard` also mixes drawer and keyboard responsibilities | Interview Drawer; preserve behavior while separating it from Keyboard |

### Compounds

| Unit | Definition | Source/specimen truth | Current production/dependencies | Next gate |
| --- | --- | --- | --- | --- |
| Pattern Card | Not reviewed | Reference source exists; mounted specimen imports it | Consumes reference Bar Tape, IconButton, and CodeStrip; production has a separate `components/patterns/PatternCard.vue` | Interview and reconcile the parallel component |
| Pattern Reel | Not reviewed | Reference source exists; mounted specimen imports it | Consumes reference Pattern Card; no production consumer found | Define after Pattern Card |

### Compositions

| Unit | Definition | Source/specimen truth | Current production/dependencies | Next gate |
| --- | --- | --- | --- | --- |
| Loading Screen | Not reviewed | Reference source exists; mounted specimen imports it | Production `LoadingSplash` already consumes it; this pre-acceptance use is not formalization | Interview against the live loading flow |

## Accepted or anticipated architecture not mounted by the guide

| Unit | Layer | Definition | Source/specimen truth | Current production/dependencies | Next gate |
| --- | --- | --- | --- | --- | --- |
| Key | Compound | **Accepted in interview** | No accepted `Key.vue` or compound specimen yet; current `keyboard/KeyboardKey.vue` is legacy production code | Wraps Note with press/focus/pointer/touch/drag/physical-keyboard behavior and triggers sound; must not move those concerns into Note | Planner + surgical implementation; migrate current keys without changing behavior |
| Keyboard | Compound | **Taxonomy only** | No accepted `Keyboard.vue` or specimen; current keyboard layout lives inside legacy `DrawerKeyboard.vue` | Hosts Key and existing keyboard config/input routing | Complete definition interview, then extract one Keyboard rather than creating a parallel keyboard |
| Keyboard + Drawer | Composition | Relationship accepted; definition pending | No source or specimen accepted | Will arrange the defined Keyboard and Drawer; must replace the current mixed responsibility rather than coexist with another `DrawerKeyboard` concept | Define Keyboard and Drawer first |

## Dependency map

```text
Global tokens / Music Color Recipe
                `-> Note -> Key -> Keyboard
                       `-> CodeStrip (only after CodeStrip is defined)

Keyboard + Drawer -> future Keyboard + Drawer composition

Reference-only chains:
Kicker -> Spine Card
Bar Tape + IconButton + CodeStrip -> Pattern Card -> Pattern Reel
DrawerShell -> Drawer specimen and production TopDrawer
Loading Screen -> production LoadingSplash
```

## Config, state, and behavior handholds

- `keyboard.primaryLabel` (`syllable | degree | raw`) exists in visual config metadata/store, and Note supports the corresponding prop. Production `KeyboardKey` does not consume it yet; Key integration must complete that path.
- Note geometry (`standard | tile | offcut | tab | pill`) and responsive proportion (`tall | medium | stocky | wide`) are independent axes, not a persisted config surface. Existing `keyboard.keyShape` is only border radius.
- Note owns only reusable musical presentation and its externally supplied `sounding` state. Key owns focus, press, pointer/touch/drag, physical-keyboard listeners, sound triggering, and interaction lifecycle.
- Note supports `colored` and `monochrome`. Production config and legacy keys still expose glassmorphism; purge that through its own reviewed migration.
- Movable/fixed music-color config is already persisted and used by production JavaScript. Do not replace that behavior until the Music Color Recipe review establishes one authority.

## Current gate order

1. Obtain final Note visual acceptance and keep its PR focused.
2. Formalize accepted Key around Note with a planner and surgical worker; preserve current keyboard behavior.
3. Complete the Keyboard interview and extract one compound from the current `DrawerKeyboard` responsibilities.
4. Interview Drawer as its own unique, then define the Keyboard + Drawer composition.
5. Interview CodeStrip before migrating it to Note.
6. Settle Music Color Recipe before changing the production color calculation.
7. Continue the remaining mounted reference units one accepted definition at a time.

For every unit, the gate is: **accept definition -> formalize source -> make the specimen import that source -> integrate only into already-defined consumers -> verify config/music dependencies -> commit and PR as a focused slice**.
