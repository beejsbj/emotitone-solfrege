<script setup lang="ts">
import { computed } from "vue";

type Tone = "amber" | "red" | "violet" | "cream" | "green" | "neutral";
type Size = "sm" | "md";

interface Props {
  tone?: Tone;
  size?: Size;
  type?: "button" | "submit" | "reset";
}

const props = withDefaults(defineProps<Props>(), {
  tone: "neutral",
  size: "sm",
  type: "button",
});

const toneClass = computed(
  () =>
    (
      {
        amber:
          "border-[#7d6825] bg-[#171209] text-[#f7d167] hover:border-[#f7b22c] hover:text-[#fff1c5]",
        red:
          "border-[#6e2a1d] bg-[#170d0b] text-[#f28b72] hover:border-[#e53d2d] hover:text-white",
        violet:
          "border-[#433066] bg-[#100c18] text-[#d8caf7] hover:border-[#5a4295] hover:text-white",
        cream:
          "border-[#7e7255] bg-[#171209] text-[#efe5cf] hover:border-[#efe5cf] hover:text-white",
        green:
          "border-[#1e7f54] bg-[#072a1d] text-[#b7ffd8] hover:border-[#34c97f] hover:text-white",
        neutral:
          "border-[#37311c] bg-[#15120b] text-neutral-300 hover:border-[#a38d3a] hover:text-white",
      } as const
    )[props.tone]
);

const sizeClass = computed(
  () =>
    (
      {
        sm: "h-8 w-8 text-[9px]",
        md: "h-9 w-9 text-[10px]",
      } as const
    )[props.size]
);
</script>

<template>
  <button
    :type="type"
    class="inline-flex items-center justify-center border transition-all duration-200 [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)] disabled:pointer-events-none disabled:opacity-40"
    :class="[toneClass, sizeClass]"
  >
    <slot />
  </button>
</template>
