# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:**
- Vitest `3.2.4`
- Config: `vitest.config.ts`
- Runtime details:
  - Environment: `happy-dom`
  - Globals: enabled
  - Setup file: `src/test-setup.ts`
  - Vue plugin and `@` alias are wired through `vitest.config.ts`

**Assertion Library:**
- Vitest `expect`
- Vue component assertions use `@vue/test-utils` helpers such as `mount`, `flushPromises`, and wrapper queries.

**Run Commands:**
```bash
bun run test            # Start Vitest in watch mode
bun run test:run        # Run the suite once
bun run test:coverage   # Run with v8 coverage instrumentation
```

## Test File Organization

**Location:**
- Tests live in a dedicated `src/__tests__/` tree rather than beside source files.
- The tree is grouped by runtime layer: `components`, `composables`, `data`, `e2e`, `helpers`, `integration`, `services`, `stores`, and `utils`.

**Naming:**
- Use `*.test.ts`. No `*.spec.ts` files are present.
- Test filenames generally mirror the runtime subject, for example `src/stores/music.ts` -> `src/__tests__/stores/music.test.ts` and `src/components/InstrumentSelector.vue` -> `src/__tests__/components/ui/InstrumentSelector.test.ts`.

**Structure:**
```text
src/__tests__/
├── components/
├── composables/
├── data/
├── e2e/
├── helpers/
├── integration/
├── services/
├── stores/
└── utils/
```

## Test Structure

**Suite Organization:**
```ts
describe("music store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    superdoughMocks.attackNote.mockClear();
  });

  it("plays notes using the actual current mode degree count", async () => {
    const musicStore = useMusicStore();
    const noteId = await musicStore.attackNote(11, 4);

    expect(noteId).toMatch(/^F5_11_4_/);
    expect(superdoughMocks.attackNote).toHaveBeenCalled();
  });
});
```

**Patterns:**
- Use nested `describe` blocks to separate behavior clusters, especially in utility and store tests such as `src/__tests__/utils/deviceDetection.test.ts`, `src/__tests__/utils/hapticFeedback.test.ts`, and `src/__tests__/stores/visualConfig.test.ts`.
- Reset shared mocks aggressively in `beforeEach`; most files call `vi.clearAllMocks()` and re-seed mutable hoisted state.
- For store tests, activate a fresh Pinia instance with `setActivePinia(createPinia())` or `setActivePinia(createTestPinia())`, as in `src/__tests__/stores/music.test.ts` and `src/__tests__/stores/visualConfig.test.ts`.
- For component tests, mount through `createTestWrapper(...)` from `src/__tests__/helpers/test-utils.ts` so Pinia is always installed.
- Assert UI mostly by `data-testid` selectors and emitted events, as in `src/__tests__/components/core/App.test.ts`, `src/__tests__/components/ui/InstrumentSelector.test.ts`, and `src/__tests__/components/ui/ConfigPanel.test.ts`.
- Use `nextTick`, `flushPromises`, and `waitForUpdates()` to stabilize async component or store work before asserting.
- Use fake timers for debounce and delayed side effects, for example `src/__tests__/stores/visualConfig.test.ts` and `src/__tests__/e2e/setup.ts`.

## Mocking

**Framework:** Vitest mocking with `vi.mock`, `vi.hoisted`, `vi.unmock`, `vi.spyOn`, and `vi.importActual`

**Patterns:**
```ts
const audioMocks = vi.hoisted(() => ({
  attackNote: vi.fn().mockResolvedValue("note-1"),
  releaseNote: vi.fn(),
}));

vi.mock("@/services/superdoughAudio", () => ({
  ...audioMocks,
}));
```

```ts
vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");
  return {
    ...actual,
    onMounted: (callback: () => void) => callback(),
    onUnmounted: vi.fn(),
  };
});
```

**What to Mock:**
- Mock browser APIs centrally in `src/test-setup.ts` and `src/__tests__/helpers/setup-dom.ts`: `AudioContext`, `BaseAudioContext`, `HTMLCanvasElement.getContext`, `TouchEvent`, `requestAnimationFrame`, `localStorage`, and `performance`.
- Mock external audio and animation packages instead of hitting real browser integrations, especially `superdough`, `@strudel/web`, `@strudel/webaudio`, `@strudel/soundfonts`, `gsap`, and `vue-sonner`, as seen in `src/test-setup.ts` and `src/__tests__/services/superdoughAudio.test.ts`.
- Mock child components and adjacent stores in component tests to keep the assertion surface narrow, for example `src/__tests__/components/core/App.test.ts`, `src/__tests__/components/ui/ConfigPanel.test.ts`, and `src/__tests__/components/ui/InstrumentSelector.test.ts`.
- Mock lifecycle-heavy Vue internals when testing a composable directly, as in `src/__tests__/composables/useKeyboardControls.test.ts`.

**What NOT to Mock:**
- Keep core music theory logic real in domain tests. `src/__tests__/services/music.test.ts` and `src/__tests__/stores/music.test.ts` explicitly `vi.unmock("@/services/music")` and `vi.unmock("@/data")`.
- Keep Pinia behavior real even in helper-based tests. `createTestWrapper` installs a normal store instance rather than a fully fake store.

