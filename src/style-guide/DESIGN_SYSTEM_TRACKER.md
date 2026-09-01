# Design System Tracker

Current truth for the temporary EmotiTone production visual-design pass. Read this file with `$emotitone-design-system`; do not reconstruct the workflow from chat or old design-lab documents.

## Mission

Tighten, touch up, and promote the visual design already present in production, the style guide, and the external reference material. Burooj remains the taste authority where a real visual choice survives the evidence; the agent should autonomously reconcile obvious omissions and drift.

```text
tokens -> primitives -> compounds + uniques -> compositions
```

Compositions are production surfaces. Reusable visual grammar must live at its lowest appropriate layer and be consumed upward. A higher unit cannot close while it silently owns a reusable token or primitive recipe.

This is a visual migration. Preserve existing interaction, audio, routing, state, persistence, APIs, accessibility behavior, haptics, and motion. Park functional changes as separate work.

## Truth and gates

Truth has two repository homes:

- This tracker holds current definition, source, specimen, production-adoption, dependencies, and frontier truth.
- `DESIGN_LOG.md` holds chronological acceptance and implementation receipts.

Linear `BJS-35` holds workflow state and external receipts. `/Users/burooj/BJsWorkspace/Projects/emotitone-design-system`, style-guide specimens, screenshots, and Git history are reference evidence, not acceptance authority.

Each unit advances through four independent claims:

1. **Defined** — Burooj explicitly accepted the visual definition.
2. **Authoritative source** — one real source owns the accepted visual grammar.
3. **Real specimen** — the style guide imports and drives that source.
4. **Production adoption** — the production surface consumes that source.

None implies the next. A file existing or already being used in production does not make its design accepted.

## Current checkpoint — 2026-09-01

- Branch: `implementing-design-system`; recompute dirty/ahead/push state live.
- Accepted and authoritative: Note, Key, the Analog Ring + Digital Arc Knob family, and Button.
- Geometry's circle-native cut-paper family is accepted and authoritative at the token layer: five `--clip-disc-*` silhouettes live in `emotitone-design-system.css`, render directly in the Geometry token guide, and are consumed by real Button instances in its style-guide specimen. No production Button is assigned one yet.
- Circle-native Geometry formalization at `0c065c1`: 9/9 focused Button tests, type-check, and production build pass with existing dependency/chunk warnings. Live guide computed styles confirmed the default Button remains `border-radius: 50%` / `clip-path: none`, while all five 48px specimens resolve distinct token clips with rotation. The collaborative preview screenshot failed; an exact temporary SVG render was inspected instead. A fresh bounded lineage audit passed after stale ownership receipts were repaired.
- Final circle-native Geometry correction at `f0be471`: responsive curved `shape()` tokens replace the rejected faceted polygons, with `circle(50%)` fallbacks. Offcut, tab, and rip mutate only a localized sector of an otherwise perfect circle; rounded stock is a continuously wobbly uneven circle; tile keeps restrained four-sided tension. Burooj accepted this as nice enough and closed Button work. A fresh bounded lineage audit passed with no findings; production assignment remains a separate future consumer decision.
- Button is accepted, formalized, mounted as a real specimen, and adopted in production. Its corrected finish has no faux inset outline, uses centered icons at 50% of the face, and defaults production brass to canonical sheen + glow. Button also exposed a new foundational Geometry idea: reusable circle-native cut-paper silhouettes belong to tokens, while Button is only their first primitive specimen consumer.
- Sticker's non-badge definition is accepted. Badge's brass-only identity is accepted, while whether it remains a Sticker variant or becomes its own primitive is open.
- Keyboard is the single production compound and is mounted in the guide, but its exact visual density remains **Under review**.
- CodeStrip's surfaced `glyph` proportion is accepted and formalized at 3:4 with a CodeStrip-owned responsive block scale 20% below the comparison candidate. Its real source and guide workbench now compose accepted Note and Chord, own a surfaced Rest, expose five duration treatments, compare three densities, and accept controlled 0–1 temporal progress. CodeStrip remains the unique production successor to LiveStrip, not one half of an action-bar unit; the corrected workbench awaits visual selection before production adoption.
- Chord's visual definition is accepted. Its display contract is coupled: `symbol` is always one fused surface, while `notes` is always a zero-gap cluster of authoritative Notes; invalid fused-members and clustered-symbol combinations do not exist. The fused surface consumes Note's paper sheen, shadow, and whole-surface geometry family. Progress starts at Ink and reveals unchanged music colors independently from bottom to top. Its authoritative source and real workbench are complete; production adoption waits for CodeStrip and the future Keyboard chord row.
- After CodeStrip closes, define a separate compound that composes the upgraded CodeStrip with a small set of adjacent Buttons. Backspace/Undo, Play, and Send are current candidates; their final membership and arrangement remain open.
- The current production action bar's many horizontally scrolling Knobs are evidence to replace, not accepted compound anatomy. Drawer does not need to remain a Knob and its trigger belongs to the later Drawer definition.
- `DrawerKeyboard.vue` becomes the composition only after CodeStrip, its action compound, Keyboard, and Drawer are defined.
- Music Color remains an independent later visual gate.
- Do not re-grill Note, Key, or Knob without a concrete contradiction or explicit request.

