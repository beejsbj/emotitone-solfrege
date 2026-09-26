<script setup lang="ts">
import VariantCell from "../guide/VariantCell.vue";

interface Chip {
  token: string;
  name: string;
  hex: string;
  role: string;
  /** Text colour on the chip face. */
  ink: string;
  tilt: string;
  cut: string;
}

const inkScale: Chip[] = [
  { token: "--ink", name: "Ink", hex: "#0A0908", role: "deepest stage", ink: "var(--ivory)", tilt: "var(--rot-tile-2)", cut: "var(--clip-tile)" },
  { token: "--ink-2", name: "Ink 2", hex: "#141210", role: "surface 1 · rise", ink: "var(--ivory)", tilt: "var(--rot-tile-3)", cut: "var(--clip-offcut)" },
  { token: "--ink-3", name: "Ink 3", hex: "#1C1916", role: "panel body", ink: "var(--ivory)", tilt: "var(--rot-tile-4)", cut: "var(--clip-tab)" },
  { token: "--ink-4", name: "Ink 4", hex: "#25211D", role: "hover / press", ink: "var(--ivory)", tilt: "var(--rot-tile-5)", cut: "var(--clip-tile)" },
  { token: "--ink-5", name: "Ink 5", hex: "#3A352F", role: "wire / divider", ink: "var(--ivory)", tilt: "var(--rot-tile-1)", cut: "var(--clip-offcut)" },
];

const ivoryScale: Chip[] = [
  { token: "--ivory", name: "Ivory", hex: "#F4EFE6", role: "primary text", ink: "var(--ink)", tilt: "var(--rot-tile-3)", cut: "var(--clip-offcut)" },
  { token: "--ivory-2", name: "Ivory 2", hex: "#C9C2B5", role: "secondary text", ink: "var(--ink)", tilt: "var(--rot-tile-2)", cut: "var(--clip-tab)" },
  { token: "--ivory-3", name: "Ivory 3", hex: "#8F877B", role: "meta / muted", ink: "var(--ink)", tilt: "var(--rot-tile-5)", cut: "var(--clip-tile)" },
  { token: "--ivory-4", name: "Ivory 4", hex: "#514B42", role: "disabled / decorative", ink: "var(--ivory)", tilt: "var(--rot-tile-4)", cut: "var(--clip-offcut)" },
];

const brassFinishes = [
  { name: "Flat", cls: "", style: "background:var(--brass);" },
  { name: "Sheen", cls: "brass", style: "" },
  { name: "Glow", cls: "", style: "background:var(--brass);box-shadow:var(--shadow-glow-brass);" },
  { name: "Sheen + glow", cls: "brass", style: "box-shadow:var(--shadow-glow-brass);" },
];

const chipStyle = (chip: Chip) => ({
  background: `var(${chip.token})`,
  color: chip.ink,
  "--chip-tilt": chip.tilt,
  "--chip-cut": chip.cut,
});
</script>

<template>
  <section class="preview-port preview-port--token-ui-colors">
    <div class="card">
      <div class="label">Chrome only</div>
      <p class="caption lede">Music Color sits on top of this layer.</p>
      <p class="caption lede rule">
        <span class="rule__kicker">High-contrast</span>
        Reach for <code>--ink</code> and <code>--ivory</code> first. The grays
        (<code>--ink-2…5</code>, <code>--ivory-2…4</code>) are surface and meta &mdash; used
        sparingly to keep the dark stage feeling high-contrast.
      </p>

      <div class="block">
        <div class="label">Dark stage scale</div>
        <div class="well well--bone chips">
          <figure v-for="chip in inkScale" :key="chip.token" class="chip" :style="chipStyle(chip)">
            <span class="chip__name">{{ chip.name }}</span>
            <figcaption class="chip__meta">
              <code>{{ chip.token }}</code>
              <span>{{ chip.hex }}</span>
              <span class="chip__role">{{ chip.role }}</span>
            </figcaption>
          </figure>
        </div>
      </div>

      <div class="block">
        <div class="label">Light text on dark</div>
        <div class="well chips">
          <figure v-for="chip in ivoryScale" :key="chip.token" class="chip" :style="chipStyle(chip)">
            <span class="chip__name">{{ chip.name }}</span>
            <figcaption class="chip__meta">
              <code>{{ chip.token }}</code>
              <span>{{ chip.hex }}</span>
              <span class="chip__role">{{ chip.role }}</span>
            </figcaption>
          </figure>
        </div>
      </div>

      <div class="block">
        <div class="label">Brass with ink and ivory</div>
        <div class="well brass-block">
          <div
            v-for="finish in brassFinishes"
            :key="finish.name"
            class="brass-swatch"
            :class="finish.cls"
            :style="finish.style"
          >
            <span class="brass-swatch__name">{{ finish.name }}</span>
            <span class="brass-swatch__hex">#E0A93A</span>
          </div>
        </div>

        <div class="brass-legend">
          <p><b>One signal per panel.</b> Apply via the <code>.brass</code> utility (gradient + sheen) &mdash; never as a flat fill.</p>
          <p>Reserve for: active record, captured value, the lit beat on the metronome, the brand wordmark on a hero.</p>
          <p>Never on borders. Never on text smaller than 12px. Never as a chrome background. Glow = <code>--shadow-glow-brass</code>, lifted from the digital knob.</p>
        </div>

        <div class="applied">
          <span class="applied__kicker">Applied</span>
          <div class="applied__grid">
            <VariantCell caption="REC · active record">
              <span class="brass rec-dot" title="record"></span>
            </VariantCell>
            <VariantCell caption="Captured value">
              <span class="brass seg">120</span>
            </VariantCell>
            <VariantCell caption="Lit key">
              <span class="brass key" title="lit sax key"></span>
            </VariantCell>
            <VariantCell caption="Wordmark · .brass-text">
              <span class="brass-text wordmark">Emotitone</span>
            </VariantCell>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}

