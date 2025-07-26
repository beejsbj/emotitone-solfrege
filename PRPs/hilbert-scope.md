# PRP: Implement Hilbert Scope Visual Effect

## Executive Summary

This PRP implements a Hilbert Scope audio visualization into the EmotiTone Solfège unified visual effects system. The Hilbert Scope creates a circular, oscillating visualization that responds to audio amplitude and timbre in real-time, positioned in the top half of the screen. Unlike blobs which appear for each note, the Hilbert Scope is a single persistent visualization that reacts to all audio output.

## Context and Background

### Current State
- EmotiTone has a unified canvas system (`UnifiedVisualEffects.vue`) managing multiple visual effects
- Existing effects include: blobs (per-note), particles, strings, and ambient rendering
- Each effect has its own renderer module following a consistent pattern
- Visual configurations are managed through the `visualConfig` store with persistence
- The system uses Tone.js for audio generation and Web Audio API for analysis

### Reference Implementation
- Complete working example provided in `hilbert-scope-tone.html`
- Uses Web Audio API's AnalyserNode for frequency/time domain data
- Implements Hilbert transform using convolution filters
- Creates smooth, organic circular visualizations
- Includes amplitude-based coloring and trail effects

### Integration Requirements
- Must integrate as a new renderer in the unified canvas system
- Should follow the existing pattern of other renderers (blob, particle, string)
- Configuration must be added to visualConfig store
- Should work alongside existing effects without conflicts
- Position: top half of screen, centered

## Architecture Overview

### Implementation Blueprint

```typescript
// 1. Create new Hilbert Scope renderer module
src/composables/canvas/useHilbertScopeRenderer.ts
  - HilbertScope class (ported from reference)
  - HilbertAmplitude class (visualization logic)
  - Amplitude analyzer integration
  - Rendering functions following existing patterns

// 2. Add Hilbert configuration to visual types
src/types/visual.ts
  - HilbertScopeConfig interface with all config properties

// 3. Update visual config store and composable
src/composables/useVisualConfig.ts
  - Add default Hilbert config to DEFAULT_CONFIG
src/stores/visualConfig.ts
  - No changes needed (automatically handles new config sections)

// 4. Integrate into unified canvas system
src/composables/canvas/useUnifiedCanvas.ts
  - Import and initialize HilbertScopeRenderer
  - Add to renderFrame sequence
  - Connect to Tone.js audio context on initialization

// 5. Connect audio analysis
  - Use existing Tone.js context from audio service
  - Create Web Audio nodes for Hilbert transform
  - Connect to amplitude analysis
```

### Key Technical Details

1. **Hilbert Transform Implementation**
   - Uses Web Audio API ConvolverNode with custom impulse response
   - Hamming window for filter coefficients
   - Delay compensation for phase alignment

2. **Audio Connection**
   - Access Tone.js context via `Tone.context`
   - Create native Web Audio gain node for analysis
   - Connect to existing audio chain without disrupting playback

3. **Rendering Strategy**
   - Single persistent visualization (not per-note)
   - OnionSkin pattern for trail effects
   - Positioned in top center (50% x, 25% y)
   - Scales based on screen size with configurable min/max

4. **Performance Considerations**
   - Use existing animation loop from unified canvas
   - Leverage performance monitoring already in place
   - Clear old canvas data to prevent memory leaks

## Implementation Steps

### Phase 1: Core Hilbert Scope Module

1. Create `useHilbertScopeRenderer.ts`:
   - Port HilbertScope class with Web Audio processing
   - Port visualization classes (Hilbert, HilbertAmplitude)
   - Adapt to Vue composable pattern
   - Use existing color system for consistency

2. Key adaptations from reference:
   - Remove standalone canvas management (use unified system)
   - Integrate with existing animation lifecycle
   - Use TypeScript interfaces for type safety
   - Connect to EmotiTone's audio service instead of standalone Tone.js

### Phase 2: Configuration Integration

1. Add to `visual.ts` types:
```typescript
export interface HilbertScopeConfig {
  isEnabled: boolean;
  sizeRatio: number;      // Base size as ratio of screen
  minSize: number;        // Minimum size in pixels
  maxSize: number;        // Maximum size in pixels
  opacity: number;        // Base opacity (0-1)
  scaleInDuration: number;    // Scale in animation (seconds)
  scaleOutDuration: number;   // Scale out animation (seconds)
  driftSpeed: number;     // Drift speed in pixels/second
  glowEnabled: boolean;   // Enable glow effect
  glowIntensity: number;  // Glow blur radius
  history: number;        // Trail effect strength (0-1)
  lineWidth: number;      // Base line width
  colorMode: 'white' | 'amplitude';  // Color mode
}
```

