<template>
  <AnatomyDisplay
    title="Buttons &middot; Icon-Button Primitive"
    :features="features"
    caption="Icon-only controls use ink/ivory hardware chrome by default. Brass remains a signal treatment, not the default button language. The specimen owns only staging, labels, and paired-button demonstration wrappers."
  >
    <template #hero>
      <div class="states-cluster">
        <div v-for="state in stateExamples" :key="state.label" class="state-unit">
          <IconButton
            :simulated-state="state.simulatedState"
            :disabled="state.disabled"
            :title="state.label"
            :aria-label="state.label"
          >
            <PlayIcon />
          </IconButton>
          <span>{{ state.label }}</span>
        </div>
      </div>
    </template>

    <VariantGrid title="Variants &mdash; Geometry">
      <VariantCell
        v-for="variant in geometryExamples"
        :key="variant.geometry"
        :caption="variant.caption"
      >
        <IconButton :geometry="variant.geometry" :title="variant.label" :aria-label="variant.label">
          <component :is="variant.icon" />
        </IconButton>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Fill and signal">
      <VariantCell
        v-for="variant in toneExamples"
        :key="variant.tone"
        :caption="variant.caption"
        :stage="variant.stage"
      >
        <IconButton
          :tone="variant.tone"
          :geometry="variant.geometry"
          :title="variant.label"
          :aria-label="variant.label"
        >
          <component :is="variant.icon" />
        </IconButton>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Toggle and size">
      <VariantCell caption="Toggle off &middot; wire rest">
        <IconButton tone="wire" :pressed="false" aria-label="Toggle off" title="Toggle off">
          <SpeakerIcon />
        </IconButton>
      </VariantCell>
      <VariantCell caption="Toggle on &middot; ivory fill">
        <IconButton :pressed="true" aria-label="Toggle on" title="Toggle on">
          <MutedIcon />
        </IconButton>
      </VariantCell>
      <VariantCell caption="SM / MD / LG &middot; 32 / 40 / 48px">
        <div class="size-row">
          <IconButton size="sm" aria-label="Small" title="Small"><PlayIcon size="10" /></IconButton>
          <IconButton aria-label="Medium" title="Medium"><PlayIcon /></IconButton>
          <IconButton size="lg" aria-label="Large" title="Large"><PlayIcon size="18" /></IconButton>
        </div>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Paired controls">
      <VariantCell caption="Vertical pair &middot; shared shell">
        <div class="icon-button-pair">
          <IconButton size="sm" aria-label="Up octave" title="Up octave">
            <UpIcon />
          </IconButton>
          <IconButton size="sm" aria-label="Down octave" title="Down octave">
            <DownIcon />
          </IconButton>
        </div>
      </VariantCell>
      <VariantCell caption="Trio pair &middot; hairline dividers">
        <div class="icon-button-pair">
          <IconButton size="sm" aria-label="Bars" title="Bars">
            <BarsIcon />
          </IconButton>
          <IconButton size="sm" aria-label="Dots" title="Dots">
            <DotsIcon />
          </IconButton>
          <IconButton size="sm" aria-label="Back" title="Back">
            <BackIcon />
          </IconButton>
        </div>
      </VariantCell>
      <VariantCell caption="Pattern rail &middot; sharp sm">
        <div class="icon-row">
          <IconButton
            v-for="action in patternActions"
            :key="action.label"
            size="sm"
            geometry="sharp"
            :aria-label="action.label"
            :title="action.label"
          >
            <component :is="action.icon" />
          </IconButton>
        </div>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { defineComponent, h } from "vue";
import IconButton from "../../components/primatives/IconButton.vue";
import type {
  IconButtonGeometry,
  IconButtonSimulatedState,
  IconButtonTone,
} from "../../components/primatives/IconButton.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

type IconSize = string | number;

const svgAttrs = (size: IconSize, viewBox = "0 0 14 14") => ({
  width: size,
  height: size,
  viewBox,
  "aria-hidden": "true",
});

const makeIcon = (
  name: string,
  render: (size: IconSize) => ReturnType<typeof h>,
  defaultSize: IconSize = 14,
) =>
  defineComponent({
    name,
    props: {
      size: {
        type: [String, Number],
        default: defaultSize,
      },
    },
    setup(props) {
      return () => render(props.size as IconSize);
    },
  });

const PlayIcon = makeIcon("PlayIcon", (size) =>
  h("svg", svgAttrs(size), [h("path", { d: "M3 1.5v11l9-5.5z", fill: "currentColor" })]),
);

const PlusIcon = makeIcon("PlusIcon", (size) =>
  h("svg", svgAttrs(size), [
    h("path", {
      d: "M1 7h12M7 1v12",
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-linecap": "butt",
      fill: "none",
    }),
  ]),
);

