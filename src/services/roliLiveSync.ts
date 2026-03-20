import type { ChromaticNote, DynamicColorConfig, MusicalMode } from "@/types";
import { buildRoliPianoPalette } from "@/services/roliPianoExport";

export interface MidiPortLike {
  name?: string | null;
  state?: string | null;
}

export const ROLI_SYNC_NOTE_CHANNEL = 1;
export const ROLI_SYNC_CONTROL_CHANNEL = 16;
export const ROLI_SYNC_CONTROL_STATUS =
  0xb0 | (ROLI_SYNC_CONTROL_CHANNEL - 1);
export const ROLI_APP_MAIN_OCTAVE_MIN = 1;
export const ROLI_APP_MAIN_OCTAVE_MAX = 8;

export const ROLI_SYNC_CCS = {
  paletteIndex: 102,
  paletteRed: 103,
  paletteGreen: 104,
  paletteBlue: 105,
  paletteCommit: 106,
  activeRed: 107,
  activeGreen: 108,
  activeBlue: 109,
  activeCommit: 110,
  mainOctave: 111,
} as const;

const ROLI_PORT_NAME_PATTERN = /\b(roli|lumi|lightkey|seaboard|blocks?)\b/i;

function clampMidiData(value: number): number {
  return Math.max(0, Math.min(127, Math.round(value)));
}

function clampMidiChannelNibble(value: number): number {
  return Math.max(0, Math.min(15, Math.round(value)));
}

export function clampRoliAppMainOctave(value: number): number {
  return Math.max(
    ROLI_APP_MAIN_OCTAVE_MIN,
    Math.min(ROLI_APP_MAIN_OCTAVE_MAX, Math.round(value))
  );
}

function parseLittleFootHexRgb(color: string) {
  const normalized = color.trim().toLowerCase();
  const match = normalized.match(/^0x([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);

  if (!match) {
    throw new Error(`Unsupported LittleFoot color: ${color}`);
  }

  const [, _alpha, red, green, blue] = match;

  return {
    r: parseInt(red, 16),
    g: parseInt(green, 16),
    b: parseInt(blue, 16),
  };
}

function toMidiColorComponent(value: number): number {
  return clampMidiData((value / 255) * 127);
}

export function isRoliMidiPortName(name?: string | null): boolean {
  return typeof name === "string" && ROLI_PORT_NAME_PATTERN.test(name);
}

export function pickPreferredRoliOutput<T extends MidiPortLike>(
  outputs: Iterable<T> | T[]
): T | null {
  for (const output of Array.from(outputs)) {
    if (
      output.state !== undefined
      && output.state !== null
      && output.state !== "connected"
    ) {
      continue;
    }

    if (isRoliMidiPortName(output.name)) {
      return output;
    }
  }

  return null;
}

export function buildRoliNoteOnMessage(
  noteNumber: number,
  velocity: number = 100,
  channel: number = ROLI_SYNC_NOTE_CHANNEL
): number[] {
  return [
    0x90 | clampMidiChannelNibble(channel - 1),
    clampMidiData(noteNumber),
    clampMidiData(velocity),
  ];
}

export function buildRoliNoteOffMessage(
  noteNumber: number,
  channel: number = ROLI_SYNC_NOTE_CHANNEL
): number[] {
  return [
    0x80 | clampMidiChannelNibble(channel - 1),
    clampMidiData(noteNumber),
    0,
  ];
}

export function buildRoliAllNotesOffMessages(
  channel: number = ROLI_SYNC_NOTE_CHANNEL
): number[][] {
  const status = 0xb0 | clampMidiChannelNibble(channel - 1);

  return [
    [status, 120, 0],
    [status, 123, 0],
  ];
}

export function buildRoliMainOctaveMessage(mainOctave: number): number[] {
  return [
    ROLI_SYNC_CONTROL_STATUS,
    ROLI_SYNC_CCS.mainOctave,
    clampRoliAppMainOctave(mainOctave),
  ];
}

export function buildRoliPaletteUpdateMessages(
  dynamicColorConfig: DynamicColorConfig,
  currentKey: ChromaticNote,
  currentMode: MusicalMode,
  activeColor: string = "0xffffffff"
): number[][] {
  const palette = buildRoliPianoPalette({
    dynamicColorConfig,
    currentKey,
    currentMode,
    activeColor,
  });
  const pitchColours = [
    palette.C,
    palette.C_,
    palette.D,
    palette.D_,
    palette.E,
    palette.F,
    palette.F_,
    palette.G,
    palette.G_,
    palette.A,
    palette.A_,
    palette.B,
  ];

  const messages = pitchColours.flatMap((color, index) => {
    const rgb = parseLittleFootHexRgb(color);

    return [
      [ROLI_SYNC_CONTROL_STATUS, ROLI_SYNC_CCS.paletteIndex, index],
      [
        ROLI_SYNC_CONTROL_STATUS,
        ROLI_SYNC_CCS.paletteRed,
        toMidiColorComponent(rgb.r),
      ],
      [
        ROLI_SYNC_CONTROL_STATUS,
        ROLI_SYNC_CCS.paletteGreen,
        toMidiColorComponent(rgb.g),
      ],
      [
        ROLI_SYNC_CONTROL_STATUS,
        ROLI_SYNC_CCS.paletteBlue,
        toMidiColorComponent(rgb.b),
      ],
      [ROLI_SYNC_CONTROL_STATUS, ROLI_SYNC_CCS.paletteCommit, 127],
    ];
  });

  const activeRgb = parseLittleFootHexRgb(palette.activeColour);

  messages.push(
    [
      ROLI_SYNC_CONTROL_STATUS,
      ROLI_SYNC_CCS.activeRed,
      toMidiColorComponent(activeRgb.r),
    ],
    [
      ROLI_SYNC_CONTROL_STATUS,
      ROLI_SYNC_CCS.activeGreen,
      toMidiColorComponent(activeRgb.g),
    ],
    [
      ROLI_SYNC_CONTROL_STATUS,
      ROLI_SYNC_CCS.activeBlue,
      toMidiColorComponent(activeRgb.b),
    ],
    [ROLI_SYNC_CONTROL_STATUS, ROLI_SYNC_CCS.activeCommit, 127]
  );

  return messages;
}
