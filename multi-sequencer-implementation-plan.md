# Multi-Sequencer Implementation Plan

## 🎯 **Overview**

Transform the single sequencer into a multi-sequencer system where each sequencer can have its own instrument and octave, while maintaining synchronized playback and the existing solfege-based learning approach.

### **Music Theory Considerations**

Different instruments and octaves can have different modes in the same song (common in modal jazz, contemporary classical). However, for solfege learning consistency, all sequencers will share the same key/mode while allowing different instruments and octaves for timbral variety and harmonic layering.

---

## 📋 **Phase 1: Type System & Data Structure** ✅

### ~~1.1 New Type Definitions (`src/types/music.ts`)~~

```typescript
// Individual sequencer instance
export interface SequencerInstance {
  id: string;
  name: string;
  instrument: string; // Maps to instrumentStore instruments
  octave: number;
  beats: SequencerBeat[];
  isPlaying: boolean;
  currentStep: number;
  isMuted: boolean;
  volume: number; // 0-1
  icon: string; // Icon identifier for visual distinction
  color?: string; // Optional user-selected color from predefined palette
}

// Multi-sequencer configuration
export interface MultiSequencerConfig {
  tempo: number;
  steps: number;
  rings: number;
  globalIsPlaying: boolean;
  activeSequencerId: string | null;
}

// Updated project save format for multi-sequencer
export interface MultiSequencerProject {
  id: string;
  name: string;
  description: string;
  emotion: string;
  sequencers: SequencerInstance[];
  config: MultiSequencerConfig;
  createdAt: Date;
  modifiedAt: Date;
}

// Predefined color palette for sequencer customization
export interface SequencerColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}
```

### ~~1.2 Constants & Data~~

```typescript
// Predefined icons for sequencers (using Lucide icons)
export const SEQUENCER_ICONS = [
  "music",
  "piano",
  "guitar",
  "violin",
  "drums",
  "trumpet",
  "microphone",
  "headphones",
  "radio",
  "speaker",
  "heart",
  "star",
] as const;

// Predefined color palette options
export const SEQUENCER_COLOR_PALETTES: SequencerColorPalette[] = [
  {
    id: "blue",
    name: "Ocean",
    primary: "#3B82F6",
    secondary: "#1E40AF",
    accent: "#60A5FA",
  },
  {
    id: "green",
    name: "Forest",
    primary: "#10B981",
    secondary: "#047857",
    accent: "#34D399",
  },
  {
    id: "purple",
    name: "Cosmic",
    primary: "#8B5CF6",
    secondary: "#5B21B6",
    accent: "#A78BFA",
  },
  {
    id: "red",
    name: "Fire",
    primary: "#EF4444",
    secondary: "#B91C1C",
    accent: "#F87171",
  },
  {
    id: "yellow",
    name: "Sun",
    primary: "#F59E0B",
    secondary: "#D97706",
    accent: "#FBBF24",
  },
  {
    id: "pink",
    name: "Bloom",
    primary: "#EC4899",
    secondary: "#BE185D",
    accent: "#F472B6",
  },
];
```

---

## 📋 **Phase 2: Store Refactoring** ✅

### ~~2.1 Multi-Sequencer Store Architecture (`src/stores/multiSequencer.ts`)~~

