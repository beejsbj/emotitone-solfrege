<template>
  <button
    v-if="shape === 'sleek'"
    type="button"
    class="pattern-card pattern-card--sleek"
    :style="cardStyle"
  >
    <div class="pattern-card__row">
      <span class="pattern-card__spine"></span>
      <span class="pattern-card__num">{{ num }}</span>
      <span class="pattern-card__meta">
        <span class="pattern-card__name">{{ name }}</span>
        <span class="pattern-card__sub">{{ sub }}</span>
      </span>
      <span v-if="when" class="pattern-card__when">{{ when }}</span>
    </div>
    <BarTape
      v-if="barTape"
      :mode="barTapeMode"
      frame="flush"
      :segments="barTape"
    />
  </button>

  <article
    v-else
    class="pattern-card pattern-card--active"
    :style="cardStyle"
  >
    <span class="pattern-card__spine"></span>
    <div class="pattern-card__active-inner">
      <div class="pattern-card__active-head">
        <span class="pattern-card__num">{{ num }}</span>
        <div class="pattern-card__active-copy">
          <div class="pattern-card__name">{{ name }}</div>
          <div class="pattern-card__sub">{{ sub }}</div>
        </div>
        <div
          v-if="showActions"
          class="pattern-card__icon-row"
          aria-label="Pattern controls"
        >
          <IconButton
            v-for="action in defaultActions"
            :key="action.label"
            size="sm"
            geometry="sharp"
            :title="action.label"
            :aria-label="action.label"
          >
            <component :is="action.icon" />
          </IconButton>
        </div>
      </div>

      <CodeStrip
        v-if="codeTokens"
        class="pattern-card__code-strip"
        :tokens="codeTokens"
      />

      <div v-if="footerText || statusText" class="pattern-card__active-foot">
        <span v-if="footerText" class="pattern-card__position">{{ footerText }}</span>
        <span v-if="statusText" class="pattern-card__status brass">{{ statusText }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from "vue";
import BarTape from "../primatives/BarTape.vue";
import IconButton from "../primatives/IconButton.vue";
import CodeStrip from "../uniques/CodeStrip.vue";
import type { BarTapeMode, BarTapeSegment } from "../primatives/BarTape.vue";
import type { CodeStripToken } from "../uniques/CodeStrip.vue";

export type PatternCardShape = "sleek" | "active";

const props = withDefaults(
  defineProps<{
    shape?: PatternCardShape;
    num: string;
    name: string;
    sub: string;
    spine?: string;
    when?: string;
    barTape?: BarTapeSegment[];
    barTapeMode?: BarTapeMode;
    codeTokens?: CodeStripToken[];
    footerText?: string;
    statusText?: string;
    showActions?: boolean;
  }>(),
  {
    shape: "sleek",
    spine: "var(--tomato)",
    when: undefined,
    barTape: undefined,
    barTapeMode: "equal",
    codeTokens: undefined,
    footerText: undefined,
    statusText: undefined,
    showActions: true,
  },
);

const cardStyle = computed(() => ({
  "--pattern-card-spine": props.spine,
}));

const makeIcon = (name: string, paths: () => ReturnType<typeof h>[]) =>
  defineComponent({
    name,
    setup() {
      return () =>
        h(
          "svg",
          {
            width: 12,
            height: 12,
            viewBox: "0 0 16 16",
            "aria-hidden": "true",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "butt",
            "stroke-linejoin": "miter",
          },
          paths(),
        );
    },
  });

const PlayIcon = defineComponent({
  name: "PatternCardPlayIcon",
  setup() {
    return () =>
      h("svg", { width: 12, height: 12, viewBox: "0 0 14 14", "aria-hidden": "true" }, [
        h("path", { d: "M3 1.5v11l9-5.5z", fill: "currentColor" }),
      ]);
  },
});

const ArmIcon = makeIcon("PatternCardArmIcon", () => [
  h("circle", { cx: "8", cy: "8", r: "4" }),
]);

const DuplicateIcon = makeIcon("PatternCardDuplicateIcon", () => [
  h("path", { d: "M3 5H11V13H3Z" }),
  h("path", { d: "M5 3H13V11" }),
]);

const SendDownIcon = makeIcon("PatternCardSendDownIcon", () => [
  h("path", { d: "M8 2V12" }),
  h("path", { d: "M4 8L8 12L12 8" }),
]);

const defaultActions = [
  { label: "Play", icon: PlayIcon },
  { label: "Arm take", icon: ArmIcon },
  { label: "Duplicate", icon: DuplicateIcon },
  { label: "Send down", icon: SendDownIcon },
];
</script>

<style scoped>
.pattern-card {
  position: relative;
  width: 100%;
  color: var(--ivory);
  font: inherit;
}

.pattern-card--sleek {
  appearance: none;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--hairline);
  background: var(--ink-2);
  cursor: pointer;
  text-align: left;
  transition:
    transform var(--dur-panel) var(--ease-swing),
    opacity var(--dur-panel) var(--ease-brush),
    border-color var(--dur-ui) var(--ease-brush),
    background var(--dur-ui) var(--ease-brush);
}

