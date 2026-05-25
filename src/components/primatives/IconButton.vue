<template>
  <button
    :type="type"
    :class="buttonClasses"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :aria-pressed="pressed"
    :title="title"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonGeometry = "default" | "sharp" | "rxs" | "rmd" | "offcut" | "tile" | "cut";
export type IconButtonTone =
  | "default"
  | "wire"
  | "hairline"
  | "solid"
  | "brassSignal"
  | "brassFill"
  | "brassWire"
  | "brassGlow";
export type IconButtonSimulatedState = "rest" | "hover" | "active";

const props = withDefaults(
  defineProps<{
    size?: IconButtonSize;
    geometry?: IconButtonGeometry;
    tone?: IconButtonTone;
    simulatedState?: IconButtonSimulatedState;
    pressed?: boolean;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    ariaLabel?: string;
    title?: string;
  }>(),
  {
    size: "md",
    geometry: "default",
    tone: "default",
    simulatedState: "rest",
    pressed: undefined,
    disabled: false,
    type: "button",
    ariaLabel: undefined,
    title: undefined,
  },
);

const buttonClasses = computed(() => [
  "icon-button",
  `icon-button--${props.size}`,
  `icon-button--geometry-${props.geometry}`,
  `icon-button--tone-${props.tone}`,
  `icon-button--state-${props.simulatedState}`,
  {
    "icon-button--pressed": props.pressed,
    brass: props.tone === "brassFill",
  },
]);
</script>

<style scoped>
.icon-button {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 0;
  border-radius: var(--r-sm);
  background: var(--ink-3);
  box-shadow: var(--ring);
  color: var(--ivory);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition:
    background var(--dur-tap) var(--ease-stab),
    box-shadow var(--dur-tap) var(--ease-stab),
    transform var(--dur-tap) var(--ease-stab),
    opacity var(--dur-tap) var(--ease-stab);
}

.icon-button:hover,
.icon-button--state-hover {
  background: var(--ink-4);
}

.icon-button:active,
.icon-button--state-active {
  transform: scale(.96);
}

.icon-button--state-active {
  background: var(--ink-4);
  box-shadow: inset 0 0 0 1px var(--ink-5);
}

.icon-button:disabled {
  cursor: not-allowed;
  opacity: .35;
}

.icon-button--sm {
  width: 32px;
  height: 32px;
  border-radius: var(--r-xs);
}

.icon-button--md {
  width: 40px;
  height: 40px;
}

.icon-button--lg {
  width: 48px;
  height: 48px;
}

.icon-button--geometry-sharp {
  border-radius: 0;
}

.icon-button--geometry-rxs {
  border-radius: var(--r-xs);
}

.icon-button--geometry-rmd {
  border-radius: var(--r-md);
}

.icon-button--geometry-offcut {
  border-radius: 0;
  clip-path: var(--clip-offcut);
}

.icon-button--geometry-tile {
  border-radius: 0;
  clip-path: var(--clip-tile);
}

.icon-button--geometry-cut {
  border-radius: 0;
  background: var(--ink-4);
  box-shadow: var(--shadow-cut), var(--ring);
}

.icon-button--tone-wire {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--ink-5);
  color: var(--ivory-2);
}

.icon-button--tone-hairline {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--hairline);
  color: var(--ivory-4);
}

.icon-button--tone-solid,
.icon-button--pressed {
  background: var(--ivory);
  box-shadow: none;
  color: var(--ink);
}

.icon-button--tone-brassSignal {
  color: var(--brass-edge);
}

.icon-button--tone-brassFill {
  box-shadow: none;
  color: var(--brass-edge);
}

.icon-button--tone-brassWire {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--brass);
  color: var(--brass);
}

.icon-button--tone-brassWire:hover {
  box-shadow: var(--shadow-glow-brass);
}

.icon-button--tone-brassGlow {
  background: transparent;
  box-shadow: var(--shadow-glow-brass);
  color: var(--ivory);
}

.icon-button--tone-brassGlow:hover {
  box-shadow: var(--shadow-glow-brass), 0 0 20px rgba(224,169,58,.65);
}

.icon-button :deep(svg) {
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .icon-button {
    transition: none !important;
  }

  .icon-button.brass,
  .icon-button--tone-brassWire,
  .icon-button--tone-brassGlow {
    animation: none !important;
  }
}
</style>
