# EmotiTone Solfège - Architecture Refactor PRP

## Executive Summary

This PRP outlines a comprehensive refactor of the EmotiTone Solfège codebase to achieve a clean, modular architecture that eliminates duplication and follows the ideal system design outlined in CLAUDE.md. The refactor will be executed in phases using multiple specialized agents to ensure minimal disruption while maintaining all existing functionality.

## Current Architecture Problems

### 1. Event System Duplication

- Custom events created manually in multiple places with similar structures
- No centralized event management or type safety
- Event details have inconsistent shapes across different contexts

### 2. Audio Context Management

- Tone.js initialization code repeated in audio service (3+ times)
- No single source of truth for audio state
- User interaction handling duplicated

### 3. Tight Coupling

- Stores directly handle audio operations instead of delegating
- Components depend on concrete implementations rather than interfaces
- Visual effects tied directly to specific event shapes

### 4. Missing Abstraction Layers

- No clear separation between theory, audio, and visual concerns
- Direct service imports throughout components
- No dependency injection or service locator pattern

### 5. State Management Issues

- Music store handles too many responsibilities
- Circular dependencies between stores
- Inconsistent patterns for computed state

## Target Architecture (from CLAUDE.md)

```
┌─── THEORY → AUDIO PIPELINE ───────────────────┐
│ Tonal.js (theory) → Music Service (playback) │
│              ↓                               │
│         Tone.js (audio engine)               │
│              ↓                               │
│      Instrument System (samples/synths)      │
└───────────────────────────────────────────────┘
```

## Refactor Phases

### Phase 1: Core Infrastructure (Agent: core-refactor)

**Goal**: Establish foundational patterns and services

1. **Event System Refactor**

   - Create `EventBus` service with typed events
   - Define event interfaces in `types/events.ts`
   - Replace all custom event creation with EventBus methods
   - Add event namespacing for different concerns

2. **Service Layer Architecture**

   - Create service interfaces in `types/services.ts`
   - Implement service locator pattern
   - Add dependency injection for testing

3. **Audio Context Manager**
   - Extract audio context management to dedicated service
   - Single initialization point with state machine
   - Proper error handling and recovery

**Files to create**:

- `src/services/EventBus.ts`
- `src/services/AudioContextManager.ts`
- `src/services/ServiceLocator.ts`
- `src/types/events.ts`
- `src/types/services.ts`

### Phase 2: Theory & Audio Pipeline (Agent: audio-refactor)

**Goal**: Implement clean separation between theory and audio

1. **Theory Layer**

   - Pure music theory calculations (no side effects)
   - Tonal.js integration only
   - No audio or visual concerns

2. **Audio Layer**

   - Consumes theory layer for note data
   - Manages Tone.js interactions
   - Emits standardized audio events

3. **Instrument Abstraction**
   - Create instrument interface
   - Implement adapter pattern for different instrument types
   - Lazy loading with proper lifecycle

**Files to refactor**:

- `src/services/music.ts` → Split into `TheoryService.ts` and `AudioEngine.ts`
- `src/services/audio.ts` → Refactor to use AudioContextManager
- `src/stores/instrument.ts` → Extract instrument logic to service

### Phase 3: State Management (Agent: state-refactor)

**Goal**: Clean store responsibilities and eliminate circular dependencies

1. **Store Refactoring**

   - Music store: Only musical state (key, mode, scale)
   - Sequencer store: Only sequencer state (beats, transport)
   - Visual store: Only visual configuration
   - Remove all service logic from stores

2. **Computed State Pattern**

   - Use Vue computed for derived state
   - Implement selector pattern for complex queries
   - Add memoization where appropriate

3. **Action Pattern**
   - All mutations through well-defined actions
   - Actions delegate to services
   - Services emit events for side effects

**Files to refactor**:

- `src/stores/music.ts`
- `src/stores/sequencer.ts`
- `src/stores/instrument.ts`
- `src/stores/visualConfig.ts`

### Phase 4: Visual System (Agent: visual-refactor)

**Goal**: Decouple visual effects from audio implementation

1. **Visual Event System**

   - Subscribe to EventBus for audio events
   - Transform audio events to visual commands
   - Implement visual effect registry

2. **Canvas Coordination**

   - Centralized canvas management
   - Effect composition pipeline
   - Performance optimization with RAF

3. **Effect Modularity**
   - Each effect as independent module
   - Configurable effect parameters
   - Dynamic effect loading

**Files to refactor**:

- `src/composables/canvas/`
- `src/components/UnifiedVisualEffects.vue`
- Create `src/services/VisualEffectRegistry.ts`

### Phase 5: Component Integration (Agent: component-refactor)

**Goal**: Update components to use new architecture

1. **Service Injection**

   - Components receive services via injection
   - Remove direct imports
   - Use interfaces for type safety

2. **Event Handling**

   - Subscribe to EventBus instead of DOM events
   - Proper cleanup in unmount
   - Type-safe event handlers

3. **Composable Updates**
   - Update composables to use new services
   - Remove store dependencies where appropriate
   - Add proper TypeScript types

**Files to update**:

- All Vue components
- All composables

## Implementation Blueprint

### Core Service Structure

