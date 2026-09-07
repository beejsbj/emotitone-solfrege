<template>
  <main class="picker-lab">
    <header class="picker-lab__header">
      <p class="picker-lab__eyebrow">EmotiTone · focused design lab</p>
      <h1>Instrument Picker.</h1>
      <p class="picker-lab__intro">
        The accepted Drawer and Tabs frame one sound library. Every visible choice now comes from
        the Sticker family; the native button beneath it supplies semantics, focus, and selection.
      </p>
    </header>

    <section class="picker-lab__surface" aria-labelledby="picker-direction-title">
      <header class="picker-lab__surface-heading">
        <div>
          <p class="picker-lab__source">Definition candidate · Sticker choices</p>
          <h2 id="picker-direction-title">A loose library of labels.</h2>
        </div>
        <span class="picker-lab__status">Lineage clean</span>
      </header>

      <div class="picker-lab__stage">
        <TabbedOverlayPanel
          v-model="activeBank"
          :tabs="tabs"
          tab-test-id-prefix="picker-sticker-tab"
          tabs-aria-label="Sticker instrument banks"
          width="100%"
          height="34rem"
          max-height="34rem"
        >
          <template #header>
            <div class="picker-header">
              <div class="picker-header__title">
                <Sticker variant="fill" color="ivory">Sound</Sticker>
                <span class="picker-header__bank">{{ bankLabel }}</span>
              </div>
              <div class="picker-header__actions">
                <span class="picker-header__count">{{ headlineCount }}</span>
                <Button title="Close sounds" accessible-name="Close sounds">
                  <X :size="14" />
                </Button>
              </div>
            </div>
          </template>

          <template #toolbar>
            <label class="picker-search">
              <Search :size="14" aria-hidden="true" />
              <input
                v-model="query"
                type="search"
                placeholder="search sounds"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
              />
            </label>
          </template>

          <div class="picker-library">
            <section v-for="group in groups" :key="group.label" class="picker-group">
              <header class="picker-group__heading">
                <span>{{ group.label }}</span>
                <span>{{ group.sounds.length.toString().padStart(2, "0") }}</span>
              </header>

              <div class="picker-group__choices">
                <button
                  v-for="sound in group.sounds"
                  :key="sound.id"
                  type="button"
                  class="picker-choice"
                  :class="`picker-choice--${choiceState(sound)}`"
                  :aria-label="`${sound.label}, ${choiceState(sound)}`"
                  :aria-pressed="selection === sound.id"
                  @click="selection = sound.id"
                >
                  <Sticker :variant="stickerVariant(sound)" :color="stickerColor(sound)">
                    {{ sound.label }}
                  </Sticker>
                </button>
              </div>
            </section>

            <p v-if="!visibleSounds.length" class="picker-lab__empty">
              no matches for “{{ query }}”
            </p>
          </div>
        </TabbedOverlayPanel>
      </div>

      <dl class="picker-lab__facts">
        <div><dt>Available</dt><dd>Ivory outline Sticker; the default library texture.</dd></div>
        <div><dt>Cold</dt><dd>The same outline Sticker dimmed, without inventing another surface.</dd></div>
        <div><dt>Current</dt><dd>Filled Ivory Sticker; selection is the strongest stable event.</dd></div>
        <div><dt>Warming</dt><dd>Brass Badge; a temporary loading signal using its accepted brass-only role.</dd></div>
        <div><dt>Button</dt><dd>Invisible native semantics only; Sticker owns all visible geometry and material.</dd></div>
      </dl>
    </section>

    <aside class="picker-lab__question">
      <p class="picker-lab__eyebrow">Definition gate</p>
      <h2>One existing primitive, four meaningful states.</h2>
      <p>
        The picker owns grouping and state mapping—not another choice component. Accepting this
        means the production grid becomes a wrapping field of real Stickers with the mapping above.
      </p>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Search, X } from "lucide-vue-next";
import Button from "../components/primatives/Button.vue";
import Sticker from "../components/primatives/Sticker.vue";
import TabbedOverlayPanel, { type TabbedOverlayTab } from "../components/TabbedOverlayPanel.vue";

type SoundState = "ready" | "cold" | "available" | "warming";
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
  { id: "vibraphone_bowed", label: "Vibraphone Bowed", bank: "Mallets", state: "warming" },
  { id: "kalimba", label: "Kalimba", bank: "Mallets", state: "ready" },
  { id: "glockenspiel", label: "Glockenspiel", bank: "Mallets", state: "cold" },
  { id: "supersaw", label: "Supersaw", bank: "Synths", state: "available" },
  { id: "z_triangle", label: "Z Triangle", bank: "Synths", state: "available" },
  { id: "bd", label: "Bass Drum", bank: "Drums", state: "ready" },
  { id: "hh", label: "Hi-Hat", bank: "Drums", state: "ready" },
];

const activeBank = ref("all");
const query = ref("");
const selection = ref("piano");

