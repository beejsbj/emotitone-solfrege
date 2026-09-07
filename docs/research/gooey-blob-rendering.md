# Gooey blob rendering research

Date: 2026-09-07

## Verdict

The reference effect is a **single shared filter over all bodies**: the CodePen puts both dots inside `.container` and applies `filter: blur(15px) contrast(30)`. The important detail is the filter boundary, not the circle shape. In this repo, blob bodies are filtered one at a time and harmonic bridges are drawn by another renderer, so they cannot form one true metaball field.

For the requested combination—real body merging, independently colored bodies, replay-safe lifecycle behavior, and Safari—the chosen implementation is a bounded CPU alpha field over the blobs' exact prepared contours. It rasterizes only the local contour bounds, caps the working surface at 30,000 pixels, explicitly blurs and thresholds the channels, and composites one shared silhouette back into the visible Canvas 2D scene. This avoids the limited-availability `CanvasRenderingContext2D.filter` path while keeping WebGL available as a future escalation if real-device measurements require it.

## Primary evidence

- [Michiel Huiskens’ reference CodePen](https://codepen.io/michiel-huiskens/pen/KMyYrQ) has two HTML dots inside one container. Its CSS is `.container { filter: blur(15px) contrast(30); }`; the dots are black, circular, and one is animated. No JavaScript or per-dot filter is used.
- [MDN: `CanvasRenderingContext2D.filter`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter) documents `blur()`, `contrast()`, and SVG `url()` filters, but labels the property “Limited availability” and warns that it does not work in some widely used browsers. It applies while a drawing operation is rendered; it is not a general post-process of the already-painted framebuffer.
- [MDN: `globalCompositeOperation`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation) documents compositing such as `destination-in`, `lighter`, and `source-over`. These are useful for layering a mask and color image, but none performs a threshold on a blurred alpha channel.
- [MDN: SVG filters](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_filters), [`feGaussianBlur`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feGaussianBlur), and [`feColorMatrix`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feColorMatrix) document the portable SVG building blocks: blur one shared group, then transform its RGBA values with a 5×5 matrix. A matrix can turn blurred alpha into a hard-ish threshold; `feComposite` can then use that threshold as a mask for the original colored group.
- [MDN: WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) and the [WebGL 1.0 specification](https://registry.khronos.org/webgl/specs/latest/1.0/index.html) document GPU-backed fragment shaders, shader programs, texture upload, and implementation limits. [MDN’s 2D WebGL example](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Basic_2D_animation_example) shows the full-screen-shader pattern.
- [Iñigo Quílez: smooth minimum](https://iquilezles.org/articles/smin/) is the original shader reference for replacing `min(d1, d2)` with a polynomial smooth union. For metaball-style fields, the equivalent practical field is a sum of each ball’s influence followed by a threshold.
- [MDN: `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) states that callbacks generally follow the display refresh rate (commonly 60 Hz) and that elapsed time must drive animation. It is the right scheduling primitive for all three approaches.

## What the implemented pipeline does

- [`useBlobRenderer.ts`](../../src/composables/canvas/useBlobRenderer.ts) prepares each blob's exact vibrating contour once per animation frame. Both ordinary blob painting and shared-field painting consume that same geometry snapshot.
- [`useBlobFieldRenderer.ts`](../../src/composables/canvas/useBlobFieldRenderer.ts) rasterizes all prepared contours into one bounded field, performs an explicit two-pass separable blur and alpha threshold, and derives either a filled Merge silhouette or an Outline perimeter from that same material.
- The silhouette union is independent of lifecycle opacity, so a releasing body cannot erase a sustained body at an overlap. Color weights and final visibility do follow each blob's current opacity, so a departing blob withdraws continuously instead of snapping out at removal.
- [`useUnifiedCanvas.ts`](../../src/composables/canvas/useUnifiedCanvas.ts) gives Merge and Outline ownership of the complete body-rendering slot. [`useHarmonicGeometryRenderer.ts`](../../src/composables/canvas/useHarmonicGeometryRenderer.ts) therefore paints no bridge or line underlay in those modes; Web and Center Only retain the graph renderer and ordinary blob bodies.

## Pipeline comparison

| Approach | Shared body + connector field | Per-blob gradients/colors | Dozens at 60 fps | Safari | Fit here |
| --- | --- | --- | --- | --- | --- |
| Canvas 2D: one combined draw + blur/contrast | Yes for the blur input, but contrast is a color operation, not a portable alpha threshold | Poor to moderate. High contrast changes colors; overlapping colors follow ordinary compositing | Reasonable for low counts if the browser accelerates filters; full-screen filtering cost is implementation-dependent | Risky. `ctx.filter` is limited-availability and has Safari compatibility caveats | Good fallback/approximation, not a true portable goo pass |
| Canvas 2D: bounded local field + explicit blur/threshold | Yes; all exact body contours enter one field | Good with separate additive color weights and visibility union | Viable when the field is cropped and hard-capped; not suitable as an uncapped full-screen pass | Uses baseline Canvas 2D pixel APIs rather than `ctx.filter`; real iOS Safari still needs review | Chosen incremental implementation |
| SVG `feGaussianBlur` + `feColorMatrix` | Yes: put every body and bridge in one filtered `<g>` | Good for preserving the source group via `feComposite`; arbitrary weighted color blending is awkward | Often GPU-backed, but SVG DOM/filter cost and filter-region size need measurement | SVG filters are broadly available; test iOS Safari filter-region behavior | Best non-WebGL shared filter, but violates a Canvas 2D-only constraint |
| WebGL fragment metaball/SDF field | Yes by definition: every pixel evaluates every body and connector primitive in one pass | Excellent: accumulate a weighted color/gradient alongside the scalar field | Best option. Cost is roughly pixels × active blobs; lower-resolution pass and texture-packed blob data make dozens practical | WebGL is the safer GPU path; feature-detect WebGL1/2 and retain fallback | Best match for true gooey rendering; requires a second context or renderer migration |

## Concrete techniques

### Canvas 2D

The useful Canvas 2D shape is to separate *geometry* from *paint*:

1. Generate each blob outline and each harmonic connector once per frame.
2. Paint all of them into one mask surface as opaque white (or additive white) before any color paint.
3. Blur that combined surface once.
4. Threshold the blurred alpha and use it to clip a second surface containing the original per-blob gradients.

The catch is step 4. `contrast()` can make a black/white image look thresholded, as the CodePen demonstrates, but Canvas 2D does not expose an alpha color-transfer primitive. `destination-in` can consume an alpha mask, but cannot manufacture the threshold. The implemented CPU read/blur/threshold/write pass makes that transfer explicit and remains bounded to a quantized local region with a 30,000-pixel ceiling. Do not set `ctx.filter` inside `drawPreparedBlob` and call that “gooey”: it filters each source independently.

If a browser-gated enhancement is acceptable, an SVG filter can be referenced from `ctx.filter = 'url(#goo)'` according to MDN’s Canvas filter API. Feature-detect it; do not make it the Safari baseline.

### SVG filter

Use one `<g id="goo">` containing all blob bodies and all connectors. A representative filter graph is:

```xml
<filter id="goo" x="-30%" y="-30%" width="160%" height="160%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="blur"/>
  <!-- A' = 30*A - 14; clamp produces a threshold-like alpha. -->
  <feColorMatrix in="blur" type="matrix"
    values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 30 -14"
    result="threshold"/>
  <feComposite in="SourceGraphic" in2="threshold" operator="in"/>
</filter>
```

The expanded filter region matters because Gaussian blur extends beyond the source bounds; MDN explicitly documents this clipping hazard. The final `feComposite` preserves the original group’s color/gradient rather than replacing it with the matrix output. The visual result at overlaps is still ordinary SVG group compositing (typically the topmost source color), not a physically weighted blend of two colors. For dozens of rapidly changing nodes, measure DOM/filter cost and avoid recreating filter definitions every frame.

### WebGL metaball/SDF pass

Draw a single full-screen triangle/quad. The fragment shader receives each active blob’s center, radius, color, opacity, and optional gradient parameters. For a classic 2D metaball field:

```glsl
float field = 0.0;
vec3 weightedColor = vec3(0.0);
float weightTotal = 0.0;

for (int i = 0; i < MAX_BLOBS; i++) {
  vec2 delta = pixel - blobs[i].center;
  float d2 = dot(delta, delta);
  float w = (blobs[i].radius * blobs[i].radius) / max(d2, 0.0001);
  field += w;

  vec3 localColor = blobGradient(blobs[i], delta, d2);
  weightedColor += w * blobs[i].opacity * localColor;
  weightTotal += w * blobs[i].opacity;
}

float alpha = smoothstep(threshold - softness, threshold + softness, field);
vec3 color = weightedColor / max(weightTotal, 0.0001);
```

The connector must participate in the same loop/field. Two practical choices are (a) add capsule/segment influence terms for each harmonic edge, or (b) upload bridge primitives as additional “blobs”/capsules. Do not draw bridges later in Canvas 2D if they are expected to merge with the shader bodies.

For a small number of blobs, uniforms are simplest. For dozens, query the implementation limits and use a packed 1D/2D texture (one texel per blob/primitive) rather than assuming a large uniform array; the WebGL specification exposes conservative uniform and texture limits. Render the goo pass at a capped internal resolution (for example, device-pixel-ratio 1–1.5), then composite it to the full-screen canvas. Downsampling is usually cheaper than reducing the blob count and keeps field evaluation on the GPU.

## Implemented integration and escalation point

`prepareBlobs` remains the authoritative lifecycle and animation step and now emits an exact prepared contour, current color, scale, glow, elapsed time, and opacity for each body. `useBlobFieldRenderer` owns reusable offscreen Canvas 2D surfaces and buffers, crops work to contour bounds plus blur padding, and scales that work to a hard 30,000-pixel budget. `useUnifiedCanvas` composites the result once at the body slot while leaving ambient, labels, particles, and strings outside the field.

The bounded CPU route was selected over a WebGL migration because it preserves the existing animated outlines exactly, avoids another context architecture, and is portable across the baseline Canvas 2D API. In headless Chrome at a 3840×2160 target with twelve bodies, the capped field resolved to 173×172 (29,756 pixels); warmed probes were approximately 12–14 ms. Treat those numbers as implementation evidence, not a mobile-Safari performance claim. If target hardware misses its frame budget, the next step is the offscreen WebGL full-screen pass described above, using the same prepared-frame contract.

## Risks and verification

- **Context architecture:** a canvas cannot be both `2d` and WebGL. A second canvas adds a texture/compositing copy; migrating every renderer to WebGL is much larger.
- **Safari variability:** feature-detect `ctx.filter`, SVG filter references, WebGL1, and WebGL2. Test iOS Safari on real hardware; do not infer mobile behavior from desktop Chrome.
- **Color seams:** scalar field thresholding is easy; preserving individual radial gradients at overlaps is not. Weighted color accumulation is the WebGL advantage, while SVG’s `SourceGraphic` mask generally resolves overlap by source order.
- **Field cost:** the fragment loop is pixel-count × primitive-count. Cap resolution and pack data for dozens of primitives; benchmark at the target viewport and device-pixel ratio.
- **Filter bounds:** blur can clip at the default filter region. Expand SVG regions and WebGL/Canvas intermediate surfaces by the blur radius.
- **Animation timing:** use the existing `requestAnimationFrame` lifecycle and elapsed timestamps; do not advance positions by a fixed `1 / 60` when refresh rates vary.
- **Regression surface:** harmonic labels, particles, strings, and background should remain outside the goo pass. Verify that only bodies and intended connectors are merged, and that faded blobs stop contributing to both color and field.
