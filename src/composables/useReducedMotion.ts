import { onBeforeUnmount, onMounted, ref } from "vue";

/** A live `prefers-reduced-motion` flag. */
export function useReducedMotion() {
  const query = typeof window === "undefined"
    ? undefined
    : window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const reduced = ref(query?.matches ?? false);
  const onChange = (event: MediaQueryListEvent) => {
    reduced.value = event.matches;
  };
  onMounted(() => query?.addEventListener?.("change", onChange));
  onBeforeUnmount(() => query?.removeEventListener?.("change", onChange));
  return reduced;
}
