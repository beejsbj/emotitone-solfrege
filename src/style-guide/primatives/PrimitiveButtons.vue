<template>
  <AnatomyDisplay
    title="Button &middot; Momentary Primitive"
    :features="features"
    caption="One icon-only momentary primitive: the punched-out circular paper chad. The guide owns only staging and visible labels; every control shown is the production Button source."
  >
    <template #hero>
      <div class="button-specimen__hero">
        <Button accessible-name="Play" title="Play"><Play :size="18" /></Button>
        <Button tone="ivory" accessible-name="Undo" title="Undo"><Undo2 :size="18" /></Button>
        <Button tone="brass" accessible-name="Send" title="Send"><CornerDownLeft :size="18" /></Button>
      </div>
    </template>

    <VariantGrid title="Materials">
      <VariantCell caption="Ink paper &middot; everyday default">
        <Button accessible-name="Ink paper" title="Ink paper"><Circle :size="16" /></Button>
      </VariantCell>
      <VariantCell caption="Ivory paper &middot; high contrast">
        <Button tone="ivory" accessible-name="Ivory paper" title="Ivory paper"><Plus :size="16" /></Button>
      </VariantCell>
      <VariantCell caption="Brass paper &middot; intentional material">
        <Button tone="brass" accessible-name="Brass paper" title="Brass paper"><Asterisk :size="16" /></Button>
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
      <VariantCell caption="Loading &middot; tone-matched perimeter">
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
  { label: "Metaphor", value: "punched-out circular paper chad · filled, not an aperture" },
  { label: "Role", value: "icon-only momentary action · never persistent state" },
  { label: "Shape", value: "perfect circle · no off-cut, dome, bezel, track, or ticks" },
  { label: "Depth", value: "2px hard paper offset · collapses on press" },
  { label: "Material", value: "ink / ivory everyday · brass intentional per consumer" },
  { label: "Sizes", value: "32 / 40 / 48px · contextual --button-size override" },
  { label: "States", value: "hover contrast · press/rebound · loading perimeter · disabled stillness" },
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
</style>
