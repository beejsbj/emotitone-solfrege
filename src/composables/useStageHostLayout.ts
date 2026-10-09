import { onBeforeUnmount, onMounted, readonly, ref, type Ref } from "vue";
import { fullStageRect, type StageRect } from "@/composables/canvas/stageRuntime";

const OCCLUDER_SELECTOR = "[data-stage-occluder]";
const OCCLUSION_PART_SELECTOR = "[data-stage-occlusion-part]";
const ACTIVE_OCCLUSION_SELECTOR = "[data-stage-occlusion-active='true']";

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
  let observedElements = new Set<Element>();

  const syncObservedElements = (elements: Element[]) => {
    const nextElements = new Set(elements);
    for (const element of observedElements) {
      if (!nextElements.has(element)) resizeObserver?.unobserve(element);
    }
    for (const element of nextElements) {
      if (!observedElements.has(element)) resizeObserver?.observe(element);
    }
    observedElements = nextElements;
  };

  const isVisibleOcclusionPart = (element: Element) => {
    const style = window.getComputedStyle(element);
    return style.display !== "none"
      && style.visibility !== "hidden"
      && style.opacity !== "0";
  };

  const measure = () => {
    frameRequest = 0;
    const canvas = canvasRef.value;
    if (!canvas) return;
    const canvasBounds = canvas.getBoundingClientRect();
    const occluders = [...document.querySelectorAll(OCCLUDER_SELECTOR)];
    const hosts = occluders
      .map((occluder) => occluder.closest("[data-stage-occlusion-host]"))
      .filter((host): host is Element => Boolean(host));
    const parts = occluders.flatMap((occluder) => [
      ...occluder.querySelectorAll(OCCLUSION_PART_SELECTOR),
    ]);
    syncObservedElements([canvas, ...occluders, ...hosts, ...parts]);

    const candidateTops = [...occluders, ...parts]
      .filter(isVisibleOcclusionPart)
      .map((element) => element.getBoundingClientRect())
      .filter((bounds) => bounds.height > 0)
      .map((bounds) => bounds.top);
    const nearestOcclusionTop = candidateTops.length
      ? Math.min(...candidateTops)
      : canvasBounds.bottom;
    const occlusionTop = Math.max(
      canvasBounds.top,
      Math.min(canvasBounds.bottom, nearestOcclusionTop),
    );
    const nextRect = {
      x: 0,
      y: 0,
      width: Math.max(0, canvasBounds.width),
      height: Math.max(0, occlusionTop - canvasBounds.top),
    };
    if (
      usableRect.value.x !== nextRect.x
      || usableRect.value.y !== nextRect.y
      || usableRect.value.width !== nextRect.width
      || usableRect.value.height !== nextRect.height
    ) {
      usableRect.value = nextRect;
    }

    if (occluders.some((occluder) => (
      occluder.matches(ACTIVE_OCCLUSION_SELECTOR)
      || Boolean(occluder.querySelector(ACTIVE_OCCLUSION_SELECTOR))
    ))) {
      frameRequest = requestAnimationFrame(measure);
    }
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
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-stage-occlusion-active"],
    });
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
