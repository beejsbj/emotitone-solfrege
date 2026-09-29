<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Component } from "vue";
import Joystick from "@/components/uniques/Joystick/index.vue";
import type { JoystickVisual } from "@/components/uniques/Joystick/edition";
import type { HarmonyAlteration } from "@/domain/harmony";
import type { LabJoystickFaceProps } from "@/types/uniquesLab";

/*
 * Lab scaffold. The production Joystick stays mounted and owns every gesture,
 * hold, latch, Readout, haptic, keyboard radio and ARIA path. A direction only
 * paints a face inside the real beat face (so UIBeat still scales it), fed by
 * the state production already publishes on its root and stick. Adoption would
 * move the face into the Joystick itself; this overlay is not anatomy.
 */
const props = withDefaults(defineProps<{
  face?: Component | null;
  visual: JoystickVisual;
  label?: string;
  size?: string;
}>(), { face: null, label: "Harmony", size: "72px" });

const model = defineModel<HarmonyAlteration>({ default: "auto" });

const root = ref<HTMLElement | null>(null);
const beatFace = ref<HTMLElement | null>(null);
const state = ref({ x: 0, y: 0, effective: "auto" as HarmonyAlteration, active: false, momentary: false });
let observer: MutationObserver | undefined;

function read() {
  const host = root.value?.querySelector<HTMLElement>(".joystick");
  const stick = host?.querySelector<HTMLElement>(".joystick__stick");
  if (!host || !stick) return;
  // Production draws the stick at 50% + vector × 27%; invert that exactly.
  const x = (parseFloat(stick.style.left) - 50) / 27;
  const y = (parseFloat(stick.style.top) - 50) / 27;
  state.value = {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    effective: (host.dataset.effective as HarmonyAlteration) ?? "auto",
    active: host.dataset.active !== undefined,
    momentary: host.dataset.momentary !== undefined,
  };
}

onMounted(() => {
  beatFace.value = root.value?.querySelector<HTMLElement>(".joystick__beat-face") ?? null;
  read();
  observer = new MutationObserver(read);
  if (root.value) observer.observe(root.value, { subtree: true, attributes: true, attributeFilter: ["style", "data-effective", "data-active", "data-momentary"] });
});
onBeforeUnmount(() => observer?.disconnect());

const faceProps = computed<LabJoystickFaceProps>(() => ({
  visual: props.visual,
  latched: model.value ?? "auto",
  ...state.value,
}));
</script>

<template>
  <div ref="root" class="lab-joystick" :class="{ 'lab-joystick--custom': face }" :style="{ '--joystick-size': size }">
    <Joystick v-model="model" :visual="visual" :label="label" :haptic="false" />
    <Teleport v-if="face && beatFace" :to="beatFace">
      <component :is="face" class="lab-joystick__face" v-bind="faceProps" />
    </Teleport>
  </div>
</template>

<style scoped>
.lab-joystick { display: grid; justify-items: center; inline-size: var(--joystick-size); }

/* Keep the plate (and its focus ring and radios) but remove its paint. */
.lab-joystick--custom :deep(.joystick__plate) { position: absolute; inset: 8%; inline-size: auto; background: none; box-shadow: none; }
.lab-joystick--custom :deep(.joystick__plate::before),
.lab-joystick--custom :deep(.joystick__plate::after),
.lab-joystick--custom :deep(.joystick__detent),
.lab-joystick--custom :deep(.joystick__stick) { visibility: hidden; }
.lab-joystick--custom :deep(.joystick__beat-face) { position: relative; }

.lab-joystick__face { position: absolute; inset: 0; pointer-events: none; }
</style>
