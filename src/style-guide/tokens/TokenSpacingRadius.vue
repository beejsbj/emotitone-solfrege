<script setup lang="ts">
const radii = [
  { token: "--r-xs", step: "XS", value: "4px", tilt: "var(--rot-tile-2)" },
  { token: "--r-sm", step: "SM", value: "8px", tilt: "var(--rot-tile-3)" },
  { token: "--r-md", step: "MD", value: "14px", tilt: "var(--rot-tile-4)" },
  { token: "--r-lg", step: "LG", value: "18px", tilt: "var(--rot-tile-5)" },
  { token: "--r-xl", step: "XL", value: "24px", tilt: "var(--rot-tile-1)" },
];
</script>

<template>
  <section class="preview-port preview-port--token-spacing-radius">
    <div class="card">
      <div class="label">Radius</div>
      <p class="caption lede">
        Guide-retained scale steps, XS through XL plus pill &mdash; the complete radius scale stays
        documented here even where no product surface uses a step yet.
      </p>

      <div class="corners">
        <figure v-for="r in radii" :key="r.token" class="corner">
          <div class="corner__well">
            <div
              class="corner__paper"
              :style="{ borderRadius: `var(${r.token})`, '--corner-tilt': r.tilt }"
            >
              <span class="corner__step">{{ r.step }}</span>
            </div>
          </div>
          <figcaption class="corner__meta">
            <code>{{ r.token }}</code>
            <span>{{ r.value }}</span>
          </figcaption>
        </figure>

        <figure class="corner corner--pill">
          <div class="corner__well">
            <div class="corner__paper corner__paper--pill" style="border-radius: var(--r-pill)">
              <span class="corner__step">Pill</span>
            </div>
          </div>
          <figcaption class="corner__meta">
            <code>--r-pill</code>
            <span>999px</span>
          </figcaption>
        </figure>
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

.corners {
  margin-top: var(--s-8);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 132px), 1fr));
  gap: var(--s-7) var(--s-5);
}

.corner {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  min-width: 0;
}

.corner--pill {
  grid-column: span 2;
}

/* Plain Ink well; the paper sheet runs off its bottom-right so the
   top-left corner reads large, like the corner of a torn-off page. */
.corner__well {
  position: relative;
  height: 120px;
  background: var(--ink);
  overflow: hidden;
}

.corner__paper {
  position: absolute;
  top: var(--s-8);
  left: var(--s-8);
  width: 160px;
  height: 160px;
  background: var(--bone);
  color: var(--ink);
  padding: var(--s-5);
  box-sizing: border-box;
  transform: rotate(var(--corner-tilt, 0deg));
}

.corner__paper--pill {
  left: 50%;
  width: min(160px, 80%);
  height: 40px;
  top: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateX(-50%) rotate(var(--rot-tile-3));
  background: var(--guide-paper, var(--bone));
  color: var(--guide-paper-ink, var(--ink));
}

.corner__step {
  font: 700 22px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.corner__meta {
  display: flex;
  justify-content: space-between;
  gap: var(--s-4);
  font: var(--t-caption);
  color: var(--ivory-3);
}

.corner__meta code {
  font: var(--t-body-s-mono);
  color: var(--ivory);
}
</style>