```typescript
export const useMultiSequencerStore = defineStore("multiSequencer", () => {
  // Global state
  const sequencers = ref<SequencerInstance[]>([]);
  const config = ref<MultiSequencerConfig>({
    tempo: 120,
    steps: 16,
    rings: 7,
    globalIsPlaying: false,
    activeSequencerId: null,
  });

  // Computed
  const activeSequencer = computed(
    () =>
      sequencers.value.find((s) => s.id === config.value.activeSequencerId) ||
      null
  );

  const playingSequencers = computed(() =>
    sequencers.value.filter((s) => s.isPlaying)
  );

  // Sequencer management
  const createSequencer = (name?: string, instrument?: string) => {
    const newSequencer: SequencerInstance = {
      id: `seq-${Date.now()}-${Math.random()}`,
      name: name || `Sequencer ${sequencers.value.length + 1}`,
      instrument: instrument || "synth", // Default to current global instrument
      octave: 4, // Default octave
      beats: [],
      isPlaying: false,
      currentStep: 0,
      isMuted: false,
      volume: 1,
      icon: SEQUENCER_ICONS[sequencers.value.length % SEQUENCER_ICONS.length],
      color: undefined, // User can set later
    };

    sequencers.value.push(newSequencer);
    config.value.activeSequencerId = newSequencer.id;
    return newSequencer;
  };

  const deleteSequencer = (id: string) => {
    const index = sequencers.value.findIndex((s) => s.id === id);
    if (index > -1) {
      sequencers.value.splice(index, 1);
      // Update active sequencer if needed
      if (config.value.activeSequencerId === id) {
        config.value.activeSequencerId = sequencers.value[0]?.id || null;
      }
    }
  };

  const updateSequencer = (id: string, updates: Partial<SequencerInstance>) => {
    const index = sequencers.value.findIndex((s) => s.id === id);
    if (index > -1) {
      sequencers.value[index] = { ...sequencers.value[index], ...updates };
    }
  };

  // Beat management for specific sequencer
  const addBeatToSequencer = (sequencerId: string, beat: SequencerBeat) => {
    const sequencer = sequencers.value.find((s) => s.id === sequencerId);
    if (sequencer) {
      sequencer.beats.push(beat);
    }
  };

  // Global playback coordination
  const startAllSequencers = async () => {
    config.value.globalIsPlaying = true;
    sequencers.value.forEach((seq) => {
      if (!seq.isMuted) {
        seq.isPlaying = true;
        seq.currentStep = 0;
      }
    });
  };

  const stopAllSequencers = () => {
    config.value.globalIsPlaying = false;
    sequencers.value.forEach((seq) => {
      seq.isPlaying = false;
      seq.currentStep = 0;
    });
  };

  // Individual sequencer playback
  const startSequencer = (id: string) => {
    const sequencer = sequencers.value.find((s) => s.id === id);
    if (sequencer && !sequencer.isMuted) {
      sequencer.isPlaying = true;
      sequencer.currentStep = 0;
    }
  };

  const stopSequencer = (id: string) => {
    const sequencer = sequencers.value.find((s) => s.id === id);
    if (sequencer) {
      sequencer.isPlaying = false;
      sequencer.currentStep = 0;
    }
  };

  return {
    // State
    sequencers: computed(() => sequencers.value),
    config: computed(() => config.value),

    // Computed
    activeSequencer,
    playingSequencers,

    // Management
    createSequencer,
    deleteSequencer,
    updateSequencer,
    addBeatToSequencer,

    // Playback
    startAllSequencers,
    stopAllSequencers,
    startSequencer,
    stopSequencer,
  };
});
```

### ~~2.2 Migration Strategy~~

1. ~~**Parallel Implementation**: Keep existing `useSequencerStore` for backward compatibility~~
2. ~~**Migration Utility**: Create function to convert single sequencer data to multi-sequencer format~~
3. **Gradual Deprecation**: Phase out old store over time

---

## 📋 **Phase 3: Component Architecture** ✅ (Mostly Complete)

### ~~3.1 New Component Structure~~

```
App.vue
└── SequencerSection.vue (New wrapper)
    ├── SequencerControls.vue (Updated - Global controls)
    ├── TabsComponent.vue (New - Reusable tabs)
    ├── SequencerInstanceControls.vue (New - Per-sequencer controls)
    └── CircularSequencer.vue (Updated - Instance-aware)
```

### ~~3.2 TabsComponent.vue (New Reusable Component)~~

**Features:**

- Generic tab system for reuse across app
- Mobile-optimized horizontal scrolling
- Customizable tab content
- Active state management

**Props:**

```typescript
interface Tab {
  id: string;
  label: string;
  icon?: string;
  badge?: string;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  variant?: "default" | "pills" | "underline";
}
```

### ~~3.3 SequencerInstanceControls.vue (New Component)~~

**Features:**

- Individual play/stop button with visual state
- Instrument selector (dropdown from instrumentStore)
- Octave control (3-5 range)
- Volume slider and mute toggle
- Sequencer settings (name, icon, color)
- Delete sequencer option

**Layout:**

```
[🎵 Icon] [Name Input] [🎹 Instrument ▼] [Oct: 4] [🔊 Vol] [⚙️]
[▶️ Play] [Individual controls row]
```

### ~~3.4 Updated SequencerControls.vue~~

**Changes:**

