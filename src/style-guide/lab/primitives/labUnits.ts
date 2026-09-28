import BarTape from "@/components/primatives/BarTape.vue";
import Button from "@/components/primatives/Button.vue";
import Note from "@/components/primatives/Note.vue";
import Sticker from "@/components/primatives/Sticker";
import Tabs from "@/components/primatives/Tabs.vue";
import type { LabPrimitiveUnit } from "@/types/primitivesLab";
import BarTapeBench from "./bar-tape/BarTapeBench.vue";
import PianoRollTape from "./bar-tape/PianoRollTape.vue";
import SpliceTape from "./bar-tape/SpliceTape.vue";
import ButtonBench from "./button/ButtonBench.vue";
import KeycapButton from "./button/KeycapButton.vue";
import LitKeycapButton from "./button/LitKeycapButton.vue";
import PadButton from "./button/PadButton.vue";
import ChickenHeadFace from "./knob/ChickenHeadFace.vue";
import KnobBench from "./knob/KnobBench.vue";
import KnurledDialFace from "./knob/KnurledDialFace.vue";
import LedCollarFace from "./knob/LedCollarFace.vue";
import DragValueBench from "./drag-value/DragValueBench.vue";
import DymoPaper from "./drag-value/DymoPaper.vue";
import OdometerPaper from "./drag-value/OdometerPaper.vue";
import ProductionDragPaper from "./drag-value/ProductionDragPaper.vue";
import ReadoutPaper from "./drag-value/ReadoutPaper.vue";
import MarksShelf from "./MarksShelf.vue";
import NoteBench from "./note/NoteBench.vue";
import PitchTearNote from "./note/PitchTearNote.vue";
import PosterCropNote from "./note/PosterCropNote.vue";
import StencilNote from "./note/StencilNote.vue";
import RansomSticker from "./sticker/RansomSticker.vue";
import StampSticker from "./sticker/StampSticker.vue";
import StickerBench from "./sticker/StickerBench.vue";
import TapeSticker from "./sticker/TapeSticker.vue";
import FolderTabs from "./tabs/FolderTabs.vue";
import MarqueeTabs from "./tabs/MarqueeTabs.vue";
import TabsBench from "./tabs/TabsBench.vue";
import TicketTabs from "./tabs/TicketTabs.vue";

/*
 * Every direction is judged against the design bible: which zone it lives in,
 * whether it is chassis (hardware) or applied paper stuck onto the chassis,
 * and whether it keeps brand colour out of the playing zone.
 */
