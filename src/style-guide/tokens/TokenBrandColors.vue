<script setup lang="ts">
const scraps = [
  { token: "--tomato", name: "Tomato", hex: "#D8362A", role: "poster red · warning dot, danger kicker, brand splash", ink: "var(--ink)", tilt: "var(--rot-sticker)", cut: "var(--clip-offcut)" },
  { token: "--pine", name: "Pine", hex: "#1F4D3F", role: "deep green · quiet spine, \"live\" marker, brand patch", ink: "var(--ivory)", tilt: "var(--rot-mark)", cut: "var(--clip-paper-rip)" },
  { token: "--plum", name: "Plum", hex: "#6B3FA0", role: "lifted purple · ambient spine, scrap accent, sticker", ink: "var(--ivory)", tilt: "var(--rot-tile-2)", cut: "var(--clip-tile)" },
  { token: "--bone", name: "Bone", hex: "#EFE6D0", role: "warm off-white · brand background, paper-sticker face", ink: "var(--ink)", tilt: "var(--rot-tile-5)", cut: "var(--clip-tab)" },
  { token: "--mustard", name: "Mustard", hex: "#F0B137", role: "poster yellow · sticker spine, hot kicker, scrap accent", ink: "var(--ink)", tilt: "var(--rot-sticker-lg)", cut: "var(--clip-tile)" },
  { token: "--cobalt", name: "Cobalt", hex: "#2F67B2", role: "cool blue · Brand Logo cutout, poster counterweight", ink: "var(--ivory)", tilt: "var(--rot-mark)", cut: "var(--clip-offcut)" },
];

const scrapStyle = (scrap: (typeof scraps)[number]) => ({
  background: `var(${scrap.token})`,
  color: scrap.ink,
  "--scrap-tilt": scrap.tilt,
  "--scrap-cut": scrap.cut,
});
</script>

<template>
  <section class="preview-port preview-port--token-brand-colors">
    <div class="card">
      <div class="label">Poster use only</div>
      <p class="caption lede">Never on functional UI chrome &mdash; that's what brass is for.</p>

      <div class="wall">
        <figure v-for="scrap in scraps" :key="scrap.token" class="scrap" :style="scrapStyle(scrap)">
          <span class="scrap__name">{{ scrap.name }}</span>
          <figcaption class="scrap__meta">
            <span class="scrap__code"><code>{{ scrap.token }}</code> {{ scrap.hex }}</span>
            <span class="scrap__role">{{ scrap.role }}</span>
          </figcaption>
        </figure>
      </div>

      <p class="caption lede outro">
        Brand sits on top of ink, never replaces it. Use one brand color per reusable card &mdash; mixing reads as gift-wrap, not jazz.
        The singular Brand Logo is the explicit full-palette exception.
      </p>
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

.outro {
  margin-top: var(--s-9);
}

/* A poster wall: big torn scraps pasted onto the Ink. */
.wall {
  margin-top: var(--s-8);
  padding: var(--s-9) var(--s-6);
  background: var(--ink);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
  gap: var(--s-9) var(--s-7);
}

/* Six scraps read best as a 3 × 2 poster wall once there is room. */
@media (min-width: 900px) {
  .wall { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.scrap {
  margin: 0;
  min-height: 188px;
  padding: var(--s-6) var(--s-7) var(--s-6) var(--s-6);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--s-7);
  clip-path: var(--scrap-cut);
  transform: rotate(var(--scrap-tilt));
  transition: transform var(--dur-ui) var(--ease-swing);
}

.scrap:hover {
  transform: rotate(0deg) scale(1.02);
}

.scrap__name {
  font: 700 clamp(40px, 11vw, 56px)/0.9 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.scrap__meta {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  max-width: 30ch;
}

.scrap__code {
  font: var(--t-body-s-mono);
  font-weight: 600;
}

.scrap__code code {
  font: inherit;
  color: inherit;
}

.scrap__role {
  font: var(--t-caption);
  opacity: 0.85;
}

@media (prefers-reduced-motion: reduce) {
  .scrap { transition: none; }
  .scrap:hover { transform: rotate(var(--scrap-tilt)); }
}
</style>
