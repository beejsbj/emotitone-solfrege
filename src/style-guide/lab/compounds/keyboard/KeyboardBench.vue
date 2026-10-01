<script setup lang="ts">
import Keyboard from "@/components/compounds/Keyboard.vue";
import { defaultKeyboardHeight } from "@/components/compounds/keyboardSizing";
import type { LabBenchProps } from "@/types/compoundsLab";
import LabCell from "../LabCell.vue";
import { cMajorRows } from "../key/keyLabFixtures";

/**
 * Production-only bench: the real controlled Keyboard at the deployed phone's
 * three-row allocation (chords, then octaves 5 · 4 · 3 in C major), and the
 * same Keyboard in a wide host. The Keyboard is left alone; no skins.
 */
const props = defineProps<LabBenchProps>();

const ROWS = 3;
const rows = cMajorRows(ROWS);
const height = defaultKeyboardHeight(ROWS);
const hosts = [
  { id: "phone", caption: "C major · chords + three melody rows · phone host (390px)" },
  { id: "wide", caption: "Same Keyboard · wide host (up to 960px)" },
] as const;
</script>

<template>
  <div class="ulab-bench keyboard-bench" :class="props.skin ? `keyboard-skin--${props.skin}` : 'keyboard-skin--production'">
    <LabCell v-for="host in props.compact ? hosts.slice(0, 1) : hosts" :key="host.id" :caption="host.caption" wide>
      <div class="keyboard-bench__host" :class="`keyboard-bench__host--${host.id}`">
        <Keyboard
          usage="controlled"
          :rows="rows"
          :main-octave="4"
          :available-height="height"
          geometry-family="offcut"
          edition-seed="compounds-lab"
        />
      </div>
    </LabCell>
  </div>
</template>

<style scoped>
.keyboard-bench__host { width: min(100%, 390px); min-width: 0; }
.keyboard-bench__host--wide { width: min(100%, 960px); }
</style>
