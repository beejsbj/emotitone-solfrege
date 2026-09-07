<template>
  <main class="picker-lab">
    <header class="picker-lab__header">
      <p class="picker-lab__eyebrow">EmotiTone · focused design lab</p>
      <h1>Instrument Picker.</h1>
      <p class="picker-lab__intro">
        One composition inside the accepted Drawer and Tabs. These definition specimens preserve
        search, banks, selection, and sound state while testing how much framing 992 sounds need.
      </p>
    </header>

    <section class="picker-lab__comparison" aria-label="Instrument picker directions">
      <article class="picker-lab__surface picker-lab__surface--recommended">
        <header class="picker-lab__surface-heading">
          <div>
            <p class="picker-lab__source">Direction A · quiet index</p>
            <h2>Labels make the shelves.</h2>
          </div>
          <span class="picker-lab__status picker-lab__status--recommended">Recommended</span>
        </header>

        <div class="picker-lab__stage">
          <TabbedOverlayPanel
            v-model="indexBank"
            :tabs="tabs"
            tab-test-id-prefix="picker-index-tab"
            tabs-aria-label="Quiet index instrument banks"
            width="100%"
            height="34rem"
            max-height="34rem"
          >
            <template #header>
              <PickerHeader
                :bank="bankLabel(indexBank, indexQuery)"
                :count="headlineCount(indexBank, indexQuery, visibleIndexSounds.length)"
                @close="noop"
              />
            </template>
            <template #toolbar>
              <PickerSearch v-model="indexQuery" />
            </template>

            <div class="picker-index">
              <section v-for="group in indexGroups" :key="group.label" class="picker-index__group">
                <header class="picker-index__group-heading">
                  <span>{{ group.label }}</span>
                  <span>{{ group.sounds.length.toString().padStart(2, '0') }}</span>
                </header>
                <div class="picker-index__list">
                  <button
                    v-for="sound in group.sounds"
                    :key="sound.id"
                    type="button"
                    class="picker-index__sound"
                    :class="{ 'picker-index__sound--selected': indexSelection === sound.id }"
                    @click="indexSelection = sound.id"
                  >
                    <span class="picker-index__sound-name">{{ sound.label }}</span>
                    <span class="picker-index__sound-state">
                      {{ indexSelection === sound.id ? 'current' : sound.state }}
                    </span>
                  </button>
                </div>
              </section>
              <p v-if="!visibleIndexSounds.length" class="picker-lab__empty">
                no matches for “{{ indexQuery }}”
              </p>
            </div>
          </TabbedOverlayPanel>
        </div>

        <dl class="picker-lab__facts">
          <div><dt>Hierarchy</dt><dd>One rule per category; no container around every cluster.</dd></div>
          <div><dt>Choices</dt><dd>Two-column index with hairlines instead of isolated cards.</dd></div>
          <div><dt>Selected</dt><dd>An ivory slab is the one strong event in the list.</dd></div>
          <div><dt>Density</dt><dd>Names stay readable while more rows fit in the drawer.</dd></div>
        </dl>
      </article>

      <article class="picker-lab__surface">
        <header class="picker-lab__surface-heading">
          <div>
            <p class="picker-lab__source">Direction B · clipped cards</p>
            <h2>Keep today’s object grid.</h2>
          </div>
          <span class="picker-lab__status">Conservative</span>
        </header>

        <div class="picker-lab__stage">
          <TabbedOverlayPanel
            v-model="cardBank"
            :tabs="tabs"
            tab-test-id-prefix="picker-cards-tab"
            tabs-aria-label="Clipped card instrument banks"
            width="100%"
            height="34rem"
            max-height="34rem"
          >
            <template #header>
              <PickerHeader
                :bank="bankLabel(cardBank, cardQuery)"
                :count="headlineCount(cardBank, cardQuery, visibleCardSounds.length)"
                @close="noop"
              />
            </template>
            <template #toolbar>
              <PickerSearch v-model="cardQuery" />
            </template>

            <div class="picker-cards">
              <section v-for="group in cardGroups" :key="group.label" class="picker-cards__group">
                <header class="picker-cards__group-heading">
                  <Sticker variant="fill" color="ivory">{{ group.label }}</Sticker>
                  <span>{{ group.sounds.length.toString().padStart(2, '0') }}</span>
                </header>
                <div class="picker-cards__grid">
                  <button
                    v-for="sound in group.sounds"
                    :key="sound.id"
                    type="button"
                    class="picker-cards__sound"
                    :class="{ 'picker-cards__sound--selected': cardSelection === sound.id }"
                    @click="cardSelection = sound.id"
                  >
                    <span class="picker-cards__sound-name">{{ sound.label }}</span>
                    <span class="picker-cards__sound-state">
                      {{ cardSelection === sound.id ? 'current' : sound.state }}
                    </span>
                  </button>
                </div>
              </section>
              <p v-if="!visibleCardSounds.length" class="picker-lab__empty">
                no matches for “{{ cardQuery }}”
              </p>
            </div>
          </TabbedOverlayPanel>
        </div>

        <dl class="picker-lab__facts">
          <div><dt>Hierarchy</dt><dd>Sticker headings separate groups without another enclosing box.</dd></div>
          <div><dt>Choices</dt><dd>Three-column clipped objects preserve the current picker character.</dd></div>
          <div><dt>Selected</dt><dd>The chosen sound becomes the only filled card.</dd></div>
          <div><dt>Density</dt><dd>Familiar and compact, but long names still work harder.</dd></div>
        </dl>
      </article>
    </section>

    <aside class="picker-lab__question">
      <p class="picker-lab__eyebrow">Definition gate</p>
      <h2>Should sounds read as an index or as little objects?</h2>
      <p>
        Everything else can follow from that choice. Search remains quiet, Tabs remain the bank
        control, Sticker is used only where it earns hierarchy, and brass stays out of routine state.
      </p>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from "vue";