- Remove global octave control (now per-sequencer)
- Update play button to "Play All" / "Stop All"
- Add "Add Sequencer" button with icon/name prompt
- Keep global tempo control
- Keep melody library (loads into active sequencer)

**New Layout:**

```
[🎵 Add Sequencer] [▶️ Play All | ⏹️ Stop All] [Tempo: 120] [💾 Melody Library]
```

### ~~3.5 Updated CircularSequencer.vue~~

**Changes:**

- Accept `sequencerId` prop
- Use sequencer-specific beats from multiSequencerStore
- Update all beat operations to target specific sequencer
- Visual indication of which sequencer is active

---

## 📋 **Phase 4: Transport Coordination** ✅

### ~~4.1 Enhanced Transport System (`src/utils/multiSequencer.ts`)~~

```typescript
class MultiSequencerTransport {
  private sequencerTransports: Map<string, SequencerTransport> = new Map();
  private masterTransport: Tone.Transport;

  constructor() {
    this.masterTransport = Tone.getTransport();
  }

  // Synchronized playback - all sequencers follow same master clock
  async startAll(sequencers: SequencerInstance[], globalTempo: number) {
    this.masterTransport.bpm.value = globalTempo;

    // Create/update individual transports for each active sequencer
    for (const sequencer of sequencers) {
      if (sequencer.isPlaying && !sequencer.isMuted) {
        await this.initSequencerTransport(sequencer);
      }
    }

    this.masterTransport.start();
  }

  async startSequencer(sequencerId: string, sequencer: SequencerInstance) {
    if (!sequencer.isMuted) {
      await this.initSequencerTransport(sequencer);
      if (!this.masterTransport.state === "started") {
        this.masterTransport.start();
      }
    }
  }

  private async initSequencerTransport(sequencer: SequencerInstance) {
    const transport = new SequencerTransport();

    // Initialize with sequencer-specific instrument and octave
    transport.initWithReactiveLoop(
      () => sequencer.beats,
      16, // steps
      this.masterTransport.bpm.value,
      (beat, time) => {
        // Play note with sequencer's specific instrument and octave
        this.playSequencerNote(sequencer, beat, time);
      },
      (step, time) => {
        sequencer.currentStep = step;
      }
    );

    this.sequencerTransports.set(sequencer.id, transport);
    await transport.start();
  }

  private playSequencerNote(
    sequencer: SequencerInstance,
    beat: SequencerBeat,
    time: number
  ) {
    const musicStore = useMusicStore();
    const instrumentStore = useInstrumentStore();

    // Temporarily switch to sequencer's instrument for this note
    const currentInstrument = instrumentStore.currentInstrument;
    instrumentStore.setInstrument(sequencer.instrument);

    // Play note with sequencer's octave and volume
    const noteDuration = calculateNoteDuration(
      beat.duration,
      16,
      this.masterTransport.bpm.value
    );
    musicStore.playNoteWithDuration(
      beat.solfegeIndex,
      sequencer.octave, // Use sequencer's octave
      noteDuration.toneNotation,
      time
    );

    // Restore original instrument
    instrumentStore.setInstrument(currentInstrument);
  }

  stopAll() {
    this.sequencerTransports.forEach((transport) => transport.stop());
    this.sequencerTransports.clear();
    this.masterTransport.stop();
    this.masterTransport.cancel();
  }

  stopSequencer(sequencerId: string) {
    const transport = this.sequencerTransports.get(sequencerId);
    if (transport) {
      transport.stop();
      this.sequencerTransports.delete(sequencerId);
    }
  }
}
```

---

## 📋 **Phase 5: UI/UX Design** 🚧 (In Progress)

### 5.1 Mobile-First Tab Design

**Tab Indicator Content:**

```
[🎵 Icon] [Name] [Oct:4]
```

**Tab States:**

- **Active**: Highlighted background, bold text
- **Playing**: Pulse animation, play indicator (🔊)
- **Muted**: Muted indicator (🔇), grayed out
- **Inactive**: Default styling

### 5.2 Sequencer Management UI

**Add Sequencer Flow:**

1. User taps "➕ Add Sequencer" button
2. Quick setup modal appears:
   - Name input (default: "Sequencer X")
   - Icon picker (grid of available icons)
   - Instrument selector (inherits global by default)
   - Optional color picker
3. Sequencer created and becomes active

