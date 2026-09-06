<template>
  <section class="preview-port preview-port--token-brand-colors">
    <div class="card">
      <div class="label" style="margin-bottom:10px">POSTER USE ONLY</div>
      <p class="caption" style="margin:0 0 14px">Never on functional UI chrome — that's what brass is for.</p>
    
      <div class="grid">
        <div>
          <div class="sw" style="background:var(--tomato)"></div>
          <div class="nm">--tomato</div>
          <div class="iv">#D8362A</div>
          <div class="role">poster red &middot; warning dot, danger kicker, brand splash</div>
        </div>
        <div>
          <div class="sw" style="background:var(--pine)"></div>
          <div class="nm">--pine</div>
          <div class="iv">#1F4D3F</div>
          <div class="role">deep green &middot; quiet spine, "live" marker, brand patch</div>
        </div>
        <div>
          <div class="sw" style="background:var(--plum)"></div>
          <div class="nm">--plum</div>
          <div class="iv">#6B3FA0</div>
          <div class="role">lifted purple &middot; ambient spine, scrap accent, sticker</div>
        </div>
        <div>
          <div class="sw" style="background:var(--bone)"></div>
          <div class="nm">--bone</div>
          <div class="iv">#EFE6D0</div>
          <div class="role">warm off-white &middot; brand background, paper-sticker face</div>
        </div>
        <div>
          <div class="sw" style="background:var(--mustard)"></div>
          <div class="nm">--mustard</div>
          <div class="iv">#F0B137</div>
          <div class="role">poster yellow &middot; sticker spine, hot kicker, scrap accent</div>
        </div>
      </div>
    
      <p class="caption" style="margin-top:14px">
        Brand sits on top of ink, never replaces it. Use one brand color per card &mdash; mixing reads as gift-wrap, not jazz.
        Applied form: see <code>primitive-spine-card.html</code> for the canonical brand-marked shell.
      </p>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
.grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
  }
  .sw {
    height: 84px;
    border: 1px solid rgba(0,0,0,.35);
  }
  .nm {
    margin-top: 10px;
    font: var(--t-label);
    letter-spacing: var(--tracking-label);
    color: var(--ivory);
    font-size: 11px;
  }
  .iv {
    font: var(--t-mono);
    font-size: 10px;
    color: var(--ivory-3);
  }
  .role {
    font: var(--t-mono);
    font-size: 10px;
    color: var(--ivory-3);
    margin-top: 4px;
    line-height: 1.5;
  }
</style>
