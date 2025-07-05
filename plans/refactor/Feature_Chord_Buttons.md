# Feature: Chord Button Implementation

## 🎯 Goal

Enhance the main palette interface by adding "Chord Buttons" that allow users to explore harmony and play common chord progressions. This adds a significant new dimension to the app's musical capabilities without complicating the core note-playing experience.

## 📋 Background

The current palette interface is limited to playing single notes. While excellent for melodies, it doesn't provide an intuitive way to explore or understand chords, which are fundamental to music. This feature will bridge that gap.

## 🔧 Implementation Steps

### Step 1: Design Chord Button Interface

**Placement strategy:**

- Add chord buttons below the existing single-note pads
- Keep interface clean and organized
- Ensure mobile-friendly touch targets
- Maintain visual hierarchy

**Chord selection:**

- Start with essential diatonic chords: **I** (tonic), **IV** (subdominant), **V** (dominant), **vi** (relative minor)
- Calculate chord notes dynamically based on current key/scale
- Consider future expansion to seventh chords and extensions

### Step 2: Create ChordButton Component

**Create `src/components/chords/ChordButton.vue`:**

```vue
<script setup lang="ts">
interface Props {
  chordRomanNumeral: string;
  chordName: string;
  notes: string[];
  themeColor: string;
  isActive?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  play: [notes: string[]];
  release: [notes: string[]];
}>();

const handlePress = () => {
  emit("play", props.notes);
};

const handleRelease = () => {
  emit("release", props.notes);
};
</script>

<template>
  <button
    class="chord-button"
    :class="{ active: isActive }"
    :style="{ '--chord-color': themeColor }"
    @mousedown="handlePress"
    @mouseup="handleRelease"
    @touchstart="handlePress"
    @touchend="handleRelease"
  >
    <div class="chord-roman">{{ chordRomanNumeral }}</div>
    <div class="chord-name">{{ chordName }}</div>
    <div class="chord-notes">{{ notes.join(" ") }}</div>
  </button>
</template>

<style scoped>
.chord-button {
  background: hsla(var(--chord-color), 0.1);
  border: 2px solid hsla(var(--chord-color), 0.3);
  border-radius: 12px;
  padding: 16px;
  min-width: 80px;
  transition: all 0.2s ease;
  color: hsla(var(--chord-color), 1);
}

.chord-button:hover {
  background: hsla(var(--chord-color), 0.2);
  transform: translateY(-2px);
}

.chord-button.active {
  background: hsla(var(--chord-color), 0.3);
  transform: scale(0.95);
}

.chord-roman {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 4px;
}

.chord-name {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 4px;
}

.chord-notes {
  font-size: 0.7rem;
  opacity: 0.6;
}
</style>
```

### Step 3: Enhance AudioService for Polyphony

**Update `src/services/audio.ts` to support chord playback:**

```typescript
// Ensure polyphonic capability
export class AudioService {
  private activeChords: Map<string, string[]> = new Map();

  async playChord(notes: string[], chordId: string = "default"): Promise<void> {
    // Stop any existing chord with same ID
    if (this.activeChords.has(chordId)) {
      this.releaseChord(chordId);
    }

    // Play all notes simultaneously
    const promises = notes.map((note) => this.playNote(note, false)); // Don't auto-release
    await Promise.all(promises);

    // Track active chord
    this.activeChords.set(chordId, notes);
  }

  releaseChord(chordId: string): void {
    const notes = this.activeChords.get(chordId);
    if (notes) {
      notes.forEach((note) => this.releaseNote(note));
      this.activeChords.delete(chordId);
    }
  }

  private releaseNote(note: string): void {
    // Release specific note
    if (this.synth) {
      this.synth.triggerRelease(note);
    }
  }
}
```

### Step 4: Add Chord Logic to Music Service

**Create `src/services/chords.ts`:**

```typescript
import { Scale } from "@tonaljs/scale";
import { Chord } from "@tonaljs/chord";

export interface ChordInfo {
  romanNumeral: string;
  name: string;
  notes: string[];
  quality: string;
}

export class ChordService {
  getDiatonicChords(key: string, scale: string = "major"): ChordInfo[] {
    const scaleNotes = Scale.get(`${key} ${scale}`).notes;

    const chordMappings = {
      major: [
        { degree: "I", quality: "M" },
        { degree: "ii", quality: "m" },
        { degree: "iii", quality: "m" },
        { degree: "IV", quality: "M" },
        { degree: "V", quality: "M" },
        { degree: "vi", quality: "m" },
        { degree: "vii°", quality: "dim" },
      ],
      minor: [
        { degree: "i", quality: "m" },
        { degree: "ii°", quality: "dim" },
        { degree: "III", quality: "M" },
        { degree: "iv", quality: "m" },
        { degree: "v", quality: "m" },
        { degree: "VI", quality: "M" },
        { degree: "VII", quality: "M" },
      ],
    };

    const mappings =
      chordMappings[scale as keyof typeof chordMappings] || chordMappings.major;

    return mappings.slice(0, 4).map((mapping, index) => {
      const root = scaleNotes[index];
      const chordSymbol = `${root}${
        mapping.quality === "m" ? "m" : mapping.quality === "dim" ? "dim" : ""
      }`;
      const chord = Chord.get(chordSymbol);

      return {
        romanNumeral: mapping.degree,
        name: chord.name,
        notes: chord.notes.map((note) => `${note}4`), // Add octave
        quality: mapping.quality,
      };
    });
  }
}
```