## Active frontiers and dependencies

Two unit sessions are ready and may proceed independently:

- visually inspect and accept the Keyboard density matrix in its existing workbench;
- finish CodeStrip's duration, Rest, density, and temporal-state definition now that its Chord dependency is accepted, then adopt CodeStrip into production without losing LiveStrip behavior.

Button is closed as a lower primitive. The later CodeStrip action compound may build on its accepted momentary-action ownership without reopening Button.

The action compound follows CodeStrip. Drawer follows as its own unit. `DrawerKeyboard.vue` becomes the production composition only after CodeStrip, its action compound, Keyboard, and Drawer are defined. Then resume the remaining queue one unit per session and finish with a fresh lineage audit across the completed pass.

Adjacent sessions are allowed when their files and lineage do not overlap. Shared token or primitive promotion must be coordinated before dependent sessions close.

## Unit map

| Unit | Layer | Definition | Source / specimen / production truth | Next gate |
| --- | --- | --- | --- | --- |
| Circle-native cut paper | Geometry tokens | **Accepted and closed for Button work** | Five curved `--clip-disc-*` silhouettes with clean-circle fallbacks are authoritative in `emotitone-design-system.css`; `TokenGeometry.vue` renders them directly and real Buttons employ them in `PrimitiveButtons.vue`. Production Buttons retain their default perfect circle | Assign tokens to production only through a separately accepted consumer-unit decision; do not reopen Button |
| Sticker | Primitive | **Accepted outside Badge boundary** | `components/primatives/Sticker.vue` is the source and its real specimen imports it; no production consumer exists | Preserve outline/fill identity while Badge taxonomy is settled |
| Badge | Candidate primitive; currently a Sticker variant | **Brass-only identity accepted; taxonomy under review** | Current `Sticker.vue` exposes Badge through the shared color API and the specimen shows tomato/pine examples; this is implementation drift, not accepted Badge identity | Visually compare Badge as its own identity; choose extraction or retained variant before formalizing |
| Note | Primitive | **Accepted** | `components/primatives/Note.vue` is authoritative; real specimen and production Keyboard consume it through Key | Finish five geometry token recipes; define new consumers separately |
| Key | Compound | **Accepted** | `components/compounds/Key.vue` is authoritative; real specimen and production Keyboard consume it | Maintain Note/Key ownership boundary |
| Knob — Ring + Arc | Primitive deep module | **Accepted** | `components/primatives/Knob/index.vue` is the sole public production/specimen interface after `5da92b2`; responsive proportions were repaired at `7ed0127`; its public roles are Range, Boolean, and Options | Maintain the one public seam, proportional scale contract, and Boolean ownership of persistent on/off state |
| Button | Primitive | **Accepted** | `components/primatives/Button.vue` is authoritative; the real specimen imports it and displays all four brass finishes plus the foundational disc-clip tokens through Button's existing styling seam; production Config, Instrument Selector, Keyboard action bar, Pattern Card, and inactive sequencer placeholders consume the default circular Button. Former IconButton and Knob Button sources are removed | Preserve momentary circular production ownership, required accessible names, corrected icon scale, borderless chrome, and canonical brass tokens; decide production use of disc geometry separately |
| Keyboard | Compound | **Under review** | `components/compounds/Keyboard.vue` is the single production source; guide drives it with `usage="controlled"` | Burooj accepts or adjusts the visual-density matrix |
| Chord | Compound | **Accepted** | `components/compounds/Chord.vue` is authoritative and `style-guide/compounds/CompoundChord.vue` mounts it in a real workbench. `display="symbol"` is one fused paper surface; `display="notes"` is a zero-gap cluster of authoritative Notes. Controlled member progress reveals unchanged music color over an Ink base. No production consumer has adopted it | Consume it through CodeStrip and the future Keyboard chord row; do not reopen its visual definition without a concrete contradiction |
| CodeStrip | Unique | **Complete visual workbench under review; glyph accepted** | `components/uniques/CodeStrip.vue` composes authoritative Note and Chord, owns surfaced Rest and duration/density/temporal presentation, and is driven by `style-guide/uniques/UniqueCodeStrip.vue`. Production `LiveStrip.vue` still holds the editing/playback functionality CodeStrip succeeds; no public intermediate compound exists | Burooj selects duration treatment and density and adjusts Rest/Chord/temporal presentation if needed; then accept before production adoption |
| CodeStrip action cluster | Compound | Relationship accepted; definition pending | The current production `KeyboardActionBar.vue` is horizontally scrolling evidence to replace. Accepted Button is available below it; Backspace/Undo, Play, and Send are candidate children, not yet final anatomy | Define membership and arrangement only after CodeStrip closes |
| Drawer | Unique | **Undefined** | Current DrawerShell/specimen/production hosts and the current Drawer Knob are evidence, not accepted Drawer doctrine | Define after the CodeStrip action compound; Drawer does not need to remain a Knob |
| DrawerKeyboard | Composition | Relationship accepted; definition pending | Current file is mixed production evidence, not the final composition | Compose only after CodeStrip, its action compound, Keyboard, and Drawer are defined |
| Music Color Recipe | Token recipe | **Under review; later** | Runtime resolver is calculation authority; current swatch presentation is unaccepted drift | Reconcile the original wheel intent with one runtime recipe |

