# Circular Sequencer Duration Enhancement

## Overview

The circular sequencer has been enhanced to play notes according to their visual duration representation on the sequencer circle. Previously, all notes played for a fixed duration (typically a whole note) regardless of how long they visually appeared on the circle.

## Problem Statement

The sequencer circle is divided into:
- **1 full bar** (360 degrees)
- **4 sections** of 4 steps each
- **16 total steps** representing 16th notes
- Each beat has a visual `duration` property that shows how many steps it spans

However, the audio playback was ignoring this visual duration and playing all notes for the same fixed duration.

## Solution Implementation

### 1. **New Duration Type** (`src/types/music.ts`)

Added `SequencerDuration` interface to handle timing calculations:

```typescript
export interface SequencerDuration {
  toneNotation: string;    // e.g., "4n", "8n", "2n"
  seconds: number;         // Duration in seconds
  fraction: number;        // Fraction of a whole note
}
```

### 2. **Duration Calculation Utility** (`src/utils/duration.ts`)

Created comprehensive duration calculation functions:

- **`calculateNoteDuration()`**: Converts step counts to proper musical durations
- **`convertToToneNotation()`**: Maps step durations to Tone.js notation
- **`getDurationDescription()`**: Human-readable duration descriptions

**Duration Mapping:**
- 1 step = 16th note (`16n`)
- 2 steps = 8th note (`8n`) 
- 4 steps = Quarter note (`4n`)
- 8 steps = Half note (`2n`)
- 16 steps = Whole note (`1n`)

### 3. **Enhanced Audio Service** (`src/services/audio.ts`)

Added new method `playNoteWithDuration()`:
- Accepts specific duration in Tone.js notation
- Supports scheduled playback with timing
- Maintains compatibility with existing audio system

### 4. **Music Store Enhancement** (`src/stores/music.ts`)

Added `playNoteWithDuration()` function:
- Calculates proper note names and frequencies
- Calls enhanced audio service with duration
- Dispatches events for visual effects
- Integrates with existing polyphonic system

### 5. **Updated Sequencer Components**

Both `CircularSequencer.vue` and `ImprovedCircularSequencer.vue` now:
- Import duration calculation utilities
- Calculate proper duration for each beat during playback
- Use `musicStore.playNoteWithDuration()` instead of basic note attack
- Pass calculated Tone.js notation and timing

**Before:**
```typescript
musicStore.attackNoteWithOctave(beat.solfegeIndex, beat.octave);
```

**After:**
```typescript
const noteDuration = calculateNoteDuration(
  beat.duration,
  config.value.steps,
  config.value.tempo
);

musicStore.playNoteWithDuration(
  beat.solfegeIndex,
  beat.octave,
  noteDuration.toneNotation,
  time
);
```

## Key Benefits

### 1. **Visual-Audio Alignment**
- Notes now sound for as long as they appear visually
- Short beats play as quick notes
- Long beats sustain appropriately

### 2. **Musical Accuracy**
- Proper note timing based on musical notation
- Respects tempo changes
- Maintains consistent rhythmic relationships

### 3. **Enhanced User Experience**
- Intuitive relationship between visual and audio
- More expressive musical possibilities
- Better educational value for understanding note durations

### 4. **Backward Compatibility**
- All existing functionality preserved
- No breaking changes to saved melodies
- Progressive enhancement approach

## Technical Details

### Duration Calculation Formula

```typescript
// Fraction of a whole note
const fraction = stepDuration / totalSteps;

// Duration in seconds (based on tempo)
const wholeNoteDuration = (60 / tempo) * 4;
const seconds = fraction * wholeNoteDuration;
```

### Tone.js Integration

The system uses Tone.js `triggerAttackRelease()` with proper duration and timing:

```typescript
instrument.triggerAttackRelease(noteToPlay, duration, time);
```

This ensures notes are scheduled accurately and play for the correct duration.

## Testing

The enhancement can be tested by:

1. **Creating beats of different lengths** in the sequencer
2. **Playing the sequence** and listening to duration differences
3. **Changing tempo** to verify duration scaling
4. **Comparing short vs. long beats** audibly

## Future Enhancements

Potential improvements:
- **Swing timing** for rhythmic variation
- **Note velocity** based on visual properties
- **Advanced note articulation** (staccato, legato)
- **Polyphonic duration management** for overlapping notes

## Files Modified

- `src/types/music.ts` - New duration type
- `src/utils/duration.ts` - Duration calculation utilities (new file)
- `src/services/audio.ts` - Enhanced audio service
- `src/stores/music.ts` - Duration-aware playback
- `src/components/CircularSequencer.vue` - Updated playback logic
- `src/components/ImprovedCircularSequencer.vue` - Updated playback logic

This enhancement makes the circular sequencer much more musically expressive and educationally valuable by ensuring that what you see is what you hear.