### Step 5: Integrate Chord Buttons into Palette

**Update main palette component:**

```vue
<script setup lang="ts">
import { ChordButton } from "@/components/chords";
import { ChordService } from "@/services/chords";
import { useMusicStore } from "@/stores/music";
import { useAudioService } from "@/services/audio";

const musicStore = useMusicStore();
const audioService = useAudioService();
const chordService = new ChordService();

const activeChords = ref<Set<string>>(new Set());

const diatonicChords = computed(() => {
  return chordService.getDiatonicChords(
    musicStore.currentKey,
    musicStore.currentScale
  );
});

const handleChordPlay = async (notes: string[], chordId: string) => {
  activeChords.value.add(chordId);
  await audioService.playChord(notes, chordId);

  // Highlight corresponding single note pads
  highlightNotePads(notes);
};

const handleChordRelease = (notes: string[], chordId: string) => {
  activeChords.value.delete(chordId);
  audioService.releaseChord(chordId);

  // Remove highlight from note pads
  unhighlightNotePads(notes);
};

const highlightNotePads = (notes: string[]) => {
  // Find and highlight corresponding single note pads
  const noteNames = notes.map((note) => note.replace(/\d+/, ""));
  noteNames.forEach((noteName) => {
    const pad = document.querySelector(`[data-note="${noteName}"]`);
    if (pad) {
      pad.classList.add("chord-highlight");
    }
  });
};
</script>

<template>
  <div class="palette-container">
    <!-- Existing single note pads -->
    <div class="note-pads">
      <!-- ... existing note pads ... -->
    </div>

    <!-- New chord buttons section -->
    <div class="chord-buttons">
      <div class="chord-buttons-header">
        <h3>Chords</h3>
      </div>
      <div class="chord-buttons-grid">
        <ChordButton
          v-for="chord in diatonicChords"
          :key="chord.romanNumeral"
          :chord-roman-numeral="chord.romanNumeral"
          :chord-name="chord.name"
          :notes="chord.notes"
          :theme-color="getChordColor(chord.quality)"
          :is-active="activeChords.has(chord.romanNumeral)"
          @play="handleChordPlay($event, chord.romanNumeral)"
          @release="handleChordRelease($event, chord.romanNumeral)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chord-buttons {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid hsla(0, 0%, 100%, 0.1);
}

.chord-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.chord-buttons-header h3 {
  color: hsla(0, 0%, 90%, 0.8);
  font-size: 1.1rem;
  margin: 0;
  text-align: center;
}

/* Highlight single note pads when chord is played */
:global(.note-pad.chord-highlight) {
  box-shadow: 0 0 20px hsla(280, 100%, 70%, 0.5);
  transform: scale(1.05);
}
</style>
```

### Step 6: Enhance Visual Feedback

**Update canvas visuals to respond to chords:**

```typescript
// In visual effects composable
const handleChordVisualization = (notes: string[]) => {
  // Blend colors of chord notes
  const chordColors = notes.map((note) => getNoteColor(note));
  const blendedColor = blendColors(chordColors);

  // Create chord-specific visual effect
  createChordBurst(blendedColor);
};
```

## ✅ Verification

1. **Chord Buttons Visible**: Four chord buttons (I, IV, V, vi) are visible on the main interface
2. **Chord Playback**: Pressing a chord button plays the correct notes simultaneously
3. **Visual Feedback**: Single note pads light up when corresponding chord is played
4. **Audio Quality**: Polyphonic playback is clean and musical
5. **Dynamic Chords**: Chord notes update correctly when key/scale changes
6. **Mobile Friendly**: Touch interaction works well on mobile devices
7. **Integration**: Feature doesn't interfere with existing single-note functionality

## 📦 Completion

This feature is complete when chord buttons are fully integrated into the palette interface, provide musical chord functionality, and enhance the user's ability to explore harmony while maintaining the app's core simplicity and intuitiveness.
