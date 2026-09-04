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

## Current checkpoint — 2026-09-04

- Branch: `implementing-design-system`; recompute dirty/ahead/push state live.
- Accepted and authoritative: Note, Key, the Analog Ring + Digital Arc Knob family, and Button.
- Geometry's circle-native cut-paper family is accepted and authoritative at the token layer: five `--clip-disc-*` silhouettes live in `emotitone-design-system.css`, render directly in the Geometry token guide, and are consumed by real Button instances in its style-guide specimen. No production Button is assigned one yet.
- Circle-native Geometry formalization at `0c065c1`: 9/9 focused Button tests, type-check, and production build pass with existing dependency/chunk warnings. Live guide computed styles confirmed the default Button remains `border-radius: 50%` / `clip-path: none`, while all five 48px specimens resolve distinct token clips with rotation. The collaborative preview screenshot failed; an exact temporary SVG render was inspected instead. A fresh bounded lineage audit passed after stale ownership receipts were repaired.
- Final circle-native Geometry correction at `f0be471`: responsive curved `shape()` tokens replace the rejected faceted polygons, with `circle(50%)` fallbacks. Offcut, tab, and rip mutate only a localized sector of an otherwise perfect circle; rounded stock is a continuously wobbly uneven circle; tile keeps restrained four-sided tension. Burooj accepted this as nice enough and closed Button work. A fresh bounded lineage audit passed with no findings; production assignment remains a separate future consumer decision.
- Button is accepted, formalized, mounted as a real specimen, and adopted in production. Its corrected finish has no faux inset outline, uses centered icons at 50% of the face, and defaults production brass to canonical sheen + glow. Button also exposed a new foundational Geometry idea: reusable circle-native cut-paper silhouettes belong to tokens, while Button is only their first primitive specimen consumer.
- Sticker's non-badge definition is accepted. Badge's brass-only identity is accepted, while whether it remains a Sticker variant or becomes its own primitive is open.
- Keyboard is the single production compound and is mounted in the guide, but its exact visual density remains **Under review**.
- CodeStrip's complete visual definition is accepted and correctly adopted in production at `4b3e49a`, with edit authority hardened at `a88c583`, superseding both the parallel renderer in `dd2ff7f` and the whole-document replacement widget in `11c5736`. `components/uniques/CodeStrip/index.vue` is the sole public host and the actual Strudel CodeMirror document. Its private extension replaces only semantic mini-notation source ranges with accepted Note/Chord/Rest visuals; focus reveals those same raw ranges, and edited note/chord identities invalidate stale recorded metadata before blur. Idle recording is fully colored, Play immediately resets events to Ink, and Strudel's native `showMiniLocations` source-location effect progressively reveals color/Ivory. `onDraw` owns only follow-scroll. The LiveStrip component, LiveCard wrapper, config key, controller name, adapter clock, and whole-document widget are removed; persisted `liveStrip` config migrates once to `codeStrip`. Inline text and proportional distance remain retired.
- Chord's visual definition is accepted. Its display contract is coupled: `symbol` is always one fused surface whose bands follow low-to-high voicing order, while `notes` is always a zero-gap cluster whose Notes follow press order; invalid fused-members and clustered-symbol combinations do not exist. Each member's independent progress visualizes its actual attack and release without changing either display order. The fused surface consumes Note's paper sheen, shadow, and whole-surface geometry family. Its authoritative source and real workbench are complete; production CodeStrip now consumes clustered Notes for overlapping input, while fused-symbol adoption waits for the future Keyboard chord row and trustworthy recognition.
- CodeStrip's adjacent action compound is accepted, authoritative, mounted as a real specimen, and adopted in production at `7b7c7b6`, with behavior and editability repaired at `6867a42`. Burooj reopened its compactness after production inspection: the compound now has no outer padding, while CodeStrip retains only its own editable-content spacing. It remains one row with brass Play/Stop on the left, the flexible CodeStrip in the middle, then ink Backspace and ivory Return on the right. Backspace names the existing remove-last-event action rather than promising editor undo; Return uses the typewriter carriage-return metaphor for the existing commit-and-clear action rather than calling it Send. All three are icon-only 40px Buttons with accessible names and no visible labels.
- Control Bar is accepted as a six-control compound: Key, Mode, BPM, Octave, Rows, and the existing provisional Drawer Boolean. It composes the authoritative Knob primitive in six equal-width slots across the full available width, with horizontal padding deprioritized and no scrolling at target mobile widths. Drawer stays behaviorally and visually unchanged until the Drawer unit decides its final trigger and home.
- `DrawerKeyboard.vue` becomes the composition only after CodeStrip, its action compound, Keyboard, and Drawer are defined.
- Music Color remains an independent later visual gate.
- Do not re-grill Note, Key, or Knob without a concrete contradiction or explicit request.

