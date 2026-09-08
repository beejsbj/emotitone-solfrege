<template>
  <main class="workbench">
    <header class="workbench__header">
      <p class="workbench__eyebrow">Definition workbench · not yet accepted</p>
      <h1>Pattern Card</h1>
      <p>
        One pattern, two states. Card carries the identity; the musical view changes
        from a compressed Bar Tape to the expanded CodeStrip and its actions.
      </p>
    </header>

    <section class="workbench__section">
      <SectionHead index="01" title="Collapsed" note="Metadata + Bar Tape" />
      <Card
        as="button"
        class="pattern-card pattern-card--collapsed"
        label="Pattern 01 — Piano / C Major"
        type="button"
        flush
        @click="lastAction = 'Collapsed card selected'"
      >
        <template #mark><span class="pattern-card__ordinal">01</span></template>
        <div class="pattern-card__summary">
          <strong class="pattern-card__name">{{ pattern.name }}</strong>
          <span class="pattern-card__meta">Piano · C major · 14 notes</span>
        </div>
        <template #footer>
          <BarTape :segments="barTapeSegments" aria-label="Pattern note timeline" />
        </template>
      </Card>
      <p class="definition-note">
        No CodeStrip and no action rail. The whole compact Card is the selection target.
      </p>
    </section>

    <section class="workbench__section">
      <SectionHead index="02" title="Expanded / active" note="CodeStrip replaces Bar Tape" />
      <Card
        class="pattern-card pattern-card--expanded"
        label="Pattern 01 — Piano / C Major"
        flush
      >
        <template #mark><span class="pattern-card__ordinal">01</span></template>
        <div class="pattern-card__expanded-head">
          <strong class="pattern-card__name">{{ pattern.name }}</strong>
          <span class="pattern-card__meta">Piano · C major · 14 notes</span>
        </div>

        <CodeStrip
          class="pattern-card__code-strip"
          :tokens="codeTokens"
          density="dense"
          duration-mode="hidden"
          :framed="false"
          :show-chevron="false"
          aria-label="Expanded pattern Strudel code"
        />

        <div class="pattern-card__action-foot">
          <span class="pattern-card__state">Active · Strudel</span>
          <div class="pattern-card__actions" aria-label="Pattern actions">
            <Button
              size="sm"
              tone="ink"
              title="Delete pattern"
              accessible-name="Delete pattern"
              @click="lastAction = 'Delete pattern'"
            >
              <Trash2 aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              tone="brass"
              title="Open in Strudel"
              accessible-name="Open in Strudel"
              @click="lastAction = 'Open in Strudel'"
            >
              <ExternalLink aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              tone="ivory"
              title="Copy Strudel code"
              accessible-name="Copy Strudel code"
              @click="lastAction = 'Copy Strudel code'"
            >
              <Copy aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>
      <p class="action-readout" aria-live="polite">{{ lastAction }}</p>
    </section>

    <section class="workbench__section">
      <SectionHead index="03" title="Boundary" note="Accepted structure vs unresolved behavior" />
      <div class="boundary-grid">
        <div>
          <h3>Pattern Card owns</h3>
          <p>Two anatomies, identity hierarchy, media swap, and the three action placements.</p>
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
          <h3>Still open</h3>
          <p>Keep's disposition, deletion eligibility/confirmation, and final metadata density.</p>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { defineComponent, h, ref } from "vue";
import { Copy, ExternalLink, Trash2 } from "lucide-vue-next";
import BarTape from "../../components/primatives/BarTape.vue";
import Button from "../../components/primatives/Button.vue";
import Card from "../../components/primatives/Card.vue";
import CodeStrip from "../../components/uniques/CodeStrip/index.vue";
import { buildRecordedCodeStripTokens } from "../../components/uniques/CodeStrip/recordingTokens";
import { useColorSystem } from "../../composables/useColorSystem";
import { defaultPatterns } from "../../data/patterns";
import { DEFAULT_SOURCE_BPM } from "../../services/StrudelNotation";
import type { BarTapeSegment } from "../../components/primatives/BarTape.vue";

const SectionHead = defineComponent({
  props: { index: String, title: String, note: String },
  setup(props) {
    return () =>
      h("div", { class: "section-head" }, [
        h("div", [h("p", props.index), h("h2", props.title)]),
        h("p", props.note),
      ]);
  },
});

const pattern = defaultPatterns[0];
const sourceBpm = pattern.bpm ?? DEFAULT_SOURCE_BPM;
const { getStaticPrimaryColorByScaleIndex } = useColorSystem();
const lastAction = ref("Actions are inert in this definition specimen");

const barTapeSegments: BarTapeSegment[] = [...pattern.notes]
  .sort((firstNote, secondNote) => firstNote.pressTime - secondNote.pressTime)
  .map((note) => ({
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

.workbench__section {
  padding: 28px 0 34px;
  border-top: 1px solid var(--hairline);
}

.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.section-head h2 {
  margin-top: 4px;
  font-size: clamp(20px, 4vw, 30px);
}

.section-head > p {
  max-width: 280px;
  text-align: right;
}

.pattern-card {
  width: 100%;
}

.pattern-card--collapsed {
  color: inherit;
  cursor: pointer;
}

.pattern-card__ordinal {
  font: 400 42px/.9 var(--font-display);
  letter-spacing: var(--tracking-display);
}

.pattern-card__summary,
.pattern-card__expanded-head {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 22px 74px 12px 22px;
}

.pattern-card__summary {
  min-height: 58px;
  justify-content: center;
}

.pattern-card__expanded-head {
  min-height: 74px;
  justify-content: flex-end;
  padding-bottom: 16px;
}

.pattern-card__name {
  overflow: hidden;
  font: var(--t-h2);
  letter-spacing: var(--tracking-display);
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pattern-card__meta,
.pattern-card__state {
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: .12em;
  text-transform: uppercase;
}

.pattern-card__meta {
  overflow: hidden;
  margin-top: 5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pattern-card__code-strip {
  width: 100%;
  border-top: 1px solid var(--hairline);
  border-bottom: 1px solid var(--hairline);
}

.pattern-card__action-foot {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 10px 14px 12px 22px;
}

.pattern-card__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.definition-note,
.action-readout {
  margin: 14px 0 0;
  color: var(--ivory-3);
  font: var(--t-body-s-mono);
}

.action-readout {
  min-height: 1.4em;
  text-align: right;
}

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

.boundary-grid p {
  margin: 0;
  color: var(--ivory-3);
  font: var(--t-body-s-mono);
}

@media (max-width: 640px) {
  .section-head {
    align-items: start;
    flex-direction: column;
  }

  .section-head > p { text-align: left; }
  .boundary-grid { grid-template-columns: 1fr; }
  .pattern-card__state { max-width: 10ch; }
}
</style>
