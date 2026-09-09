<template>
  <main class="pattern-reel-page">
    <nav class="pattern-reel-page__top-links" aria-label="PatternReel variants">
      <span>Variants</span>
      <a
        v-for="option in variants"
        :key="option.id"
        :href="`?variant=${option.id}`"
        :aria-current="variant === option.id ? 'page' : undefined"
        @click.prevent="setVariant(option.id)"
      >
        {{ option.label }}
      </a>
    </nav>

    <header class="pattern-reel-page__intro">
      <div>
        <span class="pattern-reel-page__kicker">Temporary workbench · isolated route</span>
        <h1>PatternReel</h1>
      </div>

      <p>{{ activeVariant.thesis }}</p>

      <ul aria-label="Prototype boundaries">
        <li>In-memory only</li>
        <li>No audio</li>
        <li>No production store</li>
        <li>PatternStrip + CodeStrip Bar are scaffolds</li>
      </ul>
    </header>

    <section class="pattern-reel-page__stage" aria-label="PatternReel prototype stage">
      <div class="pattern-reel-page__stage-head">
        <span>Drawer slice</span>
        <span>{{ activeVariant.label }}</span>
      </div>

      <div class="pattern-reel-page__instrument-slice">
        <PatternReelPrototype
          :items="items"
          :selected-id="selectedId"
          :variant="variant"
          @commit="handleCommit"
          @state="reelState = $event"
          @action="handleAction"
        />

        <PatternReelCodeStripScaffold
          :item="selectedItem"
          @action="handleCodebarAction"
        />
      </div>
    </section>

    <aside class="pattern-reel-page__readout" aria-label="Prototype state">
      <div>
        <span>Committed pattern</span>
        <strong>{{ selectedItem.name }}</strong>
      </div>
      <div>
        <span>Reel preview</span>
        <strong>{{ previewItem.name }}</strong>
      </div>
      <div>
        <span>Last input</span>
        <strong>{{ reelState.input }}</strong>
      </div>
      <div>
        <span>Reel posture</span>
        <strong>{{ reelState.posture }}</strong>
      </div>
      <div>
        <span>CodeStrip contract</span>
        <strong>Changes on commit</strong>
      </div>
      <output aria-live="polite">{{ lastAction }}</output>
    </aside>

    <nav
      v-if="isDev"
      class="pattern-reel-page__switcher"
      aria-label="PatternReel prototype variants"
    >
      <button
        v-for="option in variants"
        :key="option.id"
        type="button"
        :aria-pressed="variant === option.id"
        @click="setVariant(option.id)"
      >
        <span>{{ option.shortLabel }}</span>
        {{ option.label }}
      </button>
    </nav>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import PatternReelCodeStripScaffold from "./PatternReelCodeStripScaffold.vue";
import PatternReelPrototype from "./PatternReelPrototype.vue";
import { patternReelPrototypeItems } from "./prototypeData";
import type {
  PatternReelPrototypeInput,
  PatternReelPrototypeState,
  PatternReelPrototypeVariant,
} from "./types";

const variants: Array<{
  id: PatternReelPrototypeVariant;
  shortLabel: string;
  label: string;
  thesis: string;
}> = [
  {
    id: "wheel",
    shortLabel: "B",
    label: "Wheel deck",
    thesis: "The chosen wheel springs open with a visible end bounce, holds fully open for 900ms, then gathers with the same playful rebound.",
  },
  {
    id: "steps",
    shortLabel: "A",
    label: "Paper steps",
    thesis: "Restrained depth keeps each PatternStrip legible while still carrying the stack into the bottom selection slot.",
  },
  {
    id: "cassette",
    shortLabel: "C",
    label: "Tight cassette",
    thesis: "A compact low-travel reel tests whether the PatternReel should surrender depth to preserve drawer height.",
  },
];

const isDev = import.meta.env.DEV;
const items = patternReelPrototypeItems;
const initialVariant = new URLSearchParams(window.location.search).get("variant");
const variant = ref<PatternReelPrototypeVariant>(
  variants.some((option) => option.id === initialVariant)
    ? initialVariant as PatternReelPrototypeVariant
    : "wheel",
);
const selectedId = ref(items[items.length - 1].id);
const reelState = ref<PatternReelPrototypeState>({
  input: "initial",
  previewId: selectedId.value,
  settling: false,
  posture: variant.value === "wheel" ? "deck" : "fixed",
});
const lastAction = ref("Ready · the one-note Current take starts selected");
let previousTitle = "";

