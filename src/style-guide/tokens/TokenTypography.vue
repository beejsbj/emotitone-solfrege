<template>
  <section class="preview-port preview-port--token-typography">
    <div class="card">
      <div class="label">Typography</div>
    
      <!-- 1. Typeface row -->
      <div class="face-row">
        <div class="face-tile">
          <div class="face-sample-display">Emotitone.</div>
          <div class="face-meta">Display &middot; Lets Jazz &middot; uppercase voice</div>
        </div>
        <div class="face-tile">
          <div class="face-sample-mono">.note {
      --note-degree: 2;
    }</div>
          <div class="face-meta">Mono &middot; JetBrains Mono &middot; code, captions, long body, guide specs</div>
        </div>
      </div>
    
      <!-- 2. Type ramp -->
      <div class="ramp">
        <div class="ramp-label">Type ramp</div>
    
        <div class="ramp-row">
          <span class="s-display-xl">Do.</span>
          <span class="ramp-spec">--t-display-xl &middot; 700 56px/0.92 &middot; display</span>
        </div>
        <div class="ramp-row">
          <span class="s-display-l">Sing.</span>
          <span class="ramp-spec">--t-display-l &middot; 700 40px/0.94 &middot; display</span>
        </div>
        <div class="ramp-row">
          <span class="s-display-m">Play it.</span>
          <span class="ramp-spec">--t-display-m &middot; 700 28px/0.96 &middot; display</span>
        </div>
        <div class="ramp-row">
          <span class="s-h1">The quick brown fox</span>
          <span class="ramp-spec">--t-h1 &middot; 700 22px/1.10 &middot; display</span>
        </div>
        <div class="ramp-row">
          <span class="s-h2">The quick brown fox</span>
          <span class="ramp-spec">--t-h2 &middot; 700 18px/1.14 &middot; display</span>
        </div>
        <div class="ramp-rule">Body · Lets Jazz under 5 words · Mono past 5</div>
        <div class="ramp-row">
          <span class="s-body-jazz">Short impact line.</span>
          <span class="ramp-spec">--t-body &middot; 450 14px/1.55 &middot; lets jazz &middot; &le;5 words</span>
        </div>
        <div class="ramp-row">
          <span class="s-body-mono">The quick brown fox jumps over the lazy dog</span>
          <span class="ramp-spec">--t-body-mono &middot; 450 14px/1.55 &middot; mono &middot; &gt;5 words</span>
        </div>
        <div class="ramp-row">
          <span class="s-body-s">Quiet meta inline.</span>
          <span class="ramp-spec">--t-body-s &middot; 450 12px/1.50 &middot; lets jazz &middot; &le;5 words</span>
        </div>
        <div class="ramp-row">
          <span class="s-body-s-mono">The quick brown fox jumps over the lazy dog</span>
          <span class="ramp-spec">--t-body-s-mono &middot; 450 12px/1.50 &middot; mono &middot; &gt;5 words</span>
        </div>
        <div class="ramp-row">
          <span class="s-caption">Chrome metadata &middot; debug readouts &middot; file paths</span>
          <span class="ramp-spec">--t-caption &middot; 450 11px/1.40 &middot; mono</span>
        </div>
        <div class="ramp-row">
          <span class="s-label-jazz">Presets &middot; Scope &middot; Sync</span>
          <span class="ramp-spec">--t-label &middot; 600 11px/1.10 &middot; lets jazz</span>
        </div>
        <div class="ramp-row">
          <span class="s-mono">120 BPM &middot; C4:m &middot; 2026-05-18</span>
          <span class="ramp-spec">--t-mono &middot; 500 12px/1.40 &middot; mono</span>
        </div>
      </div>
    
      <!-- 3. Tracking -->
      <div class="tracking">
        <div class="tracking-tile">
          <div class="tracking-sample-display" style="letter-spacing: var(--tracking-display)">Tight.</div>
          <div class="tracking-meta">--tracking-display &middot; 0.01em &middot; display faces</div>
        </div>
        <div class="tracking-tile">
          <div class="tracking-sample-label" style="letter-spacing: var(--tracking-label)">Wide label caps</div>
          <div class="tracking-meta">--tracking-label &middot; 0.14em &middot; jazz labels</div>
        </div>
      </div>
    
      <!-- 4. Usage rules -->
      <div class="rules">
        <div class="rule-line">Lets Jazz is the primary font — use it everywhere by default</div>
        <div class="rule-line">Mono is the exception — captions, and body over 5 words</div>
        <div class="rule-line">Product labels are Lets Jazz; guide/spec inspection labels may be mono</div>
        <div class="rule-line">Display is always uppercase, period-terminated</div>
        <div class="rule-line">One Lets Jazz size per scope — don't stack display on display</div>
      </div>
    
      <div class="caption">Two typefaces. One rule. Display is the voice — mono is the instrument.</div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* ── Typeface row ──────────────────────────────────────────────────────── */
