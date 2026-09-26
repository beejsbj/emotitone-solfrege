<script setup lang="ts">
import Sticker from "@/components/primatives/Sticker";

type Face = "jazz" | "mono";

interface RampRow {
  token: string;
  spec: string;
  face: Face;
  note?: string;
  sample: string;
  cls: string;
}

const displayRows: RampRow[] = [
  { token: "--t-display-xl", spec: "700 56px/0.92", face: "jazz", sample: "Do.", cls: "s-display-xl" },
  { token: "--t-display-l", spec: "700 40px/0.94", face: "jazz", sample: "Sing.", cls: "s-display-l" },
  { token: "--t-display-m", spec: "700 28px/0.96", face: "jazz", sample: "Play it.", cls: "s-display-m" },
  { token: "--t-h1", spec: "700 22px/1.10", face: "jazz", sample: "The quick brown fox", cls: "s-h1" },
  { token: "--t-h2", spec: "700 18px/1.14", face: "jazz", sample: "The quick brown fox", cls: "s-h2" },
];

const bodyRows: RampRow[] = [
  { token: "--t-body", spec: "450 14px/1.55", face: "jazz", note: "≤ 5 words", sample: "Short impact line.", cls: "s-body-jazz" },
  { token: "--t-body-mono", spec: "450 14px/1.55", face: "mono", note: "> 5 words", sample: "The quick brown fox jumps over the lazy dog", cls: "s-body-mono" },
  { token: "--t-body-s", spec: "450 12px/1.50", face: "jazz", note: "≤ 5 words", sample: "Quiet meta inline.", cls: "s-body-s" },
  { token: "--t-body-s-mono", spec: "450 12px/1.50", face: "mono", note: "> 5 words", sample: "The quick brown fox jumps over the lazy dog", cls: "s-body-s-mono" },
];

const detailRows: RampRow[] = [
  { token: "--t-caption", spec: "450 11px/1.40", face: "mono", note: "captions stay mono", sample: "Chrome metadata · debug readouts · file paths", cls: "s-caption" },
  { token: "--t-label", spec: "600 11px/1.10", face: "jazz", sample: "Presets · Scope · Sync", cls: "s-label-jazz" },
  { token: "--t-mono", spec: "500 12px/1.40", face: "mono", sample: "120 BPM · C4:m · 2026-05-18", cls: "s-mono" },
];

const rampGroups = [
  { title: "Display ramp", rows: displayRows },
  { title: "Body · Jazz under 5 words, mono past 5", rows: bodyRows },
  { title: "Captions, labels, readouts", rows: detailRows },
];

const rules = [
  { head: "Jazz first.", body: "Lets Jazz is the primary font — use it everywhere by default." },
  { head: "Mono is the exception.", body: "Captions, and body over 5 words." },
  { head: "Labels are Jazz.", body: "Product labels are Lets Jazz; guide/spec inspection labels may be mono." },
  { head: "Shout, then stop.", body: "Display is always uppercase, period-terminated." },
  { head: "One size per scope.", body: "One Lets Jazz size per scope — don't stack display on display." },
];

const noteSource = `<Note
  syllable="Mi"
  degree="III"
  raw-pitch="E4"
/>`;
</script>

<template>
  <section class="type-poster">
    <p class="type-poster__intro">
      Two typefaces. One rule. Display is the voice — mono is the instrument.
    </p>

    <!-- 1. The two faces -->
    <div class="faces">
      <figure class="face face--jazz">
        <Sticker class="face__tag" variant="fill" color="mustard">Primary</Sticker>
        <div class="face__jazz">Emotitone.</div>
        <figcaption>
          <span class="face__name">Lets Jazz</span>
          <span class="face__role">--font-display · the uppercase voice · headings, names, labels, short body</span>
        </figcaption>
      </figure>
      <figure class="face face--mono">
        <Sticker class="face__tag" variant="fill" color="tomato">Exception</Sticker>
        <pre class="face__mono">{{ noteSource }}</pre>
        <figcaption>
          <span class="face__name">JetBrains Mono</span>
          <span class="face__role">--font-mono · code, captions, long body, guide specs</span>
        </figcaption>
      </figure>
    </div>
    <p class="face-note">Face specimens are scaled for the poster; true sizes live in the ramp.</p>

    <!-- 2. Type ramp, at true token sizes -->
    <div v-for="group in rampGroups" :key="group.title" class="ramp">
      <div class="label">{{ group.title }}</div>
      <div class="ramp__well">
        <div v-for="row in group.rows" :key="row.token" class="ramp__row">
          <span class="ramp__sample" :class="row.cls">{{ row.sample }}</span>
          <span class="ramp__spec">
            <span class="ramp__face" :class="`ramp__face--${row.face}`">{{ row.face === 'jazz' ? 'Jazz' : 'Mono' }}</span>
            <code>{{ row.token }}</code>
            <span class="ramp__values">{{ row.spec }}<template v-if="row.note"> · {{ row.note }}</template></span>
          </span>
        </div>
      </div>
    </div>

    <!-- 3. Tracking -->
    <div class="label">Tracking</div>
    <div class="tracking">
      <div class="tracking__well">
        <div class="tracking__display" style="letter-spacing: var(--tracking-display)">Tight.</div>
        <div class="tracking__meta"><code>--tracking-display</code> · 0.01em · display faces</div>
      </div>
      <div class="tracking__well">
        <div class="tracking__label" style="letter-spacing: var(--tracking-label)">Wide label caps</div>
        <div class="tracking__meta"><code>--tracking-label</code> · 0.14em · jazz labels</div>
      </div>
    </div>

    <!-- 4. Usage rules -->
    <div class="label">House rules</div>
    <ol class="rules">
      <li v-for="(rule, index) in rules" :key="rule.head" class="rule">
        <span class="rule__num">{{ index + 1 }}</span>
        <span class="rule__head">{{ rule.head }}</span>
        <span class="rule__body">{{ rule.body }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.type-poster {
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
  min-width: 0;
}

.type-poster__intro {
  margin: 0;
  max-width: 60ch;
  font: var(--t-body-mono);
  color: var(--ivory-2);
}

/* ── The two faces ─────────────────────────────────────────────────────── */
.faces {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: var(--s-5);
}

.face {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--s-8);
  min-width: 0;
  margin: 0;
  padding: var(--s-8) var(--s-6) var(--s-6);
  background: var(--ink);
  container-type: inline-size;
}

