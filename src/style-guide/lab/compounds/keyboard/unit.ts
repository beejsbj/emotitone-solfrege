import type { LabCompoundUnit } from "@/types/compoundsLab";
import KeyboardBench from "./KeyboardBench.vue";

export const keyboardUnit: LabCompoundUnit = {
  id: "keyboard",
  name: "Keyboard",
  source: "components/compounds/Keyboard.vue",
  bench: KeyboardBench,
  directions: [],
  reading:
    "Playing zone · the hardware bed the Keys and ChordKeys are stuck onto. Its density, row hierarchy and variation amplitude were accepted and closed.",
  leaveAlone:
    "Everything visible on the Keyboard is a Key or a ChordKey, and those carry their own directions above. What the Keyboard itself owns is density, which Burooj accepted on the deployed phone. A keybed, gutters or a frame would be a housing around a playing surface, which the bible rules out.",
};
