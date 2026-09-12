<template>
  <article class="stage-study-scene" :class="`stage-study-scene--${variant}`">
    <header class="stage-study-scene__header">
      <div>
        <span>{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
      </div>
      <p>{{ description }}</p>
    </header>

    <div class="stage-study-scene__frame">
      <svg
        class="stage-study-scene__canvas"
        viewBox="0 0 360 520"
        role="img"
        :aria-label="`${title}: ${description}`"
      >
        <defs>
          <radialGradient :id="`${sceneId}-ambient`">
            <stop offset="0" :stop-color="colors[0]" :stop-opacity="ambientOpacity" />
            <stop offset="0.46" :stop-color="colors[4]" :stop-opacity="ambientOpacity * 0.48" />
            <stop offset="1" stop-color="#0A0908" stop-opacity="0" />
          </radialGradient>
          <filter :id="`${sceneId}-glow`" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter :id="`${sceneId}-soft`" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur :stdDeviation="relationshipMode === 'merge' ? 3.5 : 1.2" />
          </filter>
          <linearGradient :id="`${sceneId}-deck`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#211e1a" stop-opacity="0.94" />
            <stop offset="1" stop-color="#0A0908" stop-opacity="0.99" />
          </linearGradient>
        </defs>

        <rect width="360" height="520" fill="#0A0908" />
        <circle
          :cx="center.x"
          :cy="center.y"
          :r="ambientRadius"
          :fill="`url(#${sceneId}-ambient)`"
          :opacity="variant === 'baseline' ? 0.62 : 1"
        />

        <g class="stage-study-scene__strings" :opacity="variant === 'baseline' ? 0.44 : 0.72">
          <path
            v-for="(path, index) in stringPaths"
            :key="`string-${index}`"
            :d="path"
            fill="none"
            :stroke="colors[index % colors.length]"
            :stroke-width="stringWidths[index]"
            stroke-linecap="round"
          />
        </g>

        <g
          v-if="relationshipMode !== 'off'"
          class="stage-study-scene__relationships"
          :filter="`url(#${sceneId}-soft)`"
        >
          <path
            v-for="(edge, index) in relationshipPaths"
            :key="`edge-${index}`"
            :d="edge.path"
            fill="none"
            :stroke="colors[index % colors.length]"
            :stroke-width="relationshipMode === 'merge' ? 12 : 2"
            :stroke-opacity="relationshipMode === 'merge' ? 0.42 : 0.34"
            stroke-linecap="round"
          />
        </g>

        <g class="stage-study-scene__hilbert" :filter="`url(#${sceneId}-glow)`">
          <circle
            :cx="center.x"
            :cy="center.y"
            :r="scopeRadius * 0.72"
            fill="#0A0908"
            fill-opacity="0.34"
            :stroke="colors[0]"
            stroke-opacity="0.12"
          />
          <path
            :d="hilbertPath"
            fill="none"
            :stroke="colors[0]"
            :stroke-width="1.35 + energy * 2.4"
            :stroke-opacity="0.6 + energy * 0.36"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </g>

        <g class="stage-study-scene__blobs">
          <g
            v-for="(blob, index) in blobs"
            :key="`blob-${index}`"
            :transform="`translate(${blob.x} ${blob.y}) scale(${blob.scale})`"
          >
            <circle
              :r="blob.radius + 7"
              :fill="colors[index % colors.length]"
              opacity="0.08"
            />
            <circle
              :r="blob.radius"
              :fill="colors[index % colors.length]"
              :fill-opacity="0.68 + blob.activity * 0.28"
            />
            <circle
              :cx="-blob.radius * 0.2"
              :cy="-blob.radius * 0.22"
              :r="blob.radius * 0.56"
              fill="#F4EFE6"
              fill-opacity="0.08"
            />
          </g>
        </g>

        <g class="stage-study-scene__marks" fill="#F4EFE6" opacity="0.5">
          <path d="M43 92h10M48 87v10" />
          <circle cx="307" cy="74" r="2.5" />
          <path d="m319 251 7 7m0-7-7 7" />
        </g>

        <g class="stage-study-scene__deck">
          <rect
            x="0"
            :y="deckY"
            width="360"
            :height="520 - deckY"
            :fill="`url(#${sceneId}-deck)`"
          />
          <rect x="0" :y="deckY" width="360" height="1" fill="#F4EFE6" opacity="0.16" />
          <g :transform="`translate(0 ${deckY + 12})`">
            <rect x="0" y="0" width="360" height="42" fill="#1B1815" />
            <rect x="0" y="0" width="4" height="42" :fill="colors[0]" />
            <rect x="12" y="9" width="88" height="5" rx="2.5" fill="#F4EFE6" opacity="0.64" />
            <rect x="12" y="22" width="52" height="3" rx="1.5" fill="#8E867A" opacity="0.55" />
            <g fill="none" stroke="#F4EFE6" stroke-opacity="0.44">
              <circle cx="285" cy="21" r="9" />
              <circle cx="315" cy="21" r="9" />
              <circle cx="345" cy="21" r="9" />
            </g>
          </g>
          <rect x="0" :y="deckY + 64" width="360" height="1" fill="#F4EFE6" opacity="0.1" />
          <text x="12" :y="deckY + 82" fill="#8E867A" font-size="8" letter-spacing="1.4">
            PERFORMANCE DECK / OPAQUE TERRITORY
          </text>
        </g>

        <g class="stage-study-scene__labels" fill="#F4EFE6">
          <text :x="center.x" :y="center.y + 4" text-anchor="middle" font-size="8" letter-spacing="1.2" opacity="0.72">
            HILBERT
          </text>
          <text
            v-if="variant !== 'baseline'"
            :x="center.x"
            :y="Math.max(18, center.y - orbitRadiusY - 34)"
            text-anchor="middle"
            font-size="7"
            letter-spacing="1.2"
            opacity="0.4"
          >
            CIRCLE-OF-FIFTHS SUPPORT ORBIT
          </text>
        </g>
      </svg>
      <div class="stage-study-scene__meter" aria-hidden="true">
        <span :style="{ transform: `scaleX(${Math.max(0.025, energy)})` }" />
      </div>
    </div>

    <footer>
      <span>{{ footerLead }}</span>
      {{ footerCopy }}
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, useId } from "vue";