.lede {
  max-width: 64ch;
  margin: var(--s-5) 0 0;
}

.rule__kicker {
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
  margin-right: var(--s-2);
}

.lede code,
.brass-legend code {
  color: var(--ivory);
  white-space: nowrap;
}

.block {
  margin-top: var(--s-9);
}

.block > .label {
  margin-bottom: var(--s-5);
}

/* Plain Ink well; the dark scale sits on Bone paper so --ink can read. */
.well {
  background: var(--ink);
  padding: var(--s-7) var(--s-6);
}

.well--bone {
  background: var(--bone);
}

/* Cut-paper paint chips. */
.chips {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 124px), 1fr));
  gap: var(--s-7) var(--s-5);
}

.chip {
  margin: 0;
  min-height: 128px;
  padding: var(--s-5) var(--s-5) var(--s-4);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--s-6);
  clip-path: var(--chip-cut);
  transform: rotate(var(--chip-tilt));
  transition: transform var(--dur-ui) var(--ease-swing);
}

.chip:hover {
  transform: rotate(0deg) translateY(-2px);
}

.chip__name {
  font: 700 24px/0.95 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.chip__meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font: var(--t-caption);
}

.chip__meta code {
  font: var(--t-body-s-mono);
  font-weight: 600;
  color: inherit;
}

.chip__role {
  opacity: 0.8;
}

/* Brass finishes: brass is the subject here. */
.brass-block {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 124px), 1fr));
  gap: var(--s-7) var(--s-6);
}

.brass-swatch {
  position: relative;
  height: 112px;
  padding: var(--s-4) var(--s-5);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--ink);
  box-sizing: border-box;
}

.brass-swatch:nth-child(odd) { transform: rotate(var(--rot-tile-2)); }
.brass-swatch:nth-child(even) { transform: rotate(var(--rot-tile-5)); }

.brass-swatch__name {
  position: relative;
  z-index: 3;
  font: 700 18px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.brass-swatch__hex {
  position: relative;
  z-index: 3;
  font: var(--t-body-s-mono);
  font-weight: 600;
}

.brass-legend {
  max-width: 68ch;
  margin-top: var(--s-7);
  font: var(--t-body-s-mono);
  color: var(--ivory-3);
}

.brass-legend p {
  margin: 0 0 var(--s-4);
}

.brass-legend b {
  color: var(--ivory);
  font-weight: 600;
}

.applied {
  margin-top: var(--s-8);
}

.applied__kicker {
  display: inline-block;
  margin-bottom: var(--s-5);
  padding: var(--s-2) var(--s-4);
  background: var(--guide-paper, var(--bone));
  color: var(--guide-paper-ink, var(--ink));
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  clip-path: var(--clip-tab);
  transform: rotate(var(--rot-sticker));
}

.applied__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr));
  gap: var(--s-6) var(--s-5);
}

.rec-dot { width: 18px; height: 18px; border-radius: 50%; }
.seg {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 18px;
  padding: 4px 10px;
  line-height: 1;
  letter-spacing: .04em;
}
.key { width: 36px; height: 48px; }
.wordmark {
  font-family: var(--font-display);
  font-size: 30px;
  line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
  .chip { transition: none; }
  .chip:hover { transform: rotate(var(--chip-tilt)); }
}
</style>
