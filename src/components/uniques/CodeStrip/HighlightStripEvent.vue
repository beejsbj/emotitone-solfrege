<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import type { NoteColorResolver } from "@/components/primatives/noteColorContext";
import Sequence from "./Sequence.vue";
import type { NotationHighlightSource } from "./highlight";
import type { CodeStripViewport } from "./viewport";
import type {
  CodeStripDensity,
  CodeStripDurationMode,
  CodeStripToken,
} from "./types";

/**
 * One Stave event of the HighlightStrip. Controlled progress arrives as
 * primitives; during playback the event reads its own state from the
 * highlight `source`, so it re-renders only when its own state changes.
 */
const props = defineProps<{
  token: CodeStripToken;
  index: number;
  progress: number;
  /** Chord member fills in member order, joined by "|". */
  memberProgress?: string;
  active: boolean;
  /** Playback highlight to read from; progress then follows its clock. */
  source?: NotationHighlightSource;
  /** This event's phrase note ids, for `source`. */
  noteIds?: readonly string[];
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

const state = computed(() => {
  const { source, token } = props;
  if (!source) return { progress: props.progress, active: props.active };
  if (token.type === "rest") return { progress: source.restProgress(props.index), active: false };
  const active = source.isActive(props.noteIds ?? []);
  if (token.type === "chord") {
    const members = token.members.map((member) => source.noteProgress(member.id));
    return {
      progress: members.reduce((sum, value) => sum + value, 0) / Math.max(1, members.length),
      members,
      active,
    };
  }
  return { progress: source.noteProgress(token.type === "note" ? token.noteId : undefined), active };
});

const rendered = computed<CodeStripToken>(() => {
  const token = props.token;
  const { progress } = state.value;
  if (token.type === "chord") {
    const members = "members" in state.value && state.value.members
      ? state.value.members
      : props.memberProgress?.split("|").map(Number) ?? [];
    return {
      ...token,
      members: token.members.map((member, memberIndex) => ({
        ...member,
        progress: members[memberIndex] ?? progress,
      })),
    };
  }
  if (token.type === "note" || token.type === "rest") return { ...token, progress };
  return token;
});

const lit = computed(() => state.value.active);

// Playback progress follows the clock every frame, so it must not ease.
const fillStyle = computed(() =>
  props.source ? { "--code-strip-fill-duration": "0ms" } : undefined,
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
      'highlight-strip-event--active': lit,
      'highlight-strip-event--hidden': hidden,
    }"
    :data-event-index="index"
    :data-active="lit || undefined"
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
