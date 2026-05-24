<template>
  <section class="preview-port preview-port--unique-brand-cover">
    <div class="card">
      <div class="cover-wrap">
        <div class="cover-cols">

          <!-- Left: headline + body -->
          <div>
            <div class="kicker"><span class="dot"></span>EmotiTone Solfège — Design System v0.1 — Stage 01 of 06</div>
            <h1 class="headline">
              <span class="c-mustard">Cut-paper</span> jazz,<br>
              lit by a <span class="c-red">synth.</span>
            </h1>
            <p class="body-copy">A directed visual language for a music-theory instrument. Two moods on one stage: a mid-century Affinity poster — bold flat shapes, jazz-poster colour, hand-set display type — sitting in a dark studio room where the only chromatic light comes from the music itself.</p>
          </div>

          <!-- Right: shapes collage panel -->
          <div style="position:relative">
            <div class="stamp">FILE · 01 / FOUNDATIONS</div>
            <div class="shapes-panel">
              <svg viewBox="0 0 210 218" width="210" height="218" style="display:block;overflow:visible">
                <!-- mustard rectangle — rotated −6° -->
                <rect x="22" y="38" width="118" height="158" fill="#e0a93a" transform="rotate(-6 81 117)"/>
                <!-- red rectangle — rotated +8° -->
                <rect x="102" y="18" width="80" height="118" fill="#D8362A" transform="rotate(8 142 77)"/>
                <!-- plum rectangle — rotated −3° -->
                <rect x="52" y="112" width="148" height="80" fill="#6b3fa0" transform="rotate(-3 126 152)"/>
                <!-- treble clef silhouette — butt caps, no fill -->
                <g transform="translate(112 56) scale(0.52)">
                  <path d="M40 0 C60 30 60 70 30 90 C5 105 -10 130 10 150 C30 170 60 170 70 150 C78 132 70 115 60 110 L50 200"
                        stroke="#0A0908" stroke-width="10" fill="none" stroke-linecap="butt"/>
                  <circle cx="50" cy="200" r="13" fill="#0A0908"/>
                </g>
                <!-- bone quarter note — stem + notehead -->
                <g transform="translate(30 142)">
                  <ellipse cx="13" cy="13" rx="13" ry="9"
                           transform="rotate(-20 13 13)" fill="#F1E9D8"/>
                  <rect x="24" y="-22" width="4" height="35" fill="#F1E9D8"
                        transform="rotate(-15 24 -22)"/>
                </g>
              </svg>
            </div>
          </div>

        </div><!-- /cover-cols -->

        <!-- Meta grid — full width below the two columns -->
        <div class="meta-grid">
          <div><div class="k">Mood</div><div class="v">Late-night studio</div></div>
          <div><div class="k">Display</div><div class="v">Lets Jazz</div></div>
          <div><div class="k">Body</div><div class="v">JetBrains Mono</div></div>
          <div><div class="k">Surface</div><div class="v">Stage / Paper</div></div>
        </div>

      </div><!-- /cover-wrap -->
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* ─── Brand cover composition — extracted from v2 hero ─── */
.cover-wrap {
  position: relative;
}

/* Kicker */
.kicker {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font: var(--t-label);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-3);
  margin-bottom: 18px;
}
.kicker .dot {
  width: 7px;
  height: 7px;
  background: var(--brass);
  flex-shrink: 0;
}

/* Headline */
.headline {
  font: 400 44px/0.92 var(--font-display);
  letter-spacing: 0.01em;
  text-transform: uppercase;
  margin: 0 0 18px;
}
.headline .c-mustard { color: var(--brass); }
.headline .c-red     { color: var(--tomato); }

/* Body copy */
.body-copy {
  font: var(--t-body-s);
  color: var(--ivory-3);
  max-width: 40ch;
  margin: 0;
  line-height: 1.65;
}

/* Two-col layout: text | shapes panel */
.cover-cols {
  display: grid;
  grid-template-columns: 1fr 210px;
  gap: 20px;
  align-items: start;
}

/* Shapes panel — the cut-paper collage */
.shapes-panel {
  position: relative;
  background: var(--ink-2);
  box-shadow: var(--ring);
  overflow: hidden;
  height: 218px;
  margin-top: 20px; /* room for rotated stamp above */
}

/* Stamp badge — rotated file label */
.stamp {
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

/* Meta grid — 4-col spec row */
.meta-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-top: 20px;
  border-top: 1px solid var(--ink-5);
  border-bottom: 1px solid var(--ink-5);
}
.meta-grid > div {
  padding: 14px 0;
  border-right: 1px solid var(--ink-5);
}
.meta-grid > div:last-child { border-right: 0; }
.meta-grid .k {
  font: var(--t-label);
  letter-spacing: 0.2em;
  color: var(--ivory-3);
  margin-bottom: 7px;
}
.meta-grid .v {
  font: 400 17px/1 var(--font-display);
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: var(--ivory);
}
</style>
