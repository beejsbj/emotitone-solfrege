import type { LabCompoundUnit } from "@/types/compoundsLab";
import OverlayHeaderBench from "./OverlayHeaderBench.vue";

export const overlayHeaderUnit: LabCompoundUnit = {
  id: "overlay-header",
  name: "Overlay Panel Header",
  source: "components/OverlayPanelHeader.vue",
  bench: OverlayHeaderBench,
  verdict:
    "Burooj, 2026-10-01: \"Overlay header I accept highlight band. For main heading and label maker for sub headings.\" Display Header is dropped.",
  reading:
    "Playing zone · the header shared by the Instrument Picker and Config Menu in the top drawers: a mono title, the current tab as quiet context, optional status, and a 32px action rail. The bible leaves open whether the panel behind the Tabs chip is chassis or something else (§12).",
  directions: [
    {
      id: "band-label",
      letter: "A",
      name: "Band + Label",
      paper: "plum",
      skin: "band-label",
      idea:
        "Burooj's pairing of two directions. The main heading is Lets Jazz display in Ink on the poster's leaning Ivory highlight band; the subheading (the current tab) is embossed on Ink label tape stuck onto the panel.",
      better:
        "The top menus get the poster voice exactly once, on the word that names the panel, and the label tape gives the smaller heading a hardware-label read instead of a second band.",
      risks:
        "It reaches the poster voice into the playing zone (bible §12), which this pick answers by example. The band is loud at the top of every menu, and embossed tape adds a plastic material beside paper.",
      bible: { zone: "Both zones", role: "Applied paper", fit: "caution", note: "Ivory band and Ink tape only; settles §12 for headings." },
    },
  ],
};
