/**
 * Integration Test Suite for EmotiTone Solfège
 * 
 * This directory contains comprehensive integration tests that verify
 * how different parts of the application work together.
 * 
 * Test Categories:
 * 
 * 1. Audio-Visual Integration (audio-visual-integration.test.ts)
 *    - Note events triggering both audio and visual effects
 *    - Sequencer playback synchronization with canvas animations
 *    - Visual effects responding to different instruments
 *    - Color system integration with musical changes
 * 
 * 2. Store-Service Integration (store-service-integration.test.ts)
 *    - Music store ↔ Audio service communication
 *    - Sequencer store ↔ Transport coordination
 *    - Instrument store ↔ Audio service integration
 *    - Visual config store propagation
 *    - Cross-store communication patterns
 * 
 * 3. Component Communication (component-communication.test.ts)
 *    - Palette → Music store → Audio flow
 *    - Sequencer grid → Store → Playback integration
 *    - Key/Mode selector → Global state updates
 *    - Transport controls → Multi-sequencer coordination
 *    - Instrument selector → Audio configuration
 *    - Event bus communication between components
 * 
 * 4. User Workflows (user-workflow.test.ts)
 *    - Complete music creation workflow (explore → compose → playback)
 *    - Session save and restore functionality
 *    - Multi-track composition workflow
 *    - Educational workflow for learning scale degrees
 *    - Performance mode with live inputs
 *    - Error recovery and state consistency
 * 
 * 5. Performance Integration (performance-integration.test.ts)
 *    - Audio latency under load
 *    - Canvas rendering performance with effects
 *    - Memory usage during extended sessions
 *    - Concurrent operations performance
 *    - Performance monitoring and bottleneck identification
 * 
 * Running Integration Tests:
 * 
 * Run all integration tests:
 * ```bash
 * bun test integration
 * ```
 * 
 * Run specific integration test file:
 * ```bash
 * bun test audio-visual-integration
 * ```
 * 
 * Run with coverage:
 * ```bash
 * bun test --coverage integration
 * ```
 * 
 * Key Testing Patterns:
 * 
 * - Tests use real component instances with mocked external dependencies
 * - Focus on verifying communication and data flow between systems
 * - Test complete user journeys and workflows
 * - Verify performance characteristics under load
 * - Ensure error propagation and recovery work correctly
 * 
 * Test Helpers Available:
 * 
 * - createTestWrapper: Mount components with proper store setup
 * - waitForUpdates: Wait for async operations to complete
 * - measurePerformance: Measure operation execution time
 * - Mock audio/canvas contexts for isolated testing
 * - Test data factories for consistent test setup
 */

// Export test suites for potential programmatic access
export { default as AudioVisualIntegration } from './audio-visual-integration.test'
export { default as StoreServiceIntegration } from './store-service-integration.test'
export { default as ComponentCommunication } from './component-communication.test'
export { default as UserWorkflow } from './user-workflow.test'
export { default as PerformanceIntegration } from './performance-integration.test'