2. Update `useVisualConfig.ts` DEFAULT_CONFIG:
```typescript
hilbertScope: {
  isEnabled: false,  // Start disabled to test integration
  sizeRatio: 0.3,    // 30% of screen
  minSize: 150,
  maxSize: 400,
  opacity: 0.7,
  scaleInDuration: 0.5,
  scaleOutDuration: 0.5,
  driftSpeed: 5,
  glowEnabled: true,
  glowIntensity: 10,
  history: 0.85,     // Trail strength
  lineWidth: 3,
  colorMode: 'white'
}
```

### Phase 3: Canvas Integration

1. Update `useUnifiedCanvas.ts`:
   - Import hilbertScopeRenderer
   - Initialize on canvas setup with audio context
   - Add to renderFrame sequence (after ambient, before blobs)
   - Handle cleanup on destroy

2. Audio connection flow:
   - Get Tone.context in initializeCanvas
   - Create analyser nodes for Hilbert processing
   - Connect to main audio output (not per-note)

### Phase 4: Testing and Refinement

1. Verify audio connection works with existing instruments
2. Test performance with other effects enabled
3. Ensure proper cleanup on component unmount
4. Test configuration persistence and hot-reloading

## Implementation Checklist

- [ ] Create `useHilbertScopeRenderer.ts` with core classes
- [ ] Add HilbertScopeConfig to visual types
- [ ] Update DEFAULT_CONFIG with Hilbert settings
- [ ] Integrate renderer into unified canvas system
- [ ] Connect to Tone.js audio context
- [ ] Add to renderFrame sequence
- [ ] Test with existing visual effects
- [ ] Verify configuration persistence
- [ ] Add performance monitoring integration
- [ ] Test cleanup and memory management

## Validation Gates

```bash
# Type checking
bun run type-check

# Linting
bun run lint

# Development server (manual testing)
bun run dev
```

### Manual Testing Checklist
1. Enable Hilbert Scope in visual config
2. Play notes - verify single scope responds to all audio
3. Test alongside other effects (blobs, particles)
4. Check positioning (top center of screen)
5. Verify trail effects work properly
6. Test configuration changes (size, opacity, glow)
7. Ensure proper cleanup on disable/unmount

## Error Handling Strategy

1. **Audio Context Issues**
   - Gracefully handle if Tone.context not available
   - Fallback to disabled state with console warning
   - Don't break other visual effects

2. **Performance Degradation**
   - Monitor frame rate via existing performance system
   - Auto-disable if consistent frame drops
   - Provide user feedback about performance

3. **Configuration Errors**
   - Validate config values with sensible bounds
   - Use defaults for invalid values
   - Log warnings for debugging

## Code Patterns to Follow

1. **Renderer Module Pattern** (from `useBlobRenderer.ts`):
   - Export composable function
   - Internal state management with Maps/arrays
   - Clear separation of concerns
   - Consistent method naming

2. **Configuration Integration** (from existing configs):
   - Reactive computed refs for config sections
   - Automatic persistence via store
   - Hot-reload friendly

3. **Animation Lifecycle** (from unified canvas):
   - Use existing renderFrame structure
   - Respect isEnabled flags
   - Integrate with performance monitoring

## Potential Gotchas

1. **Web Audio API Timing**
   - Hilbert transform introduces latency
   - Already compensated in reference implementation
   - Keep delay compensation logic intact

2. **Canvas Layering**
   - Render order matters for visual depth
   - Place after ambient but before blobs
   - Use appropriate blend modes

3. **Memory Management**
   - OnionSkin creates swap canvases
   - Must clean up on destroy
   - Monitor for leaks in dev tools

## Future Enhancements

- Frequency-based color mapping
- Multiple scope instances at different positions
- Beat detection for pulsing effects
- Integration with sequencer timing
- Save/load scope presets

## Confidence Score: 9/10

High confidence due to:
- Complete working reference implementation
- Clear integration patterns in existing codebase
- Well-defined visual effects architecture
- Minimal external dependencies

Minor uncertainty only in:
- Exact Tone.js audio routing (but pattern is clear from codebase)

This PRP provides comprehensive context for successful one-pass implementation of the Hilbert Scope feature.