export const PRIMITIVE_LAB_UNITS: LabPrimitiveUnit[] = [
  {
    id: "button",
    name: "Button",
    source: "src/components/primatives/Button.vue",
    reading: "Playing zone · chassis. Pad and Keycap are the two originals; Lit Keycap is their combination. Side by side for feel.",
    bench: ButtonBench,
    production: Button,
    directions: [
      {
        id: "pad",
        letter: "A",
        name: "Pad",
        paper: "mustard",
        idea: "A drum-machine pad backlit from under the paper. A lit lip rests under each pad; every hit floods the edge with light that decays like a note's release.",
        better: "The press becomes an attack/decay envelope, which is the instrument's own language. Rounded-square pads read as playable hardware rather than icons, and the resting lip shows which surfaces are live without adding outlines.",
        risks: "It abandons the accepted circular paper chad and the disc-geometry token family. Glow on every hit adds compositor work to rows of buttons, and the light is new motion that UIBeat, press, and decay must share without fighting.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Hardware lit by touch; Ink, Ivory, Brass only." },
        component: PadButton,
      },
      {
        id: "keycap",
        letter: "B",
        name: "Keycap",
        paper: "cobalt",
        idea: "A mechanical switch cap on the chassis: a top face over visible side walls, so every press has real travel. The cap bottoms out on press and springs back; loading lights a small status pip.",
        better: "Travel is the most honest press feedback a flat screen can fake. The side wall reads as depth on Ink, where the current 2px offset disappears, and it makes the CodeStrip Bar look like a row of switches.",
        risks: "Also leaves the accepted circle. The visible wall adds 4px of visual height at 32px, and a keyboard-switch look could read as computer rather than instrument.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Machined hardware; Brass only on the brass tone." },
        component: KeycapButton,
      },
      {
        id: "lit-keycap",
        letter: "C",
        name: "Lit Keycap",
        paper: "plum",
        idea: "Pad and Keycap combined: a switch cap on visible side walls with real travel, backlit from inside the switch. Light leaks from under the cap at rest; every hit bottoms it out and floods the seam with light that decays like a note's release.",
        better: "Two honest press signals at once: the cap physically travels, and the light speaks the instrument's attack/decay language. The side wall and lit lip give depth on Ink, where the current 2px offset disappears, and the CodeStrip Bar reads as a row of lit switches.",
        risks: "It leaves the accepted circular paper chad and the disc-geometry token family. The wall adds about 4px of visual height at 32px. Glow on every hit adds compositor work, and the light is new motion that UIBeat, travel, and decay must share without fighting.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Lit hardware; Ink, Ivory, Brass only." },
        component: LitKeycapButton,
      },
    ],
  },
  {
    id: "sticker",
    name: "Sticker + Badge",
    source: "src/components/primatives/Sticker.vue",
    reading: "Both zones · applied paper. On the playing zone it wears Ink, Ivory, and Brass; brand papers belong to the poster zone only.",
    bench: StickerBench,
    production: Sticker,
    directions: [
      {
        id: "tape",
        letter: "A",
        name: "Tape",
        paper: "bone",
        idea: "Every label is torn masking tape: ragged ends, fibre grain, slapped on at an angle. Outline becomes an Ink strip coloured only along its two long edges; Badge becomes straight foil tape.",
        better: "Today's outline is a 1px box, the exact default structure the Plan asks us to avoid. Tape is literally something stuck onto the instrument, which is the bible's picture of applied paper.",
        risks: "The torn ends need about 5px extra inline padding, so dense rows (Instrument Picker) get wider. The fibre texture is subtle and may vanish on low-DPI screens.",
        bible: { zone: "Both zones", role: "Applied paper", fit: "fits", note: "Stuck-on paper; colour follows the zone." },
        component: TapeSticker,
      },
      {
        id: "ransom",
        letter: "B",
        name: "Ransom",
        paper: "tomato",
        idea: "The guide's cut-letter headline shrunk to label size: every letter is its own scrap at its own tilt. Badge becomes a row of straight Brass type sorts.",
        better: "The most voice-forward option. In the playing zone the scraps stay Ink and Ivory; the Brass type-sort Badge is a genuine metal object, which fits Brass's instrument role better than gradient text does.",
        risks: "Legibility drops fast past one or two words, and letter-by-letter rendering needs a hidden accessible name (included). Busy next to Music Color. Only makes sense for short labels.",
        bible: { zone: "Both zones", role: "Applied paper", fit: "caution", note: "Allowed in Ink and Ivory, but it pulls the poster voice onto the chassis." },
        component: RansomSticker,
      },
      {
        id: "stamp",
        letter: "C",
        name: "Stamp",
        paper: "pine",
        idea: "A rubber stamp hit hard and crooked: double rule, worn speckled ink, the stage showing through. Fill is a solid inked block with the same wear; Badge is an engraved plate.",
        better: "Stamped onto the hardware is Burooj's own word for applied paper. Stamped also means chosen, so the selected state gains meaning, not just a colour. The worn ink is real print texture with no gradients and no glass.",
        risks: "The speckle mask softens small text and costs a little paint per sticker. The double rule is still a border, only a deliberate one. Rotating up to 7° can clip in tight containers.",
        bible: { zone: "Both zones", role: "Applied paper", fit: "fits", note: "Stamped onto the chassis; colour follows the zone." },
        component: StampSticker,
      },
    ],
  },
  {
    id: "note",
    name: "Note",
    source: "src/components/primatives/Note.vue",
    reading: "Playing zone · applied paper in Music Color. Keys are cut paper stuck onto the instrument; their only colour is the pitch.",
    bench: NoteBench,
    production: Note,
    directions: [
      {
        id: "poster-crop",
        letter: "A",
        name: "Poster Crop",
        paper: "mustard",
        idea: "The identity is set gig-poster huge and cropped by the paper, bleeding off the edge; the other labels ride on a small Ink ticket. Tall Notes turn the word on its side.",
        better: "Today every Note is the same centred label on a coloured card. Cropped giant letterforms make each syllable a distinct shape you can recognise before you read it.",
        risks: "Cropping trades legibility for voice. \"Sol\" and \"Se\" rely on their first two letters, and small glyph Notes lose the ticket. It reopens the accepted Keyboard density result, which is closed.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Colour is pure Music Color, but it reopens the accepted Keyboard density." },
        component: PosterCropNote,
      },
      {
        id: "pitch-tear",
        letter: "B",
        name: "Pitch Tear",
        paper: "cobalt",
        idea: "Music Color paper is torn off at the pitch's height inside the octave, over an Ink card: Do sits low, Ti reaches high. Holding a note fills the card to the top like a meter.",
        better: "It is the only direction that teaches: a row of Notes draws the scale's staircase, so pitch height becomes visible alongside colour. Sounding becomes a meter-fill instead of a rim flash.",
        risks: "Low notes show much less colour, so the colour mapping (the product's core lesson) weakens at the tonic. The height encodes pitch within the octave only, and must not be misread as volume.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "Torn paper over the chassis; only Music Color." },
        component: PitchTearNote,
      },
      {
        id: "stencil",
        letter: "C",
        name: "Stencil",
        paper: "plum",
        idea: "An Ink card with the syllable die-cut through it and the pitch's light behind. At rest only the letters and a lit lip carry Music Color; holding the note switches the light on and floods the card.",
        better: "The most \"lit by a synth\" option. The resting Keyboard goes quiet and dark, and playing is unmistakable: the whole key lights in its exact colour.",
        risks: "Low-octave colours (L≈.35) as text on Ink fall under comfortable contrast — see the octave-2 Do. The resting rainbow that teaches the mapping becomes letters only.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "Light answers sound; only Music Color." },
        component: StencilNote,
      },
    ],
  },
  {
    id: "knob",
    name: "Knob · Ring / Arc",
    source: "src/components/primatives/Knob/ (Ring and Arc editions)",
    reading: "Playing zone · chassis. The hardware you turn: machined, contrasty, Brass only on masters.",
    bench: KnobBench,
    production: null,
    directions: [
      {
        id: "knurled-dial",
        letter: "A",
        name: "Knurled Dial",
        paper: "tomato",
        idea: "A machined dial: a knurled grip ring that visibly turns with the value, around an Ink cap with an engraved index. Brass Knobs get a Brass grip — the metal you actually hold.",
        better: "Ring and Arc are thin glowing strokes, the most generic plugin look. The knurled grip makes the Knob unmistakably a physical part of the chassis, and turning the value turns the whole object.",
        risks: "No continuous value arc, so a range reads from the index angle and the readout rather than a fill. The knurl is fine detail that blurs below 48px, and a rotating grip suggests rotary drag while the Knob uses vertical drag.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Pure hardware; Brass is the grip metal on masters." },
        component: KnurledDialFace,
      },
      {
        id: "chicken-head",
        letter: "B",
        name: "Chicken Head",
        paper: "mustard",
        idea: "A jazz-club amp knob: a printed skirt with a tick scale and a tapered pointer. The value reads against the scale like hardware, and the number sits in the open gap at the bottom.",
        better: "The most analog option: it looks like the thing you turn, and it is the analog reading the Ring/Arc family pairs with a digital one. Options print their names round the skirt.",
        risks: "Printed option names are about 6px at 72px, so seven modes are decoration rather than readable. The pointer implies rotary drag. It is the most skeuomorphic, closest to retro pastiche.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Analog hardware; Ink, Ivory, Brass." },
        component: ChickenHeadFace,
      },
      {
        id: "led-collar",
        letter: "C",
        name: "LED Collar",
        paper: "cobalt",
        idea: "A synth encoder: the accepted dark analog well ringed by fifteen hand-cut chads that light up like LEDs. The light chases chad to chad as the value moves.",
        better: "The digital reading: it keeps the accepted dark well and centre readout and turns the stroke into discrete lit segments. Quantised chads read as steps, which fits Options naturally.",
        risks: "Fifteen steps quantise the visual (not the value), so fine range moves can look stuck. Many small glowing elements per Knob cost paint in the Control Bar. The closest to the current Knobs.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Digital hardware lit by value." },
        component: LedCollarFace,
      },
    ],
  },
  {
    id: "drag-value",
    name: "Drag Value",
    source: "src/components/primatives/DragValue.vue",
    reading: "Playing zone · the floating readout over Knob and Joystick drags. Its follower physics stays; only the paper it carries is reimagined. Only Brass is a Badge; Ivory latched stays.",
    bench: DragValueBench,
    production: ProductionDragPaper,
    directions: [
      {
        id: "dymo",
        letter: "A",
        name: "Dymo Label",
        paper: "bone",
        idea: "The value is punched into label-maker tape and stuck onto the gear: raised letters, a glossy strip, diagonal cut ends. Every new value is punched again, letter by letter, like the embosser's click.",
        better: "Studio gear is labelled with exactly this tape, so it is the most literal applied object on the hardware. The punch-in makes every value change feel mechanical rather than a generic scale bounce.",
        risks: "Mono letters are wider than the current Jazz sticker, so long option names ('Phrygian') grow the follower. Ivory latched becomes Ivory tape — it reads as a label, not a Badge.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "Tape stuck onto the gear; Ink, Ivory, Brass." },
        component: DymoPaper,
      },
      {
        id: "odometer",
        letter: "B",
        name: "Odometer",
        paper: "mustard",
        idea: "A mechanical counter window: each character sits on its own drum behind a bezel, and only the drums that changed roll to their new face — up when the value rises, down when it falls.",
        better: "The analog reading of the readout, matching Chicken Head and the Analog Knob. Direction of change is visible in the roll itself, so you feel which way you're turning.",
        risks: "Word values (modes, Joystick moods) roll every drum at once and read as noise. The drum shading is fine detail at 20px. Brass becomes a bezel around dark drums rather than the familiar sheen Badge.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Analog counter hardware; Brass bezel on masters." },
        component: OdometerPaper,
      },
      {
        id: "readout",
        letter: "C",
        name: "Segment Readout",
        paper: "cobalt",
        idea: "A recessed display window: lit characters over faint unlit '8' segments, the way a synth's LCD always shows its ghost digits. Each change flickers the display like a refresh.",
        better: "The digital reading, paired with the Odometer's analog one, so the readout can follow the Knob's Analog/Digital edition. Lit characters answer the gesture with light, the bible's motion rule.",
        risks: "Ghost 8s under letters look odd for word values. Glow on a moving follower adds paint during drags. Loses the cut-paper tilt feel the current sticker has.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Digital display hardware lit by the value." },
        component: ReadoutPaper,
      },
    ],
  },
  {
    id: "marks",
    name: "Marks",
    source: "src/components/primatives/marks.ts + Mark.vue",
    reading: "Both zones · glyph geometry shared by SVG and canvas.",
    bench: MarksShelf,
    production: null,
    directions: [],
    leaveAlone: "Left alone on purpose. Marks is a geometry registry, not a look: 29 accepted glyphs shared by SVG and the canvas Stage particles. A reimagined Mark would be a treatment, and treatments belong to the units that use Marks. Redrawing the glyphs would be a variation, not an idea.",
  },
  {
    id: "bar-tape",
    name: "Bar Tape",
    source: "src/components/primatives/BarTape.vue",
    reading: "Playing zone · a readout on the PatternStrip; its only colour is Music Color.",
    bench: BarTapeBench,
    production: BarTape,
    directions: [
      {
        id: "piano-roll",
        letter: "A",
        name: "Piano Roll",
        paper: "pine",
        idea: "The tape grows from 1px to a 6px band, and each note becomes a 2px dash at its pitch height. The strip draws the melody's contour as well as its rhythm and colour.",
        better: "At 1px the tape is a colour barcode: you can't tell two patterns with similar colours apart. Contour makes every pattern's shape recognisable at a glance in the reel.",
        risks: "It gives up the accepted 1px density and overlaps the top 6px of each 51.2px strip. Only two directions, because Bar Tape has one job and there are not three honest ideas for it.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "An instrument readout; only Music Color." },
        component: PianoRollTape,
      },
      {
        id: "splice",
        letter: "B",
        name: "Splice",
        paper: "bone",
        idea: "Reel-to-reel tape spliced by hand: a 3px band where every note is its own diagonal-cut piece, butted against the next with an Ink seam.",
        better: "Repeated notes of the same colour currently merge into one bar. The splice seams keep every event countable, so rhythm reads as cuts.",
        risks: "Very short notes turn into slivers where the diagonal eats the colour. 3px still gives up the accepted 1px density.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "Cut tape pieces; only Music Color." },
        component: SpliceTape,
      },
    ],
  },
  {
    id: "tabs",
    name: "Tabs",
    source: "src/components/primatives/Tabs.vue",
    reading: "Playing zone · an applied-paper chip on a chassis rail in the top menus.",
    bench: TabsBench,
    production: Tabs,
    directions: [
      {
        id: "folder",
        letter: "A",
        name: "Folder",
        paper: "bone",
        idea: "Real file-folder tabs standing on the edge of the sheet they open. The chosen tab rises in Ivory (or Brass) and joins a paper edge that runs the full width.",
        better: "Today's rail is a bordered box with a floating chip, a hairline frame the Plan calls default structure. Folder removes the box and makes the chosen destination visibly connected to its content.",
        risks: "It needs the panel below to accept an Ivory (or Brass) top edge, a TabbedOverlayPanel change on adoption. The overlapping shoulders need care in the eight-destination scroll rail.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "Ivory paper on the chassis; Brass only for Shape." },
        component: FolderTabs,
      },
      {
        id: "ticket",
        letter: "B",
        name: "Ticket",
        paper: "tomato",
        idea: "The rail is a strip of numbered gig tickets joined at their perforations. Choosing one tears it off: it turns Ivory, tips, and lifts on a hard Ink shadow.",
        better: "Selection is a physical event — a piece of paper torn off and stuck back on — instead of a chip sliding. The numbering gives destinations an order you can say out loud.",
        risks: "The tilted active ticket needs vertical room and can collide with the header above. The perforation mask costs paint, and the look is busy beside the Config panel's own groups.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "Ink and Ivory stubs; no brand colour." },
        component: TicketTabs,
      },
      {
        id: "marquee",
        letter: "C",
        name: "Marquee",
        paper: "plum",
        idea: "A club marquee lit by a synth: every destination has a row of bulbs, and only the chosen one is on. On change the bulbs chase in the direction you moved.",
        better: "No chip, no box, no hairline: selection is light alone, the calmest structure of the three with the most character in motion. The chase direction also tells you where you came from.",
        risks: "Selection relies on luminance plus a small bulb row, so it is weaker in Forced Colors and bright sun than a solid chip. It trades the applied-paper chip for chassis lights.",
        bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Hardware lamps instead of a paper chip." },
        component: MarqueeTabs,
      },
    ],
  },
];