const activeVariant = computed(() => (
  variants.find((option) => option.id === variant.value) ?? variants[0]
));

const selectedItem = computed(() => (
  items.find((item) => item.id === selectedId.value) ?? items[items.length - 1]
));

const previewItem = computed(() => (
  items.find((item) => item.id === reelState.value.previewId) ?? selectedItem.value
));

function setVariant(nextVariant: PatternReelPrototypeVariant) {
  variant.value = nextVariant;
  const url = new URL(window.location.href);
  url.searchParams.set("variant", nextVariant);
  window.history.replaceState({}, "", url);
  lastAction.value = `Variant changed · ${activeVariant.value.label}`;
}

function handleCommit(id: string, input: PatternReelPrototypeInput) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) return;
  selectedId.value = id;
  lastAction.value = `${item.name} committed by ${input} · CodeStrip context updated`;
}

function handleAction(action: string) {
  lastAction.value = `${action} intent · prototype action is inert`;
}

function handleCodebarAction(action: string) {
  lastAction.value = `${action} intent · CodeStrip Bar is visual context only`;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches("input, textarea, select, [contenteditable='true']");
}

function handleVariantKeys(event: KeyboardEvent) {
  if (isEditableTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const currentIndex = variants.findIndex((option) => option.id === variant.value);
  const direction = event.key === "ArrowRight" ? 1 : -1;
  const nextIndex = (currentIndex + direction + variants.length) % variants.length;
  setVariant(variants[nextIndex].id);
}

onMounted(() => {
  previousTitle = document.title;
  document.title = "PatternReel Prototype · EmotiTone";
  window.addEventListener("keydown", handleVariantKeys);
});

onBeforeUnmount(() => {
  document.title = previousTitle;
  window.removeEventListener("keydown", handleVariantKeys);
});
</script>

<style scoped>
.pattern-reel-page {
  min-height: 100vh;
  padding: clamp(24px, 4vw, 52px) clamp(14px, 4vw, 48px) 112px;
  background:
    radial-gradient(circle at 50% 18%, color-mix(in srgb, var(--ink-5) 42%, transparent), transparent 34%),
    var(--ink);
  color: var(--ivory);
}

.pattern-reel-page__intro,
.pattern-reel-page__stage,
.pattern-reel-page__readout,
.pattern-reel-page__top-links {
  width: min(720px, 100%);
  margin-inline: auto;
}

.pattern-reel-page__top-links {
  position: sticky;
  z-index: 90;
  top: var(--s-4);
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: var(--s-7);
  padding: 4px;
  background: var(--ink-2);
  box-shadow: var(--ring);
}

.pattern-reel-page__top-links > span {
  padding: 8px 12px;
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: .12em;
  text-transform: uppercase;
}

.pattern-reel-page__top-links a {
  flex: 1;
  padding: 8px 10px;
  color: var(--ivory-3);
  font: var(--t-label);
  letter-spacing: .08em;
  text-align: center;
  text-decoration: none;
  text-transform: uppercase;
}

.pattern-reel-page__top-links a:hover {
  background: var(--ink-3);
  color: var(--ivory);
}

.pattern-reel-page__top-links a[aria-current="page"] {
  background: var(--ivory);
  color: var(--ink);
}

.pattern-reel-page__top-links a:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -3px;
}

.pattern-reel-page__intro {
  display: grid;
  grid-template-columns: minmax(0, .75fr) minmax(260px, 1.25fr);
  align-items: end;
  gap: var(--s-7) var(--s-9);
  margin-bottom: var(--s-8);
}

.pattern-reel-page__intro h1 {
  margin: 6px 0 0;
  color: var(--ivory);
  font: var(--t-display-l);
  letter-spacing: var(--tracking-display);
  line-height: .9;
  text-transform: uppercase;
}

