# EmotiTone Solfège - End-to-End Test Suite

This directory contains comprehensive end-to-end tests that verify complete user workflows and journeys in the EmotiTone Solfège application.

## Test Categories

### 1. First-Time User Experience
**File:** `first-time-user.test.ts`
- Application loading and initialization
- Audio context activation with user interaction
- Default music theory setup (C major)
- Initial sequencer and visual effects setup
- Error handling during startup
- Mobile-responsive design verification

### 2. Music Learning Workflow
**File:** `music-learning-workflow.test.ts`
- Key and mode changes with scale updates
- Solfège palette interactions and note playing
- Audio feedback and visual coordination
- Harmonic analysis and interval learning
- Touch interactions for mobile devices
- Note release and polyphonic management

### 3. Simple Composition Workflow
**File:** `simple-composition-workflow.test.ts`
- Creating beats on sequencer grid
- Playback with audio feedback
- Pattern modification and editing
- Instrument changes during composition
- Tempo adjustments and velocity variations
- Pattern looping and muting controls

### 4. Advanced Sequencer Usage
**File:** `advanced-sequencer-usage.test.ts`
- Multi-track sequencer management
- Different instruments per track
- Complex polyrhythmic patterns
- Transport controls and global playback
- Multi-ring (scale degree) patterns
- Simultaneous multi-track playback

### 5. Project Management
**File:** `project-management.test.ts`
- Project saving with full state persistence
- Project loading and state restoration
- Multiple project creation and switching
- Import/export functionality
- Metadata tracking and versioning
- Project duplication and validation

### 6. Performance and Stress Testing
**File:** `performance-stress.test.ts`
- Rapid user interaction handling
- Multiple simultaneous audio streams
- Complex composition stress tests
- Memory usage during extended sessions
- Canvas rendering performance
- Error recovery under high load

### 7. Cross-Browser Compatibility
**File:** `cross-browser-compatibility.test.ts`
- Different Web Audio API implementations
- Viewport sizes and orientations
- Touch event implementations
- Canvas context variations
- localStorage availability and limitations
- Animation frame implementations

## Running the Tests

### Individual Test Files
```bash
# Run specific test category
bun run test src/__tests__/e2e/first-time-user.test.ts
bun run test src/__tests__/e2e/music-learning-workflow.test.ts
```

### All E2E Tests
```bash
# Run all E2E tests
bun run test src/__tests__/e2e/

# Run with UI for interactive debugging
bun run test:ui src/__tests__/e2e/

# Run with coverage reporting
bun run test:coverage src/__tests__/e2e/
```

### Specific Test Suites
```bash
# Run performance tests only
bun run test --grep "Performance and Stress Testing"

# Run user workflow tests only
bun run test --grep "First-Time User Experience|Music Learning Workflow"
```

## Test Setup and Configuration

### Setup Files
- `setup.ts` - Global E2E test setup and mocking
- `../helpers/test-utils.ts` - Reusable test utilities
- `../helpers/audio-mocks.ts` - Audio-specific mocking

### Key Features
- Comprehensive Web Audio API mocking
- Canvas rendering simulation
- Touch and mouse event simulation
- Performance measurement utilities
- Cross-browser compatibility simulation
- Mobile-first responsive testing

## Test Coverage Areas

### User Workflows Covered
- ✅ First-time user onboarding
- ✅ Music theory learning progression
- ✅ Simple beat creation and playback
- ✅ Advanced multi-track composition
- ✅ Project management and persistence
- ✅ Performance under stress conditions
- ✅ Cross-browser and cross-device compatibility

### Technical Areas Covered
- ✅ Audio context management
- ✅ Canvas rendering and visual effects
- ✅ Touch and gesture interactions
- ✅ State management and persistence
- ✅ Memory management and cleanup
- ✅ Error handling and recovery
- ✅ Performance optimization

## Test Architecture

### Mocking Strategy
- **Audio Context**: Full Web Audio API mocking with state management
- **Canvas**: 2D rendering context with all drawing operations
- **Touch Events**: Multi-touch gesture simulation
- **Performance**: Timing and memory usage measurement
- **Storage**: localStorage with various implementation scenarios

### Test Patterns
- **Arrange-Act-Assert**: Clear test structure
- **Given-When-Then**: Behavior-driven test scenarios
- **Performance Measurement**: Timing-based assertions
- **Error Simulation**: Failure scenario testing

## Debugging Tests

### Common Issues
1. **Audio Context Suspended**: Ensure user interaction simulation
2. **Canvas Context Missing**: Verify canvas mocking setup
3. **Timing Issues**: Use `waitForAudioLoad()` and `waitForAnimation()`
4. **Touch Events**: Check touch event simulation
5. **State Management**: Verify store initialization

### Debugging Commands
```bash
# Run with detailed output
bun run test src/__tests__/e2e/ --verbose

# Run single test with debugging
bun run test src/__tests__/e2e/first-time-user.test.ts --debug

# Run with UI for step-by-step debugging
bun run test:ui src/__tests__/e2e/first-time-user.test.ts
```

## Adding New Tests

### When Adding New Features
1. Add corresponding E2E tests to relevant test files
2. Update test categories in this README
3. Ensure tests cover both happy path and error scenarios
4. Include performance considerations for new features
5. Test on mobile-first responsive design

### Test File Structure
```typescript
import { describe, it, expect, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import { simulateUserInteraction, waitForAudioLoad } from './setup'

describe('New Feature Tests', () => {
  it('handles new feature workflow', async () => {
    // Arrange
    const wrapper = createTestWrapper(App)
    await waitForAudioLoad(200)
    
    // Act
    await simulateUserInteraction(wrapper)
    
    // Assert
    expect(wrapper.find('#app')).toBeTruthy()
  })
})
```

## Test Maintenance

### Regular Maintenance Tasks
- Update mocks when dependencies change
- Verify cross-browser compatibility scenarios
- Review performance benchmarks
- Update user workflow tests for UI changes
- Maintain mobile responsive test coverage

### Performance Monitoring
- Monitor test execution time
- Track memory usage during tests
- Verify canvas rendering performance
- Check audio stream handling efficiency

## Contributing

When contributing to E2E tests:
1. Follow existing test patterns and naming conventions
2. Include both positive and negative test cases
3. Add performance assertions where relevant
4. Test mobile interactions and responsive design
5. Update documentation for new test categories
6. Ensure tests are stable and reproducible

## Support

For issues with E2E tests:
1. Check the test output for specific error messages
2. Verify mock setup in `setup.ts`
3. Review timing with audio and animation helpers
4. Check browser compatibility simulation
5. Consult the main project documentation in `CLAUDE.md`