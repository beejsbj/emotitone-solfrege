<template>
  <div class="relative transition-all duration-300 ease-in-out">
    <div class="bg-gray-900/95 backdrop-blur-sm border-t border-white/20 overflow-hidden flex items-center justify-between gap-1 p-2">
      <!-- Left: Master Play Button Knob (inert) -->
      <div class="flex items-center gap-2">
        <Knob
          type="button"
          label="Master"
          :icon="Play"
          :ready-color="'hsla(0, 0%, 40%, 1)'"
          :active-color="'hsla(0, 84%, 60%, 1)'"
          :is-disabled="true"
          :is-active="false"
        />
      </div>

      <!-- Center: Tempo (inert) -->
      <div class="flex items-center gap-2">
        <Knob
          type="range"
          :model-value="tempo"
          :min="60"
          :max="180"
          label="Tempo"
          :format-value="(v: number) => `${v}`"
          theme-color="hsla(43, 96%, 56%, 1)"
          @update:modelValue="(v: any) => (tempo = typeof v === 'number' ? v : Number(v))"
        />
      </div>

      <!-- Right: Step Display (inert) -->
      <div class="text-center">
        <Knob
          type="range"
          :is-display="true"
          :model-value="currentStep"
          :min="0"
          :max="15"
          label="Step"
          :format-value="(v: number) => `${v + 1}`"
          theme-color="hsla(271, 91%, 65%, 1)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Knob } from "./knobs";
import { Play } from "lucide-vue-next";

// Inert local state only
let tempo = ref(120);
const currentStep = ref(0);
</script>
