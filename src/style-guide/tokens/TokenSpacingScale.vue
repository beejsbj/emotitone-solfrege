<template>
  <section class="preview-port preview-port--token-spacing-scale">
    <div class="card">
      <div class="label">Spacing</div>
      <div class="caption" style="margin-bottom:14px">Eleven-step scale from 2 to 64px.</div>
    
      <div class="swatch-row">
        <span class="swatch-token">--s-1</span>
        <div class="swatch-bar" style="width:var(--s-1)"></div>
        <span class="swatch-val">2px</span>
        <span class="swatch-hint">Hairline gap</span>
      </div>
      <div class="swatch-row">
        <span class="swatch-token">--s-2</span>
        <div class="swatch-bar" style="width:var(--s-2)"></div>
        <span class="swatch-val">4px</span>
        <span class="swatch-hint">Icon nudge</span>
      </div>
      <div class="swatch-row">
        <span class="swatch-token">--s-3</span>
        <div class="swatch-bar" style="width:var(--s-3)"></div>
        <span class="swatch-val">6px</span>
        <span class="swatch-hint">Tight inline gap</span>
      </div>
      <div class="swatch-row">
        <span class="swatch-token">--s-4</span>
        <div class="swatch-bar" style="width:var(--s-4)"></div>
        <span class="swatch-val">8px</span>
        <span class="swatch-hint">Chip padding</span>
      </div>
      <div class="swatch-row">
        <span class="swatch-token">--s-5</span>
        <div class="swatch-bar" style="width:var(--s-5)"></div>
        <span class="swatch-val">12px</span>
        <span class="swatch-hint">Row gap</span>
      </div>
      <div class="swatch-row">
        <span class="swatch-token">--s-6</span>
        <div class="swatch-bar" style="width:var(--s-6)"></div>
        <span class="swatch-val">16px</span>
        <span class="swatch-hint">Panel inset</span>
      </div>
      <div class="swatch-row">
        <span class="swatch-token">--s-7</span>
        <div class="swatch-bar" style="width:var(--s-7)"></div>
        <span class="swatch-val">20px</span>
        <span class="swatch-hint">Section gap</span>
      </div>
      <div class="swatch-row">
        <span class="swatch-token">--s-8</span>
        <div class="swatch-bar" style="width:var(--s-8)"></div>
        <span class="swatch-val">24px</span>
        <span class="swatch-hint">Card padding</span>
      </div>
      <div class="swatch-row">
        <span class="swatch-token">--s-9</span>
        <div class="swatch-bar" style="width:var(--s-9)"></div>
        <span class="swatch-val">32px</span>
        <span class="swatch-hint">Block spacing</span>
      </div>
      <div class="swatch-row">
        <span class="swatch-token">--s-10</span>
        <div class="swatch-bar" style="width:var(--s-10)"></div>
        <span class="swatch-val">48px</span>
        <span class="swatch-hint">Large margin</span>
      </div>
      <div class="swatch-row">
        <span class="swatch-token">--s-11</span>
        <div class="swatch-bar" style="width:var(--s-11)"></div>
        <span class="swatch-val">64px</span>
        <span class="swatch-hint">Page gutter</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
.swatch-row {
  display: grid;
  grid-template-columns: 52px 1fr 48px 120px;
  align-items: center;
  gap: 12px;
  padding: 5px 0;
  border-bottom: 1px solid var(--ink-5);
}
.swatch-row:last-child { border-bottom: 0; }
.swatch-token {
  font: var(--t-mono);
  color: var(--ivory-2);
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.swatch-bar {
  height: 8px;
  background: var(--brass);
  border-radius: 1px;
  min-width: 2px;
}
.swatch-val {
  font: var(--t-mono);
  color: var(--ivory-3);
  text-align: right;
}
.swatch-hint {
  font: var(--t-caption);
  color: var(--ivory-4);
  padding-left: 4px;
}
</style>
