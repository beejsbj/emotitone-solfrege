# Feature: System Boundary Clarification

## 🎯 Goal

Formally establish and enforce clear boundaries between the **Melody System** and the **Sequencer System**. This architectural refinement will clarify data flow, reduce coupling, and make both systems easier to understand, maintain, and extend.

## 📋 Background

The responsibilities of the Melody and Sequencer systems are currently intermingled. It's not always clear what system is responsible for data (the "what" to play) versus playback (the "how" and "when" to play it), leading to potential code duplication and confusion.

## 🔧 Implementation Steps

### Step 1: Define System Responsibilities

**Create `src/docs/system-architecture.md`:**

```markdown
# System Architecture: Melody vs Sequencer

## System Boundaries

### Melody System (The "What" - Data & Composition)

**Core Responsibility:** Single source of truth for musical compositions and patterns

**Handles:**

- Creating, saving, and loading melodies
- Managing library of predefined musical patterns
- Generating new melodies from user input or algorithms
- Pattern analysis and emotional character mapping
- Music theory calculations (scales, chords, progressions)

**Key Artifacts:**

- `Melody` data structures
- `Pattern` data structures
- `NoteSequence` data structures
- Music theory services

**Does NOT handle:**

- Timing or tempo
- Audio playback scheduling
- Transport controls (play/pause/stop)
- BPM or swing settings
- Direct Tone.js interactions

### Sequencer System (The "How" - Playback & Timing)

**Core Responsibility:** Interpret musical data and schedule it for audio playback

**Handles:**

- Looping melodies or patterns
- Managing playback state (play, stop, pause)
- Transport details (BPM, swing, timing)
- Audio scheduling and synchronization
- Direct AudioService/Tone.js interaction

**Does NOT handle:**

- Creating or storing musical patterns
- Music theory calculations
- Melody generation algorithms
- Long-term pattern storage
```

### Step 2: Create System Service Interfaces

**Create `src/services/melody/MelodySystem.ts`:**

```typescript
export interface MelodyData {
  id: string;
  name: string;
  notes: NoteEvent[];
  key: string;
  scale: string;
  tempo?: number; // Suggested tempo only
  metadata: {
    createdAt: number;
    emotionalCharacter?: string;
    tags: string[];
  };
}

export interface NoteEvent {
  note: string;
  startTime: number; // Relative time in beats
  duration: number; // Duration in beats
  velocity: number;
}

export class MelodySystem {
  async createMelody(
    notes: NoteEvent[],
    metadata: Partial<MelodyData["metadata"]>
  ): Promise<MelodyData> {
    // Create melody data structure
    return {
      id: this.generateId(),
      name: metadata.name || "Untitled Melody",
      notes,
      key: "C",
      scale: "major",
      metadata: {
        createdAt: Date.now(),
        tags: [],
        ...metadata,
      },
    };
  }

  async saveMelody(melody: MelodyData): Promise<void> {
    // Save to storage (localStorage, IndexedDB, etc.)
  }

  async loadMelody(id: string): Promise<MelodyData | null> {
    // Load from storage
  }

  async generateMelody(options: GenerationOptions): Promise<MelodyData> {
    // Use melody generation algorithms
  }

  analyzePattern(melody: MelodyData): PatternAnalysis {
    // Analyze melodic patterns, emotional character, etc.
  }

  private generateId(): string {
    return `melody_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**Create `src/services/sequencer/SequencerSystem.ts`:**

```typescript
import type { MelodyData } from "../melody/MelodySystem";

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentBeat: number;
  bpm: number;
  swing: number;
  loop: boolean;
}

export class SequencerSystem {
  private playbackState: PlaybackState = {
    isPlaying: false,
    isPaused: false,
    currentBeat: 0,
    bpm: 120,
    swing: 0,
    loop: true,
  };

  private currentMelody: MelodyData | null = null;
  private audioService: AudioService;

  constructor(audioService: AudioService) {
    this.audioService = audioService;
  }

  loadMelody(melody: MelodyData): void {
    this.currentMelody = melody;
    this.stop(); // Reset playback state

    // Apply suggested tempo if available
    if (melody.tempo) {
      this.setBPM(melody.tempo);
    }
  }

  play(): void {
    if (!this.currentMelody) return;

    this.playbackState.isPlaying = true;
    this.playbackState.isPaused = false;

    // Start Tone.js transport
    this.scheduleNotes();
    Tone.Transport.start();
  }

  pause(): void {
    this.playbackState.isPaused = true;
    this.playbackState.isPlaying = false;
    Tone.Transport.pause();
  }

  stop(): void {
    this.playbackState.isPlaying = false;
    this.playbackState.isPaused = false;
    this.playbackState.currentBeat = 0;
    Tone.Transport.stop();
    Tone.Transport.cancel(); // Clear scheduled events
  }

  setBPM(bpm: number): void {
    this.playbackState.bpm = bpm;
    Tone.Transport.bpm.value = bpm;
  }

  setLoop(loop: boolean): void {
    this.playbackState.loop = loop;
  }

  private scheduleNotes(): void {
    if (!this.currentMelody) return;

    this.currentMelody.notes.forEach((noteEvent) => {
      Tone.Transport.schedule((time) => {
        this.audioService.playNote(noteEvent.note, time, noteEvent.duration);
      }, noteEvent.startTime);
    });
  }

  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }
}
```

### Step 3: Establish Data Flow Interface