const DotIcon = makeIcon("DotIcon", (size) =>
  h("svg", svgAttrs(size), [h("circle", { cx: "7", cy: "7", r: "2.5", fill: "currentColor" })]),
);

const SquareIcon = makeIcon("SquareIcon", (size) =>
  h("svg", svgAttrs(size), [h("rect", { x: "3", y: "3", width: "8", height: "8", fill: "currentColor" })]),
);

const BevelIcon = makeIcon("BevelIcon", (size) =>
  h("svg", svgAttrs(size), [h("path", { d: "M4 2h6l2 2v6l-2 2H4L2 10V4z", fill: "currentColor" })]),
);

const ArrowLeftIcon = makeIcon("ArrowLeftIcon", (size) =>
  h("svg", svgAttrs(size), [
    h("path", {
      d: "M5 2 1 5l4 3",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.6",
      "stroke-linecap": "butt",
      "stroke-linejoin": "miter",
    }),
    h("path", {
      d: "M3 5h8",
      stroke: "currentColor",
      "stroke-width": "1.6",
      "stroke-linecap": "butt",
      fill: "none",
    }),
  ]),
);

const CrossIcon = makeIcon("CrossIcon", (size) =>
  h("svg", svgAttrs(size), [
    h("path", {
      d: "M7 2v10M2 7h10",
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-linecap": "butt",
      fill: "none",
    }),
  ]),
);

const RailsIcon = makeIcon("RailsIcon", (size) =>
  h("svg", svgAttrs(size), [
    h("rect", { x: "2", y: "1", width: "3.5", height: "12", fill: "currentColor" }),
    h("rect", { x: "8.5", y: "1", width: "3.5", height: "12", fill: "currentColor" }),
  ]),
);

const StarIcon = makeIcon("StarIcon", (size) =>
  h("svg", svgAttrs(size), [h("path", { d: "M7 2l2.5 4.5h5l-4 3 1.5 5L7 11.5 2 14.5l1.5-5-4-3h5z", fill: "currentColor" })]),
);

const SpeakerIcon = makeIcon("SpeakerIcon", (size) =>
  h("svg", svgAttrs(size), [
    h("path", { d: "M5 4 9 7 5 10V4z", fill: "currentColor" }),
    h("path", {
      d: "M10 5q1 2 0 4",
      stroke: "currentColor",
      "stroke-width": "1.4",
      fill: "none",
      "stroke-linecap": "butt",
    }),
  ]),
);

const MutedIcon = makeIcon("MutedIcon", (size) =>
  h("svg", svgAttrs(size), [
    h("path", { d: "M5 4 9 7 5 10V4z", fill: "currentColor" }),
    h("path", {
      d: "M9 5l3 4M12 5l-3 4",
      stroke: "currentColor",
      "stroke-width": "1.4",
      fill: "none",
      "stroke-linecap": "butt",
    }),
  ]),
);

const UpIcon = makeIcon("UpIcon", (size) =>
  h("svg", svgAttrs(size, "0 0 10 10"), [h("path", { d: "M5 1l4 5H1z", fill: "currentColor" })]),
  10,
);

const DownIcon = makeIcon("DownIcon", (size) =>
  h("svg", svgAttrs(size, "0 0 10 10"), [h("path", { d: "M5 9 1 4h8z", fill: "currentColor" })]),
  10,
);

const BarsIcon = makeIcon("BarsIcon", (size) =>
  h("svg", svgAttrs(size, "0 0 10 10"), [
    h("rect", { x: "1", y: "2", width: "2", height: "6", fill: "currentColor" }),
    h("rect", { x: "4", y: "2", width: "2", height: "6", fill: "currentColor" }),
    h("rect", { x: "7", y: "2", width: "2", height: "6", fill: "currentColor" }),
  ]),
  10,
);

const DotsIcon = makeIcon("DotsIcon", (size) =>
  h("svg", svgAttrs(size, "0 0 10 10"), [
    h("circle", { cx: "2", cy: "5", r: "1.5", fill: "currentColor" }),
    h("circle", { cx: "5", cy: "5", r: "1.5", fill: "currentColor" }),
    h("circle", { cx: "8", cy: "5", r: "1.5", fill: "currentColor" }),
  ]),
  10,
);

const BackIcon = makeIcon("BackIcon", (size) =>
  h("svg", svgAttrs(size, "0 0 10 10"), [
    h("path", {
      d: "M1 5h8M1 5l3-3M1 5l3 3",
      stroke: "currentColor",
      "stroke-width": "1.4",
      fill: "none",
      "stroke-linecap": "butt",
    }),
  ]),
  10,
);

const ArmIcon = makeIcon("ArmIcon", (size) =>
  h("svg", { ...svgAttrs(size, "0 0 16 16"), fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "butt", "stroke-linejoin": "miter" }, [
    h("circle", { cx: "8", cy: "8", r: "4" }),
  ]),
  12,
);

