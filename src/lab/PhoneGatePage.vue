<script setup lang="ts">
/**
 * The phone gate (BJS-494): the worklet engine's receipts, run in the phone's
 * own browser from a preview link. One tap starts it (and unlocks audio); a few
 * guided steps follow; the results read as one plain summary to copy into the
 * issue. A lab page in the playing zone's materials: Ink, Ivory, Brass, and
 * Music Color only on the dials, which show the loop's notes.
 */
import { computed, onBeforeUnmount, ref } from "vue";
import { ArrowRight, Check, Copy, Play, RotateCcw, Square, X } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import LooperDial, { type LooperDialState } from "@/components/primatives/LooperDial.vue";
import type { LoopDialSegment } from "@/components/primatives/LoopDial.vue";
import UnifiedVisualEffects from "@/components/UnifiedVisualEffects.vue";
import { useMusicColor } from "@/composables/useMusicColor";
import { chromaticPitchHeight } from "@/services/scalePitch";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { GATE_BAR_MS, gateMembers } from "./phoneGate/fixtures";
import { gateRows, type Verdict } from "./phoneGate/report";
import { createPhoneGate, MUTE_TAPS, PAD_TAPS, SOAK_BARS, SOLO_HOLDS, type GateDial } from "./phoneGate/runner";

// The Stage behind the page runs the default look, and the lab never saves it.
useVisualConfigStore().useEphemeralDefaults();

const gate = createPhoneGate();
const state = gate.state;
const rows = computed(() => gateRows(state.results));
const running = computed(() => state.phase !== "idle" && state.phase !== "done");
const copied = ref(false);
const summaryRef = ref<HTMLElement | null>(null);

const { getStaticPrimaryColorByPitchClass } = useMusicColor();
const dialShapes = Object.fromEntries(gateMembers().map(member => {
  const segments: LoopDialSegment[] = member.notes.map(note => ({
    color: getStaticPrimaryColorByPitchClass(note.pitchClassIndex ?? 0, member.mode, member.key, note.octave),
    startMs: note.pressTime,
    durationMs: note.duration,
    height: chromaticPitchHeight(note, { key: member.key, mode: member.mode }),
  }));
  return [member.id, { segments, lengthMs: (member.lengthBars ?? 1) * GATE_BAR_MS }];
}));

function dialState(dial: GateDial): LooperDialState {
  if (dial.soloed) return "solo";
  if (dial.muted || state.dials.some(other => other.soloed)) return "muted";
  return "playing";
}

const VERDICT_LABEL: Record<Verdict, string> = { pass: "Pass", fail: "Fail", record: "Recorded", partial: "Partial",
  "not-run": "Not run" };

