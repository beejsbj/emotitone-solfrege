import type { LabUniqueUnit } from "@/types/uniquesLab";
import UniqueHarmonicGeometry from "../../uniques/UniqueHarmonicGeometry.vue";
import CodeStripBench from "./code-strip/CodeStripBench.vue";
import DrawerBench from "./drawer/DrawerBench.vue";
import CompassFace from "./joystick/CompassFace.vue";
import GateFace from "./joystick/GateFace.vue";
import JoystickBench from "./joystick/JoystickBench.vue";
import MatrixFace from "./joystick/MatrixFace.vue";

/*
 * The Uniques lab registry: each unit, its reading in the design bible, and
 * its directions. Every direction keeps the real production component mounted
 * and changes only its presentation.
 */
export const UNIQUE_LAB_UNITS: LabUniqueUnit[] = [
  {
    id: "joystick",
    name: "Joystick",
    source: "components/uniques/Joystick/index.vue",
    bench: JoystickBench,
    reading:
      "Playing zone · chassis. A thing you play with, so Brass is allowed. It ships in paired Analog and Digital editions; each direction says which edition it would replace. Known drift: the LED collar (#112) shrank the Analog Knob's well to a 16% inset while the Joystick's stays at 12%.",
    directions: [
      {
        id: "gate",
        letter: "A",
        name: "Gate Plate",
        paper: "mustard",
        editions: ["analog"],
        idea:
          "The dark well is cut into the Brass plate as an eight-slot shifter gate, so the eight choices are physical channels you can see before you touch. The stick rides the slot of the direction it is in; each slot end carries a lamp, and the latched one stays lit.",
        better:
          "Production shows eight dots on an empty well: you learn the directions only by dragging. The gate shows the choices and the current latch at rest, and snapping the stick to its slot shows the octant decision production makes invisibly.",
        risks:
          "At the 48px Control Bar size the slots get thin. Snapping means the stick no longer follows the finger freely between slots, which can read as less precise even though the chosen direction is identical.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Machined Brass hardware; lamps only answer the latch and your touch." },
        face: GateFace,
      },
      {
        id: "compass",
        letter: "B",
        name: "LED Compass",
        paper: "cobalt",
        editions: ["analog"],
        idea:
          "The Joystick joins the Knob family: the Knob's own dark dome at its 16% inset, ringed by eight of the LED collar's hand-cut chads, one per direction. The Brass plate goes; the stick is a Brass nub, and the chad you point at lights.",
        better:
          "It resolves the well drift at the source instead of resizing a plate, and puts the Control Bar's four Knobs and the Joystick in one visual family. Direction reads as light, which is the synth half of the sentence.",
        risks:
          "Losing the Brass plate makes the Joystick less of a landmark in the bar; it may read as a fifth Knob. Eight chads are sparse compared with the Knob's fifteen.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Reuses the accepted LED collar grammar; Brass stays on the part you move." },
        face: CompassFace,
      },
      {
        id: "matrix",
        letter: "C",
        name: "Pad Matrix",
        paper: "pine",
        editions: ["digital"],
        idea:
          "The Digital edition becomes the Joystick's keyboard model made visible: the 3 × 3 radio grid as nine pads, with Automatic as the centre dot. A Brass cursor slides continuously across the grid, and the pad under it lights.",
        better:
          "Production's Digital edition is the Analog one squared off: a cross and four dots. The matrix is a genuinely digital reading in which what you see matches the arrow-key grid, and it keeps the continuous finger tracking.",
        risks:
          "It only replaces the Digital edition; Analog would still need a pick. A square cursor over square pads may read as a selection box rather than a stick.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Ink plate, Brass light; answers touch only. Digital reading of §6." },
        face: MatrixFace,
      },
    ],
  },
  {
    id: "drawer",
    name: "Drawer",
    source: "components/uniques/Drawer/index.vue",
    bench: DrawerBench,
    reading:
      "Playing zone · chassis. The Drawer body is flush Ink and stays that way; the reimaginable part is the exposed-edge handle, the only thing you touch. Each direction restyles the real handle, so dragging, continuous sizing, complete-row Keyboard sizing, haptics and Arrow-key resizing are untouched.",
    directions: [
      {
        id: "lip",
        letter: "A",
        name: "Pull Lip",
        paper: "mustard",
        skin: "lip",
        idea:
          "The handle is the drawer's own machined lip: a chamfered trapezoid continuous with the Ink body, with a recessed finger slot cut into it in place of the two grip ticks. Pressing it deepens the slot.",
        better:
          "The current tab reads as a label stuck on the edge; the lip reads as hardware you pull. It is wider and easier to grab without getting taller.",
        risks:
          "The chamfer costs about 28px of width, which the two top handles sharing one edge at 390px can ill afford when the instrument name is long.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Hardware grammar: dark well and press depth, no colour." },
      },
      {
        id: "meter",
        letter: "B",
        name: "Travel Meter",
        paper: "cobalt",
        skin: "meter",
        idea:
          "The grip ticks become an LED ladder that lights with how far the drawer is open. On the Keyboard drawer each pip is a complete row, one to eight, so dragging counts rows in light.",
        better:
          "Complete-row sizing is invisible in production until the keys snap. The meter makes the Drawer's state readable even when it is closed, and light answers your touch.",
        risks:
          "More light in the chrome. The ladder is small at 28px, and a top drawer's fill is only relative to the frame, so its meaning is less crisp than the Keyboard's row count.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Ivory light answers touch and state; no decorative motion." },
      },
      {
        id: "tape",
        letter: "C",
        name: "Tape Tag",
        paper: "tomato",
        skin: "tape",
        idea:
          "The handle becomes a strip of Ivory masking tape stuck across the drawer's edge, with torn ends and a slight tilt: a label applied to the hardware. It flattens when you press or drag it.",
        better:
          "It is the loudest and most legible handle, and it carries the adopted Tape Sticker paper into the playing zone, where the bible's hardware-with-paper seam says a label belongs.",
        risks:
          "It is paper acting as a control, and the bible calls handles chassis. Ivory tape is also the brightest element at the screen edge, which competes with Music Color when you play.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Ivory only, so legal, but it recasts a chassis part as paper." },
      },
    ],
  },
  {
    id: "code-strip",
    name: "Code Strip",
    source: "components/uniques/CodeStrip/index.vue",
    bench: CodeStripBench,
    reading:
      "Playing zone · the editable Strudel document. Its Notes and Chords are applied paper in Music Color; the strip between them is chassis. Directions restyle the real CodeMirror document, so source-range editing, playback progress and exact-pitch identity are unchanged. Drift found on the way: production's text selection is a green hsl(152) wash, a colour the bible does not allow.",
    directions: [
      {
        id: "stave",
        letter: "A",
        name: "Stave",
        paper: "bone",
        skin: "stave",
        idea:
          "The strip reads as a line of music, not a line of code: one hairline staff runs through it, the Notes sit on it, brackets become barlines, and code punctuation recedes. Duration ticks stand up as stems and a rest is a slim gap in the staff that fills with Ivory.",
        better:
          "Production shows raw mini-notation (a backtick, angle brackets, commas) beside pasted-paper Notes, so it is neither code nor notation. The staff gives the strip one reading and makes rests and bar structure visible at 390px.",
        risks:
          "Hiding punctuation makes the document harder to edit as code; the raw source still appears on focus. A staff invites people to read pitch height, which this staff does not encode.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "An Ivory hairline as notation grammar, not a border; colour stays with the Notes." },
      },
      {
        id: "roll",
        letter: "B",
        name: "Roll",
        paper: "cobalt",
        skin: "roll",
        idea:
          "Space is time. Each Note trails its duration as a lane, like a piano roll: a half note is four times as long as an eighth. Lanes behind the playhead light Ivory, so the strip fills like tape as the phrase plays.",
        better:
          "Production's duration marks are 1–4px ticks that don't read on a phone. The Roll makes rhythm legible at a glance and joins the adopted Bar Tape Piano Roll, so the strip and the tape share one idea of time.",
        risks:
          "Rhythm-proportional spacing makes long notes wide, so the strip scrolls more at 390px. Production's live highlight marks only sounding events active, so the trail of lit lanes needs a small progress hook to behave there as it does here.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Ivory light follows the music; no colour beyond the Notes." },
      },
      {
        id: "window",
        letter: "C",
        name: "Display Window",
        paper: "pine",
        skin: "window",
        idea:
          "The strip is the instrument's display: a recessed Ink window set into the bar, sibling of the floating Readout. Unplayed Notes sit as unlit segments, the playhead lights them, and code punctuation shows honestly in mono.",
        better:
          "Today the strip floats on the bar with no edge, so it's unclear where the document starts and the controls end. A display window gives the document a place, pairs it with the Readout, and gives the empty state a lit prompt.",
        risks:
          "It is the nearest to a material variation of the three. An inset well is a housing, which the bible resists around playing surfaces, and it costs about 6px of strip height.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "caution", note: "A recessed well is hardware grammar, but it edges toward a housing." },
      },
    ],
  },
  {
    id: "harmonic-geometry",
    name: "Harmonic Geometry",
    source: "composables/canvas/useBlobFieldRenderer.ts · useHarmonicGeometryRenderer.ts",
    bench: UniqueHarmonicGeometry,
    reading: "Playing zone · Stage canvas. Its only colour is Music Color.",
    directions: [],
    leaveAlone:
      "Left alone. Burooj accepted the organic Merge and rooted Web material on 2026-09-24 and confirmed it on a real device on 2026-09-27, and two reimagined-lettering trials (the interval-in-filament and Merge-join treatments) were tried and rolled back. A third canvas study now would reopen a unit with a fresh, hard-won acceptance for little new information. Say so if you want it opened anyway; the renderer seams are ready for canvas studies.",
  },
];
