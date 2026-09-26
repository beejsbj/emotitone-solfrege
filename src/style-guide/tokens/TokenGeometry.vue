<script setup lang="ts">
const clips = [
  {
    token: "--clip-offcut",
    word: "Off-cut",
    tone: "tomato",
    value: "polygon(2% 6%, 96% 0%, 100% 8%, 98% 94%, 4% 100%, 0% 90%)",
    use: "Badge, active tab",
  },
  {
    token: "--clip-tile",
    word: "Tile",
    tone: "mustard",
    value: "polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%)",
    use: "Key and solfège tile",
  },
  {
    token: "--clip-tab",
    word: "Tab",
    tone: "pine",
    value: "polygon(2% 0, 100% 4%, 98% 100%, 0 96%)",
    use: "Tab slide, smear",
  },
  {
    token: "--clip-paper-rip",
    word: "Rip",
    tone: "cobalt",
    value: "polygon(0 0, 100% 0, 100% 4%, 88% 20%, 100% 40%, 78% 56%, 100% 78%, 100% 100%, 0 100%)",
    use: "Tile-fired corner tear",
  },
] as const;

const discs = [
  { token: "--clip-disc-tile", word: "Tile", cls: "clip-disc-tile" },
  { token: "--clip-disc-offcut", word: "Off-cut", cls: "clip-disc-offcut" },
  { token: "--clip-disc-tab", word: "Tab", cls: "clip-disc-tab" },
  { token: "--clip-disc-paper-rip", word: "Rip", cls: "clip-disc-paper-rip" },
  { token: "--clip-disc-rounded-stock", word: "Stock", cls: "clip-disc-rounded-stock" },
] as const;

const tiles = [
  { n: 1, value: "+0.2deg" },
  { n: 2, value: "-0.3deg" },
  { n: 3, value: "+0.5deg" },
  { n: 4, value: "-0.15deg" },
  { n: 5, value: "+0.45deg" },
] as const;

const stickers = [
  { token: "--rot-sticker", value: "-2.2deg", word: "Badge", tone: "tomato", use: "Brand badges, stickers" },
  { token: "--rot-sticker-lg", value: "-3deg", word: "Poster", tone: "mustard", use: "Large poster elements" },
  { token: "--rot-mark", value: "+2deg", word: "Mark", tone: "plum", use: "Decorative cut mark" },
] as const;

const recipes = [
  { name: "Skew tab", word: "Tab", cls: "skew-offcut", value: "skewX(-2deg)", use: "Active off-cut tab" },
  { name: "Smear", word: "Smear", cls: "skew-rip", value: "scaleX(1.08) skewX(-12deg)", use: "Smear exit, cut-slide" },
  { name: "Rip out", word: "Rip out", cls: "skew-mode-out", value: "skewX(-14deg) translateY(-8px)", use: "Mode-rip knob exit" },
] as const;

const keyboardFamilies = ["standard", "tile", "offcut", "tab", "pill"] as const;

const shadows = [
  {
    token: "--shadow-cut",
    word: "Cut",
    cls: "shadow-cut",
    stage: "bone",
    value: "6px 6px 0 var(--ink)",
    use: "Hard offset, cut-paper lift. Shown on Bone: Ink on Ink disappears.",
  },
  {
    token: "--shadow-key",
    word: "Key fall",
    cls: "shadow-key",
    stage: "ink",
    value: "inset 0 -2px 0 rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.18)",
    use: "Key and tile inner depth",
  },
  {
    token: "--shadow-pressed",
    word: "Pressed",
    cls: "shadow-pressed",
    stage: "ink",
    value: "inset 0 2px 6px rgba(0,0,0,.6)",
    use: "Tap active, pressed state",
  },
  {
    token: "--shadow-glow",
    word: "Glow",
    cls: "shadow-glow",
    stage: "ink",
    value: "0 0 0 1px var(--hairline), 0 18px 60px -28px rgba(242,107,61,.35)",
    use: "Hero panel ambient halo",
  },
  {
    token: "--shadow-glow-brass",
    word: "Brass glow",
    cls: "shadow-glow-brass",
    stage: "ink",
    value: "0 0 14px rgba(224,169,58,.45)",
    use: "Lit brass signal, digital knob",
  },
  {
    token: "Brass ring recipe",
    word: "Brass ring",
    cls: "shadow-brass",
    stage: "ink",
    value: "inset hi/lo + 0 0 14px rgba(224,169,58,.22) + 1px --brass-lo border",
    use: "Lit brass element. A local composition, not a token.",
  },
  {
    token: "--ring",
    word: "Ring",
    cls: "shadow-ring",
    stage: "ink",
    value: "inset 0 0 0 1px var(--hairline)",
    use: "Inner outline, surface separation on dark surfaces",
  },
] as const;
</script>