## Active frontiers and dependencies

Two unit sessions are ready and may proceed independently:

- visually inspect and accept the Keyboard density matrix in its existing workbench;
- define Drawer against its existing source/specimen/production evidence, including the final home of its trigger.

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
| Chord | Compound | **Accepted** | `components/compounds/Chord.vue` is authoritative and `style-guide/compounds/CompoundChord.vue` mounts it in a real workbench. `display="symbol"` is one fused paper surface ordered by `voicingOrder`; `display="notes"` is a zero-gap cluster ordered by `pressOrder`. Controlled member progress independently reveals unchanged music color over an Ink base. Production CodeStrip consumes the clustered display for overlapping recorded notes without performing recognition | Preserve clustered production order/progress; adopt fused symbols later through a trustworthy recognition owner and the future Keyboard chord row |
| CodeStrip | Unique | **Accepted and production-adopted** | `components/uniques/CodeStrip/index.vue` is the sole public source and the actual production Strudel CodeMirror host. Its private `strudelExtension.ts` transforms only mini-notation event ranges, consumes native `showMiniLocations` for playback progress, and reveals the unchanged raw document on focus. Private `Sequence.vue` composes accepted Note and Chord and owns surfaced Rest plus duration/density presentation. The real `style-guide/uniques/UniqueCodeStrip.vue` specimen mounts this same CodeMirror path. No LiveStrip or whole-document visual layer remains | Preserve the action compound consumer plus source-range, mirror-focus, native-highlight, idle/Play, and behavior tests |
| CodeStrip action compound | Compound | **Accepted correction pending adoption** | `components/compounds/CodeStripActions.vue` is authoritative, composes the real Button and CodeStrip sources, is mounted by `style-guide/compounds/CompoundCodeStripActions.vue`, and replaces the former production action bar through `DrawerKeyboard.vue`. Its current 6px outer padding and ink Return are superseded by the accepted compactness correction | Remove only compound-owned outer padding, make Return Ivory/Ink, and preserve its source seam and action behavior |
| Control Bar | Compound | **Accepted; formalization pending** | The production-only `components/keyboard/LegacyKeyboardControls.vue` is behavior evidence for Key, Mode, BPM, Octave, Rows, and Drawer. No authoritative compound or real guide specimen exists yet | Promote the six-control row into one controlled `components/compounds/ControlBar.vue`, spread equal-width Knob slots across the host, adopt it in production, and keep Drawer provisional until its own unit |
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

### CodeStrip — accepted definition

