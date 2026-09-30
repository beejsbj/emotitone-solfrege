import type { LabCompoundUnit } from "@/types/compoundsLab";
import ControlBarBench from "./ControlBarBench.vue";

export const controlBarUnit: LabCompoundUnit = {
  id: "control-bar",
  name: "Control Bar",
  source: "components/compounds/ControlBar.vue",
  bench: ControlBarBench,
  directions: [],
  reading: "Playing zone · chassis. An opaque Ink rail holding five Knobs and the Harmony Joystick in six equal slots.",
  leaveAlone:
    "The rail is flush Ink and nothing else; its character comes from the Knobs (LED collar just adopted) and the Joystick (Burooj kept production on 2026-09-29). Anything the rail itself could add, like panels, dividers or engraved legends, would be a housing or decoration.",
};
