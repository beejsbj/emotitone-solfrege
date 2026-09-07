<template>
  <button
    ref="keyRef"
    class="chord-key pressable-key"
    :class="{
      'chord-key--pressed': isPhysicallyPressed,
      'pressable-key--pressed': isPhysicallyPressed,
    }"
    type="button"
    :aria-label="accessibleName"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @touchstart.prevent="handleTouchStart"
    @touchmove.prevent="handleTouchMove"
    @touchend.prevent="handleTouchEnd"
    @touchcancel.prevent="handleTouchCancel"
  >
    <span class="chord-key__face pressable-key__face" aria-hidden="true">
      <Chord
        :members="members"
        display="symbol"
        :symbol="symbol"
        :proportion="proportion"
        :geometry="geometry"
        :accessible-name="accessibleName"
      />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Chord from "@/components/compounds/Chord.vue";
import type {
  ChordMember,
  ChordProportion,
} from "@/components/compounds/Chord.vue";
import type { NoteGeometry } from "@/components/primatives/Note.vue";
import { usePressableKey, type PressInputEvent } from "@/composables/usePressableKey";
import "./pressableKey.css";

export type ChordKeyInputEvent = PressInputEvent;

const props = withDefaults(defineProps<{
  members: ChordMember[];
  symbol: string;
  accessibleName: string;
  proportion?: ChordProportion;
  geometry?: NoteGeometry;
  pressed?: boolean;
}>(), {
  proportion: "compact",
  geometry: "offcut",
  pressed: false,
});

const emit = defineEmits<{
  press: [payload: ChordKeyInputEvent];
  release: [payload: ChordKeyInputEvent];
}>();

const keyRef = ref<HTMLButtonElement | null>(null);
const {
  isLocallyPressed,
  handleMouseDown,
  handleMouseUp,
  handleMouseLeave,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleTouchCancel,
} = usePressableKey(keyRef, {
  press: (payload) => emit("press", payload),
  release: (payload) => emit("release", payload),
});

const isPhysicallyPressed = computed(() => props.pressed || isLocallyPressed.value);
</script>

<style scoped>
.chord-key {
  width: 100%;
  min-width: 44px;
}

.chord-key__face,
.chord-key :deep(.chord),
.chord-key :deep(.chord__fused) {
  width: 100%;
}

.chord-key :deep(.chord__fused-member) {
  width: auto;
  min-width: 0;
  flex: 1 1 0;
}

.chord-key :deep(.chord__symbol) {
  overflow: hidden;
  padding-inline: 2px;
  font-size: clamp(10px, 3.8cqi, 16px);
  text-overflow: ellipsis;
}

.chord-key--pressed :deep(.chord__fused) {
  box-shadow:
    var(--shadow-key),
    inset 0 2px 4px rgba(0, 0, 0, .42);
}
</style>
