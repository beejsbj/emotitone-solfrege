# Gooey blob rendering research

Date: 2026-09-07

## Verdict

The reference effect is a **single shared filter over all bodies**: the CodePen puts both dots inside `.container` and applies `filter: blur(15px) contrast(30)`. The important detail is the filter boundary, not the circle shape. In this repo, blob bodies are filtered one at a time and harmonic bridges are drawn by another renderer, so they cannot form one true metaball field.

For the requested combination—real body/connector merging, independently colored gradients, dozens of animated blobs, 60 fps, and Safari—the reliable implementation is a full-screen WebGL fragment pass with a Canvas 2D fallback. A strictly Canvas 2D-only implementation can provide a soft approximation, but has no portable alpha-threshold stage: `CanvasRenderingContext2D.filter` has blur/contrast, not a general alpha transfer, and MDN still marks it limited-availability; Safari has historically kept canvas filters disabled. An SVG filter is a good shared-field solution, but it is an SVG pipeline rather than Canvas 2D.

## Primary evidence

- [Michiel Huiskens’ reference CodePen](https://codepen.io/michiel-huiskens/pen/KMyYrQ) has two HTML dots inside one container. Its CSS is `.container { filter: blur(15px) contrast(30); }`; the dots are black, circular, and one is animated. No JavaScript or per-dot filter is used.
- [MDN: `CanvasRenderingContext2D.filter`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter) documents `blur()`, `contrast()`, and SVG `url()` filters, but labels the property “Limited availability” and warns that it does not work in some widely used browsers. It applies while a drawing operation is rendered; it is not a general post-process of the already-painted framebuffer.
- [MDN: `globalCompositeOperation`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation) documents compositing such as `destination-in`, `lighter`, and `source-over`. These are useful for layering a mask and color image, but none performs a threshold on a blurred alpha channel.
- [MDN: SVG filters](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_filters), [`feGaussianBlur`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feGaussianBlur), and [`feColorMatrix`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feColorMatrix) document the portable SVG building blocks: blur one shared group, then transform its RGBA values with a 5×5 matrix. A matrix can turn blurred alpha into a hard-ish threshold; `feComposite` can then use that threshold as a mask for the original colored group.
- [MDN: WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) and the [WebGL 1.0 specification](https://registry.khronos.org/webgl/specs/latest/1.0/index.html) document GPU-backed fragment shaders, shader programs, texture upload, and implementation limits. [MDN’s 2D WebGL example](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Basic_2D_animation_example) shows the full-screen-shader pattern.
- [Iñigo Quílez: smooth minimum](https://iquilezles.org/articles/smin/) is the original shader reference for replacing `min(d1, d2)` with a polynomial smooth union. For metaball-style fields, the equivalent practical field is a sum of each ball’s influence followed by a threshold.
- [MDN: `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) states that callbacks generally follow the display refresh rate (commonly 60 Hz) and that elapsed time must drive animation. It is the right scheduling primitive for all three approaches.

## What the current implementation does

- [`useBlobRenderer.ts`](../../src/composables/canvas/useBlobRenderer.ts#L438-L561) creates a per-blob radial gradient, sets `ctx.filter = blur(...)`, and calls `ctx.fill()` for that blob before resetting the filter. The filter boundary therefore ends at each individual fill; neighboring blobs and connectors never enter the same filtered input.
- [`useHarmonicGeometryRenderer.ts`](../../src/composables/canvas/useHarmonicGeometryRenderer.ts#L290-L426) draws soft connections and merge bridges separately, using `screen`, shadows, gradients, and a hand-authored Bézier bridge. This is a convincing visual approximation, but not a field-derived merge.
- [`useUnifiedCanvas.ts`](../../src/composables/canvas/useUnifiedCanvas.ts#L175-L240) renders harmonic geometry before blobs, then particles and strings. A shared goo pass must be inserted as one body-plus-connector stage; otherwise later layers cannot affect the merge mask.
- [`useUnifiedCanvas.ts`](../../src/composables/canvas/useUnifiedCanvas.ts#L72-L93) obtains a single `2d` context. The same canvas cannot later be acquired as WebGL; an incremental WebGL implementation therefore needs a second/offscreen WebGL canvas or a larger migration of all renderers.

## Pipeline comparison

| Approach | Shared body + connector field | Per-blob gradients/colors | Dozens at 60 fps | Safari | Fit here |
| --- | --- | --- | --- | --- | --- |
| Canvas 2D: one combined draw + blur/contrast | Yes for the blur input, but contrast is a color operation, not a portable alpha threshold | Poor to moderate. High contrast changes colors; overlapping colors follow ordinary compositing | Reasonable for low counts if the browser accelerates filters; full-screen filtering cost is implementation-dependent | Risky. `ctx.filter` is limited-availability and has Safari compatibility caveats | Good fallback/approximation, not a true portable goo pass |
| Canvas 2D: blurred mask + `destination-in` | Shared mask is possible with an offscreen surface | Good if a real binary/soft alpha mask exists | CPU alpha thresholding (`getImageData`/`putImageData`) is full-screen work and will not scale reliably | Works without `ctx.filter` only if blur/threshold are implemented manually; expensive | Not recommended for full-screen animation |
| SVG `feGaussianBlur` + `feColorMatrix` | Yes: put every body and bridge in one filtered `<g>` | Good for preserving the source group via `feComposite`; arbitrary weighted color blending is awkward | Often GPU-backed, but SVG DOM/filter cost and filter-region size need measurement | SVG filters are broadly available; test iOS Safari filter-region behavior | Best non-WebGL shared filter, but violates a Canvas 2D-only constraint |
| WebGL fragment metaball/SDF field | Yes by definition: every pixel evaluates every body and connector primitive in one pass | Excellent: accumulate a weighted color/gradient alongside the scalar field | Best option. Cost is roughly pixels × active blobs; lower-resolution pass and texture-packed blob data make dozens practical | WebGL is the safer GPU path; feature-detect WebGL1/2 and retain fallback | Best match for true gooey rendering; requires a second context or renderer migration |

## Concrete techniques

### Canvas 2D

The useful Canvas 2D shape is to separate *geometry* from *paint*:

1. Generate each blob outline and each harmonic connector once per frame.
2. Paint all of them into one mask surface as opaque white (or additive white) before any color paint.
3. Blur that combined surface once.
4. Threshold the blurred alpha and use it to clip a second surface containing the original per-blob gradients.

The catch is step 4. `contrast()` can make a black/white image look thresholded, as the CodePen demonstrates, but Canvas 2D does not expose an alpha color-transfer primitive. `destination-in` can consume an alpha mask, but cannot manufacture the threshold. A CPU read/threshold/write pass is the only strictly Canvas 2D fallback and is a poor fit for a full-screen 60 fps effect. Do not set `ctx.filter` inside `drawPreparedBlob` and call that “gooey”: it filters each source independently.

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

## Integration recommendation

Keep `prepareBlobs` as the authoritative lifecycle/animation step, but extract a geometry snapshot from it: body center/radius/phase/color and the current harmonic edge list. Add a `useMetaballRenderer` that owns a WebGL context on an offscreen canvas and exposes `render(snapshot, width, height)`.

The least disruptive integration is:

1. Continue using the existing visible 2D canvas for ambient, particles, strings, and labels.
2. Render the goo bodies **and harmonic connectors** into the WebGL offscreen canvas in one full-screen pass.
3. Composite that result with `ctx.drawImage(webglCanvas, 0, 0, width, height)` at the blob/geometry slot in `useUnifiedCanvas`.
4. Feature-detect WebGL, and fall back to the current Canvas 2D renderer (or a combined mask/soft-bridge approximation). Keep the fallback visibly correct rather than pretending it has thresholded metaballs.
5. Add a quality governor: cap internal goo resolution, skip very low-opacity/faded blobs, and use frame-time telemetry already exposed by `performanceMonitor`.

This is still one full-screen goo render pipeline and one visible canvas, but it is not one Canvas 2D context. If “Canvas 2D only” is non-negotiable, choose the current bridge approximation or an SVG overlay; true shared-field thresholding plus Safari support is not a realistic requirement under that constraint.

## Risks and verification

- **Context architecture:** a canvas cannot be both `2d` and WebGL. A second canvas adds a texture/compositing copy; migrating every renderer to WebGL is much larger.
- **Safari variability:** feature-detect `ctx.filter`, SVG filter references, WebGL1, and WebGL2. Test iOS Safari on real hardware; do not infer mobile behavior from desktop Chrome.
- **Color seams:** scalar field thresholding is easy; preserving individual radial gradients at overlaps is not. Weighted color accumulation is the WebGL advantage, while SVG’s `SourceGraphic` mask generally resolves overlap by source order.
- **Field cost:** the fragment loop is pixel-count × primitive-count. Cap resolution and pack data for dozens of primitives; benchmark at the target viewport and device-pixel ratio.
- **Filter bounds:** blur can clip at the default filter region. Expand SVG regions and WebGL/Canvas intermediate surfaces by the blur radius.
- **Animation timing:** use the existing `requestAnimationFrame` lifecycle and elapsed timestamps; do not advance positions by a fixed `1 / 60` when refresh rates vary.
- **Regression surface:** harmonic labels, particles, strings, and background should remain outside the goo pass. Verify that only bodies and intended connectors are merged, and that faded blobs stop contributing to both color and field.

