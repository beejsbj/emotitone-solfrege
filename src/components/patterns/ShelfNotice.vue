<template>
  <EdgeNotice
    class="shelf-notice"
    :data-shelf-notice="state"
    :data-reel-busy="busy ? 'true' : undefined"
    :line="copy.line"
    :hint="hint"
    :label="copy.label"
    :signal="state === 'failed' ? 'problem' : 'warning'"
    :role="state === 'failed' ? 'alert' : 'status'"
    :busy="busy"
    haptic
    @dismiss="emit('dismiss')"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import EdgeNotice from "@/components/compounds/EdgeNotice.vue";

/*
 * The phrase shelf's storage notice, as an Edge Notice: two honest states told
 * by the lamp and the words. Over budget still saves (a warning); failed means
 * the browser refused the write (a problem). A swipe to the right puts it away.
 */
export type ShelfNoticeState = "over-budget" | "failed";

const props = defineProps<{
  state: ShelfNoticeState;
  /** The oldest Recent phrase's title; absent when no Recent can be released. */
  oldestTitle?: string;
  /** The reel is being scrolled: step aside so the unwound wheel stays visible. */
  busy?: boolean;
}>();

const emit = defineEmits<{ dismiss: [] }>();

const copy = computed(() => props.state === "failed"
  ? { label: "Not saving", line: "New sketches are not being saved" }
  : { label: "Shelf full", line: "Shelf full · still saving" });

// While nothing saves, what was played lives only in this tab.
const KEEP_TAB = "Keep this tab open: closing or reloading it loses new sketches.";

// What the line can't fit, for screen readers only.
const hint = computed(() => {
  const keep = props.state === "failed" ? ` ${KEEP_TAB}` : "";
  if (!props.oldestTitle) {
    return `.${keep} No Recent phrases to release. Copy any phrases you want to save before deleting them from the reel.`;
  }
  const ask = props.state === "failed" ? "Free space" : "Free some space soon";
  return `.${keep} ${ask}: delete old Recent phrases from the reel, oldest first: ${props.oldestTitle}.`;
});
</script>