import { Search, X } from "lucide-vue-next";
import Button from "../components/primatives/Button.vue";
import Sticker from "../components/primatives/Sticker.vue";
import TabbedOverlayPanel, { type TabbedOverlayTab } from "../components/TabbedOverlayPanel.vue";

type SoundState = "ready" | "cold" | "available";
type Sound = { id: string; label: string; bank: string; state: SoundState };

const tabs: TabbedOverlayTab[] = [
  { value: "all", label: "All Sounds", shortLabel: "All" },
  { value: "keyboards", label: "Keyboards", shortLabel: "Keys" },
  { value: "mallets", label: "Mallets", shortLabel: "Mallets" },
  { value: "synths", label: "Synths", shortLabel: "Synths" },
  { value: "drums", label: "Drums", shortLabel: "Drums" },
];

const sounds: Sound[] = [
  { id: "piano", label: "Piano", bank: "Keyboards", state: "ready" },
  { id: "steinway", label: "Steinway", bank: "Keyboards", state: "ready" },
  { id: "fmpiano", label: "FM Piano", bank: "Keyboards", state: "cold" },
  { id: "clavisynth", label: "Clavisynth", bank: "Keyboards", state: "cold" },
  { id: "gm_epiano1", label: "GM E-Piano 1", bank: "Keyboards", state: "cold" },
  { id: "gm_harpsichord", label: "GM Harpsichord", bank: "Keyboards", state: "cold" },
  { id: "marimba", label: "Marimba", bank: "Mallets", state: "ready" },
  { id: "vibraphone_bowed", label: "Vibraphone Bowed", bank: "Mallets", state: "cold" },
  { id: "kalimba", label: "Kalimba", bank: "Mallets", state: "ready" },
  { id: "glockenspiel", label: "Glockenspiel", bank: "Mallets", state: "cold" },
  { id: "supersaw", label: "Supersaw", bank: "Synths", state: "available" },
  { id: "z_triangle", label: "Z Triangle", bank: "Synths", state: "available" },
  { id: "bd", label: "Bass Drum", bank: "Drums", state: "ready" },
  { id: "hh", label: "Hi-Hat", bank: "Drums", state: "ready" },
];

const indexBank = ref("all");
const cardBank = ref("all");
const indexQuery = ref("");
const cardQuery = ref("");
const indexSelection = ref("piano");
const cardSelection = ref("piano");
const noop = () => {};

function soundsFor(bank: string, query: string) {
  const bankLabel = tabs.find((tab) => tab.value === bank)?.label;
  const needle = query.trim().toLowerCase();
  return sounds.filter((sound) =>
    (bank === "all" || sound.bank === bankLabel) &&
    (!needle || sound.label.toLowerCase().includes(needle)),
  );
}

