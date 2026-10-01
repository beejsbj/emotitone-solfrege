<script setup lang="ts">
import { ref } from "vue";
import ControlBar from "@/components/compounds/ControlBar.vue";
import type { HarmonyAlteration } from "@/domain/harmony";
import type { LabBenchProps } from "@/types/compoundsLab";
import LabCell from "../LabCell.vue";

/**
 * Production only: the lab leaves the Control Bar alone. The real compound is
 * mounted controlled, as the guide specimen does, once in a phone-width host
 * and once across a wide host.
 */
defineProps<LabBenchProps>();

const keyValue = ref("C");
const modeValue = ref("major");
const bpm = ref(120);
const octave = ref(4);
const playMode = ref("together");
const harmonyValue = ref<HarmonyAlteration>("auto");
</script>

<template>
  <div class="ulab-bench control-bar-bench control-bar-skin--production">
    <LabCell caption="Phone · 390px host, five Knobs and the Harmony Joystick" wide>
      <div class="control-bar-bench__host">
        <ControlBar
          v-model:key-value="keyValue"
          v-model:mode-value="modeValue"
          v-model:bpm="bpm"
          v-model:octave="octave"
          v-model:play-mode="playMode"
          v-model:harmony-value="harmonyValue"
          joystick-visual="analog"
          :haptic="false"
        />
      </div>
    </LabCell>
    <LabCell caption="Wide host · the same six equal slots across tablet and desktop widths" wide>
      <div class="control-bar-bench__host control-bar-bench__host--wide">
        <ControlBar
          v-model:key-value="keyValue"
          v-model:mode-value="modeValue"
          v-model:bpm="bpm"
          v-model:octave="octave"
          v-model:play-mode="playMode"
          v-model:harmony-value="harmonyValue"
          joystick-visual="analog"
          :haptic="false"
        />
      </div>
    </LabCell>
  </div>
</template>

<style scoped>
.control-bar-bench { display: grid; gap: var(--s-5); }
.control-bar-bench :deep(.plab-cell__stage) { padding-inline: 0; }
.control-bar-bench__host { inline-size: min(100%, 390px); }
.control-bar-bench__host--wide { inline-size: min(100%, 760px); }
</style>
