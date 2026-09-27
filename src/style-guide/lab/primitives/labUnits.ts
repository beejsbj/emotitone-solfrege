import BarTape from "@/components/primatives/BarTape.vue";
import Button from "@/components/primatives/Button.vue";
import Note from "@/components/primatives/Note.vue";
import Sticker from "@/components/primatives/Sticker";
import Tabs from "@/components/primatives/Tabs.vue";
import type { LabPrimitiveUnit } from "@/types/primitivesLab";
import BarTapeBench from "./bar-tape/BarTapeBench.vue";
import PianoRollTape from "./bar-tape/PianoRollTape.vue";
import SpliceTape from "./bar-tape/SpliceTape.vue";
import BurstButton from "./button/BurstButton.vue";
import ButtonBench from "./button/ButtonBench.vue";
import MisprintButton from "./button/MisprintButton.vue";
import PadButton from "./button/PadButton.vue";
import ChickenHeadFace from "./knob/ChickenHeadFace.vue";
import KnobBench from "./knob/KnobBench.vue";
import LedCollarFace from "./knob/LedCollarFace.vue";
import PaperPieFace from "./knob/PaperPieFace.vue";
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
import MarksShelf from "./MarksShelf.vue";

export const PRIMITIVE_LAB_UNITS: LabPrimitiveUnit[] = [
  {
    id: "button",
    name: "Button",
    source: "src/components/primatives/Button.vue",
    bench: ButtonBench,
    production: Button,
    directions: [
      {
        id: "misprint",
        letter: "A",
        name: "Misprint",
        paper: "tomato",
        idea: "A two-plate screenprint pulled out of register: a colour plate peeks from under the paper and the icon ghosts in that colour. Press pulls the plates into register; release springs them back out.",
        better: "The current 2px Ink offset disappears on Ink, so buttons read as flat dots. The off-register plate gives real depth on a dark stage, and press feedback becomes a visible print event instead of a 2px nudge. Loading orbits the plate instead of drawing a generic spinner.",
        risks: "Every Ink button now carries a Tomato plate (Cobalt under Ivory): brand colour lands in everyday chrome, which the Plan reserves as decorative. Dense bars get busier. The offset makes the visual centre sit slightly off the hit box.",
        component: MisprintButton,
      },
      {
        id: "pad",
        letter: "B",
        name: "Pad",
        paper: "mustard",
        idea: "A drum-machine pad backlit from under the paper. A lit lip rests under each pad; every hit floods the edge with light that decays like a note's release.",
        better: "The press becomes an attack/decay envelope, which is the instrument's own language. Rounded-square pads read as playable hardware rather than icons, and the resting lip shows which surfaces are live without adding outlines.",
        risks: "It abandons the accepted circular paper chad and the disc-geometry token family. Glow on every hit adds compositor work to rows of buttons, and the light is new motion that UIBeat, press, and decay must share without fighting.",
        component: PadButton,
      },
      {
        id: "burst",
        letter: "C",
        name: "Burst",
        paper: "plum",
        idea: "The gig-poster price burst: a twelve-point star cut from paper. Each press ratchets it forward one point; because the star repeats every 30°, the resting silhouette never changes.",
        better: "It is the most poster-native silhouette in the set. The one-point ratchet makes a momentary press feel like a mechanical detent, and it is still at rest while alive under the finger.",
        risks: "Twelve points at 32px is visual noise in the CodeStrip Bar. It reads as a promotion or badge, so an action button might be mistaken for decoration. The points cut into the icon's breathing room.",
        component: BurstButton,
      },
    ],
  },
  {
    id: "sticker",
    name: "Sticker + Badge",
    source: "src/components/primatives/Sticker.vue",
    bench: StickerBench,
    production: Sticker,
    directions: [
      {
        id: "tape",
        letter: "A",
        name: "Tape",
        paper: "bone",
        idea: "Every label is torn masking tape: ragged ends, fibre grain, slapped on at an angle. Outline becomes an Ink strip coloured only along its two long edges; Badge becomes straight foil tape.",
        better: "Today's outline is a 1px box, the exact default structure the Plan asks us to avoid. Tape keeps the cut-paper metaphor and removes the box. The torn ends read as hand-made even at 12px.",
        risks: "The torn ends need about 5px extra inline padding, so dense rows (Instrument Picker) get wider. The fibre texture is subtle and may vanish on low-DPI screens.",
        component: TapeSticker,
      },
      {
        id: "ransom",
        letter: "B",
        name: "Ransom",
        paper: "tomato",
        idea: "The guide's cut-letter headline shrunk to label size: every letter is its own scrap, alternating the Sticker colour with Ink and Ivory at its own tilt. Badge becomes a row of straight Brass type sorts.",
        better: "The most voice-forward option: labels shout the brand exactly where the product names things. The Brass type-sort Badge is a genuine metal object, so it fits Brass's instrument-metal role better than gradient text does.",
        risks: "Legibility drops fast past one or two words, and letter-by-letter rendering needs a hidden accessible name (included). Busy next to Music Color. Only makes sense for short labels, so it may need a second calmer Sticker anyway.",
        component: RansomSticker,
      },
      {
        id: "stamp",
        letter: "C",
        name: "Stamp",
        paper: "pine",
        idea: "A rubber stamp hit hard and crooked: double rule, worn speckled ink, the stage showing through. Fill is a solid inked block with the same wear; Badge is an engraved plate.",
        better: "Stamped means approved or chosen, so it gives the selected state real meaning, not just a colour. The worn ink texture is the first real print texture in the system, with no gradients and no glass.",
        risks: "The speckle mask softens small text and costs a little paint per sticker. The double rule is still a border, only a deliberate one. Rotating up to 7° can clip in tight containers.",
        component: StampSticker,
      },
    ],
  },
  {
    id: "note",
    name: "Note",
    source: "src/components/primatives/Note.vue",
    bench: NoteBench,
    production: Note,
    directions: [
      {
        id: "poster-crop",
        letter: "A",
        name: "Poster Crop",
        paper: "mustard",
        idea: "The identity is set gig-poster huge and cropped by the paper, bleeding off the edge; the other labels ride on a small Ink ticket. Tall Notes turn the word on its side.",
        better: "Today every Note is the same centred label on a coloured card. Cropped giant letterforms make each syllable a distinct shape you can recognise before you read it, and the Keyboard becomes a poster wall.",
        risks: "Cropping trades legibility for voice. \"Sol\" and \"Se\" rely on their first two letters, and small glyph Notes lose the ticket. It changes the accepted Keyboard density result, which is closed.",
        component: PosterCropNote,
      },
      {
        id: "pitch-tear",
        letter: "B",
        name: "Pitch Tear",
        paper: "cobalt",
        idea: "Music Color paper is torn off at the pitch's height inside the octave, over an Ink card: Do sits low, Ti reaches high. Holding a note fills the card to the top like a meter.",
        better: "It is the only direction that teaches: a row of Notes draws the scale's staircase, so pitch height becomes visible alongside colour. Sounding becomes a meter-fill instead of a rim flash.",
        risks: "Low notes show much less colour, so the colour mapping (the product's core lesson) weakens at the tonic. The height encodes pitch within the octave only, and a new layout must avoid misreading it as volume.",
        component: PitchTearNote,
      },
      {
        id: "stencil",
        letter: "C",
        name: "Stencil",
        paper: "plum",
        idea: "An Ink card with the syllable die-cut through it and the pitch's light behind. At rest only the letters and a lit lip carry Music Color; holding the note switches the light on and floods the card.",
        better: "The most \"lit by a synth\" option. The resting Keyboard goes quiet and dark, and playing is unmistakable: the whole key lights in its exact colour. It also lowers constant visual load on a long session.",
        risks: "Low-octave colours (L≈.35) as text on Ink fall under comfortable contrast. You can see it in the octave-2 Do. The resting rainbow that teaches the mapping becomes letters only. A contrast lift would need a Music Color adapter policy, not a new palette.",
        component: StencilNote,
      },
    ],
  },
  {
    id: "knob",
    name: "Knob · Ring / Arc",
    source: "src/components/primatives/Knob/ (Ring and Arc editions)",
    bench: KnobBench,
    production: null,
    directions: [
      {
        id: "paper-pie",
        letter: "A",
        name: "Paper Pie",
        paper: "tomato",
        idea: "The value is a solid wedge of paper, not a stroke: a slice cut from the tone's stock on a flat Ink plate. Options become a pie of equal slices with the chosen one in paper.",
        better: "Ring and Arc are both thin glowing strokes, the most generic synth-plugin look. A paper wedge is cut-paper native, reads from arm's length, and Options gets a real picture of \"one of N\" instead of a rotating segment.",
        risks: "Solid wedges are heavy in a five-Knob Control Bar. At 50% the wedge covers the centre label's surroundings. It retires the shared dark well that Joystick also uses.",
        component: PaperPieFace,
      },
      {
        id: "chicken-head",
        letter: "B",
        name: "Chicken Head",
        paper: "mustard",
        idea: "A jazz-club amp knob: a printed skirt with a tick scale and a tapered pointer. The value reads against the scale like hardware, and the number sits in the open gap at the bottom.",
        better: "The most physical option: it looks like the thing you turn. Options print their names round the skirt, so every choice is visible before you drag.",
        risks: "Printed option names are about 6px at 72px, so seven modes are decoration rather than readable. The rotating pointer implies rotary drag, but the Knob uses vertical drag. And it is the most skeuomorphic, closest to the retro-pastiche risk.",
        component: ChickenHeadFace,
      },
      {
        id: "led-collar",
        letter: "C",
        name: "LED Collar",
        paper: "cobalt",
        idea: "A synth encoder: the accepted dark analog well ringed by fifteen hand-cut paper chads that light up like LEDs. The light chases chad to chad as the value moves.",
        better: "It keeps the accepted dark well and the centre readout, and turns the stroke into discrete lit cuts: cut-paper and synth in one object. Quantised chads also read as steps, which fits Options naturally.",
        risks: "Fifteen steps quantise the visual (not the value), so fine range moves can look stuck. Many small glowing elements per Knob cost paint in the Control Bar. It is the closest to the current Knobs, so the least bold of the three.",
        component: LedCollarFace,
      },
    ],
  },
  {
    id: "marks",
    name: "Marks",
    source: "src/components/primatives/marks.ts + Mark.vue",
    bench: MarksShelf,
    production: null,
    directions: [],
    leaveAlone: "Left alone on purpose. Marks is a geometry registry, not a look: 29 accepted glyphs shared by SVG and the canvas Stage particles. A reimagined Mark would be a treatment, and treatments belong to the units that use Marks. Ransom and Stamp Stickers, Beat Indicator, and the Loading Screen field already restyle them without touching the source. Redrawing the glyphs would be a variation, not an idea.",
  },
  {
    id: "bar-tape",
    name: "Bar Tape",
    source: "src/components/primatives/BarTape.vue",
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
        risks: "It gives up the accepted 1px density and overlaps the top 6px of each 51.2px strip, where it may touch the title's ascenders. Only two directions, because Bar Tape has one job and there are not three honest ideas for it.",
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
        component: SpliceTape,
      },
    ],
  },
  {
    id: "tabs",
    name: "Tabs",
    source: "src/components/primatives/Tabs.vue",
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
        component: FolderTabs,
      },
      {
        id: "ticket",
        letter: "B",
        name: "Ticket",
        paper: "tomato",
        idea: "The rail is a strip of numbered gig tickets joined at their perforations. Choosing one tears it off: it turns Ivory, tips, and lifts on a hard Ink shadow.",
        better: "The most jazz-poster of the three, and the numbering gives destinations an order you can say out loud. Selection is a physical event (torn and lifted) instead of a chip sliding.",
        risks: "The tilted active ticket needs vertical room and can collide with the header above. The perforation mask costs paint, and the look is busy beside the Config panel's own groups.",
        component: TicketTabs,
      },
      {
        id: "marquee",
        letter: "C",
        name: "Marquee",
        paper: "plum",
        idea: "A club marquee lit by a synth: every destination has a row of bulbs, and only the chosen one is on. On change the bulbs chase in the direction you moved.",
        better: "No chip, no box, no hairline: selection is light alone, the calmest structure of the three with the most character in motion. The chase direction also tells you where you came from.",
        risks: "Selection relies on luminance plus a small bulb row, so it is weaker in Forced Colors and bright sun than a solid chip. The glow is decoration that must stay still under Reduced Motion (it does).",
        component: MarqueeTabs,
      },
    ],
  },
];
