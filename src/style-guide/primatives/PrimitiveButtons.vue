<template>
  <AnatomyDisplay
    title="Button &middot; Momentary Primitive"
    :features="features"
    caption="One icon-only momentary primitive: the Lit Keycap. A switch cap on visible walls with real travel, backlit from inside: a lit lip at rest, a full ring and lit face on every hit that close back down into the lip, and the lip rotating while loading. Every control shown is the production Button source."
  >
    <template #hero>
      <div class="button-specimen__hero">
        <Button accessible-name="Play" title="Play"><Play :size="18" /></Button>
        <Button tone="ivory" accessible-name="Undo" title="Undo"><Undo2 :size="18" /></Button>
        <Button tone="brass" accessible-name="Send" title="Send"><CornerDownLeft :size="18" /></Button>
      </div>
    </template>

    <VariantGrid title="Everyday materials">
      <VariantCell caption="Ink keycap &middot; everyday default">
        <Button accessible-name="Ink paper" title="Ink paper"><Circle :size="16" /></Button>
      </VariantCell>
      <VariantCell caption="Ink keycap &middot; brass icon study">
        <Button class="button-icon--brass" accessible-name="Ink paper with brass icon" title="Ink paper with brass icon"><Asterisk /></Button>
      </VariantCell>
      <VariantCell caption="Ivory keycap &middot; high contrast">
        <Button tone="ivory" accessible-name="Ivory paper" title="Ivory paper"><Plus :size="16" /></Button>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Brass finishes &middot; one material, four token combinations">
      <VariantCell caption="Flat &middot; --brass">
        <Button tone="brass" brass-finish="flat" accessible-name="Flat brass" title="Flat brass"><Asterisk /></Button>
      </VariantCell>
      <VariantCell caption="Sheen &middot; --brass-fill + --brass-sheen">
        <Button tone="brass" brass-finish="sheen" accessible-name="Brass sheen" title="Brass sheen"><Asterisk /></Button>
      </VariantCell>
      <VariantCell caption="Glow &middot; --brass + --shadow-glow-brass">
        <Button tone="brass" brass-finish="glow" accessible-name="Brass glow" title="Brass glow"><Asterisk /></Button>
      </VariantCell>
      <VariantCell caption="Sheen + glow &middot; production default">
        <Button tone="brass" brass-finish="sheen-glow" accessible-name="Brass sheen and glow" title="Brass sheen and glow"><Asterisk /></Button>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Sizes and real states">
      <VariantCell caption="SM / MD / LG &middot; 32 / 40 / 48px">
        <div class="button-specimen__row">
          <Button size="sm" accessible-name="Small" title="Small"><Play :size="13" /></Button>
          <Button accessible-name="Medium" title="Medium"><Play :size="16" /></Button>
          <Button size="lg" accessible-name="Large" title="Large"><Play :size="19" /></Button>
        </div>
      </VariantCell>
      <VariantCell caption="Loading &middot; the lit lip rotates">
        <Button loading accessible-name="Loading" title="Loading"><RefreshCw :size="16" /></Button>
      </VariantCell>
      <VariantCell caption="Disabled &middot; dim and still">
        <Button disabled accessible-name="Disabled" title="Disabled"><X :size="16" /></Button>
      </VariantCell>
    </VariantGrid>


    <VariantGrid title="Production relationships">
      <VariantCell caption="Momentary action &middot; consumer label">
        <div class="button-specimen__control">
          <Button size="lg" haptic accessible-name="Undo" title="Undo"><Undo2 :size="20" /></Button>
          <span>Undo</span>
        </div>
      </VariantCell>
      <VariantCell caption="Momentary action &middot; brass material">
        <div class="button-specimen__control">
          <Button size="lg" tone="brass" haptic accessible-name="Send" title="Send"><CornerDownLeft :size="20" /></Button>
          <span>Send</span>
        </div>
      </VariantCell>
      <VariantCell caption="No toggle state &middot; use Boolean Knob">
        <div class="button-specimen__boundary">BUTTON ≠ TOGGLE</div>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { Asterisk, Circle, CornerDownLeft, Play, Plus, RefreshCw, Undo2, X } from "lucide-vue-next";
import Button from "../../components/primatives/Button.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const features = [
  { label: "Metaphor", value: "Lit Keycap · a switch cap on the chassis, backlit from inside" },
  { label: "Role", value: "icon-only momentary action · never persistent state" },
  { label: "Shape", value: "rounded-square cap on visible side walls · hit box stays the native square" },
  { label: "Travel", value: "the cap bottoms out on press · non-brass elastic release · brass direct" },
  { label: "Light", value: "lit lip past a dark seam at rest · hit opens a full ring and lights the face, then closes down" },
  { label: "Material", value: "ink / ivory everyday · four canonical brass finishes" },
  { label: "Icon", value: "44% of the key · exact centered SVG box" },
  { label: "Sizes", value: "32 / 40 / 48px · contextual --button-size override" },
  { label: "States", value: "loading rotates the lip · disabled dims and drops the light · Reduced Motion holds still" },
  { label: "Source", value: "components/primatives/Button.vue" },
];
</script>

<style scoped>
.button-specimen__hero,
.button-specimen__row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-4);
}

.button-specimen__control {
  display: grid;
  justify-items: center;
  gap: var(--s-2);
}

.button-specimen__control span,
.button-specimen__boundary {
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .14em;
  text-align: center;
  text-transform: uppercase;
}

.button-icon--brass {
  --button-ink: var(--brass);
}

</style>