Remaining queue, not current authority:

- **Tokens:** UI Colors, Brand Colors, Spacing + Radius, Spacing Scale, Typography, Motion. Other Geometry families remain queued; the circle-native cut-paper family above is independently accepted and authoritative.
- **Primitives:** Bar Tape, Beat Indicator, Card, Kicker, Marks, Spine Card, Tabs.
- **Uniques:** Brand Cover, Brand Logo.
- **Compounds:** Pattern Card, Pattern Reel.
- **Compositions:** Loading Screen.

## Accepted visual contracts

### Note and Key

- Note owns noninteractive musical identity and presentation; Key owns the native momentary physical wrapper.
- Accepted Note geometry families: `standard`, `tile`, `offcut`, `tab`, `pill`; proportions: `glyph`, `tall`, `medium`, `stocky`, `wide`; surfaces: `colored`, `monochrome`.
- Physical `pressed` and musical `sounding` remain independent.
- Promote all five geometry families into coherent named token recipes before dependent randomization closes. This does not reopen their visual acceptance.

### Keyboard

- Bare responsive twelve-pitch grid; its parent owns shell, framing, resizing, and action composition.
- Main octave has strongest hierarchy. Requested rows are 1, 3, 5, and 7; unavailable octave-edge rows clip rather than forcing symmetry.
- Every row keeps all twelve pitches visible without horizontal scrolling or pitch removal.
- Local date chooses one shared geometry family from a deterministic shuffled five-day deck. Each load creates bounded family-specific cut, rotation, shadow, overlap, and stable layer variation while rectangular hit targets remain stable.
- Labels remain accessible and visually scale rather than disappear. `colored | monochrome` remains a presentation choice.
- Still unaccepted: exact gap, main/outer proportions, inset, narrow typography, overlap, and responsive variation amplitude. Inspect at 320, 390, 768, and 960 CSS px plus relevant rows, octave edges, families, labels, surfaces, states, Reduced Motion, and forced colors.

