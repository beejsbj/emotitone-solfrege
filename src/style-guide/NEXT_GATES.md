# Next Gates

Date: 2026-08-19

## Current Doctrine Corrections

- More design-system work remains before main-app implementation.
- Layer order is tokens, primatives, uniques, compounds, compositions.
- Top-drawer composition is removed from the style guide; product top drawer belongs to main-app implementation later.
- CodeStrip is unique. Compounds may compose uniques plus primitives.
- PresetRow is not a source compound; it is just SpineCard usage with a filled button/content.
- Brand colors are decorative only. Semantic color aliases such as `--danger` are legacy cleanup, not design doctrine.
- Brass is instrument metal paired with ink and ivory. It is separate from the funk/poster brand colors.
- Sticker badge is a Sticker variant and should only be brass.
- Use filled surfaces where possible and minimize borders.

## Note Primitive Gate

`Note.vue` is accepted and formalized as the controlled, noninteractive musical identity and presentation primitive.

- Final geometry: `standard`, `tile`, mirrored `offcut`, `tab`, and `pill`.
- Final responsive proportions: `tall`, `medium`, `stocky`, and `wide`; `medium` is default.
- Final surfaces: `colored` and `monochrome`.
- Final identity: syllable, scale degree, and raw pitch use one rank-based display typography system; raw pitch includes accidental and octave.
- Final activity API: externally controlled `sounding` only. Onset ring, held rim/halo, brushed release, and the static Reduce Motion treatment are accepted.
- Persisted `keyboard.primaryLabel` remains wired. Note owns no input, timer, store, or audio engine.

The Note gate is closed. `sustained`, `playedRecently`, `selected`, and `ghosted` remain undefined tracker candidates, not Note props.

## Key Compound Gate

`Key.vue` is accepted and formalized as the native, momentary button compound around the complete Note face.

- Final rest state: no permanent bezel or housing; only Note is visible.
- Final physical response: a fine-pointer 1px hover lift, then a shared 2px-down / 3%-compressed press with neutral inset depth and a local 90ms no-bounce transform transition.
- Final focus: a static 2px high-contrast neutral outline with a 2px gap; focus is independent from lift and press.
- Final state model: controlled physical `pressed` and forwarded musical `sounding` are independent. `aria-pressed` reports physical state only.
- Final local input: idempotent `mouse` and `touch:<identifier>` activations emit typed `press`/`release` payloads and clean up on end, departure, cancellation, window blur, hidden document, and unmount.
- Final accessibility: native button semantics, a caller-supplied or concise derived musical label, 44px minimum target, fine-pointer-only hover, and a static Reduce Motion press treatment.
- Final boundary: no disabled/lock state, store, audio, haptic, MIDI, QWERTY, global routing, config, or imperative trigger API. Cross-key drag/glissando remains Keyboard work.

The Key gate is closed. The accepted Note and Key have now been coalesced into the implementation branch: legacy `KeyboardKey.vue` is removed, production `Keyboard.vue` renders accepted Keys, and `DrawerKeyboard.vue` is a thin current host around that Keyboard plus its existing drawer content. This is production adoption, not acceptance of the Keyboard or Drawer definitions.

## Next Independent Gate

- Working only from the implementation branch, grill the current production `Keyboard.vue` reference and settle its definition before further Keyboard refactoring.
- Define one owner for layout, cross-key drag/glissando, literal-keyboard routing, audio/haptics, store/config integration, and the relationship to centrally owned MIDI; those concerns do not belong in Key.
- Keep the accepted Note and Key APIs intact. The current `angledStyle` to offcut mapping, legacy glassmorphism fallback, row proportions, and heights are production bridge choices to examine during the Keyboard interview, not accepted Keyboard doctrine.
- After Keyboard, grill Drawer separately. Do not let the Keyboard interview silently settle drawer chrome, action-bar composition, or drawer motion.
- Do not migrate CodeStrip during either gate.
- Purge glassmorphism across the wider app in a separately scoped gate; Note no longer exposes it.

## Deferred App Gates

- Production knobs can eventually adopt the design-system visual knob, but not until the design system is complete.
- Legacy `--note-*` aliases should not be swept from production until the defined Keyboard adopts accepted Note and Key.
- Main app implementation starts after design-system gates close.
