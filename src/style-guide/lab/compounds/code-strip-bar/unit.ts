import type { LabCompoundUnit } from "@/types/compoundsLab";
import CodeStripBarBench from "./CodeStripBarBench.vue";

export const codeStripBarUnit: LabCompoundUnit = {
  id: "code-strip-bar",
  name: "CodeStrip Bar",
  source: "components/compounds/CodeStripBar.vue",
  bench: CodeStripBarBench,
  directions: [],
  reading: "Playing zone · chassis. The opaque Ink rail around Play/Stop, the Code Strip, Backspace and Return.",
  leaveAlone:
    "Its two reimaginable parts have their own homes: the Code Strip was just adopted as the Stave (#120), and the ring around Play is the Beat Indicator unit above. The rail itself is flush Ink with accepted insets and Lit Keycaps.",
};
