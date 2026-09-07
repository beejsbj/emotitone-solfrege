# Harmony policy

The Keyboard chord row follows one directional pipeline:

```text
tonic + scaleType -> scale
scale + automatic policy -> one base chord per scale degree
base chord + alteration -> pitch classes
pitch classes + close-position voicing -> exact scientific pitches
```

`src/domain/harmony.ts` owns this pure policy. `Chord.vue` only presents member data, `ChordKey.vue` only provides Key-like input, and the Joystick only selects an alteration. Alteration and voicing are deliberately separate values so a later inversion or register policy does not become a chord quality.

Harmony policy is an internal generation algorithm. The Joystick is the sole visible Harmony performance control; a separate bank selector would require a future independent choice of algorithms.

## Joystick interaction

The public `components/uniques/Joystick/index.vue` owns both brass Analog and Digital treatments. Control Bar chooses Analog to accompany its existing instrument controls; this consumer choice is reversible. The guide mounts both treatments through this same source.

The complete face accepts pointer input. Pressing anywhere preserves the current stick position. After 5px of radial movement, displacement from that press adds to the starting stick vector, following Knob's relative-drag principle. A central dead zone and eight octants select the effective character within a clamped travel radius. An unmoved press is a no-op; a short drag latches its final character. Holding for 260ms makes a drag momentary and release restores the prior latch. Pointer capture plus global tracking preserves movement outside the face; cancellation, lost capture, blur, hidden document, and unmount restore the latch. Both axes belong to the joystick, so scrolling starts outside its face. Keyboard users have nine named spatial radio positions with arrows/Home and native Space/Enter activation.

Keyboard chord faces provide full member progress at rest, exposing Chord's low-to-high member-note colors. CodeStrip retains its independent playback-progress policy through the same Chord source.

## Automatic center

- Seven-note scales use scale-contained stacked thirds: degree `i`, `i + 2`, and `i + 4`, wrapping into the next octave.
- Five- and six-note scales choose the first root-containing, scale-contained template in this explicit order: major, minor, diminished, augmented, suspended second, suspended fourth. If none fits, the policy chooses a contained dyad by the explicit interval order `7, 5, 4, 3, 2, 10, 9, 1, 6, 8, 11`; if even that is impossible, it truthfully returns a root octave.
- The chromatic scale uses an explicit all-major base bank, one major triad on every chromatic root. It does not rely on the sparse-scale containment ranking.

The result always contains exactly the scale's real cardinality: currently 5, 6, 7, or 12 chords. No chromatic root is discarded and no sparse scale is padded.

## Directional alterations

The eight directions adapt the [official HiChord default-mode characters](https://manual.hichord.shop/) to EmotiTone. Center is EmotiTone's automatic scale-derived state.

| Direction | Character | Alteration policy |
| --- | --- | --- |
| Center | Automatic | Restore the scale-derived base chord |
| Up-left | Dreamy | Augmented |
| Up | Flip | Major-like base becomes minor; other bases become major |
| Up-right | Bluesy | Dominant seventh |
| Left | Dark | Major-like base becomes minor; other bases become diminished |
| Right | Jazzy | Major-like base becomes major seventh; other bases become minor seventh |
| Down-left | Sweet | Major-like base becomes major sixth; other bases become suspended second |
| Down | Open | Suspended fourth |
| Down-right | Lush | Major-like base becomes major ninth; other bases become minor ninth |

Explicit directions are intentional alterations. Their pitch classes may fall outside the active scale; those members carry `scaleIndex: null` rather than pretending to be a nearby scale degree.

## Attack and ownership

The chord object is captured when its key is attacked. Joystick changes affect later attacks and never retune a held chord.

Every input contact owns an independent voice group. Chord/chord, chord/melody, QWERTY, focus, mouse, and touch owners do not coalesce shared or unison pitches. Releasing one owner therefore cannot silence another. A released owner also releases voices that resolve after an asynchronous attack, and blur/unmount release every resolved or pending group.

Borrowed chord members use `musicStore.attackExactPitch()` so their scientific pitch reaches the audio engine without the legacy string path's out-of-scale flooring.
