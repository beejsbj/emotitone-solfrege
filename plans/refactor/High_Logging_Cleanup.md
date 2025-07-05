# High Priority: Logging Cleanup

## 🎯 Goal

Systematically remove all raw `console.*` statements from the codebase and replace them with our structured, production-safe `logger` utility. This will improve performance in production by eliminating unnecessary console output and provide a consistent logging strategy.

## 📋 Background

The codebase currently has dozens of `console.log`, `console.warn`, and `console.error` statements scattered across at least 22 files. A `logger` utility already exists at `src/utils/logger.ts`, which intelligently handles logging for development and production environments.

This task is completely independent of all other refactoring phases and can be done in any order.

## 🔧 Implementation Steps

### Step 1: Import the Logger Utility

In every file where you replace a `console.*` statement, ensure the logger utility is imported:

```typescript
import { logger, performanceLogger } from "@/utils/logger";
```

- Use `logger` for general-purpose logging
- Use `performanceLogger` for logs inside high-frequency functions or loops

### Step 2: Replace Console Statements

Replace according to these rules:

- `console.log(...)` → `logger.dev(...)`
- `console.warn(...)` → `logger.warn(...)`
- `console.error(...)` → `logger.error(...)` (Errors should always be logged)
- `console.info(...)` → `logger.dev(...)`
- `console.debug(...)` → `logger.dev(...)`
- `console.trace(...)` → `logger.dev(...)`

For frequently-called functions (animation loops), use:

- `console.log(...)` → `performanceLogger.throttled.dev(...)`

### Step 3: Target Files

These files were previously identified as containing console statements:

```
src/components/AudioInitializer.vue
src/components/AutoDebugPanel.vue
src/components/MelodyLibrary.vue
src/components/SequencerControls.vue
src/components/sequencer/controls/SequencerPlayback.vue
src/composables/canvas/useBlobRenderer.ts
src/composables/palette/useAnimation.ts
src/composables/palette/useInteraction.ts
src/composables/useAppLoading.ts
src/composables/sequencer/useSequencerTransport.ts
src/services/audio.ts
src/stores/instrument.ts
src/stores/music.ts
src/stores/sequencer.ts
src/App.vue
src/components/KeySelector.vue
src/components/LoadingSplash.vue
src/components/UnifiedVisualEffects.vue
src/composables/useSolfegeInteraction.ts
src/main.ts
```

## ✅ Verification

1. **Global Search**: Run `grep -r "console\." src/` - no results should be found except in `src/utils/logger.ts`
2. **Type Check**: Run `npm run type-check` to ensure all imports are correct
3. **Build**: Run `npm run build` to confirm successful compilation
4. **Runtime Check**: Verify logs appear in development but not in production builds

## 📦 Completion

This phase is complete when all console statements are replaced with logger calls and verification steps pass.
