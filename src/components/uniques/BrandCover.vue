<template>
  <div class="brand-cover">
    <div class="brand-cover__columns">
      <div>
        <div class="brand-cover__kicker">
          <span class="brand-cover__dot" aria-hidden="true"></span>
          EmotiTone Solfege - Design System v0.1 - Stage 01 of 06
        </div>

        <h1 class="brand-cover__headline">
          <span>Cut-paper</span> jazz,<br>
          lit by a <strong>synth.</strong>
        </h1>

        <p class="brand-cover__body">
          A directed visual language for a music-theory instrument. Two moods on one stage:
          a mid-century Affinity poster - bold flat shapes, jazz-poster colour, hand-set
          display type - sitting in a dark studio room where the only chromatic light comes
          from the music itself.
        </p>
      </div>

      <div class="brand-cover__art-wrap">
        <div class="brand-cover__stamp">FILE · 01 / FOUNDATIONS</div>
        <div class="brand-cover__shapes" aria-hidden="true">
          <svg viewBox="0 0 210 218" width="210" height="218" class="brand-cover__svg">
            <rect
              x="22"
              y="38"
              width="118"
              height="158"
              class="brand-cover__paper brand-cover__paper--brass"
              transform="rotate(-6 81 117)"
            />
            <rect
              x="102"
              y="18"
              width="80"
              height="118"
              class="brand-cover__paper brand-cover__paper--tomato"
              transform="rotate(8 142 77)"
            />
            <rect
              x="52"
              y="112"
              width="148"
              height="80"
              class="brand-cover__paper brand-cover__paper--plum"
              transform="rotate(-3 126 152)"
            />
            <g transform="translate(112 56) scale(0.52)">
              <path
                d="M40 0 C60 30 60 70 30 90 C5 105 -10 130 10 150 C30 170 60 170 70 150 C78 132 70 115 60 110 L50 200"
                class="brand-cover__clef"
              />
              <circle cx="50" cy="200" r="13" class="brand-cover__ink-fill" />
            </g>
            <g transform="translate(30 142)">
              <ellipse
                cx="13"
                cy="13"
                rx="13"
                ry="9"
                transform="rotate(-20 13 13)"
                class="brand-cover__bone-fill"
              />
              <rect
                x="24"
                y="-22"
                width="4"
                height="35"
                transform="rotate(-15 24 -22)"
                class="brand-cover__bone-fill"
              />
            </g>
          </svg>
        </div>
      </div>
    </div>

    <div class="brand-cover__meta">
      <div v-for="item in metaItems" :key="item.label">
        <div class="brand-cover__meta-key">{{ item.label }}</div>
        <div class="brand-cover__meta-value">{{ item.value }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const metaItems = [
  { label: "Mood", value: "Late-night studio" },
  { label: "Display", value: "Lets Jazz" },
  { label: "Body", value: "JetBrains Mono" },
  { label: "Surface", value: "Stage / Paper" },
] as const;
</script>

<style scoped>
.brand-cover {
  position: relative;
}

.brand-cover__columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 210px;
  gap: 20px;
  align-items: start;
}

.brand-cover__kicker {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font: var(--t-label);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-3);
  margin-bottom: 18px;
}

.brand-cover__dot {
  width: 7px;
  height: 7px;
  background: var(--brass);
  flex-shrink: 0;
}

.brand-cover__headline {
  font: 400 44px/0.92 var(--font-display);
  letter-spacing: 0.01em;
  text-transform: uppercase;
  margin: 0 0 18px;
}

.brand-cover__headline span {
  color: var(--brass);
}

.brand-cover__headline strong {
  color: var(--tomato);
  font-weight: 400;
}

.brand-cover__body {
  font: var(--t-body-s);
  color: var(--ivory-3);
  max-width: 40ch;
  margin: 0;
  line-height: 1.65;
}

.brand-cover__art-wrap {
  position: relative;
}

.brand-cover__stamp {
  position: absolute;
  top: 0;
  right: 6px;
  font: var(--t-label);
  letter-spacing: 0.2em;
  color: var(--ivory-3);
  border: 1px solid var(--ink-5);
  padding: 4px 8px;
  transform: rotate(8deg);
  transform-origin: top right;
  background: var(--ink-2);
  white-space: nowrap;
  z-index: 2;
}

.brand-cover__shapes {
  position: relative;
  background: var(--ink-2);
  box-shadow: var(--ring);
  overflow: hidden;
  height: 218px;
  margin-top: 20px;
}

.brand-cover__svg {
  display: block;
  overflow: visible;
}

.brand-cover__paper--brass {
  fill: var(--brass);
}

.brand-cover__paper--tomato {
  fill: var(--tomato);
}

.brand-cover__paper--plum {
  fill: var(--plum);
}

.brand-cover__clef {
  stroke: var(--ink);
  stroke-width: 10;
  fill: none;
  stroke-linecap: butt;
}

.brand-cover__ink-fill {
  fill: var(--ink);
}

.brand-cover__bone-fill {
  fill: var(--bone);
}

.brand-cover__meta {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-top: 20px;
  border-top: 1px solid var(--ink-5);
  border-bottom: 1px solid var(--ink-5);
}

.brand-cover__meta > div {
  padding: 14px 0;
  border-right: 1px solid var(--ink-5);
}

.brand-cover__meta > div:last-child {
  border-right: 0;
}

.brand-cover__meta-key {
  font: var(--t-label);
  letter-spacing: 0.2em;
  color: var(--ivory-3);
  margin-bottom: 7px;
}

.brand-cover__meta-value {
  font: 400 17px/1 var(--font-display);
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: var(--ivory);
}
</style>
