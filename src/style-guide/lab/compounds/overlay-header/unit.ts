import type { LabCompoundUnit } from "@/types/compoundsLab";
import OverlayHeaderBench from "./OverlayHeaderBench.vue";

export const overlayHeaderUnit: LabCompoundUnit = {
  id: "overlay-header",
  name: "Overlay Panel Header",
  source: "components/OverlayPanelHeader.vue",
  bench: OverlayHeaderBench,
  reading:
    "Playing zone · the header shared by the Instrument Picker and Config Menu in the top drawers: a mono title, the current tab as quiet context, optional status, and a 32px action rail. The bible leaves open whether the panel behind the Tabs chip is chassis or something else (§12).",
  directions: [
    {
      id: "dymo",
      letter: "A",
      name: "Label Maker",
      paper: "pine",
      skin: "dymo",
      idea:
        "The title is embossed onto a strip of Ink label tape, with raised Ivory letters and a slight tilt, stuck onto the panel like a label on studio gear. The context follows on a second, shorter strip.",
      better:
        "The header becomes a label on the instrument rather than a web heading, which answers the bible's open panel question: the panel is hardware and the header is applied to it.",
      risks:
        "Embossed tape is plastic, not paper, so it adds a third material. The raised-letter effect needs a fine highlight that may read as a soft shadow.",
      bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Ink and Ivory only; a new material for the applied layer." },
    },
    {
      id: "band",
      letter: "B",
      name: "Highlight Band",
      paper: "plum",
      skin: "band",
      idea:
        "The title is set in Lets Jazz display on the poster's tilted highlight band: an Ivory strip leaning behind Ink letters. The context sits beside it in mono.",
      better:
        "It carries the Let's Jazz highlight band (§2) into the product at the one place that is a heading, giving the top menus the voice the Loading Screen already has.",
      risks:
        "It reaches the poster voice into the playing zone, the bible's first open question (§12), so it is Burooj's call. An Ivory band is loud at the top of every menu.",
      bible: { zone: "Both zones", role: "Applied paper", fit: "caution", note: "Poster grammar in Ivory, not brand paper; settles §12 by example." },
    },
    {
      id: "display",
      letter: "C",
      name: "Display Header",
      paper: "cobalt",
      skin: "display",
      idea:
        "The title and context show in the Readout's segment display: lit Ivory characters over faint unlit segments in a recessed window. The action rail stays Lit Keycaps.",
      better:
        "The header joins the instrument's display family (Readout, Code Strip), so a top menu reads as the instrument telling you which page it's on.",
      risks:
        "Segment type is slower to read for words than for numbers, and it borrows a material the Readout owns for values.",
      bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Readout's display grammar; Ivory light only." },
    },
  ],
};