async function copySummary() {
  copied.value = false;
  try {
    await navigator.clipboard.writeText(state.summary);
    copied.value = true;
    return;
  } catch {
    // No clipboard permission: select the text so the system menu can copy it.
  }
  const node = summaryRef.value;
  const selection = window.getSelection();
  if (!node || !selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
  copied.value = document.execCommand?.("copy") ?? false;
}

function runAgain() {
  window.location.reload();
}

onBeforeUnmount(() => gate.dispose());
</script>

<template>
  <div class="phone-gate">
    <UnifiedVisualEffects class="phone-gate__stage" />

    <main class="phone-gate__sheet" data-testid="phone-gate">
      <header class="phone-gate__header">
        <p class="phone-gate__kicker">Lab · BJS-494</p>
        <h1 class="phone-gate__title">Phone gate</h1>
        <p class="phone-gate__lede">
          The worklet engine's receipts on this phone: a four-member piano loop at 100 BPM with live notes on top,
          then a few guided taps. About three minutes. Sound on, volume at half, the phone in one hand.
        </p>
      </header>

      <section class="phone-gate__step" aria-live="polite">
        <template v-if="state.phase === 'idle'">
          <div class="phone-gate__action">
            <Button size="lg" tone="brass" accessible-name="Run the phone gate" data-testid="phone-gate-run" @click="gate.run()">
              <Play />
            </Button>
            <span>Run the phone gate</span>
          </div>
          <p class="phone-gate__note">The tap starts audio. Keep this tab in front until the summary shows.</p>
        </template>

        <template v-else-if="state.phase === 'loading'">
          <p class="phone-gate__status">{{ state.status }}</p>
        </template>

        <template v-else-if="state.phase === 'soak'">
          <p class="phone-gate__status">{{ state.status }}</p>
          <div class="phone-gate__meter" role="progressbar" :aria-valuenow="Math.round(state.progress * 100)" aria-valuemin="0" aria-valuemax="100" :aria-label="`Soak, ${SOAK_BARS} bars`">
            <span :style="{ inlineSize: `${state.progress * 100}%` }" />
          </div>
        </template>

        <template v-else-if="state.phase === 'ear'">
          <p class="phone-gate__status">During those twelve bars, did you hear any clicks, gaps or dropouts?</p>
          <div class="phone-gate__choices">
            <div class="phone-gate__action">
              <Button size="lg" tone="ivory" accessible-name="None heard" @click="gate.answerEar(false)"><Check /></Button>
              <span>None heard</span>
            </div>
            <div class="phone-gate__action">
              <Button size="lg" accessible-name="I heard clicks or gaps" @click="gate.answerEar(true)"><X /></Button>
              <span>Heard some</span>
            </div>
          </div>
        </template>

        <template v-else-if="state.phase === 'dials'">
          <p class="phone-gate__status">
            Tap any dial {{ MUTE_TAPS }} times, about once a second (each tap mutes or unmutes).
            Then hold a dial until it solos and let go, {{ SOLO_HOLDS }} times.
          </p>
          <p class="phone-gate__count">Taps {{ state.muteTaps }} of {{ MUTE_TAPS }} · holds {{ state.soloHolds }} of {{ SOLO_HOLDS }}</p>
        </template>

        <template v-else-if="state.phase === 'tap'">
          <p class="phone-gate__status">Tap the pad {{ PAD_TAPS }} times, a firm tap each.</p>
          <p class="phone-gate__count">Taps {{ state.padTaps }} of {{ PAD_TAPS }}</p>
        </template>

        <template v-else-if="state.phase === 'resume'">
          <p class="phone-gate__status">{{ state.status }}</p>
          <div v-if="!state.needsResumeTap" class="phone-gate__meter" aria-hidden="true">
            <span :style="{ inlineSize: `${Math.min(1, state.progress) * 100}%` }" />
          </div>
          <div v-else class="phone-gate__action">
            <Button size="lg" tone="brass" accessible-name="Resume audio" @click="gate.resumeByTap()"><Play /></Button>
            <span>Resume audio</span>
          </div>
        </template>

        <template v-else-if="state.phase === 'route'">
          <p class="phone-gate__status">
            While the loop plays, plug headphones in or out, or connect or disconnect Bluetooth. Listen for a few
            seconds, then say whether the loop kept playing.
          </p>
          <p class="phone-gate__count">Loop notes in the last 2 s: {{ state.loopAlive }}</p>
          <ul v-if="state.routeObservations.length" class="phone-gate__log">
            <li v-for="line in state.routeObservations" :key="line">{{ line }}</li>
          </ul>
          <div class="phone-gate__choices">
            <div class="phone-gate__action">
              <Button size="lg" tone="ivory" accessible-name="It kept playing" @click="gate.answerRoute(true)"><Check /></Button>
              <span>Kept playing</span>
            </div>
            <div class="phone-gate__action">
              <Button size="lg" accessible-name="It broke" @click="gate.answerRoute(false)"><X /></Button>
              <span>Broke</span>
            </div>
            <div class="phone-gate__action">
              <Button size="md" accessible-name="Skip: no headphones to hand" @click="gate.answerRoute(null)"><ArrowRight /></Button>
              <span>Skip</span>
            </div>
          </div>
        </template>

        <template v-else-if="state.phase === 'done'">
          <p class="phone-gate__status">Done. Copy the summary into the issue.</p>
          <div class="phone-gate__choices">
            <div class="phone-gate__action">
              <Button size="lg" tone="brass" accessible-name="Copy the summary" data-testid="phone-gate-copy" @click="copySummary"><Copy /></Button>
              <span>{{ copied ? "Copied" : "Copy summary" }}</span>
            </div>
            <div class="phone-gate__action">
              <Button size="md" accessible-name="Run again" @click="runAgain"><RotateCcw /></Button>
              <span>Run again</span>
            </div>
          </div>
          <pre ref="summaryRef" class="phone-gate__summary" data-testid="phone-gate-summary">{{ state.summary }}</pre>
        </template>

        <div v-if="state.phase === 'dials'" class="phone-gate__dials" role="group" aria-label="Loop members">
          <div
            v-for="dial in state.dials"
            :key="dial.id"
            class="phone-gate__dial"
            @pointerup.capture="gate.dialLift(dial.id, $event)"
          >
            <LooperDial
              :segments="dialShapes[dial.id].segments"
              :length-ms="dialShapes[dial.id].lengthMs"
              :bar-ms="GATE_BAR_MS"
              :label="dial.label"
              :state="dialState(dial)"
              @mute="gate.dialMute(dial.id)"
              @solo="(held: boolean) => gate.dialSolo(dial.id, held)"
            />
            <span>{{ dial.label }}</span>
          </div>
        </div>

        <div v-if="state.phase === 'soak' || state.phase === 'tap'" class="phone-gate__action phone-gate__pad">
          <Button
            size="lg"
            tone="ivory"
            :ui-beat="false"
            accessible-name="Pad: plays a live note"
            data-testid="phone-gate-pad"
            @pointerdown="gate.padDown($event)"
            @pointerup="gate.padUp()"
            @pointercancel="gate.padUp()"
            @pointerleave="gate.padUp()"
          >
            <Play />
          </Button>
          <span>Pad</span>
        </div>

        <div v-if="state.phase === 'dials' || state.phase === 'tap'" class="phone-gate__action">
          <Button size="md" accessible-name="Next step" @click="gate.next()"><ArrowRight /></Button>
          <span>Next</span>
        </div>

        <div v-if="running" class="phone-gate__action phone-gate__stop">
          <Button size="sm" accessible-name="Stop and summarise" @click="gate.stop()"><Square /></Button>
          <span>Stop and summarise</span>
        </div>
      </section>

      <section v-if="state.phase !== 'idle'" class="phone-gate__rows" aria-label="Results so far">
        <article v-for="row in rows" :key="row.id" class="phone-gate__row" :data-verdict="row.verdict">
          <header>
            <span class="phone-gate__verdict">{{ VERDICT_LABEL[row.verdict] }}</span>
            <h2>{{ row.label }}</h2>
          </header>
          <p>{{ row.value }}</p>
          <p class="phone-gate__mark">Mark: {{ row.mark }}</p>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.phone-gate {
  position: relative;
  min-block-size: 100dvh;
  background: var(--ink);
  color: var(--ivory);
}

.phone-gate__stage {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.phone-gate__sheet {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  inline-size: 100%;
  max-inline-size: 480px;
  margin-inline: auto;
  padding: var(--s-8) var(--s-6) var(--s-10);
  display: grid;
  gap: var(--s-7);
}

.phone-gate__header,
.phone-gate__step,
.phone-gate__row {
  background: color-mix(in srgb, var(--ink-2) 88%, transparent);
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
  padding: var(--s-6);
}

.phone-gate__header { display: grid; gap: var(--s-3); }
.phone-gate__kicker { margin: 0; font: var(--t-label); letter-spacing: var(--tracking-label); color: var(--brass); text-transform: uppercase; }
.phone-gate__title { margin: 0; font: var(--t-display-m); color: var(--ivory); }
.phone-gate__lede,
.phone-gate__status,
.phone-gate__note { margin: 0; font: var(--t-body-mono); color: var(--ivory-2); }
.phone-gate__status { color: var(--ivory); }
.phone-gate__count { margin: 0; font: var(--t-mono); color: var(--brass); }

.phone-gate__step { display: grid; gap: var(--s-6); }

.phone-gate__action {
  display: flex;
  align-items: center;
  gap: var(--s-5);
  font: var(--t-body);
  color: var(--ivory);
}

.phone-gate__choices { display: flex; flex-wrap: wrap; gap: var(--s-6) var(--s-8); }

.phone-gate__meter {
  block-size: var(--s-2);
  border-radius: var(--r-pill);
  background: var(--ink-4);
  overflow: hidden;
}
.phone-gate__meter > span {
  display: block;
  block-size: 100%;
  background: var(--brass);
  transition: inline-size var(--dur-ui) linear;
}

.phone-gate__dials {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--s-4);
  justify-items: center;
}
.phone-gate__dial {
  display: grid;
  justify-items: center;
  gap: var(--s-2);
  font: var(--t-caption);
  color: var(--ivory-2);
}

.phone-gate__pad { justify-self: center; }
.phone-gate__stop { color: var(--ivory-3); }

.phone-gate__log {
  margin: 0;
  padding-inline-start: var(--s-6);
  font: var(--t-caption);
  color: var(--ivory-2);
}

.phone-gate__summary {
  margin: 0;
  padding: var(--s-5);
  max-block-size: 50dvh;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: var(--t-caption);
  color: var(--ivory);
  background: var(--ink);
  border: 1px solid var(--ink-5);
  border-radius: var(--r-sm);
  user-select: text;
  -webkit-user-select: text;
}

.phone-gate__rows { display: grid; gap: var(--s-4); }
.phone-gate__row { display: grid; gap: var(--s-2); padding: var(--s-5); }
.phone-gate__row header { display: flex; align-items: baseline; gap: var(--s-4); }
.phone-gate__row h2 { margin: 0; font: var(--t-h2); color: var(--ivory); }
.phone-gate__row p { margin: 0; font: var(--t-body-s-mono); color: var(--ivory-2); overflow-wrap: anywhere; }
.phone-gate__row .phone-gate__mark { font: var(--t-caption); color: var(--ivory-3); }

.phone-gate__verdict {
  flex: 0 0 auto;
  padding: 0 var(--s-3);
  border-radius: var(--r-xs);
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--ink);
  background: var(--ivory-3);
}
.phone-gate__row[data-verdict="pass"] .phone-gate__verdict { background: var(--ivory); }
.phone-gate__row[data-verdict="fail"] .phone-gate__verdict { background: var(--brass); }
.phone-gate__row[data-verdict="not-run"] .phone-gate__verdict { background: var(--ink-5); color: var(--ivory-2); }
</style>