```typescript
// types/events.ts
export interface NotePlayedEvent {
  type: "audio:note:played";
  payload: {
    noteId: string;
    frequency: number;
    noteName: string;
    solfegeIndex: number;
    scaleDegree: number;
    octave: number;
    instrument: string;
  };
}

// services/EventBus.ts
export class EventBus {
  private listeners = new Map<string, Set<Function>>();

  emit<T extends BaseEvent>(event: T): void {
    // Implementation
  }

  on<T extends BaseEvent>(
    type: T["type"],
    handler: (payload: T["payload"]) => void
  ): () => void {
    // Returns unsubscribe function
  }
}

// services/AudioContextManager.ts
export class AudioContextManager {
  private state: "uninitialized" | "initializing" | "ready" | "error";

  async initialize(): Promise<void> {
    // Single initialization point
  }

  getContext(): AudioContext {
    // Returns ready context or throws
  }
}
```

### Refactored Store Example

```typescript
// stores/music.ts
export const useMusicStore = defineStore("music", () => {
  // Pure state
  const currentKey = ref<ChromaticNote>("C");
  const currentMode = ref<MusicalMode>("major");

  // Services injected
  const theoryService = inject(TheoryServiceKey)!;
  const audioEngine = inject(AudioEngineKey)!;
  const eventBus = inject(EventBusKey)!;

  // Computed from theory service
  const currentScale = computed(() =>
    theoryService.getScale(currentKey.value, currentMode.value)
  );

  // Actions delegate to services
  async function playNote(solfegeIndex: number, octave: number) {
    const noteData = theoryService.getNoteData(
      currentKey.value,
      currentMode.value,
      solfegeIndex,
      octave
    );

    const noteId = await audioEngine.playNote(noteData);

    // No event emission here - audio engine handles it
  }

  return {
    // Only expose state and actions
    currentKey: readonly(currentKey),
    currentMode: readonly(currentMode),
    currentScale,
    playNote,
  };
});
```

## Testing Strategy

### Unit Tests

- Test each service in isolation with mocks
- Test stores with mocked services
- Test event bus functionality

### Integration Tests

- Test service interactions
- Test store + service combinations
- Test event flow through system

### E2E Tests

- Should continue working with minimal changes
- Update selectors if component structure changes
- Verify no regression in user workflows

## Migration Path

### Phase Execution Order

1. Phase 1: Core Infrastructure (1 week)
   - Can be done without breaking changes
   - Add new services alongside existing code
2. Phase 2: Theory & Audio Pipeline (1 week)
   - Refactor services to use new infrastructure
   - Update stores to use refactored services
3. Phase 3: State Management (1 week)
   - Clean up stores incrementally
   - Maintain backward compatibility during transition
4. Phase 4: Visual System (3-4 days)
   - Update visual effects to use event bus
   - Can be done in parallel with other work
5. Phase 5: Component Integration (1 week)
   - Update components in batches
   - Test each component after update

### Backward Compatibility

- Keep old event system working during transition
- Add adapters for old API → new API
- Remove deprecated code only after full migration

## Validation Gates

### Phase 1 Validation

```bash
# TypeScript compilation
bun run type-check

# Unit tests for new services
bun test src/services/EventBus.test.ts
bun test src/services/AudioContextManager.test.ts

# Integration tests still pass
bun test src/__tests__/integration/
```

### Phase 2-5 Validation

```bash
# All tests pass
bun test

# E2E tests pass
bun run test:e2e

# No TypeScript errors
bun run type-check

# Build succeeds
bun run build
```

## Success Metrics

1. **Code Quality**

   - No circular dependencies
   - Clear separation of concerns
   - Type safety throughout

2. **Performance**

   - Audio latency ≤ current
   - Visual effects maintain 60fps
   - Memory usage stable

3. **Maintainability**

   - New features easier to add
   - Tests easier to write
   - Debugging simplified

4. **Developer Experience**
   - Clear architecture documentation
   - Consistent patterns
   - Reduced cognitive load

## Risk Mitigation

1. **Breaking Changes**

   - Use feature flags for gradual rollout
   - Maintain old APIs during transition
   - Comprehensive test coverage

2. **Performance Regression**

   - Benchmark critical paths before/after
   - Profile memory usage
   - Monitor frame rates

3. **User Experience**
   - No visible changes to users
   - Maintain all current functionality
   - Fix bugs discovered during refactor

## Agent Coordination

### Agent Responsibilities

**core-refactor**: Infrastructure and patterns
**audio-refactor**: Audio pipeline and theory separation  
**state-refactor**: Store cleanup and state management
**visual-refactor**: Visual effects decoupling
**component-refactor**: Component updates

### Communication Between Agents

- Each agent creates detailed documentation
- Handoff includes updated type definitions
- Integration tests verify agent boundaries

### Parallel Work Opportunities

- Visual refactor can start after Phase 1
- Component updates can be batched
- Documentation can be updated continuously

## Documentation Updates

1. Update CLAUDE.md with new architecture
2. Create architecture decision records (ADRs)
3. Add inline documentation for new patterns
4. Update component documentation
5. Create migration guide for future developers

## Conclusion

This refactor will transform the EmotiTone Solfège codebase from a tightly coupled system to a clean, modular architecture. By executing in phases with specialized agents, we minimize risk while ensuring comprehensive coverage. The end result will be a maintainable, scalable codebase that matches the ideal architecture vision.

### PRP Confidence Score: 9/10

The high confidence comes from:

- Comprehensive analysis of current state
- Clear phase breakdown with specific tasks
- Detailed implementation examples
- Strong test coverage strategy
- Risk mitigation planning

The -1 point is because some edge cases may emerge during implementation that require adaptation of the plan.
