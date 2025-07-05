# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EmotiTone Solfège is an interactive music theory web application that teaches solfège through emotional experiences. Built with Vue 3, TypeScript, and Tone.js, it provides a sequencer-based interface for learning musical scales and intervals.

## Common Development Commands

### Building and Development
```bash
# Start development server (runs on port 5175)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality
```bash
# Run linting with auto-fix
npm run lint

# Type checking without compilation
npm run type-check

# Full build process (includes type checking)
npm run build
```

## Architecture Overview

### Core Systems

**Music Theory System** (`src/services/music.ts`)
- Manages scales, keys, and solfège data using Tonal.js
- Handles frequency calculations and note name conversions
- Provides melody categorization and search functionality

**Audio System** (`src/services/audio.ts`)
- Manages Tone.js audio context and instrument initialization
- Handles polyphonic note attack/release with unique note IDs
- Supports both note names and frequency-based playback

**State Management** (Pinia stores in `src/stores/`)
- `music.ts`: Current key, mode, active notes, and solfège data
- `instrument.ts`: Current instrument selection and configuration
- `sequencer.ts`: Sequencer state and transport controls
- `visualConfig.ts`: Visual effects and animation settings

### Component Architecture

**Main Application Flow**
1. `App.vue` - Root component with loading state management
2. `SequencerSection.vue` - Main sequencer interface
3. `UnifiedVisualEffects.vue` - Canvas-based visual effects system
4. `CanvasSolfegePalette.vue` - Interactive solfège wheel interface

**Sequencer Components**
- Grid-based sequencer with circular and linear layouts
- Transport controls (play/pause/stop/tempo)
- Per-track instrument and property controls
- Real-time visual feedback during playback

**Visual System**
- Canvas-based unified visual effects (particles, ambient, strings)
- GSAP animations for smooth transitions
- Responsive design with mobile optimization
- Color system tied to musical intervals and emotions

### Key Composables

**Audio & Music**
- `useSequencerTransport.ts`: Transport controls and timing
- `useSequencerGrid.ts`: Grid state and note management
- `useSolfegeInteraction.ts`: Solfège palette interactions

**Visual Effects**
- `useUnifiedCanvas.ts`: Canvas rendering coordination
- `useParticleSystem.ts`: Particle animations for note events
- `useColorSystem.ts`: Color mapping for musical elements

**Utilities**
- `useAppLoading.ts`: Application initialization state
- `useKeyboardControls.ts`: Keyboard shortcuts and navigation
- `useTooltip.ts`: Global tooltip system

## Development Guidelines

### File Organization
- Components use single-file Vue components with TypeScript
- Composables are grouped by functionality (audio, visual, sequencer)
- Types are centralized in `src/types/` with clear module boundaries
- Data files contain scales, instruments, and musical patterns

### Audio Context Management
- Audio initialization requires user interaction (handled in `AudioInitializer.vue`)
- Always check audio context state before playing notes
- Use note IDs for polyphonic note tracking and release

### Visual Effects
- Canvas operations are coordinated through `UnifiedVisualEffects.vue`
- Effects respond to `note-played` and `note-released` custom events
- Animation cleanup is handled through `useAnimationLifecycle.ts`

### State Management Patterns
- Pinia stores use composition API with TypeScript
- Reactive state is kept minimal and derived values use computed properties
- Store persistence is handled through pinia-plugin-persistedstate

## Testing and Verification

### Manual Testing Workflow
1. Start dev server and verify audio initialization
2. Test solfège palette interactions (click, drag, hover)
3. Verify sequencer playback with different instruments
4. Check visual effects respond to note events
5. Test keyboard shortcuts and transport controls

### Common Issues
- Audio context suspended: Check user interaction handling
- Note stuck playing: Verify note ID tracking in audio service
- Visual effects lag: Monitor canvas performance and cleanup
- Type errors: Run `npm run type-check` before builds

## Refactoring Plans

The project has detailed refactoring plans in `/plans/refactor/` organized by priority:

**High Priority**: Logging cleanup, TonalJS integration, color system consolidation
**Medium Priority**: TypeScript migration, configuration store splitting, large file breakdown  
**Low Priority**: UI standardization, performance optimizations
**Features**: Record player visuals, chord buttons, session history

Each phase includes detailed implementation steps, verification criteria, and completion definitions.

## Project Structure Notes

- Uses Vue 3 Composition API throughout
- Tone.js for audio synthesis and timing
- GSAP for smooth animations
- Tailwind CSS for styling
- Vite for build tooling with TypeScript support
- Path alias `@/` maps to `src/`

## Performance Considerations

- Canvas operations are throttled during animations
- Audio context is lazily initialized on user interaction
- Visual effects use requestAnimationFrame for smooth rendering
- Large audio files are loaded asynchronously through instrument system