type StageStudyVariant = "baseline" | "gated" | "spectral";
type RelationshipMode = "off" | "merge" | "web";

const props = defineProps<{
  variant: StageStudyVariant;
  energy: number;
  phase: number;
  deckHeight: number;
  relationshipMode: RelationshipMode;
}>();

const sceneId = `stage-study-${useId().replace(/:/g, "")}`;
const colors = [
  "#ff6257",
  "#ff9f43",
  "#f6d365",
  "#60d394",
  "#52b6ff",
  "#8d7dff",
  "#e56cbd",
];

const copy = {
  baseline: {
    eyebrow: "Current reading",
    title: "Shared viewport",
    description: "Bodies compete for the frame; the deck can erase part of the Blob field.",
    footerLead: "Problem",
    footerCopy: "Hilbert reads as one layer among peers, while Ambient remains a fixed wash.",
  },
  gated: {
    eyebrow: "Proposal A",
    title: "Pitch-gated strings",
    description: "One focal system. Notes choose strings; the shared phrase envelope supplies force.",
    footerLead: "Signal",
    footerCopy: "Raw waveform → Hilbert. Pitch/note → selection. Amplitude → chosen strings + breath.",
  },
  spectral: {
    eyebrow: "Proposal B",
    title: "Spectral strings",
    description: "One focal system. Each string follows the energy in its own frequency band.",
    footerLead: "Signal",
    footerCopy: "Raw waveform → Hilbert. Band energy → the whole string field + breath.",
  },
} as const;

const eyebrow = computed(() => copy[props.variant].eyebrow);
const title = computed(() => copy[props.variant].title);
const description = computed(() => copy[props.variant].description);
const footerLead = computed(() => copy[props.variant].footerLead);
const footerCopy = computed(() => copy[props.variant].footerCopy);

const deckY = computed(() => 520 - props.deckHeight);
const center = computed(() => {
  if (props.variant === "baseline") return { x: 180, y: 152 };
  return { x: 180, y: deckY.value * 0.48 };
});
const scopeRadius = computed(() => props.variant === "baseline" ? 61 : Math.min(68, deckY.value * 0.19));
const orbitRadiusX = computed(() => props.variant === "baseline" ? 132 : Math.min(138, deckY.value * 0.39));
const orbitRadiusY = computed(() => props.variant === "baseline" ? 154 : Math.min(126, deckY.value * 0.34));
const ambientOpacity = computed(() => {
  if (props.variant === "baseline") return 0.2;
  return 0.08 + props.energy * 0.34;
});
const ambientRadius = computed(() => {
  if (props.variant === "baseline") return 244;
  return 178 + props.energy * 62;
});

const blobs = computed(() => Array.from({ length: 7 }, (_, index) => {
  const baselineAngle = -Math.PI * 0.74 + index * (Math.PI * 1.48 / 6);
  const orbitAngle = -Math.PI / 2 + index * (Math.PI * 2 / 7);
  const angle = props.variant === "baseline" ? baselineAngle : orbitAngle;
  const activity = index === 0 || index === 3 || index === 5 ? props.energy : props.energy * 0.18;
  const radius = 16 + (index % 3) * 2.2;
  const x = center.value.x + Math.cos(angle) * orbitRadiusX.value;
  const y = center.value.y + Math.sin(angle) * orbitRadiusY.value;
  return {
    x,
    y,
    radius,
    activity,
    scale: 1 + Math.sin(props.phase * 0.74 + index * 1.9) * 0.035 + activity * 0.09,
  };
}));