.face-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}
.face-tile {
  background: var(--ink-2);
  border: 1px solid var(--ink-5);
  border-radius: var(--r-sm);
  padding: 18px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.face-sample-display {
  font: var(--t-display-l);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
  line-height: 1;
}
.face-sample-mono {
  font: var(--t-body);
  color: var(--ivory-2);
  line-height: 1.5;
  white-space: pre;
}
.face-meta {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-4);
  border-top: 1px solid var(--ink-5);
  padding-top: 8px;
  margin-top: 2px;
}

/* ── Type ramp ──────────────────────────────────────────────────────────── */
.ramp {
  margin-top: 20px;
}
.ramp-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ivory-4);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--ink-5);
  margin-bottom: 0;
}
.ramp-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 16px;
  padding: 9px 0;
  border-bottom: 1px solid var(--ink-5);
}
.ramp-row:last-child { border-bottom: 0; }
.ramp-rule {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-4);
  padding: 12px 0 4px;
  border-bottom: 1px solid var(--ink-5);
}
.ramp-spec {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ivory-4);
  white-space: nowrap;
  text-align: right;
}

/* Individual ramp samples */
.s-display-xl { font: var(--t-display-xl); letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ivory); line-height: 1; }
.s-display-l  { font: var(--t-display-l);  letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ivory); line-height: 1; }
.s-display-m  { font: var(--t-display-m);  letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ivory); line-height: 1; }
.s-h1         { font: var(--t-h1);         letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ivory); }
.s-h2         { font: var(--t-h2);         letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ivory); }
.s-body-jazz      { font-weight: 450; font-size: 14px; line-height: 1.55; font-family: var(--font-display); color: var(--ivory-2); }
.s-body-mono  { font: var(--t-body-mono); color: var(--ivory-2); }
.s-body-s     { font-weight: 450; font-size: 12px; line-height: 1.50; font-family: var(--font-display); color: var(--ivory-3); }
.s-body-s-mono{ font: var(--t-body-s-mono); color: var(--ivory-3); }
.s-caption    { font: var(--t-caption);    color: var(--ivory-3); }
.s-label      { font: var(--t-label);      letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--ivory-3); }
.s-label-jazz { font-family: var(--font-display); font-weight: 700; text-transform: uppercase; letter-spacing: var(--tracking-label); color: var(--ivory-3); }
.s-mono       { font: var(--t-mono);       color: var(--ivory-2); }

/* ── Tracking ───────────────────────────────────────────────────────────── */
.tracking {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 20px;
}
.tracking-tile {
  background: var(--ink-2);
  border: 1px solid var(--ink-5);
  border-radius: var(--r-sm);
  padding: 14px 14px 12px;
}
.tracking-sample-display {
  font: var(--t-display-m);
  text-transform: uppercase;
  color: var(--ivory);
}
.tracking-sample-label {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  color: var(--ivory-2);
}
.tracking-meta {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--ink-5);
}

/* ── Rules ──────────────────────────────────────────────────────────────── */
.rules {
  margin-top: 20px;
  border-top: 1px solid var(--ink-5);
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rule-line {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ivory-3);
}
.rule-line::before {
  content: "—";
  color: var(--ivory-4);
  margin-right: 8px;
}
</style>
