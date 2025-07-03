<template>
  <div class="p-8 space-y-6">
    <h2 class="text-2xl font-bold text-white mb-4">Mobile Tooltip Examples</h2>

    <!-- Long press tooltip -->
    <div class="space-y-4">
      <h3 class="text-lg text-white">Long Press Tooltip (v-tooltip-press)</h3>
      <p class="text-sm text-gray-300">
        Touch and hold for 300ms to show tooltip
      </p>
      <button
        v-tooltip-press="'Hold me down to see this tooltip! 📱'"
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors active:scale-95"
      >
        Long Press Me
      </button>
    </div>

    <!-- Drag tooltip -->
    <div class="space-y-4">
      <h3 class="text-lg text-white">Drag Tooltip (v-tooltip-drag)</h3>
      <p class="text-sm text-gray-300">
        Touch and drag to see tooltip that follows your finger
      </p>
      <button
        v-tooltip-drag="'I follow your finger! Drag me around! ✨'"
        class="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors active:scale-95"
      >
        Touch & Drag Me
      </button>
    </div>

    <!-- Knob-like interaction -->
    <div class="space-y-4">
      <h3 class="text-lg text-white">Knob Simulation</h3>
      <p class="text-sm text-gray-300">
        Touch and drag to rotate (perfect for knob controls)
      </p>
      <div
        v-tooltip-drag="`Value: ${knobValue}% - Drag to adjust`"
        @touchmove="handleKnobDrag"
        class="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold cursor-pointer active:scale-95 transition-transform relative"
        :style="{ transform: `rotate(${knobValue * 3.6}deg)` }"
      >
        <div class="w-2 h-8 bg-white rounded-full absolute top-1"></div>
        {{ Math.round(knobValue) }}
      </div>
    </div>

    <!-- Multiple interactive elements -->
    <div class="space-y-4">
      <h3 class="text-lg text-white">Multiple Touch Elements</h3>
      <p class="text-sm text-gray-300">
        Each element has its own touch tooltip
      </p>
      <div class="grid grid-cols-4 gap-4">
        <div
          v-for="item in items"
          :key="item.id"
          v-tooltip-drag="item.tooltip"
          class="aspect-square rounded-xl border-2 border-white bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-white font-bold cursor-pointer active:scale-90 transition-transform text-2xl"
        >
          {{ item.icon }}
        </div>
      </div>
    </div>

    <!-- Advanced options -->
    <div class="space-y-4">
      <h3 class="text-lg text-white">Custom Long Press Duration</h3>
      <p class="text-sm text-gray-300">This one takes 1 second to show</p>
      <button
        v-tooltip-press="{
          content: 'You waited a whole second for me! 🕐',
          longPressDuration: 1000,
        }"
        class="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors active:scale-95"
      >
        Long Press (1s delay)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const knobValue = ref(50);

const items = [
  { id: 1, icon: "🎵", tooltip: "Music note - Touch and drag to interact!" },
  { id: 2, icon: "🎹", tooltip: "Piano - Feel the keys under your finger!" },
  { id: 3, icon: "🎸", tooltip: "Guitar - Strum with your touch!" },
  { id: 4, icon: "🥁", tooltip: "Drums - Tap and drag for rhythm!" },
  { id: 5, icon: "🎺", tooltip: "Trumpet - Blow with your touch!" },
  { id: 6, icon: "🎻", tooltip: "Violin - Bow across with your finger!" },
  { id: 7, icon: "🎤", tooltip: "Microphone - Sing into your screen!" },
  { id: 8, icon: "🎧", tooltip: "Headphones - Listen with your touch!" },
];

const handleKnobDrag = (event: TouchEvent) => {
  if (!event.touches.length) return;

  const touch = event.touches[0];
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  // Calculate angle from center
  const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
  const degrees = ((angle * 180) / Math.PI + 90 + 360) % 360;

  // Convert to 0-100 value
  knobValue.value = Math.max(0, Math.min(100, (degrees / 360) * 100));
};
</script>
