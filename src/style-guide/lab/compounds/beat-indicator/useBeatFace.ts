import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import { uiBeatScaleSwell, useUIBeat, type UIBeatSnapshot } from "@/composables/useUIBeat";

/**
 * Guide-only: the Beat Indicator's presentation logic, lifted so a lab face
 * can draw the same beat in another shape. It subscribes to whichever UIBeat
 * clock the surrounding fixture provides and owns no timer. States match
 * BeatIndicator.vue: hidden while the transport is idle, a still downbeat
 * when UIBeat is not presenting (Reduced Motion, Visuals off, off-screen),
 * and running with the current beat and its swell otherwise.
 */
export type BeatFaceState = "hidden" | "rest" | "running";

export function useBeatFace(root: Ref<Element | null>, options: { still?: () => boolean } = {}) {
  const { clock, presentationEnabled } = useUIBeat();
  const state = ref<BeatFaceState>("hidden");
  const active = ref<number | null>(null);
  const swell = ref(0);
  let unsubscribe: (() => void) | undefined;

  function apply(snapshot: UIBeatSnapshot) {
    if (snapshot.status === "idle" && !options.still?.()) {
      state.value = "hidden";
      active.value = null;
      swell.value = 0;
      return;
    }
    if (options.still?.() || !presentationEnabled() || !snapshot.presenting || snapshot.beatIndex === null) {
      state.value = "rest";
      active.value = null;
      swell.value = 0;
      return;
    }
    state.value = "running";
    active.value = snapshot.beatIndex;
    swell.value = uiBeatScaleSwell(snapshot.beatPhase);
  }

  onMounted(() => {
    unsubscribe = clock.subscribe(apply, root.value);
  });
  onBeforeUnmount(() => unsubscribe?.());

  return { state, active, swell };
}
