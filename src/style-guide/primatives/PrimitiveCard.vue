<template>
  <AnatomyDisplay
    title="Card &middot; Fundamental Shell"
    :features="features"
    caption="The card shell owns the dark panel, floating label, optional mark slot, display title, and body rhythm. Decoration marks are demo content here until the mark primitive is extracted."
  >
    <template #hero>
      <CardShell
        label="01 &mdash; Stage / Ivory"
        title="A dark room. Ivory type."
        body="Everything sits on the dark stage. Ivory at four steps is the only light."
      >
        <template #mark>
          <span class="demo-mark demo-mark--ordinal">01</span>
        </template>
      </CardShell>
    </template>

    <VariantGrid title="Variants &mdash; Mark slot">
      <VariantCell caption="Ordinal mark">
        <CardShell
          compact
          label="01 &mdash; Stage / Ivory"
          title="Dark room. Ivory type."
          body="Ordinal mark enumerates a series."
        >
          <template #mark>
            <span class="demo-mark demo-mark--ordinal demo-mark--sm">01</span>
          </template>
        </CardShell>
      </VariantCell>
      <VariantCell caption="Music glyph mark">
        <CardShell compact label="Mode &mdash; Aeolian" title="Mode picker. Music mark.">
          <template #mark>
            <span class="demo-mark demo-mark--glyph">
              <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M14 4 v18 a4 4 0 1 1 -4 -4 l4 0 z" fill="currentColor" />
              </svg>
            </span>
          </template>
          Music-glyph mark signals musical context.
        </CardShell>
      </VariantCell>
      <VariantCell caption="Stamp mark">
        <CardShell
          compact
          label="Draft &mdash; Rev / 02"
          title="Doc revision. Stamp mark."
          body="Filemark stamp carries revision, draft, or status."
        >
          <template #mark>
            <span class="demo-mark demo-mark--stamp">REV &middot; 02</span>
          </template>
        </CardShell>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Shell">
      <VariantCell caption="No mark">
        <CardShell
          compact
          label="Mono &mdash; No Mark"
          title="Quiet card. No mark."
          body="The slot is optional when the card carries no count, mode, or status."
        />
      </VariantCell>
      <VariantCell caption="Borderless">
        <CardShell
          compact
          :bordered="false"
          label="No Border"
          title="Spaced apart. Hairline ring."
          body="Border removed; surrounding rhythm must create separation."
        >
          <template #mark>
            <span class="demo-mark demo-mark--ordinal demo-mark--sm">02</span>
          </template>
        </CardShell>
      </VariantCell>
      <VariantCell caption="Spec-only inversion">
        <div class="spec-inversion">
          <span class="spec-inversion__label">Inverted Light</span>
          <span class="spec-inversion__mark">03</span>
          <h3>Full ivory. Ink text.</h3>
          <p>Light inversion remains specimen-only until a real app use appears.</p>
        </div>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import CardShell from "../../components/primatives/CardShell.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const features = [
  { label: "Panel", value: "ink-3 · 1px ink-5 hairline · relative shell" },
  { label: "Label", value: "floating mono label · clipped to top edge · optional" },
  { label: "Mark", value: "top-right decoration slot · pointer-events none · optional" },
  { label: "Title", value: "Jazz display · uppercase · ivory · max 14ch" },
  { label: "Body", value: "body-s · ivory-3 · max 28ch · prop or default slot" },
  { label: "Compact", value: "smaller title/body and shorter panel for grids" },
  { label: "Border", value: "bordered by default; borderless is an explicit prop" },
  { label: "Forbidden", value: "no active controls in the mark slot" },
];
</script>

<style scoped>
.demo-mark {
  display: inline-block;
  color: currentColor;
}

.demo-mark--ordinal {
  font: 400 52px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.demo-mark--sm {
  font-size: 32px;
}

.demo-mark--glyph svg {
  display: block;
}

.demo-mark--stamp {
  border: 1px solid var(--ivory-4);
  padding: 3px 5px;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: .18em;
  text-transform: uppercase;
  transform: rotate(2deg);
}

.spec-inversion {
  position: relative;
  box-sizing: border-box;
  min-height: 158px;
  width: 100%;
  padding: 14px 12px 16px;
  background: var(--ivory);
  border: 1px solid var(--ivory-3);
}

.spec-inversion__label {
  position: absolute;
  top: -10px;
  left: 14px;
  background: var(--ivory);
  padding: 0 4px;
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: .22em;
  text-transform: uppercase;
}

.spec-inversion__mark {
  position: absolute;
  top: 4px;
  right: 8px;
  color: var(--ink-5);
  font: 400 32px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
}

.spec-inversion h3 {
  max-width: none;
  margin: 0 0 6px;
  padding-right: 38px;
  color: var(--ink);
  font: 400 14px/1.12 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.spec-inversion p {
  max-width: none;
  margin: 0;
  color: var(--ink-3);
  font: var(--t-body-s);
  font-size: 10px;
  line-height: 1.5;
}
</style>
