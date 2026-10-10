<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import type { NoteColorResolver } from "@/components/primatives/noteColorContext";
import Sequence from "./Sequence.vue";
import type { CodeStripViewport } from "./viewport";
import type {
  CodeStripDensity,
  CodeStripDurationMode,
  CodeStripToken,
} from "./types";

/**
 * One Stave event of the HighlightStrip. Progress arrives as primitives so an
 * event re-renders only when its own state changes, not on every note.
 */
const props = defineProps<{
  token: CodeStripToken;
  index: number;
  progress: number;
  /** Chord member fills in member order, joined by "|". */
  memberProgress?: string;
  active: boolean;
  /** Progress follows the playback clock frame by frame: no eased fill. */
  live?: boolean;
  hidden?: boolean;
  density: CodeStripDensity;
  durationMode: CodeStripDurationMode;
  timeSignature: string;
  viewport?: CodeStripViewport;
  colorResolver?: NoteColorResolver;
  stillColorResolver?: NoteColorResolver;
}>();

const root = ref<HTMLElement | null>(null);
const resolver = shallowRef<NoteColorResolver | undefined>(props.colorResolver);
// Sequence reads its colour provider once, so bind before it renders.
const ready = ref(!props.viewport);

onMounted(() => {
  if (!props.viewport || !root.value) return;
  const binding = props.viewport.bind(root.value, props.colorResolver, props.stillColorResolver);
  resolver.value = binding.colorResolver ?? props.colorResolver;
  ready.value = true;
});

onBeforeUnmount(() => {
  if (root.value) props.viewport?.unbind(root.value);
});

const rendered = computed<CodeStripToken>(() => {
  const token = props.token;
  if (token.type === "chord") {
    const members = props.memberProgress?.split("|").map(Number) ?? [];
    return {
      ...token,
      members: token.members.map((member, memberIndex) => ({
        ...member,
        progress: members[memberIndex] ?? props.progress,
      })),
    };
  }
  if (token.type === "note" || token.type === "rest") return { ...token, progress: props.progress };
  return token;
});

const fillStyle = computed(() =>
  props.live ? { "--code-strip-fill-duration": "0ms" } : undefined,
);

const accessibleName = computed(() => {
  const token = props.token;
  if (token.type === "note") return `Code note ${token.text}`;
  if (token.type === "chord") return token.accessibleName ?? `Code chord ${token.symbol}`;
  if (token.type === "rest") return "Code rest";
  return "Code punctuation";
});
</script>

<template>
  <span
    ref="root"
    class="highlight-strip-event"
    :class="{
      'highlight-strip-event--active': active,
      'highlight-strip-event--hidden': hidden,
    }"
    :data-event-index="index"
    :data-active="active || undefined"
    :aria-hidden="hidden || undefined"
    :style="fillStyle"
  >
    <Sequence
      v-if="ready && !hidden"
      :tokens="[rendered]"
      :duration-mode="durationMode"
      :density="density"
      :time-signature="timeSignature"
      :show-chevron="false"
      embedded
      :aria-label="accessibleName"
      :color-resolver="resolver"
    />
  </span>
</template>

<style scoped>
.highlight-strip-event {
  display: inline-flex;
  flex: 0 0 auto;
  margin-inline: 2.5px;
  vertical-align: middle;
}

.highlight-strip-event--hidden {
  margin: 0;
}

/* Clipped or offscreen history stops its fills and rejoins on entry. */
.highlight-strip-event[data-code-strip-visible="false"] :deep(.code-strip__note .note__surface::before),
.highlight-strip-event[data-code-strip-visible="false"] :deep(.chord__cluster-member .note__surface::before),
.highlight-strip-event[data-code-strip-visible="false"] :deep(.chord__fused-progress),
.highlight-strip-event[data-code-strip-visible="false"] :deep(.code-strip__rest-fill) {
  transition: none;
  will-change: auto;
}
</style>
