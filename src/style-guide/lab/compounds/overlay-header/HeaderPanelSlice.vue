<script setup lang="ts">
import { computed, ref } from "vue";
import { Download, RefreshCw, RotateCcw, X } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import Knob from "@/components/primatives/Knob/index.vue";
import MidiPermissionIcon from "@/components/MidiPermissionIcon.vue";
import OverlayPanelHeader from "@/components/OverlayPanelHeader.vue";
import TabbedOverlayPanel, { type TabbedOverlayTab } from "@/components/TabbedOverlayPanel.vue";

/**
 * Guide-only slice of a top-drawer panel: the real TabbedOverlayPanel with the
 * real OverlayPanelHeader in its header slot, fed what Config Menu or the
 * Instrument Picker passes, a short body, and the real Tabs rail. Tabs stay
 * live, so choosing one changes the header's context as it does in the app.
 */
const props = withDefaults(
  defineProps<{
    consumer: "config" | "sounds";
    initialTab?: string;
    /** Config shows its MIDI shortcut only while MIDI needs attention. */
    showMidi?: boolean;
    instrument?: string;
    body?: boolean;
  }>(),
  { initialTab: undefined, showMidi: false, instrument: "triangle", body: true },
);

const CONFIG_TABS: TabbedOverlayTab[] = [
  { value: "global", label: "Global", shortLabel: "Global" },
  { value: "stage", label: "Stage", shortLabel: "Stage" },
  { value: "scope", label: "Scope", shortLabel: "Scope" },
  { value: "bodies", label: "Note Bodies", shortLabel: "Bodies" },
  { value: "relations", label: "Relations", shortLabel: "Relations" },
  { value: "layers", label: "Layers", shortLabel: "Layers" },
  { value: "deck", label: "Deck", shortLabel: "Deck" },
  { value: "midi", label: "MIDI", shortLabel: "MIDI", icon: MidiPermissionIcon },
];

const SOUND_TABS: TabbedOverlayTab[] = [
  { value: "shape", label: "Shape", shortLabel: "Shape", tone: "brass" },
  { value: "synths", label: "Synths", shortLabel: "Synths" },
  { value: "keyboards", label: "Keyboards", shortLabel: "Keys" },
  { value: "mallets", label: "Mallets", shortLabel: "Mallets" },
  { value: "strings", label: "Strings", shortLabel: "Strings" },
  { value: "organs", label: "Organs", shortLabel: "Organs" },
  { value: "winds", label: "Winds", shortLabel: "Winds" },
  { value: "gm", label: "GM Soundfonts", shortLabel: "GM" },
];

/** Bank sizes in the shape of the registered sound list. */
const BANK_COUNTS: Record<string, number> = {
  synths: 14, keyboards: 9, mallets: 6, strings: 11, organs: 5, winds: 12, gm: 128,
};

const tabs = props.consumer === "config" ? CONFIG_TABS : SOUND_TABS;
const activeTab = ref(props.initialTab ?? tabs[props.consumer === "config" ? 0 : 1].value);
const visualsEnabled = ref(true);
const activeLabel = computed(() => tabs.find((tab) => tab.value === activeTab.value)?.label ?? "");

// Mirrors InstrumentSelector's bankLabel and visibleSoundCount.
const soundsContext = computed(() => (activeTab.value === "shape" ? `Shape · ${props.instrument}` : activeLabel.value));
const soundsStatus = computed(() => (activeTab.value === "shape" ? undefined : BANK_COUNTS[activeTab.value]));
const midiLabel = "MIDI needs permission";
</script>

<template>
  <div class="header-slice" :class="{ 'header-slice--bare': !body }">
    <TabbedOverlayPanel
      v-model="activeTab"
      :tabs="tabs"
      :tab-test-id-prefix="`lab-${consumer}-tab`"
      :tabs-aria-label="consumer === 'config' ? 'Configuration sections' : 'Instrument banks'"
      embedded
      width="100%"
      max-height="none"
      body-class="px-3 py-3"
    >
      <template #header>
        <OverlayPanelHeader v-if="consumer === 'config'" title="Config" :context="activeLabel">
          <Button v-if="showMidi" size="sm" :accessible-name="midiLabel" :title="midiLabel" @click="activeTab = 'midi'">
            <MidiPermissionIcon />
          </Button>
          <Knob
            type="boolean"
            :model-value="visualsEnabled"
            label="Visuals"
            tone="brass"
            class="header-slice__boolean-knob"
            :title="visualsEnabled ? 'Disable all visuals' : 'Enable all visuals'"
            :aria-label="visualsEnabled ? 'Disable all visuals' : 'Enable all visuals'"
            @update:model-value="visualsEnabled = Boolean($event)"
          />
          <Button size="sm" title="Reset all settings" accessible-name="Reset all settings"><RefreshCw :size="14" /></Button>
          <Button size="sm" title="Export configuration" accessible-name="Export configuration"><Download :size="14" /></Button>
          <Button size="sm" title="Close settings" accessible-name="Close settings"><X :size="14" /></Button>
        </OverlayPanelHeader>

        <OverlayPanelHeader v-else title="Sounds" :context="soundsContext" :status="soundsStatus">
          <Button
            v-if="activeTab === 'shape'"
            size="sm"
            tone="ink"
            title="Reset sound shaping"
            accessible-name="Reset sound shaping"
          >
            <RotateCcw :size="13" />
          </Button>
          <Button size="sm" title="Close sounds" accessible-name="Close sounds"><X :size="14" /></Button>
        </OverlayPanelHeader>
      </template>

      <template #default="{ activeValue }">
        <div v-if="body" class="header-slice__body">
          <template v-if="consumer === 'config'">
            <p class="header-slice__eyebrow">{{ activeValue === "global" ? "Across EmotiTone" : "Config section" }}</p>
            <p class="header-slice__heading">{{ tabs.find((tab) => tab.value === activeValue)?.label }}</p>
          </template>
          <template v-else-if="activeValue === 'shape'">
            <p class="header-slice__eyebrow">Shape the current sound</p>
            <p class="header-slice__copy">Reset restores its natural envelope and removes effects.</p>
          </template>
          <template v-else>
            <p class="header-slice__eyebrow">{{ tabs.find((tab) => tab.value === activeValue)?.label }}</p>
            <p class="header-slice__copy">{{ BANK_COUNTS[activeValue] }} sounds in this bank</p>
          </template>
        </div>
      </template>
    </TabbedOverlayPanel>
  </div>
</template>

<style scoped>
.header-slice {
  inline-size: 100%;
  background: var(--ink);
}

/* The compact strip shows only the header over its Tabs rail. */
.header-slice--bare :deep(.overlay-panel-shell__body) { display: none; }

.header-slice__boolean-knob {
  --knob-size: 32px;
  flex: 0 0 var(--knob-size);
  inline-size: var(--knob-size);
}

.header-slice__body { display: grid; gap: var(--s-2); padding-block: var(--s-2); }

.header-slice__eyebrow,
.header-slice__copy {
  margin: 0;
  color: var(--ivory-3);
  font: 450 9px/1.4 var(--font-mono);
  letter-spacing: .16em;
  text-transform: uppercase;
}

.header-slice__copy { letter-spacing: .04em; text-transform: none; }

.header-slice__heading {
  margin: 0;
  color: var(--ivory);
  font: var(--t-h2);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}
</style>
