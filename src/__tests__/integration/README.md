# Integration Tests

This directory contains integration tests for the EmotiTone Solfège application. These tests verify that different parts of the system work together correctly.

## Test Structure

### 1. Audio-Visual Integration (`audio-visual-integration.test.ts`)
Tests the synchronization between audio playback and visual effects:
- Note events trigger both audio and visual responses
- Sequencer playback coordinates with canvas animations
- Different instruments produce appropriate visual effects
- Performance remains smooth under rapid note triggers

### 2. Store-Service Integration (`store-service-integration.test.ts`)
Verifies communication between Pinia stores and services:
- Music store properly communicates with AudioService
- Sequencer store manages Transport controls
- Instrument store handles audio configuration
- Visual config changes propagate correctly
- Cross-store updates maintain consistency

### 3. Component Communication (`component-communication.test.ts`)
Tests how Vue components interact and share state:
- Palette interactions update the music store
- Sequencer grid changes affect playback
- Key/mode changes propagate globally
- Custom events facilitate component communication
- Instrument changes apply to audio output

### 4. User Workflows (`user-workflow.test.ts`)
End-to-end tests of complete user journeys:
- Music creation: explore → compose → playback
- Multi-track composition and coordination
- Educational workflows for learning scales
- Live performance scenarios
- Session save/restore functionality
- Error recovery patterns

### 5. Performance Integration (`performance-integration.test.ts`)
Tests system performance under various loads:
- Audio latency with multiple simultaneous notes
- Canvas rendering with all effects enabled
- Memory usage during extended sessions
- Concurrent sequencer performance
- Performance monitoring and metrics

## Running Tests

```bash
# Run all integration tests
bun test integration

# Run specific test suite
bun test audio-visual-integration

# Run with coverage
bun test --coverage integration

# Run in watch mode
bun test --watch integration
```

## Writing Integration Tests

When adding new integration tests:

1. **Focus on Integration Points**: Test how systems work together, not individual units
2. **Use Real Components**: Mount actual Vue components with mocked external dependencies
3. **Test User Journeys**: Simulate complete workflows that users would perform
4. **Verify Side Effects**: Check that actions in one system properly affect others
5. **Test Error Propagation**: Ensure errors are handled gracefully across systems

## Test Utilities

The integration tests use utilities from `src/__tests__/helpers/`:

- `test-utils.ts`: Component mounting, test wrappers, mock data factories
- `audio-mocks.ts`: Tone.js and Web Audio API mocks

## Performance Considerations

Integration tests may be slower than unit tests because they:
- Mount full component trees
- Simulate real user interactions
- Test async operations and timing
- Verify multiple system states

Keep tests focused and use `beforeEach`/`afterEach` for proper cleanup.

## Debugging Tips

1. Use `console.log` in tests to trace execution flow
2. Add `await waitForUpdates()` after state changes
3. Check that mocks are properly reset between tests
4. Use `.only` to isolate failing tests
5. Verify store subscriptions are cleaned up

## Coverage Goals

Integration tests should cover:
- All major user workflows
- Cross-component communication paths
- Store-service interactions
- Performance-critical operations
- Error handling across systems

Target: 80%+ coverage of integration points