**Create `src/services/MusicCoordinator.ts`:**

```typescript
import { MelodySystem, type MelodyData } from "./melody/MelodySystem";
import { SequencerSystem } from "./sequencer/SequencerSystem";

/**
 * Coordinates between Melody and Sequencer systems
 * Enforces the unidirectional data flow: Melody → Sequencer
 */
export class MusicCoordinator {
  private melodySystem: MelodySystem;
  private sequencerSystem: SequencerSystem;

  constructor(audioService: AudioService) {
    this.melodySystem = new MelodySystem();
    this.sequencerSystem = new SequencerSystem(audioService);
  }

  // Melody System Interface
  async createMelody(notes: NoteEvent[], metadata?: any): Promise<MelodyData> {
    return this.melodySystem.createMelody(notes, metadata);
  }

  async saveMelody(melody: MelodyData): Promise<void> {
    return this.melodySystem.saveMelody(melody);
  }

  async loadMelody(id: string): Promise<MelodyData | null> {
    return this.melodySystem.loadMelody(id);
  }

  // Sequencer System Interface
  playMelody(melody: MelodyData): void {
    // Unidirectional flow: Melody data flows TO sequencer
    this.sequencerSystem.loadMelody(melody);
    this.sequencerSystem.play();
  }

  pausePlayback(): void {
    this.sequencerSystem.pause();
  }

  stopPlayback(): void {
    this.sequencerSystem.stop();
  }

  setBPM(bpm: number): void {
    this.sequencerSystem.setBPM(bpm);
  }

  // Combined Operations
  async createAndPlay(notes: NoteEvent[], metadata?: any): Promise<void> {
    const melody = await this.createMelody(notes, metadata);
    this.playMelody(melody);
  }

  async loadAndPlay(melodyId: string): Promise<boolean> {
    const melody = await this.loadMelody(melodyId);
    if (melody) {
      this.playMelody(melody);
      return true;
    }
    return false;
  }
}
```

### Step 4: Update Store Architecture

**Refactor `src/stores/music.ts` to focus on melody:**

```typescript
export const useMusicStore = defineStore("music", () => {
  // Melody-focused state
  const currentMelody = ref<MelodyData | null>(null);
  const savedMelodies = ref<MelodyData[]>([]);
  const currentKey = ref("C");
  const currentScale = ref("major");

  // Actions for melody management only
  const setCurrentMelody = (melody: MelodyData) => {
    currentMelody.value = melody;
  };

  const addSavedMelody = (melody: MelodyData) => {
    savedMelodies.value.push(melody);
  };

  // Remove sequencer-specific logic
  // No BPM, playback state, or transport controls here

  return {
    currentMelody,
    savedMelodies,
    currentKey,
    currentScale,
    setCurrentMelody,
    addSavedMelody,
  };
});
```

**Refactor `src/stores/sequencer.ts` to focus on playback:**

```typescript
export const useSequencerStore = defineStore("sequencer", () => {
  // Playback-focused state only
  const isPlaying = ref(false);
  const isPaused = ref(false);
  const currentBeat = ref(0);
  const bpm = ref(120);
  const loop = ref(true);

  // Transport controls only
  const play = () => {
    isPlaying.value = true;
  };
  const pause = () => {
    isPaused.value = true;
  };
  const stop = () => {
    isPlaying.value = false;
    isPaused.value = false;
    currentBeat.value = 0;
  };

  // Remove melody creation/storage logic
  // No melody data, pattern storage, or music theory here

  return {
    isPlaying,
    isPaused,
    currentBeat,
    bpm,
    loop,
    play,
    pause,
    stop,
  };
});
```

### Step 5: Update Component Architecture

**Refactor components to use proper system boundaries:**

```vue
<!-- MelodyCreator.vue - Only talks to Melody System -->
<script setup lang="ts">
import { useMusicCoordinator } from "@/composables/useMusicCoordinator";

const coordinator = useMusicCoordinator();

const createNewMelody = async (notes: NoteEvent[]) => {
  const melody = await coordinator.createMelody(notes, {
    emotionalCharacter: "joyful",
    tags: ["original", "user-created"],
  });

  // Save the melody
  await coordinator.saveMelody(melody);
};
</script>

<!-- PlaybackControls.vue - Only talks to Sequencer System -->
<script setup lang="ts">
import { useMusicCoordinator } from '@/composables/useMusicCoordinator';
import { useSequencerStore } from '@/stores/sequencer';

const coordinator = useMusicCoordinator();
const sequencerStore = useSequencerStore();

const playCurrentMelody = () => {
  const melody = /* get current melody */;
  coordinator.playMelody(melody);
};

const pausePlayback = () => {
  coordinator.pausePlayback();
};
</script>
```

## ✅ Verification

1. **Clear Boundaries**: Melody System contains no timing/playback logic
2. **Sequencer Focus**: Sequencer System contains no melody creation logic
3. **Unidirectional Flow**: Data flows from Melody → Sequencer, never reverse
4. **Documentation**: System responsibilities are clearly documented
5. **Component Separation**: UI components talk to appropriate systems
6. **Functionality Preserved**: All existing features work identically
7. **Maintainability**: Systems can be developed independently

## 📦 Completion

This feature is complete when the Melody and Sequencer systems have clear, enforced boundaries, follow unidirectional data flow, and are properly documented. The result should be a more maintainable and understandable architecture that makes future development easier.