.pattern-card--sleek:hover,
.pattern-card--sleek:focus-visible {
  transform: translateY(-6px) rotate(0deg) scale(1);
  opacity: 1;
  border-color: var(--ink-5);
  background: var(--ink-4);
  outline: none;
}

.pattern-card__row {
  display: grid;
  grid-template-columns: 4px 56px minmax(0, 1fr) 74px;
  align-items: center;
  gap: var(--s-5);
  height: 50px;
  padding: 0 14px 0 0;
}

.pattern-card__spine {
  display: block;
  align-self: stretch;
  background: var(--pattern-card-spine);
}

.pattern-card--active > .pattern-card__spine {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
}

.pattern-card__num {
  color: var(--ivory-4);
  font: var(--t-display-m);
  line-height: .9;
  text-align: center;
  text-transform: uppercase;
}

.pattern-card__meta,
.pattern-card__active-copy {
  min-width: 0;
}

.pattern-card__name {
  display: block;
  overflow: hidden;
  color: var(--ivory);
  font: var(--t-h2);
  letter-spacing: var(--tracking-display);
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pattern-card__sub {
  display: block;
  overflow: hidden;
  margin-top: 3px;
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .14em;
  line-height: 1.2;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pattern-card__when {
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .14em;
  text-align: right;
  text-transform: uppercase;
}

.pattern-card--active {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ivory-3);
  background: var(--ink-4);
  box-shadow: var(--ring), 0 8px 0 var(--ink);
}

.pattern-card__active-inner {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  padding: 18px 18px 16px 22px;
}

.pattern-card__active-head {
  display: flex;
  align-items: center;
  gap: var(--s-6);
}

.pattern-card--active .pattern-card__num {
  color: var(--ivory-3);
  font: var(--t-display-l);
  line-height: .9;
}

.pattern-card--active .pattern-card__name {
  font: var(--t-display-m);
}

.pattern-card__active-copy {
  flex: 1;
}

.pattern-card__icon-row {
  display: flex;
  gap: var(--s-3);
}

.pattern-card__code-strip {
  border-right: 0;
  border-left: 0;
  margin-right: -18px;
  margin-left: -22px;
  padding-right: 18px;
  padding-left: 22px;
}

.pattern-card__active-foot {
  display: flex;
  align-items: center;
  gap: var(--s-5);
  border-top: 1px solid var(--hairline);
  padding-top: var(--s-5);
}

.pattern-card__position {
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 10px;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.pattern-card__status {
  display: inline-flex;
  align-items: center;
  gap: var(--s-3);
  margin-left: auto;
  border-radius: 0;
  padding: 4px 10px;
  font: var(--t-mono);
  font-size: 10px;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.pattern-card__status::before {
  width: 8px;
  height: 8px;
  background: var(--brass-edge);
  content: "";
}

@media (prefers-reduced-motion: reduce) {
  .pattern-card {
    transition-duration: 0ms;
    animation: none;
  }
}
</style>