const DuplicateIcon = makeIcon("DuplicateIcon", (size) =>
  h("svg", { ...svgAttrs(size, "0 0 16 16"), fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "butt", "stroke-linejoin": "miter" }, [
    h("path", { d: "M3 5H11V13H3Z" }),
    h("path", { d: "M5 3H13V11" }),
  ]),
  12,
);

const SendDownIcon = makeIcon("SendDownIcon", (size) =>
  h("svg", { ...svgAttrs(size, "0 0 16 16"), fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "butt", "stroke-linejoin": "miter" }, [
    h("path", { d: "M8 2V12" }),
    h("path", { d: "M4 8L8 12L12 8" }),
  ]),
  12,
);

const stateExamples: {
  label: string;
  simulatedState: IconButtonSimulatedState;
  disabled?: boolean;
}[] = [
  { label: "Rest", simulatedState: "rest" },
  { label: "Hover", simulatedState: "hover" },
  { label: "Active", simulatedState: "active" },
  { label: "Disabled", simulatedState: "rest", disabled: true },
];

const geometryExamples: {
  label: string;
  caption: string;
  geometry: IconButtonGeometry;
  icon: typeof PlayIcon;
}[] = [
  { label: "Sharp", caption: "Sharp &middot; r-0 poster edge", geometry: "sharp", icon: PlusIcon },
  { label: "r-xs", caption: "r-xs &middot; tight corner", geometry: "rxs", icon: DotIcon },
  { label: "r-sm", caption: "r-sm &middot; hardware default", geometry: "default", icon: SquareIcon },
  { label: "r-md", caption: "r-md &middot; soft panel", geometry: "rmd", icon: BevelIcon },
  { label: "Off-cut", caption: "Off-cut &middot; var(--clip-offcut)", geometry: "offcut", icon: ArrowLeftIcon },
  { label: "Tile", caption: "Tile &middot; var(--clip-tile)", geometry: "tile", icon: CrossIcon },
];

const toneExamples: {
  label: string;
  caption: string;
  tone: IconButtonTone;
  geometry?: IconButtonGeometry;
  icon: typeof PlayIcon;
  stage?: "ink" | "ink2" | "ink3" | "bone";
}[] = [
  { label: "Wire", caption: "Wire &middot; transparent ink-5", tone: "wire", icon: RailsIcon },
  { label: "Hairline", caption: "Hairline &middot; minimum ghost", tone: "hairline", icon: CrossIcon },
  { label: "Solid", caption: "Solid &middot; ivory fill", tone: "solid", icon: PlayIcon },
  { label: "Cut shadow", caption: "Cut shadow &middot; hard offset", tone: "default", geometry: "cut", icon: StarIcon, stage: "ink3" },
  { label: "Brass signal", caption: "Brass signal &middot; one per panel", tone: "brassSignal", icon: DotIcon },
  { label: "Brass fill", caption: "Brass fill &middot; global .brass", tone: "brassFill", icon: PlusIcon },
  { label: "Brass wire", caption: "Brass wire &middot; transparent", tone: "brassWire", icon: DotIcon },
  { label: "Brass glow", caption: "Brass glow &middot; active record", tone: "brassGlow", icon: StarIcon },
];

const patternActions = [
  { label: "Play", icon: PlayIcon },
  { label: "Arm take", icon: ArmIcon },
  { label: "Duplicate", icon: DuplicateIcon },
  { label: "Send down", icon: SendDownIcon },
];

const features = [
  { label: "Shape", value: "32 / 40 / 48px square touch targets" },
  { label: "Fill", value: "ink-3 default · ivory solid · transparent wire" },
  { label: "Ring", value: "var(--ring) default · inset wire alternatives" },
  { label: "Icon", value: "slot content · SVG currentColor · 10-18px" },
  { label: "Geometry", value: "sharp, radius, offcut, tile, and cut-shadow variants" },
  { label: "State", value: "hover ink-4 · active scale/inset · disabled .35" },
  { label: "Brass", value: "signal/fill/wire/glow treatments, one lit accent per panel" },
  { label: "Source", value: "components/primatives/IconButton.vue" },
];
</script>

<style scoped>
.states-cluster,
.size-row,
.icon-row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.state-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.state-unit span {
  font: var(--t-label);
  font-size: 8px;
  letter-spacing: .18em;
  color: var(--ivory-4);
}

.icon-button-pair {
  display: flex;
  overflow: hidden;
  border-radius: var(--r-sm);
  background: var(--ink-3);
  box-shadow: var(--ring);
}

.icon-button-pair :deep(.icon-button) {
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.icon-button-pair :deep(.icon-button + .icon-button) {
  border-left: 1px solid var(--hairline);
}
</style>
