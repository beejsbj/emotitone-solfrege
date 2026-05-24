<template>
  <section class="preview-port preview-port--token-ui-colors">
    <div class="card">
      <div class="label" style="margin-bottom:10px">CHROME ONLY</div>
      <p class="caption" style="margin:0 0 14px">Music color sits on top of this layer.</p>
      <p class="caption" style="margin:0 0 14px">HIGH-CONTRAST · Reach for --ink and --ivory first. The grays (--ink-2…5, --ivory-2…4) are surface and meta — used sparingly to keep the dark stage feeling high-contrast.</p>
    
      <div class="section">
        <div class="stitle">Dark stage scale</div>
        <div class="row">
          <div><div class="sw" style="background:var(--ink)"></div><div class="nm">--ink</div><div class="iv">#0A0908</div><div class="role">deepest stage</div></div>
          <div><div class="sw" style="background:var(--ink-2)"></div><div class="nm">--ink-2</div><div class="iv">#141210</div><div class="role">surface 1 &middot; rise</div></div>
          <div><div class="sw" style="background:var(--ink-3)"></div><div class="nm">--ink-3</div><div class="iv">#1B1815</div><div class="role">panel body</div></div>
          <div><div class="sw" style="background:var(--ink-4)"></div><div class="nm">--ink-4</div><div class="iv">#25211D</div><div class="role">hover / press</div></div>
          <div><div class="sw" style="background:var(--ink-5)"></div><div class="nm">--ink-5</div><div class="iv">#3A352F</div><div class="role">wire / divider</div></div>
        </div>
      </div>
    
      <div class="section">
        <div class="stitle">Light text on dark</div>
        <div class="row ivory">
          <div><div class="sw" style="background:var(--ivory)"></div><div class="nm">--ivory</div><div class="iv">#F4EFE6</div><div class="role">primary text</div></div>
          <div><div class="sw" style="background:var(--ivory-2)"></div><div class="nm">--ivory-2</div><div class="iv">#C9C2B5</div><div class="role">secondary text</div></div>
          <div><div class="sw" style="background:var(--ivory-3)"></div><div class="nm">--ivory-3</div><div class="iv">#8E867A</div><div class="role">meta / muted</div></div>
          <div><div class="sw" style="background:var(--ivory-4)"></div><div class="nm">--ivory-4</div><div class="iv">#514B42</div><div class="role">disabled / decorative</div></div>
        </div>
      </div>
    
      <div class="section">
        <div class="stitle">The lone lit signal</div>
        <div class="brass-block">
          <div class="brass-swatch" style="background:var(--brass);">
            <span class="stamp">#E0A93A</span>
            <span class="brass-swatch-label" style="position:absolute;left:12px;top:10px">flat</span>
          </div>
          <div class="brass brass-swatch">
            <span class="stamp">#E0A93A</span>
            <span class="brass-swatch-label" style="position:absolute;left:12px;top:10px">sheen</span>
          </div>
          <div class="brass-swatch" style="background:var(--brass);box-shadow:var(--shadow-glow-brass);">
            <span class="stamp">#E0A93A</span>
            <span class="brass-swatch-label" style="position:absolute;left:12px;top:10px">glow</span>
          </div>
          <div class="brass brass-swatch" style="box-shadow:var(--shadow-glow-brass);">
            <span class="stamp">#E0A93A</span>
            <span class="brass-swatch-label" style="position:absolute;left:12px;top:10px">sheen + glow</span>
          </div>
        </div>
        <div class="brass-legend">
          <b>One signal per panel.</b> Apply via the <code>.brass</code> utility (gradient + sheen) &mdash; never as a flat fill.
          <div style="margin-top:6px">Reserve for: active record, captured value, the lit beat on the metronome, the brand wordmark on a hero.</div>
          <div style="margin-top:6px">Never on borders. Never on text smaller than 12px. Never as a chrome background. Glow = <code>--shadow-glow-brass</code>, lifted from the digital knob.</div>
        </div>
        <div class="uses">
          <span class="uselabel">APPLIED:</span>
          <span class="brass rec-dot" title="record"></span>
          <span class="uselabel">REC</span>
          <span class="brass seg">120</span>
          <span class="uselabel">CAPTURED VALUE</span>
          <span class="brass key" title="lit sax key"></span>
          <span class="uselabel">LIT KEY</span>
          <span class="brass-text" style="font-family:'Lets Jazz',serif;font-size:30px;line-height:1;">Emotitone</span>
        </div>
      </div>
    
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
.row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
  .row.ivory { grid-template-columns: repeat(4, 1fr); }
  .row + .row { margin-top: 12px; }
  .sw {
    height: 56px;
    border: 1px solid rgba(0,0,0,.35);
    box-shadow: var(--ring);
  }
  .nm {
    margin-top: 8px;
    font: var(--t-label);
    letter-spacing: var(--tracking-label);
    color: var(--ivory-2);
    font-size: 10px;
  }
  .iv {
    font: var(--t-mono);
    font-size: 10px;
    color: var(--ivory-3);
  }
  .role {
    font: var(--t-mono);
    font-size: 9px;
    color: var(--ivory-3);
    margin-top: 2px;
  }
  .section {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid var(--hairline);
  }
  .section > .stitle {
    font: var(--t-label);
    letter-spacing: var(--tracking-label);
    color: var(--ivory-3);
    margin-bottom: 10px;
    text-transform: uppercase;
  }

  /* brass variants grid showcase */
  .brass-block {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 12px;
    background: var(--ink-2);
    border: 1px solid var(--hairline);
  }
  .brass-swatch {
    height: 100px;
    display: flex;
    align-items: flex-end;
    padding: 10px 12px;
    position: relative;
    border: 1px solid rgba(0,0,0,.35);
  }
  .brass-swatch .stamp {
    font: var(--t-label);
    letter-spacing: var(--tracking-label);
    color: var(--brass-edge);
    font-size: 10px;
    font-weight: 700;
    position: relative;
    z-index: 3;
  }
  .brass-swatch-label {
    font: var(--t-mono);
    font-size: 9px;
    color: var(--ivory-3);
    text-transform: uppercase;
    margin-top: 6px;
    letter-spacing: 0.1em;
  }
  .brass-legend {
    font: var(--t-mono);
    font-size: 11px;
    line-height: 1.55;
    color: var(--ivory-3);
    margin-top: 12px;
    padding: 12px;
    border-top: 1px solid var(--hairline);
  }
  .brass-legend b { color: var(--ivory); font-weight: 600; }

  .uses {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  .rec-dot { width: 18px; height: 18px; border-radius: 50%; }
  .seg {
    font-family: var(--font-mono); font-weight: 700; font-size: 18px;
    padding: 4px 10px; line-height: 1; letter-spacing: .04em;
  }
  .key { width: 36px; height: 48px; box-shadow: var(--ring); }
  .uselabel { font: var(--t-mono); color: var(--ivory-3); font-size: 10px; }

  /* glass / scrim showcase */
  .layer-demo {
    position: relative;
    height: 80px;
    background:
      linear-gradient(135deg, var(--ink-4) 0%, var(--ink-2) 100%);
    border: 1px solid var(--hairline);
    overflow: hidden;
  }
  .layer-demo > .scrim {
    position: absolute; inset: 0; background: var(--scrim);
  }
  .layer-demo > .glass {
    position: absolute; left: 18px; top: 14px; right: 18px; bottom: 14px;
    background: var(--glass);
    border: 1px solid var(--hairline);
    display: grid; place-items: center;
    font: var(--t-label); letter-spacing: var(--tracking-label); color: var(--ivory);
  }

  .layers {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 10px; margin-top: 10px;
  }
  .layers .caplet {
    font: var(--t-mono); font-size: 10px; color: var(--ivory-3); margin-top: 6px;
  }
</style>
