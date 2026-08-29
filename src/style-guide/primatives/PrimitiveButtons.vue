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

    <VariantGrid title="Everyday materials">
      <VariantCell caption="Ink paper &middot; everyday default">
        <Button accessible-name="Ink paper" title="Ink paper"><Circle :size="16" /></Button>
      </VariantCell>
      <VariantCell caption="Ivory paper &middot; high contrast">
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
      <VariantCell caption="Loading &middot; tone-matched perimeter">
        <Button loading accessible-name="Loading" title="Loading"><RefreshCw :size="16" /></Button>
      </VariantCell>
      <VariantCell caption="Disabled &middot; dim and still">
        <Button disabled accessible-name="Disabled" title="Disabled"><X :size="16" /></Button>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Geometry token studies &middot; exploratory specimen only">
      <VariantCell caption="Tile &middot; clip-tile + rot-tile-1 + shadow-key">
        <Button class="button-geometry--tile" size="lg" tone="ivory" accessible-name="Tile geometry study" title="Tile geometry study"><Plus /></Button>
      </VariantCell>
      <VariantCell caption="Offcut &middot; clip-offcut + rot-tile-3 + shadow-1">
        <Button class="button-geometry--offcut" size="lg" tone="ivory" accessible-name="Offcut geometry study" title="Offcut geometry study"><Plus /></Button>
      </VariantCell>
      <VariantCell caption="Tab &middot; clip-tab + rot-tile-4 + shadow-key">
        <Button class="button-geometry--tab" size="lg" tone="ivory" accessible-name="Tab geometry study" title="Tab geometry study"><Plus /></Button>
      </VariantCell>
      <VariantCell caption="Paper rip &middot; clip-paper-rip + rot-sticker + shadow-2">
        <Button class="button-geometry--rip" size="lg" tone="ivory" accessible-name="Paper rip geometry study" title="Paper rip geometry study"><Plus /></Button>
      </VariantCell>
      <VariantCell caption="Rounded stock &middot; r-xl + rot-tile-5 + shadow-1">
        <Button class="button-geometry--rounded" size="lg" tone="ivory" accessible-name="Rounded stock geometry study" title="Rounded stock geometry study"><Plus /></Button>
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
  { label: "Depth", value: "2px hard paper offset · no faux ring · collapses on press" },
  { label: "Material", value: "ink / ivory everyday · four canonical brass finishes" },
  { label: "Icon", value: "60% of face · exact centered SVG box" },
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

.button-geometry--tile {
  --button-clip: var(--clip-tile);
  --button-radius: 0;
  --button-rest-rotation: var(--rot-tile-1);
  --button-rest-shadow: var(--shadow-key);
}

.button-geometry--offcut {
  --button-clip: var(--clip-offcut);
  --button-radius: 0;
  --button-rest-rotation: var(--rot-tile-3);
  --button-rest-shadow: var(--shadow-1);
}

.button-geometry--tab {
  --button-clip: var(--clip-tab);
  --button-radius: 0;
  --button-rest-rotation: var(--rot-tile-4);
  --button-rest-shadow: var(--shadow-key);
}

.button-geometry--rip {
  --button-clip: var(--clip-paper-rip);
  --button-radius: 0;
  --button-rest-rotation: var(--rot-sticker);
  --button-rest-shadow: var(--shadow-2);
}

.button-geometry--rounded {
  --button-radius: var(--r-xl);
  --button-rest-rotation: var(--rot-tile-5);
  --button-rest-shadow: var(--shadow-1);
}
</style>