<template>
  <section class="preview-port preview-port--token-geometry">
    <div class="card">
      <p class="geo-intro">
        Crisp cut paper: hand-cut polygons, a few degrees of tilt, hard offsets instead of blur.
        Every value lives in the design-system file; every specimen here consumes the token directly.
      </p>

      <!-- Clip-paths -->
      <div class="geo-section">
        <div class="label">Clip-paths</div>
        <div class="clip-grid">
          <figure v-for="clip in clips" :key="clip.token" class="geo-cell">
            <div class="well well--clip">
              <div class="clip-sample" :class="[`tone-${clip.tone}`]" :style="{ clipPath: `var(${clip.token})` }">
                {{ clip.word }}
              </div>
            </div>
            <figcaption>
              <code class="token-name">{{ clip.token }}</code>
              <code class="token-value">{{ clip.value }}</code>
              <span class="token-use">{{ clip.use }}</span>
            </figcaption>
          </figure>
        </div>
        <p class="caption geo-note">All polygon coordinates are percentages, so a clip scales with the element it cuts.</p>
      </div>

      <!-- Circle-native clips -->
      <div class="geo-section">
        <div class="label">Circle-native cut paper</div>
        <div class="disc-grid">
          <figure v-for="disc in discs" :key="disc.token" class="geo-cell">
            <div class="well well--disc">
              <div class="disc-sample" :class="disc.cls">{{ disc.word }}</div>
            </div>
            <figcaption>
              <code class="token-name">{{ disc.token }}</code>
            </figcaption>
          </figure>
        </div>
        <p class="caption geo-note">
          Curved silhouettes authored with <code>shape()</code>; browsers without it fall back to a clean
          <code>circle(50%)</code>. An accepted family: any square consumer can wear one, production assignment pending.
        </p>
      </div>

      <!-- Tilt -->
      <div class="geo-section">
        <div class="label">Tile tilt</div>
        <div class="well well--tilt">
          <div class="tilt-row">
            <div v-for="tile in tiles" :key="tile.n" class="tilt-tile" :style="{ transform: `rotate(var(--rot-tile-${tile.n}))` }">
              {{ tile.n }}
            </div>
          </div>
        </div>
        <div class="tilt-legend">
          <code v-for="tile in tiles" :key="tile.n" class="token-line">
            <span class="token-name">--rot-tile-{{ tile.n }}</span> {{ tile.value }}
          </code>
        </div>
        <p class="caption geo-note">True scale. Per-tile tilt of ±0.15–0.5deg reads as hand-cut, not stamped: watch the uneven top edge.</p>
      </div>

      <!-- Sticker rotation -->
      <div class="geo-section">
        <div class="label">Sticker and mark tilt</div>
        <div class="sticker-grid">
          <figure v-for="sticker in stickers" :key="sticker.token" class="geo-cell">
            <div class="well well--sticker">
              <div class="sticker-sample" :class="[`tone-${sticker.tone}`]" :style="{ transform: `rotate(var(${sticker.token}))` }">
                {{ sticker.word }}
              </div>
            </div>
            <figcaption>
              <code class="token-name">{{ sticker.token }}</code>
              <code class="token-value">{{ sticker.value }}</code>
              <span class="token-use">{{ sticker.use }}</span>
            </figcaption>
          </figure>
        </div>
      </div>

      <!-- Transform recipes -->
      <div class="geo-section">
        <div class="label">Transform recipes</div>
        <div class="recipe-grid">
          <figure v-for="recipe in recipes" :key="recipe.name" class="geo-cell">
            <div class="well well--recipe">
              <div class="skew-sample" :class="recipe.cls">{{ recipe.word }}</div>
            </div>
            <figcaption>
              <span class="recipe-name">{{ recipe.name }}</span>
              <code class="token-value">{{ recipe.value }}</code>
              <span class="token-use">{{ recipe.use }}</span>
            </figcaption>
          </figure>
        </div>
        <p class="caption geo-note">Recipes, not tokens: the motion system applies them in the moment.</p>
      </div>

      <!-- Keyboard-edition cut families -->
      <div class="geo-section">
        <div class="label">Keyboard edition cuts</div>
        <div class="kb-grid">
          <figure v-for="family in keyboardFamilies" :key="family" class="geo-cell">
            <div class="well well--kb">
              <div
                v-for="n in 3"
                :key="n"
                class="kb-key"
                :class="{ 'kb-key--pill': family === 'pill' }"
                :style="{
                  clipPath: `var(--keyboard-${family}-cut-${n})`,
                  transform: `rotate(var(--keyboard-${family}-rotation-${n}))`,
                  boxShadow: `var(--keyboard-${family}-shadow-${n})`,
                }"
              >
                {{ n }}
              </div>
            </div>
            <figcaption>
              <span class="recipe-name">{{ family }}</span>
              <code class="token-value">--keyboard-{{ family }}-cut-1..3</code>
              <code class="token-value">--keyboard-{{ family }}-rotation-1..3</code>
              <code class="token-value">--keyboard-{{ family }}-shadow-1..3</code>
            </figcaption>
          </figure>
        </div>
        <p class="caption geo-note">
          A keyboard edition picks one family; each key takes edition 1, 2, or 3 as a matched cut, rotation, and shadow.
          Editions never synthesize runtime polygons. Edition 1 of tile, offcut, and tab aliases the base clip, and every
          shadow-1 is <code>--shadow-key</code>. Rotations reuse <code>--rot-tile-*</code> or 0deg.
        </p>
      </div>

      <!-- Box-shadows -->
      <div class="geo-section">
        <div class="label">Shadows</div>
        <div class="shadow-grid">
          <figure v-for="shadow in shadows" :key="shadow.token" class="geo-cell">
            <div class="well well--shadow" :class="{ 'well--bone': shadow.stage === 'bone' }">
              <div class="shadow-sample" :class="shadow.cls">{{ shadow.word }}</div>
            </div>
            <figcaption>
              <code class="token-name">{{ shadow.token }}</code>
              <code class="token-value">{{ shadow.value }}</code>
              <span class="token-use">{{ shadow.use }}</span>
            </figcaption>
          </figure>
        </div>
      </div>

      <!-- Strokes -->
      <div class="geo-section">
        <div class="label">Strokes</div>
        <div class="stroke-grid">
          <figure class="geo-cell">
            <div class="well well--stroke">
              <svg viewBox="0 0 110 36" aria-hidden="true">
                <line x1="8" y1="10" x2="102" y2="10" stroke="var(--ivory)" stroke-width="3" stroke-linecap="butt" />
                <line x1="8" y1="26" x2="102" y2="26" stroke="var(--ivory-4)" stroke-width="3" stroke-linecap="round" />
              </svg>
            </div>
            <figcaption>
              <span class="recipe-name">Butt vs round</span>
              <code class="token-value">stroke-linecap: butt, enforced</code>
              <span class="token-use">Butt above, round (wrong) below</span>
            </figcaption>
          </figure>

          <figure class="geo-cell">
            <div class="well well--stroke">
              <svg viewBox="0 0 80 36" aria-hidden="true">
                <line x1="4" y1="18" x2="76" y2="18" stroke="var(--hairline)" stroke-width="1" stroke-linecap="butt" />
              </svg>
            </div>
            <figcaption>
              <span class="recipe-name">1px hairline</span>
              <code class="token-value">stroke-width: 1 · var(--hairline)</code>
            </figcaption>
          </figure>

          <figure class="geo-cell">
            <div class="well well--stroke">
              <svg viewBox="0 0 80 36" aria-hidden="true">
                <line x1="4" y1="18" x2="76" y2="18" stroke="var(--ivory-3)" stroke-width="2" stroke-linecap="butt" />
              </svg>
            </div>
            <figcaption>
              <span class="recipe-name">2px rule</span>
              <code class="token-value">stroke-width: 2</code>
              <span class="token-use">Structural divider</span>
            </figcaption>
          </figure>

          <figure class="geo-cell">
            <div class="well well--stroke">
              <svg viewBox="0 0 60 36" aria-hidden="true">
                <path d="M 8 30 A 22 22 0 0 1 52 30" fill="none" stroke="var(--ivory-4)" stroke-width="2" stroke-linecap="butt" />
                <path d="M 8 30 A 22 22 0 0 1 36 10" fill="none" stroke="var(--ivory)" stroke-width="8" stroke-linecap="butt" />
              </svg>
            </div>
            <figcaption>
              <span class="recipe-name">Knob track</span>
              <code class="token-value">stroke-width: 8 · butt cap, miter join</code>
            </figcaption>
          </figure>

          <figure class="geo-cell">
            <div class="well well--stroke">
              <svg viewBox="0 0 80 36" aria-hidden="true">
                <line x1="4" y1="12" x2="76" y2="12" stroke="var(--ink-5)" stroke-width="1" stroke-dasharray="4 3" stroke-linecap="butt" />
                <line x1="4" y1="24" x2="76" y2="24" stroke="var(--ivory-4)" stroke-width="1" stroke-dasharray="1 4" stroke-linecap="butt" />
              </svg>
            </div>
            <figcaption>
              <span class="recipe-name">Dashed / dot</span>
              <code class="token-value">4 3 · 1 4 patterns, always butt-cap</code>
            </figcaption>
          </figure>
        </div>
        <p class="caption geo-note">
          Every SVG stroke uses <code>stroke-linecap: butt</code> and paths use <code>stroke-linejoin: miter</code>.
          Round caps imply a softness that conflicts with cut paper.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}