- CodeStrip is the unique production Strudel document; the retired LiveStrip name describes only its historical predecessor. Its later action cluster is a separate compound.
- Using the common Note primitive is the accepted lineage decision. CodeStrip consumes its compact surfaced `glyph` proportion rather than duplicating Note or falling back to bare text.
- `glyph` joins Note's existing `tall | medium | stocky | wide` proportion family. It is not a bare-text escape or a separate presentation axis: it retains Note's material styling, chromatic surface, geometry character, shadow/depth, typography, and sounding treatment.
- A Note proportion describes relational shape, not an immutable pixel size. `Note.vue` supplies intrinsic fallbacks while CodeStrip and production Keyboard provide host-controlled scale without changing Note's accepted proportions.
- CodeStrip owns the compact host scale for `proportion="glyph"`; the proportion recipe owns its aspect, padding, and type relationships. The accepted ratio is 3:4. Its responsive block scale is `clamp(27.2px, 8cqi, 33.6px)`, exactly 20% below the 34–42px comparison candidate. Dense, default, and spaced remain accepted host-density choices, with default as the component default.
- Recover the earlier CodeStrip density and rhythm through compact surfaced Notes, with muted duration, rest, punctuation, and grouping chrome. Do not retain the current oversized tile row.
- Preserve the Strudel editor's native progressive playback feedback: each semantic source range fills as its native location highlight advances. CodeStrip owns the visual translation; Note continues to own musical identity, typography, color, accidentals, and accessible naming.
- The accepted ownership seam is `proportion="glyph"` on Note plus a CodeStrip-local token wrapper. Do not create a public compound unless a second real consumer needs the combined Note + duration + progress anatomy.
- Burooj explicitly accepted this ownership and responsive-proportion contract on 2026-08-30, then chose 3:4 and requested the comparison candidate be made 20% smaller. `f6fc21a` formalized that choice in Note and CodeStrip, removed the obsolete `shape="glyph"` seam, made the row fill its host, and converted the guide workbench into a real-source specimen. Burooj accepted the complete corrected workbench on 2026-09-02. `dd2ff7f` mistakenly introduced a parallel recorded-note renderer beside an independently styled Strudel mirror. `11c5736` then replaced the entire document with one Vue widget and drove progress from an independent `onDraw` phase. Burooj rejected both boundaries. `4b3e49a` makes CodeStrip the editor itself: one CodeMirror document, per-source-range visual replacements, and Strudel's native highlight effect as progress authority.
- Inline textual duration and proportional-distance duration were explicitly retired on 2026-09-01. The remaining treatments are stacked text, time-signature-aware split proportional bars, and hidden. Bar mode keeps the old horizontal duration space beside each event, divides that span into meter-derived segments, and appears for Note, Chord, and Rest; Rest still never prints a textual duration.
- Chord is a public compound rather than a CodeStrip-local group. Display determines anatomy: `symbol` is fused and `notes` is a zero-gap cluster. Structure and identity are not independent axes, so fused members and clustered symbols cannot be requested. The future Keyboard chord row consumes `display="symbol"`.
- Fused Chord maps one unchanged music-color band to each member note over an Ink base and reveals those bands independently from bottom to top, preserving individual attacks and releases within one outer surface. Clustered Chord lets each touching Note expose the same Ink-to-color articulation directly. Lightness is reserved for octave semantics and must not encode progress.
- Rest remains CodeStrip-local. It is an Ink surface with an Ivory bottom-to-top progressive fill and no printed duration tag. Strudel accepts both `~` and `-` as rest aliases; `_` elongates the preceding event.
- The current workbench implements those accepted relationships through the real CodeMirror source: Chord is a first-class event replacement in fused-symbol or clustered-notes display; Rest is a compact offcut paper token whose Ivory fill rises over Ink; Note and Chord reveal unchanged music colors over Ink. Controlled guide values are translated into the same `showMiniLocations` effect used by production rather than a separate rendering path.
- `durationMode="stacked" | "bar" | "hidden"` applies one presentation across the sequence. `timeSignature` defaults to `4/4`; bar mode keeps duration inline, scales its span proportionally, divides that span into denominator-aware segments, and makes each notated beat boundary taller. Rest participates in the same split bar while remaining textually untagged. `density="dense" | "default" | "spaced"` changes host scale, padding, and gaps without changing notation anatomy.
- Live computed-style evidence on 2026-09-01 found the 339x48 hero contained with no overflow and composing two Notes, one Chord, and two Rests. Note covers resolved to Ink with top-origin retraction; fused Chord bands retained runtime music colors with bottom-origin scale; Rest resolved to Ink/offcut/paper sheen with an Ivory bottom-origin fill and contrast-reversing mark. The current source now mounts only stacked, bar, and hidden modes; equal events produce 15 total segments in 4/4 and 12 in 3/4, Rest owns one segment for its `@0.0625` duration, and focused tests assert that the proportional split bar sits inline beside Note and Rest. Screenshot capture and a fresh narrow resize failed and are not claimed.
- Burooj accepted the complete live workbench on 2026-09-02, including its duration family, density family, Rest, Chord presentation, and temporal rhythm. CodeStrip is defined, its source is authoritative, its specimen is real, and production mounts that source directly. Recorded-note metadata groups overlap into clustered Notes and derives voicing and press ranks separately, but owns no playback progress or chord recognition. `strudelExtension.ts` observes Strudel's exported `showMiniLocations` StateEffect, maps its source ranges through CodeMirror edits, and applies independent Note/Chord member progress. Rest advances from the same native `atTime`. Focusing the CodeMirror removes only those range replacements and reveals the unchanged editable Strudel source; blur restores them. At `a88c583`, note and chord compatibility began validating source identity rather than event position, so a raw edit such as `C4` to `D4` re-derives the visual and subsequent native highlight range instead of restoring stale recorded semantics. There is no LiveStrip host, parallel display, hidden Strudel line, whole-document widget, or independent progress clock.

