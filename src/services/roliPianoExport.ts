import { CHROMATIC_NOTES, MAJOR_SCALE, MINOR_SCALE } from "@/data";
import type {
  ChromaticNote,
  DynamicColorConfig,
  MusicalMode,
} from "@/types";
import { generateDynamicNoteColors } from "@/services/colorGeneration";

export const ROLI_CHROMATIC_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

type RoliChromaticNote = (typeof ROLI_CHROMATIC_NOTES)[number];

const ROLI_VARIABLE_NAMES: Record<RoliChromaticNote, string> = {
  C: "C",
  "C#": "C_",
  D: "D",
  "D#": "D_",
  E: "E",
  F: "F",
  "F#": "F_",
  G: "G",
  "G#": "G_",
  A: "A",
  "A#": "A_",
  B: "B",
};

export interface RoliPianoPalette {
  C: string;
  C_: string;
  D: string;
  D_: string;
  E: string;
  F: string;
  F_: string;
  G: string;
  G_: string;
  A: string;
  A_: string;
  B: string;
  activeColour: string;
}

export interface GenerateRoliPianoScriptOptions {
  dynamicColorConfig: DynamicColorConfig;
  currentKey: ChromaticNote;
  currentMode: MusicalMode;
  activeColor?: string;
  keyCount?: number;
  octave?: number;
  exportedAt?: string;
}

export interface BuildRoliPianoPaletteOptions {
  dynamicColorConfig: DynamicColorConfig;
  currentKey: ChromaticNote;
  currentMode: MusicalMode;
  activeColor?: string;
  octave?: number;
}

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const ROLI_OFF_COLOUR = "0xff000000";

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function hslToRgba(
  hue: number,
  saturationPercent: number,
  lightnessPercent: number,
  alpha: number = 1
): RgbaColor {
  const h = normalizeHue(hue) / 360;
  const s = Math.max(0, Math.min(1, saturationPercent / 100));
  const l = Math.max(0, Math.min(1, lightnessPercent / 100));
  const a = Math.max(0, Math.min(1, alpha));

  if (s === 0) {
    const gray = clampChannel(l * 255);
    return { r: gray, g: gray, b: gray, a: clampChannel(a * 255) };
  }

  const hueToChannel = (p: number, q: number, t: number): number => {
    let temp = t;

    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;

    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: clampChannel(hueToChannel(p, q, h + 1 / 3) * 255),
    g: clampChannel(hueToChannel(p, q, h) * 255),
    b: clampChannel(hueToChannel(p, q, h - 1 / 3) * 255),
    a: clampChannel(a * 255),
  };
}

function parseHexColor(color: string): RgbaColor | null {
  const normalized = color.trim().replace("#", "");

  if (!/^[\da-f]+$/i.test(normalized)) {
    return null;
  }

  if (normalized.length === 3) {
    const [r, g, b] = normalized.split("");
    return parseHexColor(`#${r}${r}${g}${g}${b}${b}`);
  }

  if (normalized.length === 4) {
    const [r, g, b, a] = normalized.split("");
    return parseHexColor(`#${r}${r}${g}${g}${b}${b}${a}${a}`);
  }

  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
      a: 255,
    };
  }

  if (normalized.length === 8) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
      a: parseInt(normalized.slice(6, 8), 16),
    };
  }

  return null;
}

function parseRgbColor(color: string): RgbaColor | null {
  const match = color.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i
  );

  if (!match) {
    return null;
  }

  const [, r, g, b, a = "1"] = match;

  return {
    r: clampChannel(Number(r)),
    g: clampChannel(Number(g)),
    b: clampChannel(Number(b)),
    a: clampChannel(Number(a) * 255),
  };
}