.geo-intro {
  max-width: 62ch;
  margin: 0;
  font: var(--t-body-s-mono);
  color: var(--ivory-2);
}

.geo-section {
  margin-top: var(--s-10);
}

.geo-section > .label {
  margin-bottom: var(--s-6);
}

.geo-note {
  max-width: 72ch;
  margin: var(--s-5) 0 0;
}

.geo-note code {
  font: inherit;
  color: var(--ivory-2);
}

/* ── Cells, wells, captions ─────────────────────────────────────── */
.geo-cell {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  min-width: 0;
  margin: 0;
}

.well {
  display: grid;
  place-items: center;
  padding: var(--s-8) var(--s-6);
  background: var(--ink);
  box-sizing: border-box;
}

.well--bone {
  background: var(--bone);
}

figcaption {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  min-width: 0;
}

.token-name {
  font: var(--t-body-s-mono);
  color: var(--ivory);
  overflow-wrap: anywhere;
}

.token-value {
  font: var(--t-caption);
  color: var(--ivory-3);
  overflow-wrap: anywhere;
}

.token-use {
  font: var(--t-caption);
  color: var(--ivory-4);
}

.recipe-name {
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}

/* ── Paper tones ────────────────────────────────────────────────── */
.tone-tomato { background: var(--tomato); color: var(--ivory); }
.tone-mustard { background: var(--mustard); color: var(--ink); }
.tone-pine { background: var(--pine); color: var(--ivory); }
.tone-cobalt { background: var(--cobalt); color: var(--ivory); }
.tone-plum { background: var(--plum); color: var(--ivory); }