## Fixtures and Factories

**Test Data:**
```ts
export function createTestWrapper<T extends Record<string, any>>(component: any, options?: ...) {
  const pinia = createTestPinia();
  return mount(component, {
    props: options?.props,
    global: {
      plugins: [pinia, ...(options?.global?.plugins || [])],
    },
  });
}
```

```ts
export function createMockNote(overrides: Partial<any> = {}) {
  return {
    id: "test-note-1",
    name: "C",
    frequency: 261.63,
    solfege: "Do",
    octave: 4,
    ...overrides,
  };
}
```

**Location:**
- Shared mounting and fixture helpers live in `src/__tests__/helpers/test-utils.ts`.
- Audio-specific helpers and reset utilities live in `src/__tests__/helpers/audio-mocks.ts`.
- DOM bootstrap helpers live in `src/__tests__/helpers/setup-dom.ts`.

## Coverage

**Requirements:** None enforced in config

**View Coverage:**
```bash
bun run test:coverage
```

**Coverage Signals:**
- `@vitest/coverage-v8` is installed in `package.json`, and `test:coverage` runs `vitest run --coverage`.
- `vitest.config.ts` does not define `coverage` thresholds, include/exclude rules, or reporter configuration.
- `tsconfig.json` excludes `src/**/__tests__/**`, `src/**/*.test.ts`, and `src/test-setup.ts` from app type-checking, so test typing is governed by Vitest and editor feedback rather than the main `vue-tsc` pass.
- `src/__tests__/integration/README.md` states a target of `80%+` coverage for integration points, but that target is documentation only. It is not enforced by `vitest.config.ts`.
- The current coverage command exits with failures before a stable coverage summary is emitted. Treat coverage as available in principle, but not currently trustworthy as a CI gate.

## Test Types

**Unit Tests:**
- The majority of the suite is unit-style, even when the filename says E2E. Pure function tests exist under `src/__tests__/utils/`, `src/__tests__/services/`, and `src/__tests__/data/`.
- Store tests under `src/__tests__/stores/` exercise real Pinia logic with mocked side-effect boundaries.
- Component tests under `src/__tests__/components/` mount one SFC at a time with mocked children and stores.

**Integration Tests:**
- Integration tests live under `src/__tests__/integration/`.
- `src/__tests__/integration/setup.ts` dynamically imports stores and components to avoid circular initialization issues.
- These tests try to cover multi-store/component flows and browser event propagation, for example `src/__tests__/integration/audio-visual-integration-fixed.test.ts`.

**E2E Tests:**
- No browser automation framework is in use. `playwright.config.*` and `cypress.config.*` are absent.
- The `src/__tests__/e2e/` suite is Vitest-based pseudo-E2E. It simulates workflows inside `happy-dom` with mocked audio, canvas, and user interaction helpers from `src/__tests__/e2e/setup.ts`.
- Treat these as workflow-focused component/store tests, not true browser E2E coverage.

## Common Patterns

**Async Testing:**
```ts
const wrapper = createTestWrapper(InstrumentSelector, { props });
await flushPromises();
await nextTick();
```

```ts
canvas.dispatchEvent(mousedownEvent);
await waitForUpdates();
expect(context.stores.music.activeNotes.size).toBeGreaterThan(0);
```

**Error Testing:**
```ts
const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
const success = visualConfigStore.importConfig("invalid json");

expect(success).toBe(false);
expect(consoleSpy).toHaveBeenCalledWith(
  "Failed to import config:",
  expect.any(Error)
);
```

## Current Execution Signal

**Observed on 2026-03-30:**
- `bun run test:run` exited with code `1`.
- Result: `37` test files, `300` tests, `25` passing files, `12` failing files, `273` passing tests, `27` failing tests.
- `bun run test:coverage` also exited with code `1` and a similar failure profile before emitting a usable coverage report.

**Current failure clusters:**
- Stale or misspelled imports point at files that do not exist in the current tree:
  - `src/__tests__/components/palette/PaletteControls.test.ts`
  - `src/__tests__/components/ui/KeySelector.test.ts`
  - `src/__tests__/composables/canvas/useBlobRenderer.test.ts`
  - `src/__tests__/composables/canvas/useParticleSystem.test.ts`
  - `src/__tests__/composables/canvas/useUnifiedCanvas.test.ts`
  - `src/__tests__/composables/palette/usePalette.test.ts`
- Integration setup does not currently match the runtime GSAP wrapper. `src/__tests__/integration/audio-visual-integration-fixed.test.ts` fails because `src/composables/useGSAP.ts` calls `gsap.registerPlugin(...)` at import time, but the mocked GSAP shape does not provide a compatible `registerPlugin`.
- Several suites fail because expectations have drifted from runtime behavior rather than because the harness is missing:
  - `src/__tests__/stores/visualConfig.test.ts`
  - `src/__tests__/utils/deviceDetection.test.ts`
  - `src/__tests__/utils/hapticFeedback.test.ts`
  - `src/__tests__/utils/performanceMonitor.test.ts`
  - `src/__tests__/utils/visualEffects.test.ts`

---

*Testing analysis: 2026-03-30*