function groupsFor(list: Sound[]) {
  return [...new Set(list.map((sound) => sound.bank))].map((label) => ({
    label,
    sounds: list.filter((sound) => sound.bank === label),
  }));
}

function bankLabel(bank: string, query: string) {
  if (query.trim()) return "Search";
  return tabs.find((tab) => tab.value === bank)?.label ?? "All sounds";
}

function headlineCount(bank: string, query: string, sampleCount: number) {
  if (query.trim()) return sampleCount;
  if (bank === "all") return 992;
  if (bank === "keyboards") return 12;
  return sampleCount;
}

const visibleIndexSounds = computed(() => soundsFor(indexBank.value, indexQuery.value));
const visibleCardSounds = computed(() => soundsFor(cardBank.value, cardQuery.value));
const indexGroups = computed(() => groupsFor(visibleIndexSounds.value));
const cardGroups = computed(() => groupsFor(visibleCardSounds.value));

const PickerHeader = defineComponent({
  props: {
    bank: { type: String, required: true },
    count: { type: Number, required: true },
  },
  emits: ["close"],
  setup(props, { emit }) {
    return () => h("div", { class: "picker-header" }, [
      h("div", { class: "picker-header__title" }, [
        h(Sticker, { variant: "fill", color: "ivory" }, () => "Sound"),
        h("span", { class: "picker-header__bank" }, props.bank),
      ]),
      h("div", { class: "picker-header__actions" }, [
        h("span", { class: "picker-header__count" }, props.count.toString().padStart(3, "0")),
        h(Button, {
          title: "Close sounds",
          accessibleName: "Close sounds",
          onClick: () => emit("close"),
        }, () => h(X, { size: 14 })),
      ]),
    ]);
  },
});

const PickerSearch = defineComponent({
  props: { modelValue: { type: String, required: true } },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () => h("label", { class: "picker-search" }, [
      h(Search, { size: 14, "aria-hidden": "true" }),
      h("input", {
        value: props.modelValue,
        type: "search",
        placeholder: "search sounds",
        autocomplete: "off",
        onInput: (event: Event) => emit("update:modelValue", (event.target as HTMLInputElement).value),
      }),
    ]);
  },
});
</script>

<style scoped>
.picker-lab {
  min-height: 100vh;
  background: var(--ink);
  color: var(--ivory);
  padding: clamp(24px, 5vw, 72px);
}

.picker-lab__header,
.picker-lab__comparison,
.picker-lab__question {
  width: min(100%, 1180px);
  margin-inline: auto;
}

.picker-lab__header { margin-bottom: 40px; }

.picker-lab__eyebrow,
.picker-lab__source,
.picker-lab__status,
.picker-lab__facts,
.picker-header,
.picker-search,
.picker-index,
.picker-cards {
  font-family: var(--font-mono);
}

