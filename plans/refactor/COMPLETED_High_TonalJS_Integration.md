# High Priority: TonalJS Integration

## 🎯 Goal

Restore the advanced music theory capabilities powered by the Tonal.js library. This involves adding the `@tonaljs/tonal` dependency and restoring several key files from the previous refactoring effort that were lost in the merge.

This phase is designed to be **purely additive** - adding new files and services without modifying existing UI components.

## 📋 Background

The lost refactoring replaced manual, error-prone music theory calculations with the industry-standard Tonal.js library. This enabled chord detection, key analysis, and advanced pattern analysis. All this work was lost and must be restored.

## 🔧 Implementation Steps

### Step 1: Add Dependency

```bash
npm install @tonaljs/tonal
```

### Step 2: Restore Core Music Theory Files

Execute these commands from the project root to recover lost files:

```bash
# Restore the Advanced Music Theory Service
git show origin/refactor:src/services/music.ts > src/services/musicTheory.ts

# Restore Enhanced Music Patterns
git show origin/refactor:src/data/patterns.ts > src/data/patternsEnhanced.ts

# Restore Tonal.js-powered Notes Data
git show origin/refactor:src/data/notes.ts > src/data/notesEnhanced.ts

# Restore Music-Related Types (for manual merge)
git show origin/refactor:src/types/music.ts > /tmp/music-types-enhanced.ts
```

### Step 3: Merge Enhanced Types

1. Open `/tmp/music-types-enhanced.ts` and `src/types/music.ts`
2. Copy advanced interface definitions (e.g., `TonalAnalysis`, `MusicAnalysis`) from temp file
3. Add them to the existing `music.ts` type file
4. Ensure no existing types are overwritten

### Step 4: Create Unified Music Service

To avoid breaking the existing sequencer, create a unified service:

```typescript
// src/services/musicUnified.ts
import * as simpleMusic from "./music";
import * as advancedMusic from "./musicTheory";

export const musicService = {
  ...simpleMusic,
  ...advancedMusic,
};
```

### Step 5: Verify Melody Generator

Check that `src/utils/melodyGenerator.ts` exists and is exported from `src/utils/index.ts`.

## ✅ Verification

1. **Dependency Check**: `npm list @tonaljs/tonal` should show the installed version
2. **File Existence**: Verify `musicTheory.ts`, `patternsEnhanced.ts`, and `notesEnhanced.ts` exist
3. **Type Check**: Run `npm run type-check` - this must pass
4. **Build**: Run `npm run build` to ensure successful compilation

## 📦 Completion

This phase is complete when all TonalJS files are restored, types are merged, and verification steps pass.
