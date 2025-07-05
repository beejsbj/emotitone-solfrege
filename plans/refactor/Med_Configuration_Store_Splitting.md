# Medium Priority: Configuration Store Splitting

## 🎯 Goal

Break down the monolithic 700-line `visualConfig.ts` store into smaller, focused configuration modules. This will improve maintainability, reduce complexity, and make the configuration system easier to understand and test.

## 📋 Background

The current `src/stores/visualConfig.ts` is a massive 700-line file with 200+ configuration fields. This violates the single responsibility principle and makes the configuration system difficult to maintain and understand.

## 🔧 Implementation Steps

### Step 1: Analyze Current Configuration Structure

1. **Study the existing store**: Examine `src/stores/visualConfig.ts`
2. **Identify logical groupings**: Look for natural divisions like:
   - Visual effects configuration
   - Audio-related configuration
   - Palette-specific configuration
   - Canvas/rendering configuration
   - UI behavior configuration

### Step 2: Create Focused Configuration Modules

Create separate configuration stores based on logical groupings:

```
src/stores/config/
├── useVisualsConfig.ts     # Visual effects config
├── useAudioConfig.ts       # Audio-related config
├── usePaletteConfig.ts     # Palette-specific config
├── useCanvasConfig.ts      # Canvas/rendering config
├── useUIConfig.ts          # UI behavior config
└── index.ts               # Aggregate store
```

**Example structure for `useVisualsConfig.ts`:**

```typescript
export const useVisualsConfig = defineStore("visualsConfig", () => {
  // Visual effects related state
  const particleCount = ref(100);
  const animationSpeed = ref(1.0);
  const glowIntensity = ref(0.8);

  // Visual effects actions
  const updateParticleCount = (count: number) => {
    particleCount.value = count;
  };

  return {
    particleCount,
    animationSpeed,
    glowIntensity,
    updateParticleCount,
  };
});
```

### Step 3: Create Aggregate Store

Create `src/stores/config/index.ts` that:

1. **Imports all focused stores**
2. **Provides unified interface**
3. **Maintains same API as original store**

```typescript
// src/stores/config/index.ts
export const useConfig = () => {
  const visualsConfig = useVisualsConfig();
  const audioConfig = useAudioConfig();
  const paletteConfig = usePaletteConfig();
  const canvasConfig = useCanvasConfig();
  const uiConfig = useUIConfig();

  return {
    ...visualsConfig,
    ...audioConfig,
    ...paletteConfig,
    ...canvasConfig,
    ...uiConfig,
  };
};
```

### Step 4: Maintain Backward Compatibility

1. **Keep original store temporarily**: Don't delete `visualConfig.ts` initially
2. **Create facade pattern**: Original store delegates to new modular stores
3. **Preserve API**: Ensure existing components work without changes

```typescript
// src/stores/visualConfig.ts (modified)
import { useConfig } from "./config";

export const useVisualConfig = defineStore("visualConfig", () => {
  const config = useConfig();

  // Delegate to the new modular stores
  return {
    ...config,
  };
});
```

### Step 5: Gradual Migration

1. **Test new stores**: Ensure all functionality works
2. **Update imports gradually**: Change components to use new stores
3. **Remove old store**: Once all components are updated

## ✅ Verification

1. **API Compatibility**: All existing components continue to work
2. **Functionality**: All configuration changes work correctly in UI
3. **Type Safety**: `npm run type-check` passes
4. **Build**: `npm run build` succeeds
5. **Performance**: No performance regression in configuration updates
6. **Store Structure**: Each store has single responsibility

## 📦 Completion

This phase is complete when the configuration system is split into logical modules, all functionality is preserved, and the system is more maintainable and testable.