/* ── Clip-paths ─────────────────────────────────────────────────── */
.clip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
  gap: var(--s-8) var(--s-6);
}

.well--clip {
  padding: var(--s-9) var(--s-7);
}

.clip-sample {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 5 / 3;
  font: 700 clamp(36px, 6vw, 56px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

/* ── Circle-native discs ────────────────────────────────────────── */
.disc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr));
  gap: var(--s-8) var(--s-5);
}

.disc-sample {
  display: grid;
  place-items: center;
  width: min(100%, 128px);
  aspect-ratio: 1;
  background: var(--ivory);
  color: var(--ink);
  filter: drop-shadow(0 3px 0 var(--ink-5));
  font: 700 22px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.clip-disc-tile { clip-path: var(--clip-disc-tile); }
.clip-disc-offcut { clip-path: var(--clip-disc-offcut); }
.clip-disc-tab { clip-path: var(--clip-disc-tab); }
.clip-disc-paper-rip { clip-path: var(--clip-disc-paper-rip); }
.clip-disc-rounded-stock { clip-path: var(--clip-disc-rounded-stock); }

/* ── Tile tilt ──────────────────────────────────────────────────── */
.well--tilt {
  padding: var(--s-9) var(--s-6);
}

.tilt-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--s-3);
  width: min(100%, 520px);
}