### Knob

- `components/primatives/Knob/index.vue` is the only public interface. Its adjacent role, face, and type files are private implementation.
- Ring and Arc are visual treatments of one production-led family. Brass and Ivory are semantic per-consumer treatments, not active/inactive states.
- Preserve responsive bottom-label anatomy, Range/Boolean/Options grammar, values, gestures, haptics, compatibility events, disabled/display behavior, arbitrary and per-option colors, and tactile production motion.
- The public wrapper owns a container-bounded responsive face size through `--knob-size`; consumers may override that variable for a real local density need. SVG strokes, dome depth, center content, glow, and type scale from the wrapper container, with legibility floors for small labels and values. Gallery hero sizing is not part of the production contract.
- Range uses the accepted 270-degree sweep. Boolean is full-circle. Options use real count/current-position geometry. The former Button role now belongs to the Button primitive; its old layered/perpetually moving Digital specimen remains rejected reference evidence.
- Gallery cells, top captions, dividers, and footers are specimen scaffolding.
- Behavior and public-seam verification at `5da92b2` / `a6c55ed`: 17/17 focused public-consumer tests, type-check, and production build pass. Active Button transforms changed across a 350ms sample. In a forced-overflow production row, a horizontal BPM gesture moved `scrollLeft` from 100 to about 69.83 while BPM remained 120. Happy DOM cannot deliver that positive native document-event handoff, so the public regression test keeps an observable setter, asserts no value/haptic emission, and records the browser evidence boundary.
- Responsive visual correction at `7ed0127`: 17/17 focused public-consumer tests, type-check, and production build pass. Live Chrome inspected production and both real specimens at 1624, 390, and 320 CSS px: faces resolved to 63, about 46.8, and 42px; range-number proportion remained about 28% of the face while label type held a legibility floor. Narrow production controls remained exactly centered in their host cells. The PatternCard keep control deliberately overrides `--knob-size` to 1.35rem. A fresh bounded lineage audit passed after verifying that no gallery anatomy or behavior change entered production.

### Button