const relationshipPaths = computed(() => {
  if (props.relationshipMode === "off") return [];
  const targets = props.relationshipMode === "merge"
    ? blobs.value.map((_, index) => [index, (index + 1) % blobs.value.length])
    : [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 3], [1, 5], [2, 6]];
  return targets.map(([fromIndex, toIndex], index) => {
    const from = blobs.value[fromIndex];
    const to = blobs.value[toIndex];
    const bend = (index % 2 ? -1 : 1) * (props.relationshipMode === "merge" ? 8 : 15);
    const mx = (from.x + to.x) / 2 + bend;
    const my = (from.y + to.y) / 2 - bend * 0.44;
    return { path: `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}` };
  });
});

const hilbertPath = computed(() => {
  const points: string[] = [];
  const energy = Math.max(0.025, props.energy);
  for (let index = 0; index <= 150; index += 1) {
    const t = (index / 150) * Math.PI * 2;
    const radius = scopeRadius.value * (0.24 + energy * 0.76);
    const x = center.value.x
      + Math.sin(t * 3 + props.phase * 1.22) * radius
      + Math.sin(t * 13 - props.phase * 0.4) * radius * 0.09;
    const y = center.value.y
      + Math.sin(t * 4 + props.phase * 0.82) * radius * 0.82
      + Math.cos(t * 11 + props.phase * 0.3) * radius * 0.08;
    points.push(`${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return points.join(" ");
});

const stringWidths = computed(() => Array.from({ length: 9 }, (_, index) => {
  if (props.variant === "spectral") return 0.7 + spectralEnergy(index) * 1.4;
  if (props.variant === "gated" && [1, 4, 7].includes(index)) return 1.15 + props.energy * 1.3;
  return 0.7;
}));

const stringPaths = computed(() => Array.from({ length: 9 }, (_, index) => {
  const x = 22 + index * 39.5;
  const selected = [1, 4, 7].includes(index);
  let force = props.variant === "baseline" ? (selected ? props.energy * 0.62 : 0) : 0;
  if (props.variant === "gated") force = selected ? props.energy : 0.02;
  if (props.variant === "spectral") force = spectralEnergy(index);
  const points: string[] = [];
  const endY = Math.max(80, deckY.value - 2);
  for (let step = 0; step <= 32; step += 1) {
    const normalized = step / 32;
    const y = normalized * endY;
    const damping = Math.sin(Math.PI * normalized);
    const vibration = Math.sin(normalized * Math.PI * (6 + index * 0.7) + props.phase * (1.5 + index * 0.08));
    const px = x + vibration * damping * force * 8.5;
    points.push(`${step === 0 ? "M" : "L"} ${px.toFixed(2)} ${y.toFixed(2)}`);
  }
  return points.join(" ");
}));

function spectralEnergy(index: number) {
  const band = 0.5 + 0.5 * Math.sin(props.phase * (0.62 + index * 0.035) + index * 1.54);
  return 0.035 + props.energy * (0.2 + band * 0.8);
}
</script>

<style scoped>
.stage-study-scene {
  display: grid;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  background: var(--ink-2);
}

.stage-study-scene__header {
  min-height: 132px;
  padding: var(--s-5);
  border-bottom: 1px solid color-mix(in srgb, var(--ivory) 10%, transparent);
}

.stage-study-scene__header > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
}

.stage-study-scene__header span,
.stage-study-scene footer span {
  color: var(--brass);
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.stage-study-scene__header h2 {
  min-width: 0;
  margin: 0;
  color: var(--ivory);
  font: var(--t-display-s);
  letter-spacing: var(--tracking-display);
  text-align: right;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.stage-study-scene__header p,
.stage-study-scene footer {
  color: var(--ivory-3);
  font: var(--t-body-s-mono);
}

.stage-study-scene__header p {
  max-width: 42ch;
  margin: var(--s-3) 0 0;
  overflow-wrap: anywhere;
}

.stage-study-scene__frame {
  position: relative;
  overflow: hidden;
  aspect-ratio: 360 / 520;
  background: var(--ink);
}

.stage-study-scene__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.stage-study-scene__marks path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
}

.stage-study-scene__meter {
  position: absolute;
  inset: auto var(--s-3) var(--s-3);
  height: 2px;
  overflow: hidden;
  background: color-mix(in srgb, var(--ivory) 10%, transparent);
}

.stage-study-scene__meter span {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--brass);
  transition: transform 80ms ease-out;
}

.stage-study-scene footer {
  min-height: 96px;
  padding: var(--s-4) var(--s-5) var(--s-5);
}

.stage-study-scene footer span {
  display: block;
  margin-bottom: var(--s-2);
}

@media (prefers-reduced-motion: reduce) {
  .stage-study-scene__meter span {
    transition: none;
  }
}

@media (max-width: 560px) {
  .stage-study-scene__header {
    min-height: 0;
  }

  .stage-study-scene__header > div {
    display: grid;
    justify-content: start;
  }

  .stage-study-scene__header h2 {
    margin-top: var(--s-2);
    text-align: left;
  }
}
</style>
