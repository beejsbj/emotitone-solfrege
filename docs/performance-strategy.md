# Mobile Performance & UX Strategy

> Snapshot of decisions and next-steps after the render-path audit *(July 2025)*.

---

## 1  Canvas: UnifiedVisualEffects & Particle Systems

### 1.a  Object Pooling
- **Why**  Continuous allocation → GC pauses → audio glitches.
- **Pattern**
  ```ts
  const pool: Blob[] = [];
  const active: Blob[] = [];

  function acquire(): Blob {
    return pool.pop() ?? createNewBlob();
  }
  function release(b: Blob) {
    pool.push(b);
  }
  ```
- **Pools to introduce**
  | System       | Estimated max | Notes                            |
  |--------------|--------------:|---------------------------------|
  | Blobs        | 24            | One per active note              |
  | Particles    | 500 - 800     | Burst depends on `polyphony`     |
  | Strings      | 7 × octaves   | Reused when key changes          |

### 1.b  Gradient / Color Caching
- `Map<string,CanvasGradient>` keyed by **solfège + octave**.
- Clear once on theme change → deterministic memory.
- WeakMap is optional; we own the keys for the full session anyway.

### 1.c  Off-screen Canvas (optional)
| Pros | Cons |
|------|------|
| Moves full-screen clears off main thread | iOS Safari lacks `OffscreenCanvas` |
| Lower input latency under load | Extra worker setup code |
| Free main thread for GSAP/UI | Falls back to main-thread draw when unsupported |

Implementation guard:
```ts
if ('OffscreenCanvas' in window) {
  const off = canvas.transferControlToOffscreen();
  worker.postMessage({ canvas: off }, [off]);
} else {
  // existing path
}
```

---

## 2  Solfège Palette → SVG Rewrite

### Why SVG over HTML/CSS grid?
| Feature                | SVG            | HTML div grid |
|------------------------|----------------|---------------|
| Shared `<svg>` → single layer compositing | ✅ | ❌ each div is its own layer |
| Precise coordinate system (musical rows) | ✅ | ❓ needs flex/math |
| Single pointer event target for **glide** | ✅ | ❌ requires per-key listeners |
| Vector scalability on hi-DPR             | ✅ | N/A (bitmaps) |

> Node count after rewrite ≈ **28–30** → far below perf cliff.

### Glide Interaction Sketch
```ts
let pressing = false;

function down(e) {
  pressing = true;
  svg.setPointerCapture(e.pointerId);
  play(e);
}
function enter(e) {
  if (pressing) play(e);
}
function up(e) {
  pressing = false;
  svg.releasePointerCapture(e.pointerId);
  stopAll();
}
```
*No per-key listeners—`pointerenter` fires on every key crossed.*

### Static vs Dynamic SVG
1. **Hand-crafted SVG file** for 3 octaves (fastest path).
2. **Generated** via a tiny util for arbitrary ranges; same event logic.

---

## 3  Circular Sequencer Optimisations

### Node Diet
- Pre-bake **12 path glyphs** (one per step length). Swap `d` attribute instead of morphing.
- Merge static grid rings with `stroke-dasharray`, grouped under one `<g>`.

### Interaction Enhancements
- **GSAP Draggable** wraps the playhead/indicators → momentum + edge-snapping baked in.
- Touch-to-add logic after flattening tracks:
  ```ts
  const track = Math.floor(pointerRadius / trackSpacing);
  const step  = snap(angle);
  ```
  (radius + angle are available from the pointer's polar coords.)

### Indicator Animation
- Use **GSAP DrawSVGPlugin** per indicator for visual feedback instead of live `d` edits.

---

## 4  Global Low-Power Mode (Pinia)
```ts
export const usePerfStore = defineStore('perf', {
  state: () => ({ lowPower: false }),
});
```
Consumers watch `lowPower`:
- UnifiedVisualEffects → halve FPS or stop.
- GSAP timelines → `gsap.globalTimeline.paused(lowPower)`.
- rAF-based components → skip draw when `lowPower`.

Triggers
1. Manual toggle in settings.
2. `navigator.connection.saveData === true`.
3. Battery API: `battery.level < 0.20` or `battery.saveMode` (Android 13+).

---

## 5  Next Steps Checklist
- [ ] Implement pools in `useBlobRenderer`, `useParticleSystem`, `useStringRenderer`.
- [ ] Create `PaletteSVG.vue`; replicate palette layout; migrate event logic.
- [ ] Benchmark SVG glide vs current Canvas (Chrome dev tools on physical device).
- [ ] Refactor CircularSequencer paths & integrate GSAP Draggable.
- [ ] Add `usePerfStore`; wire into UnifiedVisualEffects & GSAP composable.

> Target : **< 8 ms/frame** on mid-range Android & **zero frame drops** during 16-note polyphony.