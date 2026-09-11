import { onBeforeUnmount, onMounted, readonly, ref, type Ref } from "vue";
import { fullStageRect, type StageRect } from "@/composables/canvas/stageRuntime";

const OCCLUDER_SELECTOR = "[data-stage-occluder]";

/**
 * Runtime adapter between DOM-owned chrome and the canvas-owned Stage. The
 * renderer receives only canvas-local geometry and never needs to understand
 * drawers, keyboards, or performance-deck structure.
 */
export function useStageHostLayout(canvasRef: Ref<HTMLCanvasElement | null>) {
  const usableRect = ref<StageRect>(fullStageRect(window.innerWidth, window.innerHeight));
  const reducedMotion = ref(false);
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let motionQuery: MediaQueryList | null = null;
  let frameRequest = 0;
  let observedOccluder: Element | null = null;
  let observedHost: Element | null = null;

  const measure = () => {
    frameRequest = 0;
    const canvas = canvasRef.value;
    if (!canvas) return;
    const canvasBounds = canvas.getBoundingClientRect();
    const occluder = document.querySelector(OCCLUDER_SELECTOR);
    if (occluder !== observedOccluder) {
      if (observedOccluder) resizeObserver?.unobserve(observedOccluder);
      observedOccluder = occluder;
      if (observedOccluder) resizeObserver?.observe(observedOccluder);
    }
    const host = occluder?.closest("[data-stage-occlusion-host]") ?? null;
    if (host !== observedHost) {
      if (observedHost) resizeObserver?.unobserve(observedHost);
      observedHost = host;
      if (observedHost) resizeObserver?.observe(observedHost);
    }
    const occluderBounds = occluder?.getBoundingClientRect();
    const occlusionTop = occluderBounds && occluderBounds.height > 0
      ? Math.max(canvasBounds.top, Math.min(canvasBounds.bottom, occluderBounds.top))
      : canvasBounds.bottom;
    usableRect.value = {
      x: 0,
      y: 0,
      width: Math.max(0, canvasBounds.width),
      height: Math.max(0, occlusionTop - canvasBounds.top),
    };
  };

  const requestMeasure = () => {
    if (frameRequest) return;
    frameRequest = requestAnimationFrame(measure);
  };

  const handleMotionChange = (event: MediaQueryListEvent | MediaQueryList) => {
    reducedMotion.value = event.matches;
  };

  onMounted(() => {
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    handleMotionChange(motionQuery);
    motionQuery.addEventListener("change", handleMotionChange);
    resizeObserver = new ResizeObserver(requestMeasure);
    if (canvasRef.value) resizeObserver.observe(canvasRef.value);
    mutationObserver = new MutationObserver(requestMeasure);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", requestMeasure);
    requestMeasure();
  });

  onBeforeUnmount(() => {
    if (frameRequest) cancelAnimationFrame(frameRequest);
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    motionQuery?.removeEventListener("change", handleMotionChange);
    window.removeEventListener("resize", requestMeasure);
  });

  return {
    usableRect: readonly(usableRect),
    reducedMotion: readonly(reducedMotion),
    requestMeasure,
  };
}
