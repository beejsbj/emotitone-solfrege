import { ref } from "vue";
import * as Tone from "tone";

// Initialize basic instruments
const instruments = {
  synth: new Tone.Synth(),
  amSynth: new Tone.AMSynth(),
  fmSynth: new Tone.FMSynth(),
  membraneSynth: new Tone.MembraneSynth(),
  metalSynth: new Tone.MetalSynth(),
};

// Connect basic instruments to the main output
Object.values(instruments).forEach((instrument) => {
  instrument.toDestination();
});

// Create a sampler for piano using built-in Salamander samples
instruments.piano = new Tone.Sampler({
  urls: {
    A0: "A0.mp3",
    C1: "C1.mp3",
    "D#1": "Ds1.mp3",
    "F#1": "Fs1.mp3",
    A1: "A1.mp3",
    C2: "C2.mp3",
    "D#2": "Ds2.mp3",
    "F#2": "Fs2.mp3",
    A2: "A2.mp3",
    C3: "C3.mp3",
    "D#3": "Ds3.mp3",
    "F#3": "Fs3.mp3",
    A3: "A3.mp3",
    C4: "C4.mp3",
    "D#4": "Ds4.mp3",
    "F#4": "Fs4.mp3",
    A4: "A4.mp3",
    C5: "C5.mp3",
    "D#5": "Ds5.mp3",
    "F#5": "Fs5.mp3",
    A5: "A5.mp3",
    C6: "C6.mp3",
    "D#6": "Ds6.mp3",
    "F#6": "Fs6.mp3",
    A6: "A6.mp3",
    C7: "C7.mp3",
    "D#7": "Ds7.mp3",
    "F#7": "Fs7.mp3",
    A7: "A7.mp3",
  },
  release: 1,
  baseUrl: "https://tonejs.github.io/audio/salamander/",
}).toDestination();

export const currentInstrument = ref("piano");

export function getCurrentInstrument() {
  return instruments[currentInstrument.value];
}

export function setInstrument(instrumentName) {
  if (instruments[instrumentName]) {
    currentInstrument.value = instrumentName;
  }
}

export function getAvailableInstruments() {
  return Object.keys(instruments);
}
