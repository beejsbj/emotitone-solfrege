<template>
  <section class="preview-port preview-port--composition-loading-screen">
    <div class="card">
    
      <div class="stage">
        <span class="filemark">SOLFÈGE · 01 / FOUNDATIONS</span>
    
        <!-- subtle scatter top-left -->
        <span class="scatter" aria-hidden="true">
          <svg viewBox="0 0 180 180">
            <!-- mustard triangle -->
            <path d="M30 18 L36 32 L42 44 L48 56 L54 68 L60 80 L66 92 L68 100 L52 98 L36 100 L20 98 L8 96 L6 94 L12 80 L18 66 L24 52 Z" fill="var(--brass)" opacity=".18"/>
            <!-- plum blade, off in the corner -->
            <path d="M118 14 L128 22 L138 14 L148 24 L156 38 L154 56 L156 76 L154 92 L140 92 L128 96 L114 90 L106 78 L100 64 L104 48 L112 32 Z" fill="var(--plum)" opacity=".22"/>
            <!-- bone disk -->
            <circle cx="70" cy="148" r="18" fill="var(--bone)" opacity=".14"/>
            <!-- tomato spike -->
            <path d="M152 130 L168 138 L172 152 L164 168 L150 168 L142 158 L144 144 Z" fill="var(--tomato)" opacity=".22"/>
          </svg>
        </span>
    
        <div class="header">
          <!-- Big cut-paper brass anchor -->
          <svg class="mark" width="120" height="120" viewBox="0 0 80 80" aria-hidden="true">
            <path d="M41 6 L46 17 L51 25 L57 36 L62 46 L67 56 L72 67 L74 73 L62 71 L49 73 L36 71 L22 73 L9 72 L7 71 L13 60 L18 50 L23 41 L29 30 L34 19 Z" fill="var(--brass)"/>
          </svg>
          <span class="sticker"><span class="dot"></span>Solfège · v0.1</span>
        </div>
    
        <h1>Cut-paper <span class="accent-brass">jazz,</span><br/>lit by a <span class="accent-tomato">synth.</span></h1>
    
        <p class="lede">A directed visual language for a music-theory instrument. Loading samples, wiring transport, tuning the room.</p>
    
        <div class="progress">
          <div class="row1">
            <span class="lbl">Tuning the room…</span>
            <span class="meta">04 OF 07 · 120 BPM</span>
          </div>
          <div class="tape">
            <span class="do"></span>
            <span class="re"></span>
            <span class="mi"></span>
            <span class="fa"></span>
            <span class="sol"></span>
            <span class="la"></span>
            <span class="ti"></span>
          </div>
        </div>
    
        <span class="stamp">BUILD · 0.1 · NOT FOR PRESS</span>
      </div>
    
      <div class="caption" style="margin-top:14px;color:var(--fg-3);line-height:1.55">
        The hero composition repurposed as a loading state. The chromatic bar-tape doubles as the progress
        meter — segments light from <em>Do</em> through <em>Ti</em> as samples wire up, the lit portion pulsing
        on the beat. The room is awake before the music starts.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* ─── BRAND LOADING SCREEN ─────────────────────────────────────
     The hero composition reused as the app's loading state.
     Big cut-paper anchor + tilted sticker + display headline +
     a chromatic progress strip pulsing on the beat.
     ───────────────────────────────────────────────────────────── */
  .stage {
    position: relative;
    height: 560px;
    overflow: hidden;
    background:
      radial-gradient(120% 80% at 50% 0%, #1A1611 0%, #0A0908 60%),
      var(--ink);
    border: 1px solid var(--hairline);
    padding: 40px 44px;
    color: var(--ivory);
    display: flex; flex-direction: column;
  }

  /* file-mark top-right */
  .stage .filemark {
    position: absolute; top: 14px; right: 18px;
    font: var(--t-mono); font-size: 9px; letter-spacing: .22em;
    color: var(--ivory-3); text-transform: uppercase;
    border: 1px solid var(--hairline);
    padding: 4px 8px;
    transform: rotate(2deg);
  }
  /* version stamp bottom-left */
  .stage .stamp {
    position: absolute; bottom: 14px; left: 18px;
    font: var(--t-mono); font-size: 9px; letter-spacing: .22em;
    color: var(--ivory-4); text-transform: uppercase;
  }

  /* the cut-paper scatter — a few poster shapes off in the corner */
  .scatter {
    position: absolute; top: 20px; left: 32px;
    width: 180px; height: 180px; pointer-events: none;
  }
  .scatter svg { width: 100%; height: 100%; overflow: visible; }

  /* header row: mark + tilted sticker */
  .header {
    display: flex; align-items: center; gap: 18px;
    margin-top: 60px;
  }
  .header .mark {
    flex: 0 0 auto;
    transform: rotate(-2deg);
    filter: drop-shadow(4px 4px 0 rgba(0,0,0,.55));
  }
  .header .sticker {
    display: inline-flex; align-items: center; gap: 10px;
    background: var(--ivory);
    color: var(--ink);
    padding: 6px 14px 5px;
    font-family: var(--font-display); font-weight: 700;
    font-size: 14px; letter-spacing: .14em; text-transform: uppercase;
    white-space: nowrap;
    transform: rotate(-3deg) translateY(-6px);
    box-shadow: 4px 4px 0 rgba(0,0,0,.7);
    align-self: flex-start;
  }
  .header .sticker .dot { width: 8px; height: 8px; background: var(--ink); }

  /* big display headline */
  h1 {
    font-family: var(--font-display); font-weight: 700;
    font-size: 60px; line-height: .94; letter-spacing: .01em;
    margin: 14px 0 0; max-width: 14ch;
    color: var(--ivory);
    text-transform: uppercase;
  }
  h1 .accent-brass { color: var(--brass); }
  h1 .accent-tomato { color: var(--tomato); }

  .lede {
    font: var(--t-mono); font-size: 13px; line-height: 1.55;
    color: var(--ivory-3); max-width: 52ch;
    margin-top: 18px;
  }

  /* progress strip */
  .progress {
    margin-top: auto;
    display: flex; flex-direction: column; gap: 10px;
  }
  .progress .row1 {
    display: flex; align-items: baseline; gap: 14px;
  }
  .progress .row1 .lbl {
    font-family: var(--font-display); font-weight: 700;
    font-size: 13px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--ivory);
  }
  .progress .row1 .meta {
    margin-left: auto;
    font: var(--t-mono); font-size: 10px; letter-spacing: .18em;
    color: var(--ivory-3); text-transform: uppercase;
  }
  .progress .tape {
    height: 14px; display: flex;
    border: 1px solid var(--hairline);
  }
  .progress .tape span { display: block; height: 100%; }
  .progress .tape .do  { background: var(--note-do);  flex: 16; }
  .progress .tape .re  { background: var(--note-re);  flex: 16; }
  .progress .tape .mi  { background: var(--note-mi);  flex: 16; }
  .progress .tape .fa  { background: var(--note-fa);  flex: 16; }
  .progress .tape .sol { background: var(--note-sol); flex: 16; opacity: .25; }
  .progress .tape .la  { background: var(--note-la);  flex: 12; opacity: .15; }
  .progress .tape .ti  { background: var(--note-ti);  flex: 8;  opacity: .15; }

  /* a soft pulse on the lit portion — beat at 120bpm */
  .progress .tape .do, .progress .tape .re,
  .progress .tape .mi, .progress .tape .fa {
    animation: pulseTape 500ms cubic-bezier(.2,.9,.2,1) infinite;
  }
  .progress .tape .re { animation-delay: 30ms; }
  .progress .tape .mi { animation-delay: 60ms; }
  .progress .tape .fa { animation-delay: 90ms; }
  @keyframes pulseTape {
    0%, 100% { filter: brightness(1); }
    20%      { filter: brightness(1.18); }
  }
</style>
