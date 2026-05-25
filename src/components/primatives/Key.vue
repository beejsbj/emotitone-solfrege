<template>
  <div
    class="key-face"
    :class="classes"
    :style="styleVars"
    :aria-disabled="disabled || undefined"
  >
    <span class="key-face__syllable">{{ syllable }}</span>
    <span class="key-face__degree">{{ degree }}</span>
    <span class="key-face__raw">{{ raw }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type KeyNote =
  | "do"
  | "ra"
  | "re"
  | "me"
  | "mi"
  | "fa"
  | "fi"
  | "se"
  | "sol"
  | "le"
  | "la"
  | "te"
  | "ti";

export type KeyFormat = "syllable" | "degree" | "raw";
export type KeyShape = "strip" | "tile" | "offcut" | "tab" | "pill" | "tall" | "squary" | "wide" | "hero";

const props = withDefaults(
  defineProps<{
    note?: KeyNote;
    syllable?: string;
    degree?: string;
    raw?: string;
    format?: KeyFormat;
    shape?: KeyShape;
    pressed?: boolean;
    disabled?: boolean;
  }>(),
  {
    note: "do",
    syllable: "Do",
    degree: "I",
    raw: "C4",
    format: "degree",
    shape: "strip",
    pressed: false,
    disabled: false,
  },
);

const classes = computed(() => [
  `key-face--note-${props.note}`,
  `key-face--format-${props.format}`,
  `key-face--shape-${props.shape}`,
  {
    "key-face--pressed": props.pressed,
    "key-face--disabled": props.disabled,
  },
]);

const styleVars = computed(() => ({
  "--key-bg": `var(--note-${props.note})`,
}));
</script>

<style scoped>
.key-face {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  width: 56px;
  height: 88px;
  padding: 9px 8px 10px;
  overflow: hidden;
  border-radius: var(--r-sm);
  background: var(--key-bg, var(--note-do));
  box-shadow: var(--shadow-key);
  clip-path: var(--clip-tile);
  cursor: pointer;
  user-select: none;
  transition:
    box-shadow var(--dur-tap) var(--ease-stab),
    filter var(--dur-tap) var(--ease-stab),
    transform var(--dur-tap) var(--ease-stab);
}

.key-face::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(110% 60% at 50% 0%, rgba(255, 255, 255, .18), transparent 55%),
    linear-gradient(180deg, transparent 65%, rgba(0, 0, 0, .22) 100%);
  mix-blend-mode: overlay;
}

.key-face__syllable,
.key-face__degree,
.key-face__raw {
  position: relative;
  z-index: 1;
  line-height: 1;
  color: rgba(0, 0, 0, .55);
}

.key-face__syllable {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 9px;
  letter-spacing: .15em;
  text-transform: uppercase;
}

.key-face__degree {
  margin: auto 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 32px;
  line-height: .85;
  color: rgba(0, 0, 0, .85);
}

.key-face__raw {
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.key-face--format-syllable .key-face__syllable {
  font-size: 24px;
  letter-spacing: .04em;
  color: rgba(0, 0, 0, .85);
}

.key-face--format-syllable .key-face__degree {
  margin: 0;
  font-size: 12px;
  color: rgba(0, 0, 0, .55);
}

.key-face--format-syllable .key-face__raw {
  color: rgba(0, 0, 0, .45);
}

.key-face--format-raw .key-face__syllable {
  color: rgba(0, 0, 0, .45);
}

.key-face--format-raw .key-face__degree {
  margin: 0;
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
}

.key-face--format-raw .key-face__raw {
  font-size: 18px;
  letter-spacing: .04em;
  color: rgba(0, 0, 0, .85);
}

.key-face--pressed {
  box-shadow: var(--shadow-pressed);
  filter: brightness(.88);
  transform: translateY(1px);
}

.key-face--disabled {
  filter: saturate(.12) brightness(.45);
  cursor: not-allowed;
}

.key-face--shape-hero {
  width: 80px;
  height: 130px;
  transform: rotate(-.2deg);
}

.key-face--shape-hero .key-face__degree {
  font-size: 44px;
}

.key-face--shape-hero .key-face__syllable {
  font-size: 11px;
}

.key-face--shape-hero .key-face__raw {
  font-size: 9px;
}

.key-face--shape-tile,
.key-face--shape-offcut,
.key-face--shape-tab {
  width: 88px;
  height: 88px;
  border-radius: 0;
}

.key-face--shape-tile {
  clip-path: var(--clip-tile);
}

.key-face--shape-offcut {
  clip-path: var(--clip-offcut);
}

.key-face--shape-tab {
  clip-path: var(--clip-tab);
}

.key-face--shape-tile .key-face__degree {
  font-size: 44px;
}

.key-face--shape-offcut .key-face__degree,
.key-face--shape-tab .key-face__degree {
  font-size: 40px;
}

.key-face--shape-pill {
  clip-path: none;
  border-radius: 44px;
}

.key-face--shape-squary {
  width: 72px;
  height: 72px;
}

.key-face--shape-squary .key-face__degree {
  font-size: 28px;
}

.key-face--shape-wide {
  width: 120px;
  height: 56px;
  padding: 6px 12px 8px;
  flex-direction: row;
  align-items: center;
}

.key-face--shape-wide .key-face__syllable {
  align-self: flex-start;
}

.key-face--shape-wide .key-face__degree {
  margin: 0;
  align-self: center;
  font-size: 24px;
}

.key-face--shape-wide .key-face__raw {
  align-self: flex-end;
}

.key-face--shape-tall {
  width: 40px;
  height: 116px;
  padding: 8px 5px 9px;
}

.key-face--shape-tall .key-face__syllable {
  font-size: 7px;
}

.key-face--shape-tall .key-face__degree {
  font-size: 20px;
}

.key-face--shape-tall .key-face__raw {
  font-size: 6px;
}

@media (prefers-reduced-motion: reduce) {
  .key-face {
    transition: none;
  }
}
</style>
