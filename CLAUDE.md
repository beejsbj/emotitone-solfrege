# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EmotiTone Solfège is an interactive music theory web application that teaches solfège through emotional experiences. Built with Vue 3, TypeScript, and Tone.js, it provides a sequencer-based interface for learning musical scales and intervals.

## Common Development Commands

### Building and Development

```bash
# Start development server (runs on port 5175)
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

### Code Quality

```bash
# Run linting with auto-fix
bun run lint

# Type checking without compilation
bun run type-check

# Full build process (includes type checking)
bun run build
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

### Vue 3 Coding Standards

**Component Structure** (always in this order):

```vue
<script setup lang="ts">
// TypeScript imports and logic
</script>

<template>
  <!-- HTML template -->
</template>

<style scoped>
/* Only if needed - prefer Tailwind CSS */
</style>
```

**Key Principles**:

- Use Vue 3 Composition API exclusively
- Prefer `<script setup>` with TypeScript
- Mobile-first design (ignore desktop)
- Use HSLA instead of RGBA/HEX colors
- GSAP for performant animations
- Avoid emits - use composables for shared state
- Expert-level unique UI/UX patterns

### File Organization

- Components use single-file Vue components with TypeScript
- Composables are grouped by functionality (audio, visual, sequencer)
- All TypeScript types/interfaces go in `src/types/` directory
- Data files contain scales, instruments, and musical patterns

### Styling Guidelines

- **Primary**: Tailwind CSS for most styling
- **Secondary**: Custom CSS only for complex solutions that are too verbose in Tailwind
- **Colors**: Always use HSLA format instead of RGBA or HEX
- **Mobile**: Design for mobile first, intuitive touch interactions

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

**Technology Stack**:

- Vue 3 Composition API with `<script setup>` TypeScript
- Tone.js (^14.7.77) for audio synthesis and timing
- Tonal.js (^4.14.1) for music theory utilities
- GSAP for performant animations
- Tailwind CSS for styling (HSLA colors only)
- Pinia for state management
- Vite for build tooling with TypeScript support
- Path alias `@/` maps to `src/`

**Directory Structure**:

```
/src
├── assets/            # Static assets (images, fonts)
├── components/        # Vue components (Composition API + TS)
├── composables/       # Vue 3 composables
│   ├── canvas/       # Canvas rendering hooks
│   └── palette/      # Palette functionality
├── data/             # Static data (scales, instruments)
├── lib/              # Third-party extensions
├── services/         # Core services (audio, music)
├── stores/           # Pinia stores
├── styles/           # Global styles
├── types/            # TypeScript definitions
└── utils/            # Utility functions
```

## Performance Considerations

- **Mobile Optimization**: Touch-friendly interfaces, gesture-based interactions
- **Animations**: GSAP for performant animations over CSS transitions
- **Canvas**: Operations throttled, requestAnimationFrame for smooth rendering
- **Audio**: Context lazily initialized on user interaction
- **Loading**: Large audio files loaded asynchronously through instrument system
- **State**: Minimal reactive state, computed properties for derived values
- **Code Splitting**: TypeScript types in `/types`, composables for reusable logic

### **Ideal System Families** (is this a good idea?)

```
┌─── DUAL COLOR SYSTEMS ────────────────────────┐
│ Music Color System (scale-degree based)      │
│ ├─ Emotional note colors                     │
│ └─ Dynamic hue generation                    │
│                                              │
│ UI Color System (design tokens - TBD)        │
│ ├─ Functional interface colors               │
│ └─ Consistent design language                │
└──────────────────────────────────────────────┘
                     │
┌─── THEORY → AUDIO PIPELINE ───────────────────┐
│ Tonal.js (theory) → Music Service (playback) │
│              ↓                               │
│         Tone.js (audio engine)               │
│              ↓                               │
│      Instrument System (samples/synths)      │
└───────────────────────────────────────────────┘
                     │
┌─── MELODY ←→ SEQUENCER RELATIONSHIP ──────────┐
│ Melody System (data: notes, patterns)        │
│           ↓                                  │
│ Sequencer System (playback: loops, timing)   │
│ ├─ Multiple track support                    │
│ └─ Circular loop constraints                 │
└───────────────────────────────────────────────┘
                     │
┌─── VISUAL SYSTEM (Multi-modal) ───────────────┐
│ Canvas Animations (reactive to music)        │
│ ├─ Strings, blobs, particles, ambiance      │
│ └─ Beat/rhythm reactive effects              │
│                                              │
│ Floating Popup (theory descriptions)         │
│ └─ Real-time harmonic analysis               │
└───────────────────────────────────────────────┘
                     │
┌─── INTUITIVE INTERFACES ──────────────────────┐
│ Palette Interface (keyboard-like)            │
│ ├─ Portrait-friendly note playing            │
│ ├─ Key/scale changes                         │
│ └─ Session history tracking                  │
│                                              │
│ Circular Sequencer (record player style)     │
│ ├─ 7 concentric tracks                       │
│ ├─ 16 overlapping circles per track          │
│ └─ SVG stroke-based visualization            │
└───────────────────────────────────────────────┘
```