### CodeStrip action compound — accepted definition

- The compound is one compact horizontal instrument row: brass Play/Stop on the left, the flexible-width authoritative CodeStrip in the middle, then ink Backspace and ivory Return on the right.
- The compound adds no outer padding. CodeStrip retains its own internal editable-content spacing; the composition owns separation from adjacent units. Mobile width is reserved for the playable/editable surface before decorative breathing room.
- Each action is an icon-only 40px Button with its required accessible name and no visible label. Play changes its icon and accessible name to Stop during playback without becoming a persistent or `aria-pressed` Button state.
- Backspace invokes the existing remove-last-event behavior. It must not be called Undo because it does not own CodeMirror editor history.
- Return uses the typewriter carriage-return metaphor for the existing action that commits the current pattern and clears the working strip for the next line. It must not be called Send. Its face is Ivory with an Ink icon, distinct from brass emphasis.
- Key, Mode, BPM, Octave, Rows, and Drawer are outside this compound. Drawer remains a later unit; the other persistent musical and keyboard settings must not be smuggled into this compact action row.
- The compound owns only arrangement, local density, and action presentation. CodeStrip, Button, playback, pattern mutation, haptics, editing, audio, and persistence retain their existing owners and behavior.
- `7b7c7b6` created the authoritative compound, mounted its real controlled specimen, adopted it in `DrawerKeyboard.vue`, and removed `KeyboardActionBar.vue`. The first lineage audit caught two unauthorized consequences: all six non-compound settings had lost production access, and ancestor `user-select: none` suppressed selection in the editable CodeMirror. `6867a42` restored those settings through the explicit production-only `LegacyKeyboardControls.vue` sibling and removed selection suppression from the compound. The fresh re-audit passed with no findings.
- Verification after repair: 27/27 focused Button, CodeStrip, compound, production-wiring, provisional-settings, and Keyboard tests pass; type-check and production build pass with the existing Browserslist, soundfont-eval, and bundle-size warnings. Live 390px production evidence before the audit repair confirmed a 390px-contained row, 40px Buttons, a 240px flexible CodeStrip, brass-only Play, ink Backspace/Return, and no document overflow. The repair changed no accepted geometry; source and regression evidence confirm CodeMirror selection is restored and the six settings remain mounted. No post-repair screenshot is claimed.

### Control Bar — accepted definition

- Control Bar is the compact persistent-settings row immediately above Keyboard. Its name describes the job rather than binding the compound to Knob as an implementation detail.
- It composes six real Knob primitives in this order: Key, Mode, BPM, Octave, Rows, Drawer. Each occupies one equal-width slot and the row fills the host, so the controls spread evenly instead of clustering in a max-content scroller.
- The mobile-first layout avoids horizontal padding and remains one contained row without horizontal scrolling at target production widths. Minimal block spacing may protect Knob labels and interaction geometry; gallery framing is not compound anatomy.
- It owns arrangement only. Music, visual-config, keyboard, and Drawer stores retain their values and mutations in the production composition. The public compound exposes controlled values and change events so the style guide can drive the same source without production stores.
- Drawer remains a provisional Boolean Knob in this row. This acceptance neither defines Drawer nor commits its trigger to Control Bar permanently; its appearance, behavior, and final home remain unchanged until the Drawer unit.

### Chord — accepted definition