function parseHslColor(color: string): RgbaColor | null {
  const match = color.match(
    /^hsla?\(\s*([-\d.]+)\s*,\s*([-\d.]+)%\s*,\s*([-\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)$/i
  );

  if (!match) {
    return null;
  }

  const [, h, s, l, a = "1"] = match;

  return hslToRgba(Number(h), Number(s), Number(l), Number(a));
}

export function cssColorToLittleFootHex(color: string): string {
  const parsed =
    parseHexColor(color) ?? parseRgbColor(color) ?? parseHslColor(color);

  if (!parsed) {
    throw new Error(`Unsupported CSS color format: ${color}`);
  }

  const toHex = (value: number) => value.toString(16).padStart(2, "0");

  return `0x${toHex(parsed.a)}${toHex(parsed.r)}${toHex(parsed.g)}${toHex(parsed.b)}`;
}

function getScaleIntervals(mode: MusicalMode) {
  const scale = mode === "minor" ? MINOR_SCALE : MAJOR_SCALE;
  return scale.intervals.slice(0, 7);
}

function getPitchClassIndex(noteName: ChromaticNote) {
  return CHROMATIC_NOTES.indexOf(noteName);
}

export function getScaleDegreeIndexForPitchClass(
  noteName: ChromaticNote,
  currentKey: ChromaticNote,
  currentMode: MusicalMode
): number | null {
  const noteIndex = getPitchClassIndex(noteName);
  const keyIndex = getPitchClassIndex(currentKey);

  if (noteIndex === -1 || keyIndex === -1) {
    return null;
  }

  const relativePitchClass = (noteIndex - keyIndex + 12) % 12;
  const scaleDegreeIndex = getScaleIntervals(currentMode).indexOf(
    relativePitchClass
  );

  return scaleDegreeIndex === -1 ? null : scaleDegreeIndex;
}

export function buildRoliPianoPalette({
  dynamicColorConfig,
  currentKey,
  currentMode,
  octave = 4,
  activeColor = "0xffffffff",
}: BuildRoliPianoPaletteOptions): RoliPianoPalette {
  const tonalConfig: DynamicColorConfig = {
    ...dynamicColorConfig,
    chromaticMapping: false,
  };

  const palette = ROLI_CHROMATIC_NOTES.reduce((acc, noteName) => {
    const variableName = ROLI_VARIABLE_NAMES[noteName];
    const scaleDegreeIndex = getScaleDegreeIndexForPitchClass(
      noteName,
      currentKey,
      currentMode
    );

    acc[variableName as keyof Omit<RoliPianoPalette, "activeColour">] =
      scaleDegreeIndex === null
        ? ROLI_OFF_COLOUR
        : cssColorToLittleFootHex(
            generateDynamicNoteColors(
              scaleDegreeIndex,
              octave,
              tonalConfig
            ).primary
          );

    return acc;
  }, {} as Omit<RoliPianoPalette, "activeColour">);

  return {
    ...palette,
    activeColour: activeColor.startsWith("0x")
      ? activeColor.toLowerCase()
      : cssColorToLittleFootHex(activeColor),
  };
}

export function generateRoliPianoScript({
  dynamicColorConfig,
  currentKey,
  currentMode,
  activeColor = "0xffffffff",
  keyCount = 49,
  octave = 4,
  exportedAt = new Date().toISOString(),
}: GenerateRoliPianoScriptOptions): string {
  const palette = buildRoliPianoPalette({
    dynamicColorConfig,
    currentKey,
    currentMode,
    octave,
    activeColor,
  });
  const paletteVariables = [
    ["C", palette.C],
    ["C_", palette.C_],
    ["D", palette.D],
    ["D_", palette.D_],
    ["E", palette.E],
    ["F", palette.F],
    ["F_", palette.F_],
    ["G", palette.G],
    ["G_", palette.G_],
    ["A", palette.A],
    ["A_", palette.A_],
    ["B", palette.B],
    ["activeColour", palette.activeColour],
  ]
    .map(
      ([name, value]) =>
        `      <variable name="${name}" displayName="${name.replace("_", "#")}" group="colours" type="colour" value="${value}" />`
    )
    .join("\n");

  return `/*
<metadata description="Emotitone palette for ROLI piano"
          details="Generated ${exportedAt} for ${currentKey} ${currentMode}. Drag and drop onto LUMI using Dashboard or use BLOCKS Code to load this script. This version supports live MIDI note mirroring and palette updates from Emotitone. Reset the piano in Dashboard to restore factory behavior."
          target="Lightkey, roliPiano49"
          tags="LUMI,Emotitone">
    <groups>
      <group name="colours" displayName="Colors" columnSpan="6" displayIndex="6010"/>
    </groups>

    <variables>
${paletteVariables}
    </variables>
</metadata>
*/

const int ConfigId_midiStartChannel    = 0;
const int ConfigId_midiEndChannel      = 1;
const int ConfigId_midiUseMPE          = 2;
const int ConfigId_octave              = 4;
const int ConfigId_midiChannelRange    = 9;
const int ConfigId_velocitySensitivity = 10;
const int ConfigId_glideSensitivity    = 11;
const int ConfigId_slideSensitivity    = 12;
const int ConfigId_pressureSensitivity = 13;
const int ConfigId_liftSensitivity     = 14;
const int ConfigId_MPEZone             = 40;
const int ConfigId_fixedVelocity       = 15;
const int ConfigId_fixedVelocityValue  = 16;
const int ConfigId_gammaCorrection     = 33;
const int ConfigId_mode                = 20;
const int ConfigId_mode0_pitchEnable   = 102;
const int ConfigId_mode0_pressEnable   = 103;
const int ConfigId_xTrackingMode       = 30;
const int ConfigId_zTrackingMode       = 32;
const int ControlChannel               = 15;
const int CcPaletteIndex               = 102;
const int CcPaletteRed                 = 103;
const int CcPaletteGreen               = 104;
const int CcPaletteBlue                = 105;
const int CcPaletteCommit              = 106;
const int CcActiveRed                  = 107;
const int CcActiveGreen                = 108;
const int CcActiveBlue                 = 109;
const int CcActiveCommit               = 110;
const int CcMainOctave                 = 111;

const int maxKeys = ${keyCount};
int keyChannel[maxKeys];
int keyNoteNumber[maxKeys];
int keyColours[maxKeys];
int pitchColours[12];
int externalKeyStates[maxKeys];
int pendingPaletteIndex;
int pendingPaletteRed;
int pendingPaletteGreen;
int pendingPaletteBlue;
int pendingActiveRed;
int pendingActiveGreen;
int pendingActiveBlue;

const int numButtons = 3;
bool buttonDown[numButtons];

int scaleMidiColour(int value)
{
    return clamp(0, 255, (value * 255) / 127);
}

int makeLiveSyncColour(int red, int green, int blue)
{
    return makeARGB(255,
                    scaleMidiColour(red),
                    scaleMidiColour(green),
                    scaleMidiColour(blue));
}

void initialisePitchColours()
{
    pitchColours[0] = C;
    pitchColours[1] = C_;
    pitchColours[2] = D;
    pitchColours[3] = D_;
    pitchColours[4] = E;
    pitchColours[5] = F;
    pitchColours[6] = F_;
    pitchColours[7] = G;
    pitchColours[8] = G_;
    pitchColours[9] = A;
    pitchColours[10] = A_;
    pitchColours[11] = B;
}

void refreshKeyColours()
{
    for (int i = 0; i < maxKeys; ++i)
        keyColours[i] = pitchColours[i % 12];
}

void clearExternalNotes()
{
    for (int i = 0; i < maxKeys; ++i)
        externalKeyStates[i] = 0;
}

void setAppMainOctave(int appMainOctave)
{
    int octave = clamp(-4, 6, appMainOctave - 4);

    setLocalConfig(ConfigId_octave, octave);
    clearExternalNotes();
}

void setPitchColour(int index, int colour)
{
    if (index < 0 || index > 11)
        return;

    pitchColours[index] = colour;
    refreshKeyColours();
}

void setExternalKeyState(int noteNumber, int velocity)
{
    int keyIndex = getKeyForNote(noteNumber);

    if (keyIndex < 0 || keyIndex >= maxKeys)
        return;

    externalKeyStates[keyIndex] = velocity;
}

void initialise()
{
    setUseDefaultKeyHandler(false, false);

    setLocalConfigActiveState(ConfigId_midiStartChannel, true, true);
    setLocalConfigActiveState(ConfigId_midiEndChannel, true, true);
    setLocalConfigActiveState(ConfigId_midiUseMPE, true, true);
    setLocalConfigActiveState(ConfigId_octave, true, true);
    setLocalConfigActiveState(ConfigId_midiChannelRange, true, true);
    setLocalConfigActiveState(ConfigId_MPEZone, true, true);
    setLocalConfigActiveState(ConfigId_velocitySensitivity, true, true);
    setLocalConfigActiveState(ConfigId_glideSensitivity, false, false);
    setLocalConfigActiveState(ConfigId_pressureSensitivity, true, true);
    setLocalConfigActiveState(ConfigId_liftSensitivity, true, true);
    setLocalConfigActiveState(ConfigId_mode0_pitchEnable, true, true);
    setLocalConfigActiveState(ConfigId_mode0_pressEnable, true, true);
    setLocalConfigActiveState(ConfigId_xTrackingMode, true, true);
    setLocalConfigActiveState(ConfigId_zTrackingMode, true, true);

    setLocalConfigItemRange(ConfigId_octave, -4, 6);
    setLocalConfig(ConfigId_gammaCorrection, 1);
    setLocalConfig(ConfigId_mode, 0);
    setLocalConfigActiveState(ConfigId_MPEZone, true, true);

    initialisePitchColours();
    refreshKeyColours();
    clearExternalNotes();

    for (int i = 0; i < maxKeys; ++i)
    {
        keyChannel[i] = -1;
        keyNoteNumber[i] = -1;
    }

    clearDisplay();
    fillPixel(0xFFFFFFFF, 0, 1);
    fillPixel(0xFFFFFFFF, 1, 1);
}

int getColour(int note)
{
    return pitchColours[note % 12];
}

void repaint()
{
    for (int i = 0; i < maxKeys; ++i)
        fillPixel(getKeyColour(i), i, 0);
}

int getKeyColour(int index)
{
    int keyColour = keyColours[index];

    if (keyNoteNumber[index] >= 0 || externalKeyStates[index] > 0)
        return activeColour;

    return keyColour;
}

void keyStrike(int keyIndex, int z, int velocity)
{
    int noteNumber = getNoteForKey(keyIndex);
    int channel = assignChannel(noteNumber);

    sendNoteOn(channel, noteNumber, velocity);

    keyChannel[keyIndex] = channel;
    keyNoteNumber[keyIndex] = noteNumber;
}

void keyPress(int keyIndex, int z, int velocity)
{
    int channel = keyChannel[keyIndex];
    int noteNumber = keyNoteNumber[keyIndex];

    if (channel == -1 || noteNumber == -1)
        return;

    int pressure = clamp(0, 127, z);
    sendMIDI(0xd0 | channel, pressure);
}

void keyLift(int keyIndex, int z, int velocity)
{
    int channel = keyChannel[keyIndex];
    int noteNumber = keyNoteNumber[keyIndex];

    sendNoteOff(channel, noteNumber, velocity);
    deassignChannel(noteNumber, channel);

    keyChannel[keyIndex] = -1;
    keyNoteNumber[keyIndex] = -1;
}

void keyMove(int keyIndex, int x, int z)
{
    int channel = keyChannel[keyIndex];

    if (channel == -1)
        return;

    if (getLocalConfig(ConfigId_mode0_pitchEnable) == 1)
        sendPitchBend(channel, x);
}

void handleMIDI(int byte0, int byte1, int byte2)
{
    int status = byte0 & 0xF0;
    int channel = byte0 & 0x0F;

    if (status == 0x90 && byte2 == 0)
        status = 0x80;

    if (status == 0x90)
    {
        setExternalKeyState(byte1, byte2);
        return;
    }

    if (status == 0x80)
    {
        setExternalKeyState(byte1, 0);
        return;
    }

    if (status != 0xB0 || channel != ControlChannel)
        return;

    if (byte1 == 120 || byte1 == 123)
    {
        clearExternalNotes();
        return;
    }

    if (byte1 == CcPaletteIndex)
    {
        pendingPaletteIndex = byte2;
        return;
    }

    if (byte1 == CcPaletteRed)
    {
        pendingPaletteRed = byte2;
        return;
    }

    if (byte1 == CcPaletteGreen)
    {
        pendingPaletteGreen = byte2;
        return;
    }

    if (byte1 == CcPaletteBlue)
    {
        pendingPaletteBlue = byte2;
        return;
    }

    if (byte1 == CcPaletteCommit)
    {
        setPitchColour(
            pendingPaletteIndex,
            makeLiveSyncColour(
                pendingPaletteRed,
                pendingPaletteGreen,
                pendingPaletteBlue
            )
        );
        return;
    }

    if (byte1 == CcActiveRed)
    {
        pendingActiveRed = byte2;
        return;
    }

    if (byte1 == CcActiveGreen)
    {
        pendingActiveGreen = byte2;
        return;
    }

    if (byte1 == CcActiveBlue)
    {
        pendingActiveBlue = byte2;
        return;
    }

    if (byte1 == CcActiveCommit)
    {
        activeColour = makeLiveSyncColour(
            pendingActiveRed,
            pendingActiveGreen,
            pendingActiveBlue
        );
        return;
    }

    if (byte1 == CcMainOctave)
    {
        setAppMainOctave(byte2);
    }
}

int getKeyForNote(int noteIndex)
{
    return noteIndex - 48 - getTotalOctaveNoteShift();
}

int getNoteForKey(int keyIndex)
{
    return min(127, 48 + keyIndex + getTotalOctaveNoteShift());
}

int getTotalOctaveNoteShift()
{
    return getLocalConfig(ConfigId_octave) * 12;
}

void handleButtonDown(int index)
{
    if (index < numButtons)
    {
        bool isOtherButtonDown = isAnyButtonDown();

        buttonDown[index] = true;

        if (!isOtherButtonDown && (index == 1 || index == 2))
            handleOctaveButtonDown(index);
    }
}

void handleButtonUp(int index)
{
    if (index < numButtons)
        buttonDown[index] = false;
}

bool isAnyButtonDown()
{
    for (int i = 0; i < numButtons; ++i)
    {
        if (buttonDown[i])
            return true;
    }

    return false;
}

void handleOctaveButtonDown(int index)
{
    int octave = getLocalConfig(ConfigId_octave);

    if (index == 1) octave--;
    else if (index == 2) octave++;

    octave = clamp(-4, 6, octave);
    setLocalConfig(ConfigId_octave, octave);
    clearExternalNotes();
}
`;
}
