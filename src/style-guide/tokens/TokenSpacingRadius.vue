<template>
  <section class="preview-port preview-port--token-spacing-radius">
    <div class="card">
      <div class="label">Radius</div>
      <div class="caption" style="margin-bottom:14px">Radius tokens from XS through XL plus pill.</div>
    
      <div class="radius-grid">
        <div class="radius-tile">
          <div class="radius-box" style="width:64px;height:64px;border-radius:var(--r-xs)"></div>
          <div class="radius-token">--r-xs</div>
          <div class="radius-val">4px</div>
        </div>
        <div class="radius-tile">
          <div class="radius-box" style="width:64px;height:64px;border-radius:var(--r-sm)"></div>
          <div class="radius-token">--r-sm</div>
          <div class="radius-val">8px</div>
        </div>
        <div class="radius-tile">
          <div class="radius-box" style="width:64px;height:64px;border-radius:var(--r-md)"></div>
          <div class="radius-token">--r-md</div>
          <div class="radius-val">14px</div>
        </div>
        <div class="radius-tile">
          <div class="radius-box" style="width:64px;height:64px;border-radius:var(--r-lg)"></div>
          <div class="radius-token">--r-lg</div>
          <div class="radius-val">18px</div>
        </div>
        <div class="radius-tile">
          <div class="radius-box" style="width:64px;height:64px;border-radius:var(--r-xl)"></div>
          <div class="radius-token">--r-xl</div>
          <div class="radius-val">24px</div>
        </div>
        <div class="radius-tile">
          <div class="radius-box" style="width:120px;height:40px;border-radius:var(--r-pill)"></div>
          <div class="radius-token">--r-pill</div>
          <div class="radius-val">999px</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
.radius-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-end;
  margin-top: 8px;
}
.radius-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.radius-box {
  background: var(--ivory-3);
  box-shadow: var(--ring);
}
.radius-token {
  font: var(--t-mono);
  color: var(--ivory-2);
  letter-spacing: 0.06em;
  text-align: center;
}
.radius-val {
  font: var(--t-caption);
  color: var(--ivory-4);
  text-align: center;
}
</style>
