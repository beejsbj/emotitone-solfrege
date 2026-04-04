import { describe, expect, it } from "vitest";
import {
  buildRoliAllNotesOffMessages,
  buildRoliMainOctaveMessage,
  buildRoliNoteOffMessage,
  buildRoliNoteOnMessage,
  buildRoliPaletteUpdateMessages,
  clampRoliAppMainOctave,
  isRoliMidiPortName,
  isVirtualMidiPortName,
  pickPreferredRoliOutput,
  ROLI_SYNC_CONTROL_CHANNEL,
  ROLI_SYNC_CONTROL_STATUS,
  ROLI_SYNC_CCS,
} from "@/services/roliLiveSync";

describe("roliLiveSync", () => {
  it("recognizes ROLI and LUMI MIDI port names", () => {
    expect(isRoliMidiPortName("LUMI Keys BLOCK")).toBe(true);
    expect(isRoliMidiPortName("ROLI Seaboard")).toBe(true);
    expect(isRoliMidiPortName("Scarlett MIDI")).toBe(false);
  });

  it("recognizes common virtual MIDI loopback port names", () => {
    expect(isVirtualMidiPortName("IAC Driver Bus 1")).toBe(true);
    expect(isVirtualMidiPortName("loopMIDI Port")).toBe(true);
    expect(isVirtualMidiPortName("Launchkey Mini MK3")).toBe(false);
  });

  it("prefers a connected ROLI-compatible output", () => {
    const preferred = pickPreferredRoliOutput([
      { name: "Scarlett MIDI", state: "connected" },
      { name: "LUMI Keys BLOCK", state: "connected" },
      { name: "ROLI Seaboard", state: "disconnected" },
    ]);

    expect(preferred).toEqual({
      name: "LUMI Keys BLOCK",
      state: "connected",
    });
  });

  it("builds note and all-notes-off MIDI messages on the requested channels", () => {
    expect(buildRoliNoteOnMessage(60, 96)).toEqual([0x90, 60, 96]);
    expect(buildRoliNoteOffMessage(60, 16)).toEqual([0x8f, 60, 0]);
    expect(buildRoliAllNotesOffMessages(ROLI_SYNC_CONTROL_CHANNEL)).toEqual([
      [0xbf, 120, 0],
      [0xbf, 123, 0],
    ]);
  });

  it("builds and clamps the app-main-octave sync message", () => {
    expect(clampRoliAppMainOctave(0)).toBe(1);
    expect(clampRoliAppMainOctave(9)).toBe(8);
    expect(buildRoliMainOctaveMessage(5)).toEqual([
      ROLI_SYNC_CONTROL_STATUS,
      ROLI_SYNC_CCS.mainOctave,
      5,
    ]);
  });

  it("builds palette update CC messages for all 12 pitch classes plus the active color", () => {
    const messages = buildRoliPaletteUpdateMessages(
      {
        isEnabled: true,
        musicColorMode: "fixed",
        saturation: 0.8,
        baseLightness: 0.5,
        lightnessRange: 0.3,
        hueAnimationAmplitude: 0,
        animationSpeed: 1,
      },
      "C",
      "major"
    );

    expect(messages).toHaveLength(64);
    expect(messages[0]).toEqual([
      ROLI_SYNC_CONTROL_STATUS,
      ROLI_SYNC_CCS.paletteIndex,
      0,
    ]);
    expect(messages[4]).toEqual([
      ROLI_SYNC_CONTROL_STATUS,
      ROLI_SYNC_CCS.paletteCommit,
      127,
    ]);
    expect(messages[messages.length - 1]).toEqual([
      ROLI_SYNC_CONTROL_STATUS,
      ROLI_SYNC_CCS.activeCommit,
      127,
    ]);
    expect(messages.every((message) => message.length === 3)).toBe(true);
  });
});
