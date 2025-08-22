# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

EmotiTone Solfège is an interactive music theory web application that teaches solfège through emotional experiences. Built with Vue 3, TypeScript, and Tone.js, it provides a sequencer-based interface for learning musical scales and intervals using canvas-based visual effects.

## Common Development Commands

### Building and Development
```bash
# Start development server (runs on port 5175)
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Type checking without compilation
bun run type-check
```

### Code Quality
```bash
# Run linting with auto-fix
bun run lint

# Run all tests
bun run test

# Run tests with UI
bun run test:ui

# Run tests with coverage
bun run test:coverage

# Run single test file
bun run test src/path/to/test.test.ts

# Run E2E tests
bun run test:e2e
```

## Architecture Overview

### Core Systems Pipeline

**Music Theory → Audio → Visual Flow:**
1. **Theory Layer**: Tonal.js handles pure music theory calculations
2. **Audio Layer**: Tone.js manages audio synthesis with polyphonic support  
3. **Visual Layer**: Canvas-based effects respond to audio events
4. **State Layer**: Pinia stores coordinate between systems

### Key Services

**Audio System** (`src/services/audio.ts`)
- Manages Tone.js audio context and initialization
- Handles polyphonic note attack/release with unique note IDs
- Requires user interaction for audio context activation
- All audio operations go through the AudioService class

**Music Theory System** (`src/services/music.ts`)
- Pure music theory calculations using Tonal.js
- Manages scales, keys, solfège data, and melody categorization
- Provides frequency calculations and note name conversions
- Maintains melody cache for performance

**State Management** (Pinia stores in `src/stores/`)
- `music.ts`: Current key, mode, active notes, solfège data
- `instrument.ts`: Current instrument selection and configuration  
- `sequencer.ts`: Sequencer state and transport controls
- `visualConfig.ts`: Visual effects and animation settings

### Component Architecture

**Main Application Components:**
- `App.vue`: Root with loading state management
- `SequencerSection.vue`: Main sequencer interface
- `UnifiedVisualEffects.vue`: Canvas-based visual effects coordination
- `CanvasSolfegePalette.vue`: Interactive solfège wheel interface

**Key Composables by Domain:**
- **Audio/Music**: `useSequencerTransport.ts`, `useSequencerGrid.ts`, `useSolfegeInteraction.ts`
- **Visual Effects**: `useUnifiedCanvas.ts`, `useParticleSystem.ts`, `useColorSystem.ts`
- **Utilities**: `useAppLoading.ts`, `useKeyboardControls.ts`, `useTooltip.ts`

## Development Guidelines

### Vue 3 Standards
- Always use Composition API with `<script setup>` and TypeScript
- Mobile-first design (ignore desktop considerations)
- Use HSLA instead of RGBA/HEX colors throughout
- GSAP for all animations (never CSS transitions)
- Avoid emits - use composables for shared state
- Path alias `@/` maps to `src/`

### File Organization
```
/src
├── components/        # Single-file Vue components  
├── composables/       # Grouped by functionality (audio, visual, sequencer)
├── data/             # Static data (scales, instruments, patterns)
├── services/         # Core services (audio, music theory)
├── stores/           # Pinia stores
├── types/            # All TypeScript definitions
└── utils/            # Utility functions
```

### Audio Context Management
- Audio initialization requires user interaction (handled in `AudioInitializer.vue`)
- Always check `audioService.isAudioReady()` before playing notes
- Use note IDs for polyphonic tracking: `noteId` returned from play methods
- Audio context suspended errors are common - handle gracefully

### Visual Effects System
- All canvas operations coordinated through `UnifiedVisualEffects.vue`
- Effects respond to `note-played` and `note-released` custom events  
- Animation cleanup handled through `useAnimationLifecycle.ts`
- Use `requestAnimationFrame` for smooth rendering

### Testing Approach
- **Unit tests**: Services and utilities in isolation
- **Integration tests**: Store + service interactions
- **E2E tests**: Full user workflows with audio/visual coordination
- Audio mocking available in `__tests__/helpers/audio-mocks.ts`

## Technology Stack Notes

**Key Dependencies:**
- Vue 3 Composition API with TypeScript
- Tone.js (^15.0.4) for audio synthesis and timing
- Tonal.js (^4.10.0) for music theory utilities
- GSAP for performant animations
- Tailwind CSS for styling (HSLA colors only)
- Pinia with persistence for state management
- Vite + TypeScript with path aliases

**Performance Considerations:**
- Canvas operations throttled with `requestAnimationFrame`
- Large audio files loaded asynchronously through instrument system
- Minimal reactive state with computed properties for derived values
- TypeScript types separated in `/types` for better tree-shaking

## Planned Refactoring

The project has detailed refactoring plans in `/PRPs/codebase-refactor.md` to achieve cleaner architecture:

**Phase 1**: Event system and service layer infrastructure
**Phase 2**: Theory/audio pipeline separation  
**Phase 3**: State management cleanup
**Phase 4**: Visual system decoupling
**Phase 5**: Component integration updates

Each phase targets specific architectural improvements while maintaining functionality.

## Common Issues and Solutions

**Audio Context Issues:**
- Check `audioService.getAudioState()` for context status
- Call `audioService.startAudioContext()` after user interaction
- Look for "suspended" state in console warnings

**Note Stuck Playing:**  
- Verify note ID tracking in audio service
- Check active notes map in music store
- Ensure proper note release calls

**Visual Effects Performance:**
- Monitor canvas render loop performance
- Check animation cleanup in component unmount
- Verify `requestAnimationFrame` usage

**Type Errors:**
- Run `bun run type-check` before builds
- Check path alias resolution in `tsconfig.json`
- Verify proper TypeScript imports from `/types`

## Package Manager

Use Bun as the primary package manager for all development commands and dependency management. Bun provides faster package management and script execution compared to npm/yarn.