const visibleSounds = computed(() => {
  const selectedBank = tabs.find((tab) => tab.value === activeBank.value)?.label;
  const needle = query.value.trim().toLowerCase();
  return sounds.filter((sound) =>
    (activeBank.value === "all" || sound.bank === selectedBank) &&
    (!needle || sound.label.toLowerCase().includes(needle)),
  );
});

const groups = computed(() =>
  [...new Set(visibleSounds.value.map((sound) => sound.bank))].map((label) => ({
    label,
    sounds: visibleSounds.value.filter((sound) => sound.bank === label),
  })),
);

const bankLabel = computed(() => {
  if (query.value.trim()) return "Search";
  return tabs.find((tab) => tab.value === activeBank.value)?.label ?? "All sounds";
});

const headlineCount = computed(() => {
  if (query.value.trim()) return visibleSounds.value.length.toString().padStart(3, "0");
  if (activeBank.value === "all") return "992";
  if (activeBank.value === "keyboards") return "012";
  return visibleSounds.value.length.toString().padStart(3, "0");
});

function choiceState(sound: Sound) {
  return selection.value === sound.id ? "current" : sound.state;
}

function stickerVariant(sound: Sound): "outline" | "fill" | "badge" {
  const state = choiceState(sound);
  if (state === "current") return "fill";
  if (state === "warming") return "badge";
  return "outline";
}

function stickerColor(sound: Sound) {
  return choiceState(sound) === "warming" ? "brass-sheen" as const : "ivory" as const;
}
</script>

<style scoped>
.picker-lab {
  min-height: 100vh;
  background: var(--ink);
  color: var(--ivory);
  padding: clamp(24px, 5vw, 72px);
}

.picker-lab__header,
.picker-lab__surface,
.picker-lab__question {
  width: min(100%, 820px);
  margin-inline: auto;
}

.picker-lab__header { margin-bottom: 40px; }

.picker-lab__eyebrow,
.picker-lab__source,
.picker-lab__status,
.picker-lab__facts,
.picker-header,
.picker-search,
.picker-library {
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

.picker-lab__surface {
  border: 1px solid var(--ivory-3);
  background: var(--ink-2);
  padding: clamp(14px, 3vw, 28px);
}

.picker-lab__surface-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.picker-lab__status {
  flex: none;
  border: 1px solid var(--brass-lo);
  color: var(--brass-hi);
  padding: 6px 8px;
}

.picker-lab__stage {
  min-width: 0;
  background: #050505;
  padding: clamp(8px, 3vw, 26px);
}

.picker-header,
.picker-header__title,
.picker-header__actions,
.picker-search {
  display: flex;
  align-items: center;
}

.picker-header { justify-content: space-between; gap: 12px; }
.picker-header__title { min-width: 0; gap: 10px; }
.picker-header__actions { flex: none; gap: 7px; }

.picker-header__bank {
  overflow: hidden;
  color: var(--ivory-2);
  font-size: 9px;
  letter-spacing: .15em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.picker-header__count {
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
.picker-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ivory);
  font: var(--t-caption);
}
.picker-search input::placeholder { color: var(--ivory-4); }

.picker-library { display: grid; gap: 24px; }

.picker-group__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--ivory-4);
  color: var(--ivory-3);
  padding: 0 2px 8px;
  font-size: 8px;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.picker-group__choices {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  padding: 14px 2px 2px;
}

.picker-choice {
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 2px;
  color: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.picker-choice :deep(.sticker) {
  max-width: min(15rem, calc(100vw - 8rem));
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  transition: opacity var(--dur-tap) var(--ease-stab), transform var(--dur-tap) var(--ease-stab);
}

.picker-choice:hover :deep(.sticker) { transform: translateY(-1px) rotate(-1deg); }
.picker-choice:active :deep(.sticker) { transform: translateY(2px) rotate(0); }
.picker-choice:focus-visible { outline: 2px solid var(--ivory); outline-offset: 3px; }
.picker-choice--cold :deep(.sticker) { opacity: .38; }
.picker-choice--available :deep(.sticker) { opacity: .72; }
.picker-choice--current :deep(.sticker),
.picker-choice--warming :deep(.sticker) { opacity: 1; }

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
  grid-template-columns: 88px minmax(0, 1fr);
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

@media (prefers-reduced-motion: reduce) {
  .picker-choice :deep(.sticker) { transition: none; }
}

@media (max-width: 460px) {
  .picker-lab { padding-inline: 12px; }
  .picker-lab h1 { font: var(--t-display-l); }
  .picker-lab__surface { padding: 10px; }
  .picker-lab__surface-heading { min-height: auto; }
  .picker-lab__status { display: none; }
  .picker-lab__stage { padding: 0; }
  .picker-group__choices { gap: 9px 8px; }
  .picker-choice :deep(.sticker) { font-size: 12px; }
}
</style>
