# Medium Priority: Music Logic Deduplication

## 🎯 Goal

Eliminate duplicate music theory calculations between `src/services/music.ts` and `src/stores/music.ts`. The service should contain pure functions for calculations, while the store should only manage state and delegate calculations to the service.

## 📋 Background

Currently, both the music service (187 lines) and music store (314 lines) contain overlapping music logic. Both handle scale calculations, note frequencies, and solfege mapping. This creates maintenance burden and potential inconsistencies.

## 🔧 Implementation Steps

### Step 1: Analyze Duplicate Logic

**Compare files to identify overlaps:**

- Scale calculations
- Note frequency calculations
- Solfege mapping
- Chord progressions
- Music theory computations

**Example duplicated logic:**

```typescript
// In both service and store
const calculateScaleNotes = (root: string, scaleType: string) => {
  // Same calculation logic exists in both files
};
```

### Step 2: Consolidate Logic in Service

**Make service the source of truth:**

- Keep all music theory calculations in `src/services/music.ts`
- Make service functions pure (no side effects or state)
- Enhance service with any missing calculations from store

**Example service structure:**

```typescript
// src/services/music.ts
export function calculateScaleNotes(root: string, scaleType: string): string[] {
  // Pure calculation logic
  return notes;
}

export function getChordProgression(
  key: string,
  progression: string[]
): string[][] {
  // Pure calculation logic
  return chords;
}

export function solfegeToFrequency(solfege: string, octave: number): number {
  // Pure calculation logic
  return frequency;
}
```

### Step 3: Refactor Store to Use Service

**Remove calculations from store:**

- Delete duplicate logic from `src/stores/music.ts`
- Import service functions
- Store methods should call service functions

**Example store refactoring:**

```typescript
// src/stores/music.ts
import { calculateScaleNotes, getChordProgression } from "@/services/music";

export const useMusicStore = defineStore("music", () => {
  // State only
  const currentKey = ref("C");
  const currentScale = ref("major");
  const currentNotes = ref<string[]>([]);

  // Actions that delegate to service
  const updateScale = (key: string, scale: string) => {
    currentKey.value = key;
    currentScale.value = scale;
    currentNotes.value = calculateScaleNotes(key, scale); // Use service
  };

  const getProgression = (progression: string[]) => {
    return getChordProgression(currentKey.value, progression); // Use service
  };

  return {
    currentKey,
    currentScale,
    currentNotes,
    updateScale,
    getProgression,
  };
});
```

### Step 4: Update Store Responsibilities

**Store should focus on:**

- Current scale/key state
- User preferences
- UI state
- Reactive data
- Caching computed values

**Store should NOT contain:**

- Music theory calculations
- Pure mathematical functions
- Complex algorithms

### Step 5: Maintain Store API

**Ensure backward compatibility:**

- Keep the same public methods
- Maintain the same return types
- Preserve reactive properties
- Test all existing usage

## ✅ Verification

1. **Functionality**: All music-related features work correctly
2. **Sequencer**: Verify sequencer functions properly (depends on music store)
3. **No Duplicates**: Music calculations only exist in service, not store
4. **Type Safety**: `npm run type-check` passes
5. **Build**: `npm run build` succeeds
6. **Performance**: No performance regression from refactoring

## 📦 Completion

This phase is complete when all music calculations are centralized in the service, the store only manages state, and all functionality is preserved with improved maintainability.