.pattern-reel-page__kicker {
  color: var(--brass);
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.pattern-reel-page__intro p {
  max-width: 58ch;
  margin: 0;
  color: var(--ivory-2);
  font: var(--t-body-s-mono);
}

.pattern-reel-page__intro ul {
  display: flex;
  grid-column: 1 / -1;
  flex-wrap: wrap;
  gap: var(--s-4);
  margin: calc(-1 * var(--s-3)) 0 0;
  padding: 0;
  color: var(--ivory-3);
  font: var(--t-caption);
  list-style: none;
  text-transform: uppercase;
}

.pattern-reel-page__intro li {
  padding: 4px 7px;
  border: 1px solid var(--hairline);
}

.pattern-reel-page__stage {
  padding: var(--s-4);
  background: var(--ink-3);
  box-shadow: var(--shadow-cut);
}

.pattern-reel-page__stage-head {
  display: flex;
  justify-content: space-between;
  padding: 2px var(--s-2) var(--s-4);
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: .14em;
  text-transform: uppercase;
}

.pattern-reel-page__stage-head span:last-child {
  color: var(--ivory);
}

.pattern-reel-page__instrument-slice {
  display: grid;
  gap: var(--s-4);
}

.pattern-reel-page__readout {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  margin-top: var(--s-7);
  background: var(--hairline);
  border: 1px solid var(--hairline);
}

.pattern-reel-page__readout > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--s-2);
  padding: var(--s-5);
  background: var(--ink-2);
}

.pattern-reel-page__readout span {
  color: var(--ivory-3);
  font: var(--t-caption);
  text-transform: uppercase;
}

.pattern-reel-page__readout strong {
  overflow: hidden;
  color: var(--ivory);
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pattern-reel-page__readout output {
  grid-column: 1 / -1;
  padding: var(--s-4) var(--s-5);
  background: var(--ink);
  color: var(--ivory-2);
  font: var(--t-caption);
  text-align: right;
}

.pattern-reel-page__switcher {
  position: fixed;
  z-index: 100;
  bottom: 18px;
  left: 50%;
  display: flex;
  width: min(560px, calc(100vw - 28px));
  gap: 2px;
  padding: 4px;
  background: color-mix(in srgb, var(--ink-2) 92%, transparent);
  box-shadow: 0 16px 42px rgba(0, 0, 0, .48), var(--ring);
  backdrop-filter: blur(14px);
  transform: translateX(-50%);
}

.pattern-reel-page__switcher button {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: var(--s-3);
  padding: 10px 12px;
  border: 0;
  background: transparent;
  color: var(--ivory-3);
  cursor: pointer;
  font: var(--t-label);
  letter-spacing: .08em;
  text-transform: uppercase;
}

.pattern-reel-page__switcher button:hover {
  background: var(--ink-3);
  color: var(--ivory);
}

.pattern-reel-page__switcher button[aria-pressed="true"] {
  background: var(--ivory);
  color: var(--ink);
}

.pattern-reel-page__switcher button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -3px;
}

.pattern-reel-page__switcher span {
  display: inline-grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-family: var(--font-mono);
  font-size: 9px;
}

@media (max-width: 720px) {
  .pattern-reel-page__intro {
    grid-template-columns: 1fr;
    gap: var(--s-5);
  }

  .pattern-reel-page__intro ul {
    grid-column: auto;
    margin-top: 0;
  }

  .pattern-reel-page__readout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .pattern-reel-page {
    padding-inline: 10px;
  }

  .pattern-reel-page__stage {
    padding: var(--s-3);
  }

  .pattern-reel-page__readout {
    grid-template-columns: 1fr;
  }

  .pattern-reel-page__switcher button {
    padding-inline: 7px;
    font-size: 9px;
  }

  .pattern-reel-page__top-links {
    align-items: stretch;
  }

  .pattern-reel-page__top-links > span {
    display: none;
  }

  .pattern-reel-page__top-links a {
    display: grid;
    min-height: 40px;
    place-items: center;
    padding-inline: 5px;
    font-size: 9px;
  }
}

@media (max-height: 680px) {
  .pattern-reel-page__intro {
    margin-bottom: var(--s-5);
  }

  .pattern-reel-page__intro p,
  .pattern-reel-page__intro ul,
  .pattern-reel-page__readout {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pattern-reel-page__switcher,
  .pattern-reel-page__switcher button {
    transition: none;
  }
}

@media (forced-colors: active) {
  .pattern-reel-page,
  .pattern-reel-page__stage,
  .pattern-reel-page__readout,
  .pattern-reel-page__readout > div,
  .pattern-reel-page__readout output,
  .pattern-reel-page__switcher {
    background: Canvas;
    color: CanvasText;
  }
}
</style>
