import { usePerformerStore } from "@/stores/performer";

/**
 * Input adapters reach the app's one performer here. Every press, release and
 * expression intent goes through it; adapters keep only their own gesture
 * state (which pointer is on which key, which key needs a key-up).
 */
export function usePerformer() {
  return usePerformerStore();
}

export type PerformerHandle = ReturnType<typeof usePerformer>;