- `components/compounds/Chord.vue` is the provisional public source. Its axes are `display="symbol" | "notes"`, `proportion="compact" | "balanced" | "wide"`, and the shared Note geometry family; consumers provide member-note data and controlled progress values from 0 to 1.
- `display="symbol"` owns one fused surface and never renders member labels. `display="notes"` composes real `Note proportion="glyph"` instances at zero layout gap and never renders a chord symbol. The default whole-surface geometry is `offcut`; tile, tab, pill, and standard remain visible comparisons.
- Note's paper sheen was promoted into shared material tokens in `emotitone-design-system.css`. Note consumes the same token with no intended visual change; fused Chord combines it with the Note/key shadow and whole-surface geometry instead of inventing a separate flat card aesthetic.
- Every member begins as Ink and reveals its unchanged music color independently from bottom to top with a transform-only 72ms linear response. The fused color layer scales from its bottom edge; the clustered Note's Ink cover retracts from the top. Reduced Motion removes the transition. Chord owns no playback clock, store, audio, haptics, or input behavior.
- Chord-symbol type now scales from 17px to 30px and resolves to 30px in the wide hero. The guide owns a looping rolled-attack hero and freezes it at a representative static state under Reduced Motion. Static rows compare the two valid displays, whole-surface geometries, three proportions, articulation patterns, and Ink-to-color progress.
- Live computed-style evidence on 2026-09-01 resolved the wide offcut hero at 162x54px with Ink base, the shared paper sheen, Note/key shadow, offcut clip, and a 30px `Cmaj7` symbol. Its four overlays retained the exact runtime music colors and had independently changing scale transforms with bottom origins. The notes display rendered three real Notes, no fused surface, and an Ink cover retracting from the top. The collaborative screenshot and a fresh narrow resize failed, so neither is claimed.
- Burooj accepted the corrected live workbench on 2026-09-01. Chord is defined, its source is authoritative, and its specimen is real. Production CodeStrip now consumes `display="notes"` for overlapping recorded notes; fused-symbol adoption remains open for the future Keyboard chord row.
- Chord accepts separate optional `voicingOrder` and `pressOrder` ranks per member. Fused-symbol bands sort by voicing order; clustered Notes sort by press order; original input order is the stable fallback for either missing rank. Each member's progress remains independent, so attack and release chronology never rearranges fused bands and clustered chronology remains directly legible. Chord itself does not detect, name, pitch-sort, or temporally group notes.

## Cross-cutting truth and lineage watchlist

- Badge is brass-only. Tomato, pine, and other brand colors remain valid for non-badge Stickers. Its current implementation as a colorable Sticker variant is evidence to replace or constrain after deciding whether Badge deserves its own primitive.
- Brand colors are decorative. Semantic color aliases such as `--danger` are legacy cleanup, not design doctrine.
- Prefer filled surfaces where possible and minimize borders; treat an outline as intentional visual grammar, not default structure.
- Glassmorphism is rejected across the app. Purge the obsolete persisted/config surface in a separately scoped cleanup; do not present glass as a Keyboard or Drawer option.
- CodeStrip is the unique successor to the old production LiveStrip visual, and no LiveStrip runtime identity remains after `4b3e49a`. One public `components/uniques/CodeStrip/index.vue` owns the Strudel mirror, editing, transport attachment, and follow-scroll; its private CodeMirror extension owns semantic source-range visuals and consumes the native highlight effect. `LiveStrip.vue`, `LiveCard.vue`, the `liveStrip` config/API name, the adapter playback clock, and the whole-document widget are gone. The only remaining `liveStrip` spelling is the persisted-config migration input.
- CodeStrip's compact note treatment now crosses the repaired public seam: `glyph` is authoritative in `NoteProportion`, while CodeStrip supplies the responsive host scale. Preserve that division; do not replace it with bare text or manufacture a public CodeStrip-note compound.
- The accepted CodeStrip action compound replaces the old mixed action bar. Do not fold Key, Mode, BPM, Octave, Rows, or Drawer into it. Control Bar is the accepted compound for those six current controls; Drawer remains provisional within it until the Drawer unit.
- The Drawer trigger is part of the Drawer unit and does not need to remain a Knob.
- Music Color's original mounted intent was a segmented chromatic wheel with fixed/movable, root, octave 0–8, scale-count, and hue-sweep controls. `b140654` replaced it with linear swatches and octave 2–8 while consolidating calculation authority. The resolver consolidation is useful; the visual replacement was never accepted.
- Motion token specimens must not turn Reduce Motion into an `opacity-blink` fallback. Resolve that during the Motion unit.
- Glissando is absent and tracked separately as `BJS-371`; it is not a visual regression or acceptance condition.
- QWERTY remapping, roving focus, Space/Enter lifecycle, source coordination, remap cancellation, sounding announcements, and revised haptics are product/accessibility ideas outside this visual pass.
- Production CodeStrip's recorded-note metadata supplies low-to-high `voicingOrder` and chronological `pressOrder` for overlapping notes, using the clustered display without attempting chord recognition. Independent member progress comes from Strudel source locations, not that metadata mapper. `FloatingPopup` still sends accumulated press order to Tonal and Tonal treats its first note as the inversion bass; `BJS-406` owns that separate bug. Chord naming remains a functional concern, not Chord visual-component ownership.
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