**Sequencer Settings (Gear icon):**

- Rename sequencer
- Change icon
- Select color from palette
- Delete sequencer (with confirmation)

### 5.3 Visual Distinction Strategy

**Primary**: Icons (🎵, 🎹, 🎻, 🎺, etc.)
**Secondary**: User-selectable colors from predefined palette
**Tertiary**: Tab styling and animations

---

## 📋 **Phase 6: Implementation Order** ✅

### **Step 1: Foundation** ⚡ ~~(No UI changes yet)~~

1. ✅ ~~Add new types to `src/types/music.ts`~~
2. ✅ ~~Create reusable `TabsComponent.vue`~~
3. ✅ ~~Create `useMultiSequencerStore` (parallel to existing)~~
4. ✅ ~~Add migration utilities~~
5. ✅ ~~Update `CircularSequencer.vue` to accept sequencer ID prop~~

### **Step 2: Basic Multi-Sequencer** 🎯

1. ✅ ~~Create `SequencerInstanceControls.vue`~~
2. ✅ ~~Refactor `SequencerControls.vue` to use new store~~
3. ✅ ~~Add tab navigation with icon/name/octave display~~
4. ✅ ~~Remove global octave control~~
5. ✅ ~~Add "Add Sequencer" functionality with quick setup~~

### **Step 3: Individual Controls** 🎛️

1. ✅ ~~Implement per-sequencer instrument selection~~
2. ✅ ~~Add individual octave controls (3-5 range)~~
3. ✅ ~~Individual play/stop buttons with visual feedback~~
4. ✅ ~~Volume/mute controls per sequencer~~
5. ✅ ~~Basic sequencer management (rename, delete)~~

### **Step 4: Coordinated Playback** 🎵

1. ✅ ~~Implement `MultiSequencerTransport` class~~
2. ✅ ~~Master "Play All" / "Stop All" functionality~~
3. ✅ ~~Synchronized timing across all sequencers~~
4. ✅ ~~Per-sequencer instrument switching during playback~~
5. ✅ ~~Audio mixing and volume control~~

### **Step 5: Enhanced UX** ✨

1. 🚧 Icon picker for sequencer customization (TODO: Settings modal)
2. 🚧 Color palette selection system (TODO: Settings modal)
3. ✅ ~~Sequencer duplication feature~~
4. ✅ ~~Improved tab animations and states~~
5. ✅ ~~Haptic feedback for multi-sequencer actions~~

### **Step 6: Persistence & Polish** 💾

1. 🚧 Multi-sequencer project save/load system (TODO)
2. ✅ ~~Migration from old single-sequencer format~~
3. ✅ ~~Performance optimization for multiple sequencers~~
4. ✅ ~~Memory management and cleanup~~
5. ✅ ~~Final UI polish and animations~~

---

## 📋 **Implementation Summary** 🎉

### **What's Complete:**

- ✅ **Full multi-sequencer architecture** with independent tracks
- ✅ **Per-sequencer instruments and octaves** for rich orchestration
- ✅ **Synchronized playback system** with master transport coordination
- ✅ **Mobile-first tab navigation** with visual indicators
- ✅ **Individual sequencer controls** (play, mute, volume, instrument, octave)
- ✅ **Global controls** (tempo, play all/stop all)
- ✅ **Melody library integration** loads patterns into active sequencer
- ✅ **Reactive updates** during playback for live editing
- ✅ **Clean component architecture** with proper separation of concerns

### **What's TODO:**

- 🚧 **Settings Modal**: Icon picker, color selection, renaming
- 🚧 **Pattern Preview**: Play patterns before loading
- 🚧 **Project Save/Load**: Save multi-sequencer projects
- 🚧 **Confirmation Dialogs**: For delete and other destructive actions
- 🚧 **Advanced Features**: Copy/paste between sequencers, pattern recording

### **Key Technical Achievements:**

1. **Non-Breaking Migration**: Old single-sequencer data automatically converts
2. **Performance Optimized**: Efficient transport management and reactive updates
3. **Mobile-First Design**: Touch-friendly controls and responsive layouts
4. **Educational Focus Maintained**: Solfege learning remains primary with enhanced capabilities
5. **Clean Architecture**: Modular components and clear separation of concerns

The multi-sequencer system is now **fully functional and integrated** into the app! 🎵✨