.picker-lab__eyebrow,
.picker-lab__source,
.picker-lab__status,
.picker-lab__facts dt {
  font-size: 10px;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.picker-lab__eyebrow,
.picker-lab__source { color: var(--ivory-3); }
.picker-lab h1 { margin: 8px 0 14px; font: var(--t-display-xl); }
.picker-lab h2 { margin: 5px 0 0; font: var(--t-h1); }

.picker-lab__intro,
.picker-lab__question > p:last-child {
  max-width: 72ch;
  color: var(--ivory-2);
  font: var(--t-body-mono);
}

.picker-lab__comparison {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.picker-lab__surface {
  min-width: 0;
  border: 1px solid var(--ink-5);
  background: var(--ink-2);
  padding: clamp(14px, 2.4vw, 26px);
}

.picker-lab__surface--recommended { border-color: var(--ivory-3); }

.picker-lab__surface-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  min-height: 58px;
  margin-bottom: 18px;
}

.picker-lab__status {
  flex: none;
  border: 1px solid var(--ink-5);
  color: var(--ivory-3);
  padding: 6px 8px;
}

.picker-lab__status--recommended {
  border-color: var(--brass-lo);
  color: var(--brass-hi);
}

.picker-lab__stage {
  min-width: 0;
  background: #050505;
  padding: clamp(8px, 2vw, 22px);
}

.picker-header,
.picker-search {
  display: flex;
  align-items: center;
}

.picker-header { justify-content: space-between; gap: 12px; }
.picker-header :deep(.picker-header__title),
.picker-header :deep(.picker-header__actions) {
  display: flex;
  align-items: center;
}
.picker-header :deep(.picker-header__title) { min-width: 0; gap: 10px; }
.picker-header :deep(.picker-header__actions) { flex: none; gap: 7px; }

.picker-header :deep(.picker-header__bank) {
  overflow: hidden;
  color: var(--ivory-2);
  font-size: 9px;
  letter-spacing: .15em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.picker-header :deep(.picker-header__count) {
  color: var(--ivory-3);
  font-size: 9px;
  letter-spacing: .14em;
}

.picker-search {
  gap: 9px;
  color: var(--ivory-3);
  border-bottom: 1px solid var(--ink-5);
  padding: 3px 1px 7px;
}

.picker-search:focus-within { border-color: var(--ivory-2); color: var(--ivory); }
.picker-search :deep(input) {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ivory);
  font: var(--t-caption);
}
.picker-search :deep(input::placeholder) { color: var(--ivory-4); }

.picker-index,
.picker-cards { display: grid; gap: 22px; }

.picker-index__group-heading,
.picker-cards__group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--ivory-3);
  font-size: 8px;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.picker-index__group-heading {
  border-bottom: 1px solid var(--ivory-3);
  padding: 0 2px 7px;
}

.picker-index__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.picker-index__sound {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  border: 0;
  border-bottom: 1px solid var(--ink-5);
  background: transparent;
  color: var(--ivory-2);
  padding: 10px 8px;
  text-align: left;
}

.picker-index__sound:nth-child(odd) { border-right: 1px solid var(--ink-5); }
.picker-index__sound:hover { background: var(--ink-3); color: var(--ivory); }
.picker-index__sound--selected { background: var(--ivory); color: var(--ink); }
.picker-index__sound--selected:hover { background: var(--ivory); color: var(--ink); }

.picker-index__sound-name,
.picker-cards__sound-name {
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-index__sound-state,
.picker-cards__sound-state {
  color: var(--ivory-4);
  font-size: 6px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.picker-index__sound--selected .picker-index__sound-state,
.picker-cards__sound--selected .picker-cards__sound-state { color: var(--ink-4); }

.picker-cards__group-heading { margin-bottom: 12px; }
.picker-cards__group-heading :deep(.sticker) { font-size: 10px; }

.picker-cards__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.picker-cards__sound {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--ink-5);
  background: var(--ink-2);
  color: var(--ivory-2);
  padding: 9px 7px 7px;
  clip-path: polygon(8% 0, 100% 0, 92% 100%, 0 100%);
}

.picker-cards__sound:hover { border-color: var(--ivory-3); color: var(--ivory); }
.picker-cards__sound--selected { border-color: var(--ivory); background: var(--ivory); color: var(--ink); }
.picker-cards__sound-state { display: block; margin-top: 5px; }

.picker-lab__empty {
  border: 1px dashed var(--ink-5);
  color: var(--ivory-3);
  padding: 24px;
  text-align: center;
  font: var(--t-caption);
}

.picker-lab__facts { display: grid; margin-top: 18px; }
.picker-lab__facts div {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 12px;
  border-top: 1px solid var(--ink-5);
  padding: 10px 0;
}
.picker-lab__facts dt { color: var(--ivory); }
.picker-lab__facts dd { margin: 0; color: var(--ivory-3); font-size: 11px; line-height: 1.5; }

.picker-lab__question {
  margin-top: 18px;
  border-left: 5px solid var(--ivory);
  background: var(--ink-2);
  padding: 24px 28px;
}

@media (max-width: 840px) {
  .picker-lab__comparison { grid-template-columns: 1fr; }
}

@media (max-width: 460px) {
  .picker-lab { padding-inline: 12px; }
  .picker-lab h1 { font: var(--t-display-l); }
  .picker-lab__surface { padding: 10px; }
  .picker-lab__surface-heading { min-height: auto; }
  .picker-lab__status { display: none; }
  .picker-lab__stage { padding: 0; }
  .picker-cards__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