- There is one Button primitive and it is icon-only. Text buttons, tabs, drawer handles, and Boolean Knob remain outside this unit.
- Button is momentary only. Persistent on/off state belongs to Boolean Knob; Button has no selected, latched, toggle, or persistent `pressed` presentation.
- Button absorbs the former Knob Button's momentary action role. Its slot owns icon content, its required `accessibleName` prop owns the native accessible name, and consumers own any visible label. It preserves opt-in haptic, native click, press motion, loading, and disabled behavior without exposing a toggle seam.
- Real momentary production consumers include Config reset/export/save/close actions, Instrument Selector close, Keyboard action-bar Undo/Send, Pattern Card actions, and inactive sequencer placeholders. Config section-enable and global-visuals-enable controls use native Boolean Knob buttons because they persist state.
- Button is the punched-out circular paper chad, not a literal hole or the off-cut poster shape. It is a flat filled disc with a clean circular edge and small hard offset, echoing Knob's rounded instrument-world character without becoming domed hardware or inheriting tracks, sweeps, ticks, bezels, or other knob geometry.
- Everyday Button material is ink/ivory paper. Brass is an intentional per-consumer material treatment, parallel to Knob's Brass/Ivory assignment; it never means active, on, success, danger, or another state by itself. Production brass uses the canonical sheen + glow finish; the specimen shows flat, sheen, glow, and sheen + glow for comparison.
- Accepted state treatment: hover changes paper contrast; press collapses the hard offset and rebounds; loading uses tone-matched perimeter motion rather than automatic brass; disabled dims and removes motion. Accepted named sizes are 32/40/48px with contextual size override where a Button must align beside responsive Knobs. Button owns icon and accessible name; consumers own visible labels.
- Resting and pressed Buttons have no border or faux inset ring. Keyboard focus and forced-colors outlines remain accessibility exceptions. Button owns an icon scale of 50% of the face and true centered SVG boxes; reassess individual optical imbalance only after the corrected scale is visible.
- The default Button remains a perfect circle. Foundational `--clip-disc-*` geometry tokens may replace that default outer silhouette through Button's existing styling seam; they belong to Geometry rather than Button and do not add geometry variants to the public Button API. Their first real specimen consumer is Button, while production instances remain on the default circle until separately assigned.
- Formalization and verification at `5532155` / `62399ae`: the duplicated IconButton sources and Knob Button role were removed; 29/29 focused tests and type-check pass; production build passes with existing dependency/chunk warnings. Live `/style-guide/` inspection confirmed real 32/40/48 circles, all three materials, loading, and disabled specimens. Live `/` inspection confirmed momentary Undo/Send have no `aria-pressed` and resolve to the same roughly 63px square as neighboring Knobs at the inspected desktop viewport. A fresh lineage audit found and then verified repairs for disabled stillness, native Boolean markup, stale props, and required names across all 24 Button consumers. Responsive preview resize was unavailable, so no live narrow-width claim is made.
- Visual correction and verification at `90b13f3` / `c1b7ab2` established the borderless finish, brass variants, and disabled stillness; its 60% icon scale and face-reshaping geometry studies were superseded by Burooj's 2026-08-30 feedback. At `84585e9`, the current source resolves icons to 50% of the face. Live guide evidence confirmed the ink-paper/brass-icon study and all five rotation/depth geometry studies at `border-radius: 50%` with `clip-path: none`; focused tests, type-check, build, and a fresh lineage audit pass. Screenshot capture failed and is not claimed.

### CodeStrip — definition in progress