.face__tag {
  position: absolute;
  top: calc(var(--s-3) * -1);
  right: var(--s-5);
  font: 700 14px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.face__jazz {
  padding-bottom: var(--s-4);
  font: 700 clamp(48px, 21cqi, 136px)/0.9 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
  white-space: nowrap;
}

.face__mono {
  margin: 0;
  font: 500 clamp(15px, 4.4vw, 22px)/1.5 var(--font-mono);
  color: var(--ivory-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.face figcaption {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.face__name {
  font: 700 22px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--guide-paper);
}

.face__role {
  font: var(--t-caption);
  color: var(--ivory-3);
}

.face-note {
  margin: calc(var(--s-4) * -1) 0 0;
  font: var(--t-caption);
  color: var(--ivory-4);
}

/* ── Ramp ──────────────────────────────────────────────────────────────── */
.ramp {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.ramp__well {
  display: flex;
  flex-direction: column;
  gap: var(--s-7);
  padding: var(--s-7) var(--s-6);
  background: var(--ink);
}

.ramp__row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-5) var(--s-7);
}

.ramp__sample {
  flex: 1 1 280px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.ramp__spec {
  display: flex;
  flex: 0 1 300px;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--s-2) var(--s-3);
}

.ramp__spec code {
  font: var(--t-caption);
  color: var(--ivory-2);
}

.ramp__values {
  font: var(--t-caption);
  color: var(--ivory-4);
}

.ramp__face {
  padding: 4px 8px 2px;
  font: 700 13px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  clip-path: var(--clip-tab);
}

.ramp__face--jazz {
  background: var(--guide-paper);
  color: var(--guide-paper-ink);
  transform: rotate(var(--rot-tile-2));
}

.ramp__face--mono {
  background: var(--tomato);
  color: var(--ivory);
  transform: rotate(var(--rot-tile-3));
}

/* Samples at true token sizes */
/* Lets Jazz caps sit below their line box; give the display rows room so the tag never grazes a glyph. */
.s-display-xl, .s-display-l, .s-display-m { padding-bottom: 0.1em; }
.s-display-xl { font: var(--t-display-xl); letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ivory); }
.s-display-l  { font: var(--t-display-l);  letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ivory); }
.s-display-m  { font: var(--t-display-m);  letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ivory); }
.s-h1         { font: var(--t-h1);         letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ivory); }
.s-h2         { font: var(--t-h2);         letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ivory); }
.s-body-jazz  { font: var(--t-body);   color: var(--ivory-2); }
.s-body-mono  { font: var(--t-body-mono); color: var(--ivory-2); }
.s-body-s     { font: var(--t-body-s); color: var(--ivory-3); }
.s-body-s-mono{ font: var(--t-body-s-mono); color: var(--ivory-3); }
.s-caption    { font: var(--t-caption); color: var(--ivory-3); }
.s-label-jazz { font: var(--t-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--ivory-3); }
.s-mono       { font: var(--t-mono); color: var(--ivory-2); }

/* ── Tracking ──────────────────────────────────────────────────────────── */
.tracking {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: var(--s-5);
  margin-top: calc(var(--s-2) * -1);
}

.tracking__well {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--s-5);
  padding: var(--s-7) var(--s-6) var(--s-5);
  background: var(--ink);
}

.tracking__display {
  padding-bottom: var(--s-4);
  font: 700 clamp(40px, 12vw, 72px)/0.9 var(--font-display);
  text-transform: uppercase;
  color: var(--ivory);
}

.tracking__label {
  font: 700 clamp(16px, 4.4vw, 22px)/1.1 var(--font-display);
  text-transform: uppercase;
  color: var(--ivory-2);
}

.tracking__meta,
.tracking__meta code {
  font: var(--t-caption);
  color: var(--ivory-4);
}

.tracking__meta code { color: var(--ivory-2); }

/* ── House rules ───────────────────────────────────────────────────────── */
.rules {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: var(--s-5);
  margin: calc(var(--s-2) * -1) 0 0;
  padding: 0;
  list-style: none;
}

.rule {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto 1fr;
  gap: var(--s-2) var(--s-4);
  padding: var(--s-5);
  background: var(--ink);
}

.rule__num {
  grid-row: span 2;
  font: var(--t-display-l);
  letter-spacing: var(--tracking-display);
  color: var(--guide-paper);
}

.rule:nth-child(2) .rule__num { color: var(--tomato); }

.rule__head {
  font: var(--t-h2);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}

.rule__body {
  font: var(--t-body-s-mono);
  color: var(--ivory-3);
}
</style>
