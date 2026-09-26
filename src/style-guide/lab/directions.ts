import type { Component } from "vue";
import ProductionLogo from "./ProductionLogo.vue";
import ProductionScreen from "./ProductionScreen.vue";
import CountInLogo from "./count-in/CountInLogo.vue";
import CountInScreen from "./count-in/CountInScreen.vue";
import OctaveLogo from "./octave/OctaveLogo.vue";
import OctaveScreen from "./octave/OctaveScreen.vue";
import SideALogo from "./side-a/SideALogo.vue";
import SideAScreen from "./side-a/SideAScreen.vue";

export interface LabDirection {
  id: string;
  letter: string;
  name: string;
  logoName: string;
  paper: "bone" | "tomato" | "mustard" | "plum" | "cobalt" | "pine";
  idea: string;
  better: string;
  risks: string;
  logo: Component;
  screen: Component;
}

export const PRODUCTION: LabDirection = {
  id: "current",
  letter: "0",
  name: "Ink Chromatic Bars",
  logoName: "Centered Cluster",
  paper: "bone",
  idea: "The accepted pair: five brand circles behind a six-cut ET, beside stamped stages, an equalizer meter, twelve chromatic solfège lanes, and a tall Brass Play gate.",
  better: "The baseline every direction must beat.",
  risks: "Accepted and shipping.",
  logo: ProductionLogo,
  screen: ProductionScreen,
};

export const DIRECTIONS: LabDirection[] = [
  {
    id: "count-in",
    letter: "A",
    name: "Count-In",
    logoName: "Paste-Up ET",
    paper: "tomato",
    idea: "The load is the band counting in. Each required stage is one beat — one, two, three, four — pasted up as a gig-poster tile when it lands; MIDI is the optional “and”.",
    better: "Progress becomes a musical count you can read from across the room. The four numerals are the stage list, the meter, and the poster at once, so nothing is decorative filler.",
    risks: "Four beats for four stages is a tidy coincidence; a fifth required stage breaks the metaphor. Giant numerals are loud for repeat visits.",
    logo: CountInLogo,
    screen: CountInScreen,
  },
  {
    id: "octave",
    letter: "B",
    name: "Tuning Up",
    logoName: "Octave Stair",
    paper: "plum",
    idea: "Seven solfège columns, coloured by the real Music Color resolver, drift out of tune while the app loads and lock to pitch one by one. Ready lands the high Do: the Play gate.",
    better: "It teaches the product's core idea — Do to Ti, colour as pitch — before the first tap, and the motion is literally tuning, not spinning.",
    risks: "Borrows Music Color into the brand, so the mark depends on the resolver staying stable. Seven colours at 48px read as bars, not as a monogram.",
    logo: OctaveLogo,
    screen: OctaveScreen,
  },
  {
    id: "side-a",
    letter: "C",
    name: "Side A",
    logoName: "Record Sleeve",
    paper: "cobalt",
    idea: "A Blue Note-style sleeve with the record sliding out as progress. The stages are the Side A tracklist; MIDI is the bonus track. Ready drops the needle.",
    better: "One object carries progress, identity, and the circular sequencer's record-player metaphor. The sleeve-plus-disc silhouette is the strongest small icon of the set.",
    risks: "Record nostalgia can read retro rather than instrument. The disc is circular, so motion must stay stepped on the beat or it becomes a spinner.",
    logo: SideALogo,
    screen: SideAScreen,
  },
];

export const ALL_DIRECTIONS = [PRODUCTION, ...DIRECTIONS];