- CodeStrip remains a unique and the production successor to LiveStrip. Its later action cluster is a separate compound.
- Using the common Note primitive was the right lineage decision. The regression is that CodeStrip now receives Note's full-size geometry instead of the compact surfaced `glyph` variant the obsolete `shape="glyph"` call intended.
- `glyph` joins Note's existing `tall | medium | stocky | wide` proportion family. It is not a bare-text escape or a separate presentation axis: it retains Note's material styling, chromatic surface, geometry character, shadow/depth, typography, and sounding treatment.
- A Note proportion describes relational shape, not an immutable pixel size. `Note.vue` currently supplies fixed intrinsic fallbacks, while production Keyboard already overrides Notes to `width: 100%` and a host-controlled row height. Formalization must make that responsive contract explicit without changing accepted Keyboard output.
- CodeStrip owns the compact host scale for `proportion="glyph"`; the proportion recipe owns its aspect, padding, and type relationships. The accepted ratio is 3:4. Its responsive block scale is `clamp(27.2px, 8cqi, 33.6px)`, exactly 20% below the 34–42px comparison candidate. CodeStrip density remains a visual decision.
- Recover the earlier CodeStrip density and rhythm through compact surfaced Notes, with muted duration, rest, punctuation, and grouping chrome. Do not retain the current oversized tile row.
- Preserve LiveStrip's existing progressive playback feedback: each note token fills as playback advances. The fill belongs to CodeStrip's temporal token choreography; Note continues to own musical identity, typography, color, accidentals, and accessible naming.
- The accepted ownership seam is `proportion="glyph"` on Note plus a CodeStrip-local token wrapper. Do not create a public compound unless a second real consumer needs the combined Note + duration + progress anatomy.
- Burooj explicitly accepted this ownership and responsive-proportion contract on 2026-08-30, then chose 3:4 and requested the comparison candidate be made 20% smaller. `f6fc21a` formalized that choice in Note and CodeStrip, removed the obsolete `shape="glyph"` seam, made the row fill its host, and converted the guide workbench into a real-source specimen. Row density, state presentation, LiveStrip migration, and production verification remain open.
- Duration-as-distance is one comparison candidate, not a replacement for textual duration. Keep inline, stacked, proportional-distance, bar, and hidden treatments visible until Burooj chooses the strip-level duration presentation.
- Chord is a public compound rather than a CodeStrip-local group. Display determines anatomy: `symbol` is fused and `notes` is a zero-gap cluster. Structure and identity are not independent axes, so fused members and clustered symbols cannot be requested. The future Keyboard chord row consumes `display="symbol"`.
- Fused Chord maps one unchanged music-color band to each member note over an Ink base and reveals those bands independently from bottom to top, preserving individual attacks and releases within one outer surface. Clustered Chord lets each touching Note expose the same Ink-to-color articulation directly. Lightness is reserved for octave semantics and must not encode progress.
- Rest remains CodeStrip-local. It is an Ink surface with an Ivory bottom-to-top progressive fill and no printed duration tag. Strudel accepts both `~` and `-` as rest aliases; `_` elongates the preceding event.
- The current workbench implements those accepted relationships through the real source: Chord is a first-class token in fused-symbol or clustered-notes display; Rest is a compact offcut paper token whose Ivory fill rises over Ink; Note and Chord progress reveal unchanged music colors over Ink. All progress inputs are controlled and the guide alone owns its demonstration clock.
- `durationMode="inline" | "stacked" | "distance" | "bar" | "hidden"` applies one presentation consistently across Note and Chord events. Rest never prints its duration, though distance mode may encode its rhythmic space. `density="dense" | "default" | "spaced"` changes host scale, padding, and gaps without changing notation anatomy.
- Live computed-style evidence on 2026-09-01 found the 339x48 hero contained with no overflow and composing two Notes, one Chord, and two Rests. Note covers resolved to Ink with top-origin retraction; fused Chord bands retained runtime music colors with bottom-origin scale; Rest resolved to Ink/offcut/paper sheen with an Ivory bottom-origin fill and contrast-reversing mark. All five duration classes mounted and no workbench strip overflowed at the inspected desktop layout. Screenshot capture and a fresh narrow resize failed and are not claimed.
- This workbench is not final CodeStrip visual acceptance or production adoption. Burooj still needs to select duration and density and judge the complete row, Rest, Chord presentation, and temporal rhythm at `#unique-code-strip`.

### Chord — accepted definition

- `components/compounds/Chord.vue` is the provisional public source. Its axes are `display="symbol" | "notes"`, `proportion="compact" | "balanced" | "wide"`, and the shared Note geometry family; consumers provide member-note data and controlled progress values from 0 to 1.
- `display="symbol"` owns one fused surface and never renders member labels. `display="notes"` composes real `Note proportion="glyph"` instances at zero layout gap and never renders a chord symbol. The default whole-surface geometry is `offcut`; tile, tab, pill, and standard remain visible comparisons.
- Note's paper sheen was promoted into shared material tokens in `emotitone-design-system.css`. Note consumes the same token with no intended visual change; fused Chord combines it with the Note/key shadow and whole-surface geometry instead of inventing a separate flat card aesthetic.
- Every member begins as Ink and reveals its unchanged music color independently from bottom to top with a transform-only 72ms linear response. The fused color layer scales from its bottom edge; the clustered Note's Ink cover retracts from the top. Reduced Motion removes the transition. Chord owns no playback clock, store, audio, haptics, or input behavior.
- Chord-symbol type now scales from 17px to 30px and resolves to 30px in the wide hero. The guide owns a looping rolled-attack hero and freezes it at a representative static state under Reduced Motion. Static rows compare the two valid displays, whole-surface geometries, three proportions, articulation patterns, and Ink-to-color progress.
- Live computed-style evidence on 2026-09-01 resolved the wide offcut hero at 162x54px with Ink base, the shared paper sheen, Note/key shadow, offcut clip, and a 30px `Cmaj7` symbol. Its four overlays retained the exact runtime music colors and had independently changing scale transforms with bottom origins. The notes display rendered three real Notes, no fused surface, and an Ink cover retracting from the top. The collaborative screenshot and a fresh narrow resize failed, so neither is claimed.
- Burooj accepted the corrected live workbench on 2026-09-01. Chord is defined, its source is authoritative, and its specimen is real. Production adoption remains independently open for CodeStrip and the future Keyboard chord row.

