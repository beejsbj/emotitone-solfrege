# Pattern System V2 Architecture

## Overview

The Pattern System V2 is a complete rebuild designed to eliminate duplication, streamline the architecture, and provide a clean separation of concerns. The system automatically records musical interactions and groups them into patterns for display and analysis.

## Core Principles

1. **Single Source of Truth**: One engine owns all pattern logic
2. **Reactive UI**: Store provides reactive wrappers over engine state
3. **Clean Separation**: Recording, Storage, Display, and Notation are separate concerns
4. **Immediate Feedback**: Patterns appear instantly as notes are played
5. **Persistent History**: 24-hour rolling history with saved pattern preservation

## Architecture Components

### 1. PatternEngine (Core Service)

**File**: `src/services/PatternEngine.ts`

The central engine that owns all pattern logic:

```typescript
class PatternEngine {
  // Core State
  private history: HistoryNote[] = [];
  private patterns: Map<string, Pattern> = new Map();
  private sessions: Map<string, PatternSession> = new Map();

  // Recording
  recordNote(noteData: NoteRecordingData): HistoryNote;
  updateNoteRelease(noteId: string, releaseTime: number): void;
  removeLastNote(): HistoryNote | null; // NEW: Backspace functionality

  // Pattern Management
  getPatterns(options?: PatternSearchOptions): Pattern[];
  savePattern(patternId: string, metadata?: PatternMetadata): boolean;
  deletePattern(patternId: string): boolean;

  // Session Management
  startNewSession(context?: SessionContext): string;
  getCurrentSession(): PatternSession | null;

  // Persistence
  exportData(): PatternEngineData;
  importData(data: PatternEngineData): void;

  // Lifecycle
  purgeOldData(): { patternsRemoved: number; notesRemoved: number };
}
```

**Key Features**:

- Owns all HistoryNote recording and Pattern generation
- Handles real-time pattern grouping (silence gaps, context changes)
- Manages default patterns, saved patterns, and auto-detected patterns
- Provides persistence and migration support
- Emits events for reactive updates

### 2. Patterns Store (Reactive Wrapper)

**File**: `src/stores/patterns.ts`

Thin Pinia store that provides reactive access to engine state:

```typescript
export const usePatternsStore = defineStore("patterns", () => {
  // Engine instance
  const engine = new PatternEngine();

  // Reactive computed properties
  const patterns = computed(() => engine.getPatterns());
  const currentPattern = computed(() => engine.getCurrentPattern());
  const savedPatterns = computed(() => engine.getPatterns({ isSaved: true }));
  const defaultPatterns = computed(() =>
    engine.getPatterns({ isDefault: true })
  );

  // Actions (delegate to engine)
  const recordNote = (data: NoteRecordingData) => engine.recordNote(data);
  const removeLastNote = () => engine.removeLastNote();
  const savePattern = (id: string, metadata?: PatternMetadata) =>
    engine.savePattern(id, metadata);

  return {
    // State
    patterns,
    currentPattern,
    savedPatterns,
    defaultPatterns,

    // Actions
    recordNote,
    removeLastNote,
    savePattern,
    // ... other delegated methods
  };
});
```

**Key Features**:

- Provides reactive Vue 3 computed properties
- Delegates all logic to PatternEngine
- Handles persistence triggers
- Maintains backward compatibility with existing API

### 3. Pattern Recording Composable

**File**: `src/composables/usePatternRecording.ts`

Handles integration with the audio system:

```typescript
export function usePatternRecording() {
  const patternsStore = usePatternsStore();

  // Event handlers for note-played/note-released
  function handleNotePlayedEvent(event: CustomEvent<NotePlayedEventDetail>) {
    const historyNote = patternsStore.recordNote({
      note: event.detail.noteName,
      key: getCurrentKey(),
      mode: getCurrentMode(),
      // ... other note data
    });
  }

  function handleNoteReleasedEvent(
    event: CustomEvent<NoteReleasedEventDetail>
  ) {
    patternsStore.updateNoteRelease(event.detail.noteId, Date.now());
  }

  return {
    // State
    isRecording,
    patterns: patternsStore.patterns,

    // Actions
    removeLastNote: patternsStore.removeLastNote,
    savePattern: patternsStore.savePattern,
  };
}
```

### 4. Bracket Notation Utilities

**File**: `src/utils/bracketNotation.ts`

Simplified notation generation with relative timing:

```typescript
export function patternToBracketNotation(
  pattern: Pattern,
  options: BracketNotationOptions = {}
): BracketNotationResult {
  // Convert absolute timestamps to relative timing
  const relativeNotes = normalizePatternTiming(pattern.notes);

  // Generate clean bracket notation
  return generateNotation(relativeNotes, options);
}

function normalizePatternTiming(notes: HistoryNote[]): RelativeNote[] {
  if (notes.length === 0) return [];

  const startTime = notes[0].pressTime;
  return notes.map((note) => ({
    ...note,
    relativeStart: (note.pressTime - startTime) / 1000,
    relativeDuration: (note.duration || 0) / 1000,
  }));
}
```

### 5. LiveStrip Component

**File**: `src/components/patterns/LiveStrip.vue`

Simplified UI component with essential features:

```vue
<template>
  <div class="live-strip">
    <div v-for="pattern in patterns" :key="pattern.id" class="pattern-card">
      <!-- Pattern metadata -->
      <div class="pattern-header">
        <span class="pattern-name">{{ getPatternName(pattern) }}</span>
        <div class="pattern-actions">
          <button @click="copyPattern(pattern)">Copy</button>
          <button v-if="pattern.isCurrent" @click="removeLastNote()">⌫</button>
        </div>
      </div>

      <!-- Safe notation rendering (no v-html) -->
      <div class="pattern-notation">
        <NotationRenderer :pattern="pattern" />
      </div>
    </div>
  </div>
</template>
```

**Key Features**:

- Safe notation rendering (no unsafe HTML)
- Backspace functionality for current pattern
- Copy to clipboard
- Clear visual distinction between default/saved/current patterns

## Data Flow

```
KeyboardKey.vue
    ↓ (note events)
usePatternRecording.ts
    ↓ (recordNote)
PatternsStore.ts
    ↓ (delegate)
PatternEngine.ts
    ↓ (reactive updates)
LiveStrip.vue
```

## Event System

### Custom Events

- `note-played`: Emitted by keyboard interactions
- `note-released`: Emitted when notes are released
- `pattern-created`: Emitted when new patterns are detected
- `pattern-saved`: Emitted when patterns are bookmarked

### Engine Events

The PatternEngine emits events for reactive updates:

- `patterns-changed`: When pattern list changes
- `history-changed`: When note history changes
- `session-started`: When new session begins

## Persistence Strategy

### localStorage Keys

- `emotitone-pattern-history`: Rolling 24-hour note history
- `emotitone-saved-patterns`: User-saved patterns (permanent)
- `emotitone-pattern-config`: Engine configuration
- `emotitone-pattern-sessions`: Session metadata

### Migration Support

```typescript
class PatternEngine {
  private migrateFromV1(): void {
    // Handle migration from old localStorage structure
    const oldHistory = localStorage.getItem("emotitone-history");
    const oldPatterns = localStorage.getItem("emotitone-patterns-service-data");

    if (oldHistory || oldPatterns) {
      // Migrate and clean up old keys
    }
  }
}
```

## Performance Considerations

1. **Debounced Persistence**: Save to localStorage max once per 2 seconds
2. **Pattern Grouping**: Real-time grouping with configurable silence threshold
3. **Memory Management**: Auto-purge old patterns and notes
4. **Reactive Efficiency**: Computed properties only recalculate when engine state changes

## Backward Compatibility

The V2 system maintains API compatibility with existing components:

- Store methods have same signatures
- Event names remain unchanged
- localStorage migration handles old data
- Component props and events unchanged

## Testing Strategy

1. **Unit Tests**: PatternEngine logic, notation generation
2. **Integration Tests**: Store + Engine interaction
3. **E2E Tests**: Full recording → display workflow
4. **Migration Tests**: V1 → V2 data migration

## Implementation Plan

1. ✅ Create architecture documentation
2. 🔄 Implement PatternEngine service
3. 🔄 Refactor PatternsStore to use engine
4. 🔄 Update recording composable
5. 🔄 Simplify LiveStrip component
6. 🔄 Normalize bracket notation
7. 🔄 Add backspace functionality
8. 🔄 Implement persistence and migration
9. 🔄 Clean up unused code
10. 🔄 Add comprehensive tests

## Benefits of V2

1. **Eliminated Duplication**: Single source of pattern logic
2. **Improved Performance**: Efficient reactive updates
3. **Better UX**: Immediate pattern display, backspace support
4. **Cleaner Code**: Clear separation of concerns
5. **Easier Testing**: Isolated, testable components
6. **Future-Proof**: Extensible architecture for new features