.tilt-tile {
  display: grid;
  place-items: end center;
  padding-bottom: var(--s-5);
  width: 100%;
  aspect-ratio: 1 / 2;
  background: var(--bone);
  color: var(--ink);
  clip-path: var(--clip-tile);
  box-shadow: var(--shadow-key);
  font: 700 clamp(22px, 4vw, 40px)/1 var(--font-display);
}

.tilt-legend {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr));
  gap: var(--s-2) var(--s-6);
  margin-top: var(--s-5);
}

.token-line {
  font: var(--t-caption);
  color: var(--ivory-3);
}

.token-line .token-name {
  font: var(--t-body-s-mono);
}

/* ── Sticker tilt ───────────────────────────────────────────────── */
.sticker-grid,
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr));
  gap: var(--s-8) var(--s-5);
}

.well--sticker,
.well--recipe {
  min-height: 120px;
}

.sticker-sample {
  padding: var(--s-5) var(--s-6) var(--s-4);
  clip-path: var(--clip-offcut);
  font: 700 clamp(26px, 3vw, 36px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

/* ── Transform recipes ──────────────────────────────────────────── */
.skew-sample {
  display: grid;
  place-items: center;
  width: min(100%, 160px);
  height: 52px;
  background: var(--ink-4);
  color: var(--ivory);
  font: 700 clamp(20px, 2.4vw, 26px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.skew-offcut { transform: skewX(-2deg); background: var(--guide-paper); color: var(--guide-paper-ink); }
.skew-rip { transform: scaleX(1.08) skewX(-12deg); }
.skew-mode-out { transform: translateY(-8px) skewX(-14deg); opacity: 0.3; }

/* ── Keyboard edition cuts ──────────────────────────────────────── */
.kb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
  gap: var(--s-8) var(--s-6);
}

.well--kb {
  grid-template-columns: repeat(3, minmax(0, 52px));
  justify-content: center;
  gap: var(--s-4);
  padding: var(--s-8) var(--s-6);
}

.kb-key {
  display: grid;
  place-items: end center;
  padding-bottom: var(--s-4);
  width: 100%;
  aspect-ratio: 1 / 2.4;
  background: var(--bone);
  color: var(--ink);
  font: 700 22px/1 var(--font-display);
}

.kb-key--pill {
  aspect-ratio: 1 / 2;
}

/* ── Shadows ────────────────────────────────────────────────────── */
.shadow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr));
  gap: var(--s-8) var(--s-5);
}

.well--shadow {
  padding: var(--s-8) var(--s-6) var(--s-9);
}

.shadow-sample {
  display: grid;
  place-items: center;
  width: 100%;
  height: clamp(64px, 7vw, 96px);
  background: var(--ink-3);
  color: var(--ivory-2);
  font: 700 clamp(18px, 2.2vw, 26px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.shadow-cut {
  background: var(--tomato);
  color: var(--ivory);
  box-shadow: var(--shadow-cut);
}

.shadow-key {
  background: var(--bone);
  color: var(--ink);
  box-shadow: var(--shadow-key);
}

.shadow-pressed {
  background: var(--ink-4);
  box-shadow: var(--shadow-pressed);
}

.shadow-glow { box-shadow: var(--shadow-glow); }

/* Glow sample stays Ink: it shows the halo, not a brass fill. */
.shadow-glow-brass { box-shadow: var(--shadow-glow-brass); }

.shadow-brass {
  box-sizing: border-box;
  border: 1px solid var(--brass-lo);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.55),
    inset 0 -1px 0 rgba(0,0,0,.45),
    0 1px 0 rgba(0,0,0,.6),
    0 0 0 1px rgba(0,0,0,.18),
    0 0 14px rgba(224,169,58,.22);
}

/* The outline is the subject of this specimen. */
.shadow-ring { box-shadow: var(--ring); }

/* ── Strokes ────────────────────────────────────────────────────── */
.stroke-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr));
  gap: var(--s-8) var(--s-5);
}

.well--stroke {
  min-height: 100px;
}

.well--stroke svg {
  display: block;
  width: auto;
  max-width: 100%;
  height: 56px;
}
</style>