## Cross-cutting truth and lineage watchlist

- Badge is brass-only. Tomato, pine, and other brand colors remain valid for non-badge Stickers. Its current implementation as a colorable Sticker variant is evidence to replace or constrain after deciding whether Badge deserves its own primitive.
- Brand colors are decorative. Semantic color aliases such as `--danger` are legacy cleanup, not design doctrine.
- Prefer filled surfaces where possible and minimize borders; treat an outline as intentional visual grammar, not default structure.
- Glassmorphism is rejected across the app. Purge the obsolete persisted/config surface in a separately scoped cleanup; do not present glass as a Keyboard or Drawer option.
- CodeStrip is the unique successor to production LiveStrip. Preserve LiveStrip's working editing, playback, highlighting, follow-scroll, configuration, and Strudel integration while replacing duplicated visual presentation through the authoritative CodeStrip seam.
- CodeStrip's compact note treatment now crosses the repaired public seam: `glyph` is authoritative in `NoteProportion`, while CodeStrip supplies the responsive host scale. Preserve that division; do not replace it with bare text or manufacture a public CodeStrip-note compound.
- Do not optimize the current horizontally scrolling action-bar Knob row. Replace its visual hierarchy later with a compound that composes CodeStrip and a deliberately small Button set. Keep its exact actions and layout unaccepted until CodeStrip closes.
- The Drawer trigger is part of the Drawer unit and does not need to remain a Knob.
- Music Color's original mounted intent was a segmented chromatic wheel with fixed/movable, root, octave 0–8, scale-count, and hue-sweep controls. `b140654` replaced it with linear swatches and octave 2–8 while consolidating calculation authority. The resolver consolidation is useful; the visual replacement was never accepted.
- Motion token specimens must not turn Reduce Motion into an `opacity-blink` fallback. Resolve that during the Motion unit.
- Glissando is absent and tracked separately as `BJS-371`; it is not a visual regression or acceptance condition.
- QWERTY remapping, roving focus, Space/Enter lifecycle, source coordination, remap cancellation, sounding announcements, and revised haptics are product/accessibility ideas outside this visual pass.
- Button source reconciliation is complete. Reconcile `ChipTabs.vue` with production `ui/Tabs*`, and `compounds/PatternCard.vue` with production `patterns/PatternCard.vue` in their own units.
- LoadingScreen reached production before visual acceptance. Preserve Kicker -> SpineCard and PatternCard -> PatternReel as dependency chains rather than copying their lower-level grammar.
- The Drawer specimen uses `DrawerShell`, and production `TopDrawer.vue` already imports it; Drawer definition remains open, not source integration.

## Session handoff

End every unit session by updating only current truth here and appending one concise `DESIGN_LOG.md` receipt. Record:

- unit and gate reached;
- source, specimen, and production status independently;
- lineage promotions or deliberately local rules;
- commits and exact checks;
- visual evidence and its limits;
- dirty/pushed state;
- unresolved visual frontier and next unit.

A spoken “done,” a mounted specimen, or a passing build is not a handoff.
