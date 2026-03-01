# Modes Expansion Plan

Expand from 2 modes (major/minor) to 13 modes using Tonal.js.

## Target Modes

| Display | Tonal.js name | Notes | Type |
|---|---|---|---|
| Major | `major` | 7 | heptatonic |
| Minor | `minor` | 7 | heptatonic |
| Dorian | `dorian` | 7 | heptatonic |
| Phrygian | `phrygian` | 7 | heptatonic |
| Lydian | `lydian` | 7 | heptatonic |
| Mixolydian | `mixolydian` | 7 | heptatonic |
| Locrian | `locrian` | 7 | heptatonic |
| Melodic Minor | `melodic minor` | 7 | heptatonic |
| Harmonic Minor | `harmonic minor` | 7 | heptatonic |
| Major Pentatonic | `major pentatonic` | 5 | pentatonic |
| Minor Pentatonic | `minor pentatonic` | 5 | pentatonic |
| Major Blues | `major blues` | 6 | hexatonic |
| Minor Blues | `minor blues` | 6 | hexatonic |

All confirmed valid `TonalScale.get()` names.

## Solfège Syllables (movable-do system)

Heptatonic modes — altered degrees vs. Major:

| Mode | Syllables |
|---|---|
| Dorian (b3, b7) | Do Re **Me** Fa Sol La **Te** |
| Phrygian (b2,b3,b6,b7) | Do **Ra** **Me** Fa Sol **Le** **Te** |
| Lydian (#4) | Do Re Mi **Fi** Sol La Ti |
| Mixolydian (b7) | Do Re Mi Fa Sol La **Te** |
| Locrian (b2,b3,b5,b6,b7) | Do **Ra** **Me** Fa **Se** **Le** **Te** |
| Melodic Minor (b3) | Do Re **Me** Fa Sol La Ti |
| Harmonic Minor (b3,b6) | Do Re **Me** Fa Sol **Le** Ti |

Chromatic solfège: Ra=b2, Me=b3, Fi=#4, Se=b5, Le=b6, Te=b7.

Pentatonic/blues syllables:
```
Major Pentatonic: Do Re Mi Sol La          (1,2,3,5,6)
Minor Pentatonic: Do Me Fa Sol Te          (1,b3,4,5,b7)
Major Blues:      Do Re Me Mi Sol La       (1,2,b3,3,5,6)
Minor Blues:      Do Me Fa Se Sol Te       (1,b3,4,b5,5,b7)
```

## Execution Order (8 files)

1. **`src/types/music.ts` line 65** — widen `MusicalMode` union to all 13 values; TypeScript will surface downstream errors

2. **`src/data/solfege.ts`** (after MINOR_SOLFEGE) — add 11 new `SolfegeData[]` arrays + `SOLFEGE_MAP: Record<MusicalMode, SolfegeData[]>`

3. **`src/data/scales.ts`** — add `SCALE_MAP: Record<MusicalMode, Scale>` using `SOLFEGE_MAP`; keep `MAJOR_SCALE`/`MINOR_SCALE` exports for backward compat

4. **`src/data/index.ts`** — export `SCALE_MAP` and new solfège arrays

5. **`src/services/music.ts`** — three fixes:
   - `getCurrentScale()` line 91: `return SCALE_MAP[this.currentMode] ?? MAJOR_SCALE`
   - `getCurrentScaleNotes()` line 125: remove `const scaleName = mode === "major" ? ... : "minor"` and the hardcoded `.slice(0, 7)` — use `this.currentMode` directly with Tonal.js
   - `getNoteName()` / `getNoteFrequency()` lines 173/208: change `solfegeIndex === 7` sentinel to `solfegeIndex === scaleLength` (dynamic)

6. **`src/composables/useColorSystem.ts`** — add `SOLFEGE_HUE_MAP` for the 13 chromatic syllables so new names (Me, Ra, Fi, etc.) get correct hues instead of falling back to red:
   ```ts
   const SOLFEGE_HUE_MAP: Record<string, number> = {
     "Do": 0, "Ra": 26, "Re": 51, "Me": 77, "Mi": 103,
     "Fa": 154, "Fi": 180, "Sol": 206, "Se": 218,
     "La": 257, "Le": 270, "Te": 283, "Ti": 309,
   };
   ```
   Update `getNoteIndex()` to fall back to this map when syllable not in `SOLFEGE_NOTES`.

7. **`src/components/DrawerKeyboard.vue` line 25** — `v-if="index < 7"` → `v-if="index < store.solfegeData.length"` (dynamic key count)

8. **`src/components/keyboard/KeyboardActionBar.vue` lines 44–72** — replace 2-item OptionsKnob with 13-item MODE_OPTIONS array

## Key Risks

- `slice(0, 7)` in `getCurrentScaleNotes()` must be removed — pentatonic only has 5 notes
- `solfegeIndex === 7` octave-Do sentinel in `getNoteName`/`getNoteFrequency` must use `scaleLength`
- Pinia persist with `persist: true` — old `"major"`/`"minor"` values stay valid, no migration needed
- `OptionsKnob` with 13 options = many taps to cycle; acceptable for now, scrollable picker is a future improvement
