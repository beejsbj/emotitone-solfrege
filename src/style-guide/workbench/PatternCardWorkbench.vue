<template>
  <main class="workbench">
    <header class="workbench__header">
      <p class="workbench__eyebrow">Accepted definition · one shared source</p>
      <h1>Pattern Card</h1>
      <p>
        One pattern, two states. Card carries the identity; the musical view changes
        from a compressed Bar Tape to the expanded CodeStrip and its actions.
      </p>
    </header>

    <section class="workbench__section">
      <SectionHead index="01" title="Collapsed" note="Metadata + Bar Tape" />
      <PatternCard
        v-bind="collapsedPattern"
        @select="lastAction = 'Collapsed card selected'"
      />
      <p class="definition-note">
        No CodeStrip and no action rail. The whole compact Card is the selection target.
      </p>
    </section>

    <section class="workbench__section">
      <SectionHead index="02" title="Expanded / active" note="CodeStrip replaces Bar Tape" />
      <PatternCard
        v-bind="expandedPattern"
        :delete-armed="deleteArmed"
        @delete="handleDelete"
        @open-strudel="lastAction = 'Open in Strudel'"
        @copy="lastAction = 'Copy Strudel code'"
      />
      <p class="action-readout" aria-live="polite">{{ lastAction }}</p>
    </section>

    <section class="workbench__section">
      <SectionHead index="03" title="Boundary" note="Anatomy vs state ownership" />
      <div class="boundary-grid">
        <div>
          <h3>Pattern Card owns</h3>
          <p>Two anatomies, identity hierarchy, media swap, and three action placements.</p>
        </div>
        <div>
          <h3>Pattern List owns</h3>
          <p>Which card is active, expanding/collapsing it, ordering, and stack choreography.</p>
        </div>
        <div>
          <h3>Adapter owns</h3>
          <p>Generated notation, clipboard feedback, Strudel URL, deletion rules, and stores.</p>
        </div>
        <div>
          <h3>Deferred</h3>
          <p>Keep remains a store capability for Pattern List to place or retire in its own unit.</p>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { defineComponent, h, ref } from "vue";
import PatternCard from "../../components/compounds/PatternCard.vue";
import type { BarTapeSegment } from "../../components/primatives/BarTape.vue";
import { buildRecordedCodeStripTokens } from "../../components/uniques/CodeStrip/recordingTokens";
import { useColorSystem } from "../../composables/useColorSystem";
import { defaultPatterns } from "../../data/patterns";

const SectionHead = defineComponent({
  props: { index: String, title: String, note: String },
  setup(props) {
    return () => h("div", { class: "section-head" }, [
      h("div", [h("p", props.index), h("h2", props.title)]),
      h("p", props.note),
    ]);
  },
});

const pattern = defaultPatterns[0];
const sourceBpm = 120;
const { getStaticPrimaryColorByScaleIndex } = useColorSystem();
const lastAction = ref("Actions are inert in this controlled specimen");
const deleteArmed = ref(false);

function handleDelete() {
  if (!deleteArmed.value) {
    deleteArmed.value = true;
    lastAction.value = "Delete armed · tap again to confirm";
    return;
  }
  deleteArmed.value = false;
  lastAction.value = "Delete pattern";
}

const barTape: BarTapeSegment[] = pattern.notes.map((note) => ({
  color: getStaticPrimaryColorByScaleIndex(
    note.scaleIndex,
    pattern.mode,
    pattern.key,
    note.octave,
  ),
  durationMs: note.duration,
}));

const codeTokens = buildRecordedCodeStripTokens({
  notes: pattern.notes,
  mode: pattern.mode,
  musicKey: pattern.key,
  notation: "solfege",
  barMs: (60000 / sourceBpm) * 4,
  sourceBpm,
  surfaceStyle: "colored",
  keyBrightness: 50,
  keySaturation: 72,
});

const collapsedPattern = {
  label: "Pattern 01 — Piano / C Major",
  ordinal: "01",
  name: pattern.name ?? "Untitled pattern",
  metadata: "14 notes",
  barTape,
};

const expandedPattern = {
  ...collapsedPattern,
  state: "expanded" as const,
  codeTokens,
  codeSource: "note(\"<0 0 4 4 5 5 4 3 3 2 2 1 1 0>\").scale(\"C:major\").s(\"piano\")",
};
</script>

<style scoped>
:global(html.pattern-card-workbench-route),
:global(body.pattern-card-workbench-route),
:global(body.pattern-card-workbench-route #app) {
  min-height: 100%;
  margin: 0;
  background: var(--ink);
}

.workbench {
  box-sizing: border-box;
  width: min(840px, 100%);
  min-height: 100vh;
  margin: 0 auto;
  padding: clamp(28px, 7vw, 72px) clamp(18px, 5vw, 44px) 96px;
  color: var(--ivory);
}

.workbench__header { margin-bottom: 52px; }
.workbench__eyebrow,
.section-head p {
  margin: 0;
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.workbench__header h1,
.section-head h2 {
  margin: 0;
  font-family: var(--font-display);
  text-transform: uppercase;
}

.workbench__header h1 {
  margin-top: 8px;
  font-size: clamp(42px, 9vw, 76px);
  letter-spacing: -.035em;
  line-height: .92;
}

.workbench__header > p:last-child {
  max-width: 620px;
  margin: 18px 0 0;
  color: var(--ivory-3);
  font-size: 13px;
  line-height: 1.6;
}

.workbench__section { padding: 28px 0 34px; border-top: 1px solid var(--hairline); }
.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}
.section-head h2 { margin-top: 4px; font-size: clamp(20px, 4vw, 30px); }
.section-head > p { max-width: 280px; text-align: right; }

.definition-note,
.action-readout,
.boundary-grid p {
  color: var(--ivory-3);
  font: var(--t-body-s-mono);
}
.definition-note,
.action-readout { margin: 14px 0 0; }
.action-readout { min-height: 1.4em; text-align: right; }

.boundary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.boundary-grid > div {
  padding: 16px;
  background: var(--ink-3);
  border-left: 4px solid var(--ivory);
}
.boundary-grid h3 {
  margin: 0 0 8px;
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}
.boundary-grid p { margin: 0; }

@media (max-width: 640px) {
  .section-head { align-items: start; flex-direction: column; }
  .section-head > p { text-align: left; }
  .boundary-grid { grid-template-columns: 1fr; }
}
</style>
