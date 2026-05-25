<template>
  <div :class="frameClasses">
    <div v-if="label || sublabel" class="knob-primitive__label">
      {{ label }}
      <span v-if="sublabel">{{ sublabel }}</span>
    </div>

    <div :class="knobClasses" aria-hidden="true">
      <template v-if="visual === 'ring'">
        <div class="knob-primitive__ring">
          <span
            v-if="valueLabel"
            class="knob-primitive__value"
            :class="{
              'knob-primitive__value--lit': lit,
              'knob-primitive__value--small': smallValue,
            }"
          >
            {{ valueLabel }}
          </span>
        </div>
      </template>

      <template v-else>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <template v-if="role === 'range'">
            <path class="knob-primitive__track knob-primitive__track--bg" :d="arcPath" />
            <path
              class="knob-primitive__track knob-primitive__track--value"
              pathLength="100"
              :d="arcPath"
              stroke-dasharray="58 100"
            />
          </template>

          <template v-else-if="role === 'boolean'">
            <path
              class="knob-primitive__track knob-primitive__track--value"
              pathLength="100"
              :d="arcPath"
              stroke-dasharray="80 100"
            />
          </template>

          <template v-else-if="role === 'options'">
            <circle
              class="knob-primitive__track knob-primitive__track--bg"
              cx="50"
              cy="50"
              r="42"
              pathLength="100"
            />
            <g transform="rotate(-90 50 50)">
              <circle
                class="knob-primitive__track knob-primitive__track--value"
                cx="50"
                cy="50"
                r="42"
                pathLength="100"
                stroke-dasharray="12.5 87.5"
                stroke-dashoffset="6.25"
              />
              <circle
                class="knob-primitive__track knob-primitive__track--segment"
                cx="50"
                cy="50"
                r="42"
                pathLength="100"
                stroke-dasharray="12.5 87.5"
                stroke-dashoffset="-43.75"
              />
            </g>
          </template>

          <template v-else>
            <circle class="knob-primitive__track knob-primitive__track--bg" cx="50" cy="50" r="42" />
            <g class="knob-primitive__seg-rotate">
              <g transform="rotate(-90 50 50)">
                <circle
                  class="knob-primitive__track knob-primitive__track--value"
                  cx="50"
                  cy="50"
                  r="42"
                  pathLength="100"
                  stroke-dasharray="25 75"
                  stroke-dashoffset="12.5"
                />
              </g>
            </g>
          </template>
        </svg>

        <span
          v-if="role === 'boolean' && tone === 'brass'"
          class="knob-primitive__ball"
        />

        <div class="knob-primitive__center">
          <span v-if="role === 'button'" class="knob-primitive__glyph">
            <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="2.2" fill="currentColor" />
              <path
                d="M3.5 8a4.5 4.5 0 0 1 9 0M2 8a6 6 0 0 1 12 0"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="butt"
              />
            </svg>
          </span>
          <span
            v-else-if="valueLabel"
            class="knob-primitive__num"
            :class="{ 'knob-primitive__num--lit': lit }"
          >
            {{ valueLabel }}
          </span>
        </div>
      </template>
    </div>

    <div v-if="foot" class="knob-primitive__foot">{{ foot }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type KnobVisual = "ring" | "arc";
export type KnobRole = "range" | "boolean" | "options" | "button";
export type KnobTone = "brass" | "ivory";
export type KnobSize = "md" | "hero";

const props = withDefaults(
  defineProps<{
    visual?: KnobVisual;
    role?: KnobRole;
    tone?: KnobTone;
    size?: KnobSize;
    valueLabel?: string;
    label?: string;
    sublabel?: string;
    foot?: string;
    lit?: boolean;
    played?: boolean;
    disabled?: boolean;
    framed?: boolean;
  }>(),
  {
    visual: "ring",
    role: "range",
    tone: "brass",
    size: "md",
    valueLabel: undefined,
    label: undefined,
    sublabel: undefined,
    foot: undefined,
    lit: false,
    played: false,
    disabled: false,
    framed: false,
  },
);

const arcPath = "M 25.31 83.98 A 42 42 0 1 1 74.69 83.98";

const smallValue = computed(() => props.valueLabel !== undefined && props.valueLabel.length > 2);

const frameClasses = computed(() => [
  "knob-primitive-frame",
  {
    "knob-primitive-frame--framed": props.framed || props.label || props.sublabel || props.foot,
  },
]);

const knobClasses = computed(() => [
  "knob-primitive",
  `knob-primitive--${props.visual}`,
  `knob-primitive--${props.role}`,
  `knob-primitive--tone-${props.tone}`,
  `knob-primitive--${props.size}`,
  {
    "knob-primitive--lit": props.lit,
    "knob-primitive--played": props.played,
    "knob-primitive--disabled": props.disabled,
  },
]);
</script>

<style scoped>
.knob-primitive-frame {
  display: grid;
  justify-items: center;
  align-items: center;
}

.knob-primitive-frame--framed {
  min-height: 132px;
  padding: 8px 5px 7px;
  grid-template-rows: auto 1fr auto;
  gap: 5px;
  box-sizing: border-box;
  background: var(--ink);
  border: 1px solid var(--hairline);
  box-shadow: var(--ring);
}

.knob-primitive__label,
.knob-primitive__foot {
  width: 100%;
  font-family: var(--font-mono);
  text-transform: uppercase;
  text-align: center;
}

.knob-primitive__label {
  min-height: 24px;
  padding: 0 4px 5px;
  border-bottom: 1px solid var(--hairline);
  color: var(--ivory-3);
  font-weight: 600;
  font-size: 8px;
  line-height: 1.25;
  letter-spacing: .12em;
  box-sizing: border-box;
}

.knob-primitive__label span {
  display: block;
  color: var(--ivory-4);
  font-weight: 500;
}

.knob-primitive__foot {
  min-height: 18px;
  color: var(--ivory-4);
  font-size: 8px;
  line-height: 1.2;
  letter-spacing: .08em;
}

.knob-primitive {
  position: relative;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
}

.knob-primitive--hero {
  width: 128px;
  height: 128px;
}

.knob-primitive--ring .knob-primitive__ring {
  position: relative;
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 1px solid var(--ink-5);
  background: radial-gradient(circle at 50% 35%, var(--ink-4) 0%, var(--ink-2) 70%);
}

.knob-primitive--hero.knob-primitive--ring .knob-primitive__ring {
  width: 98px;
  height: 98px;
}

.knob-primitive--ring .knob-primitive__ring::before {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  -webkit-mask: radial-gradient(circle, transparent 60%, var(--ink) 61%);
  mask: radial-gradient(circle, transparent 60%, var(--ink) 61%);
}

.knob-primitive--ring.knob-primitive--range .knob-primitive__ring::before {
  background: conic-gradient(
    from -135deg,
    var(--ivory-3) 0%, var(--ivory-3) 64%,
    transparent 64%, transparent 100%);
}

.knob-primitive--ring.knob-primitive--range.knob-primitive--lit .knob-primitive__ring::before {
  background: conic-gradient(
    from -135deg,
    var(--brass) 0%, var(--brass) 64%,
    transparent 64%, transparent 100%);
  filter: drop-shadow(0 0 6px var(--brass));
}

.knob-primitive--ring.knob-primitive--boolean.knob-primitive--lit .knob-primitive__ring::before {
  background: conic-gradient(var(--brass) 0% 75%, transparent 75% 100%);
  filter: drop-shadow(0 0 6px var(--brass));
}

.knob-primitive--ring.knob-primitive--options .knob-primitive__ring::before {
  background: conic-gradient(
    from -135deg,
    var(--brass) 0% 18.75%,
    transparent 18.75% 25%,
    var(--ivory-3) 25% 43.75%,
    transparent 43.75% 50%,
    var(--ivory-3) 50% 68.75%,
    transparent 68.75% 75%,
    var(--ivory-3) 75% 93.75%,
    transparent 93.75% 100%);
}

@keyframes knob-spin360 {
  to {
    transform: rotate(360deg);
  }
}

.knob-primitive--ring.knob-primitive--button .knob-primitive__ring::before {
  background: conic-gradient(var(--brass) 0% 25%, transparent 25% 100%);
  filter: drop-shadow(0 0 6px var(--brass));
  animation: knob-spin360 calc(var(--beat) * 5) var(--ease-sustain) infinite;
}

.knob-primitive--ring.knob-primitive--tone-ivory.knob-primitive--range .knob-primitive__ring::before {
  background: conic-gradient(
    from -135deg,
    var(--ivory) 0%, var(--ivory) 64%,
    transparent 64%, transparent 100%);
  filter: none;
}

.knob-primitive--ring.knob-primitive--tone-ivory.knob-primitive--boolean .knob-primitive__ring::before {
  background: conic-gradient(var(--ivory) 0% 75%, transparent 75% 100%);
  filter: none;
}

.knob-primitive--ring.knob-primitive--tone-ivory.knob-primitive--options .knob-primitive__ring::before {
  background: conic-gradient(
    from -135deg,
    var(--ivory) 0% 18.75%,
    transparent 18.75% 25%,
    var(--ivory-3) 25% 43.75%,
    transparent 43.75% 50%,
    var(--ivory-3) 50% 68.75%,
    transparent 68.75% 75%,
    var(--ivory-3) 75% 93.75%,
    transparent 93.75% 100%);
  filter: none;
}

.knob-primitive--ring.knob-primitive--tone-ivory.knob-primitive--button .knob-primitive__ring::before {
  background: conic-gradient(var(--ivory) 0% 25%, transparent 25% 100%);
  filter: none;
}

.knob-primitive--ring.knob-primitive--played .knob-primitive__ring {
  box-shadow: var(--shadow-glow-brass), 0 0 30px rgba(224, 169, 58, .35);
}

.knob-primitive--ring.knob-primitive--played .knob-primitive__ring::before {
  filter: drop-shadow(0 0 8px var(--brass));
}

.knob-primitive__value {
  position: relative;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  line-height: 1;
  color: var(--ivory);
}

.knob-primitive__value--lit {
  color: var(--brass-hi);
}

.knob-primitive--tone-ivory .knob-primitive__value--lit {
  color: var(--ivory);
}

.knob-primitive__value--small {
  font-size: 14px;
}

.knob-primitive--hero .knob-primitive__value {
  font-size: 28px;
}

.knob-primitive--arc svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.knob-primitive__track {
  fill: none;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}

.knob-primitive__track--bg {
  stroke: var(--ivory);
  stroke-opacity: .18;
  stroke-width: 2;
}

.knob-primitive__track--value,
.knob-primitive__track--segment {
  stroke: var(--ivory);
  stroke-width: 8;
}

.knob-primitive--tone-brass .knob-primitive__track--value {
  stroke: var(--brass);
  filter: drop-shadow(0 0 6px rgba(224, 169, 58, .55));
}

.knob-primitive--arc.knob-primitive--played {
  box-shadow: var(--shadow-glow-brass);
  border-radius: 50%;
}

.knob-primitive--arc.knob-primitive--played .knob-primitive__track--value {
  filter: drop-shadow(0 0 10px var(--brass)) drop-shadow(0 0 22px var(--brass));
}

.knob-primitive__ball {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  background: var(--brass-fill);
  box-shadow: var(--shadow-glow-brass);
}

.knob-primitive--hero .knob-primitive__ball {
  width: 40px;
  height: 40px;
}

.knob-primitive__center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: var(--ivory);
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1;
}

.knob-primitive__num {
  font-size: 20px;
  letter-spacing: var(--tracking-display);
}

.knob-primitive__num--lit {
  color: var(--brass-hi);
}

.knob-primitive--tone-ivory .knob-primitive__num--lit {
  color: var(--ivory);
}

.knob-primitive--hero .knob-primitive__num {
  font-size: 36px;
}

.knob-primitive__glyph {
  display: grid;
  place-items: center;
  color: var(--brass-hi);
}

.knob-primitive--tone-ivory .knob-primitive__glyph {
  color: var(--ivory);
}

.knob-primitive__seg-rotate {
  transform-origin: 50% 50%;
  animation: knob-spin360 calc(var(--beat) * 5) var(--ease-sustain) infinite;
}

.knob-primitive--disabled {
  filter: saturate(.1) brightness(.55);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .knob-primitive--ring.knob-primitive--button .knob-primitive__ring::before,
  .knob-primitive__seg-rotate {
    animation: none;
  }
}
</style>
