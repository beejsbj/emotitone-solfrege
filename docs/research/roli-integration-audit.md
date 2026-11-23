# ROLI piano integration: audit, November 2026

A record of where the ROLI integration stood on 2026-11-09, when Burooj got the piano back after nine months of app changes with only fake MIDI ports to test against. Device checks are tracked in BJS-571 (and the older GitHub #81).

## How it works

Two halves talk over plain MIDI.

- **On the piano:** a LittleFoot script the app generates (`generateRoliPianoScript` in `src/services/roliPianoExport.ts`; Settings → MIDI → ROLI → Copy or Download). It lights each key with its pitch class's Music Color, and turns a key white while it is pressed or while the app plays it.
- **In the app:** `src/composables/useMidiControls.ts` finds the first connected output whose name matches `roli|lumi|lightkey|seaboard|blocks` (`roliLiveSync.ts`). It then:
  - sends the 12 pitch-class colours and the active colour as CC 102–110 on channel 16 whenever key, mode or Music Color settings change;
  - sends the on-screen keyboard's main octave as CC 111;
  - mirrors every note the app plays as note on/off on channel 1, timed to when it is heard. This covers on-screen presses, Repeat and Arp pulses, and Looper patterns at their playback level.
- **ROLI → app:** the piano's notes play through the shared performer like any MIDI keyboard. In Together style a ROLI press is not echoed back, because the piano already lights its own key.

## What held up

- **The protocol hasn't changed since March.** The script template is byte-for-byte the March version; only how the palette is computed moved to the OKLCH Music Color core. A script loaded before the trip still speaks the same CCs, and the app re-sends the live palette and octave on connect.
- **Everything playable reaches the piano.** Since March the play styles, the worklet transport and the Looper have all landed, and all of them mirror out. Looper notes go out at the level they're heard (BJS-556), on the performance clock.
- **Queue handling is careful.** Chrome can't clear a MIDI output queue, so the app answers each withdrawn note-on with a timed note-off. Palette packets survive a queue clear. Disconnecting releases every note.
- **Tests:** 82 ROLI and MIDI tests passed on `main` at `76d28df4`.

## Findings

Severity: **gap** = a missing capability the spec asks for; **risk** = a wrong assumption that only the device can confirm or rule out; **polish** = it works but could be better.

| # | Finding | Severity | Disposition |
|---|---|---|---|
| A1 | The app ignored every MIDI message except note-on and note-off: no pitch bend, no sustain pedal, no All Notes Off. Spec story 114 asks for velocity, bend, sustain and per-note expression. | gap | **Fixed** in `08ecfeeb` (bend with RPN 0 and MPE ranges, CC64 sustain, CC120/123). |
| A2 | The engine clamps every bend to ±50 cents (`livePerformance.ts`), so a controller's ±2 semitone bend tops out at a quarter tone. Spec story 115 wants bends that reach the neighbouring semitone. | gap | Burooj's call. It changes touch-bend policy too. |
| A3 | Channel pressure (aftertouch) is still ignored. The script sends it on every press. The engine's only per-note knob is gain (0.25–1.75); mapping pressure to gain would drop the note to a quarter of its level the moment the key settles. | gap | Left out on purpose. Belongs in the brainstorm (pressure → brightness or vibrato needs an engine parameter). |
| A4 | Nothing told the app whether the script was loaded. The panel and loading splash said "Live sync" for any ROLI-named port, even one running factory firmware. | risk | **Fixed** in `685af6fc`. CC112 handshake: the app asks, script protocol 2 answers with its version, and the status says live sync only after that answer. |
| A5 | The octave sync only went one way. The piano's own octave buttons moved its keys, but the app's on-screen octave didn't follow. | polish | **Fixed** in `685af6fc`. The script reports its octave on CC111. |
| A6 | Port detection is by name. If the ROLI Piano shows up under a name without "ROLI" (over Bluetooth, say), there is no sync, and nothing in the UI lets you pick the port by hand. | risk | Check on the device. Add a manual port choice if needed. |
| A7 | Every key lights from a single octave-4 palette, and every press shows the same white. Out-of-scale keys are dark. | polish | Lighting brainstorm. |

## Script check against ROLI's documentation

A separate reviewer compared the generated script with ROLI's sources: the `roli_blocks_basics` repo (protocol definitions, config IDs, block models, the LittleFoot function docs) and ROLI's own `ROLIPianoExample.littlefoot`, which was updated for the 49-key piano in December 2025. The script turns out to be a near-copy of that example; what EmotiTone adds is `handleMIDI`, the external key states and the live-sync CCs.

**Verified fine:**
- every native call and config ID it uses;
- one LED per key, lit with `fillPixel(c, i, 0)`;
- pixels (0,1) and (1,1) are the octave-button lights;
- `handleMIDI` is the hook for MIDI from the host;
- `keyMove`'s x is already a 14-bit bend;
- pressure runs 0–127;
- forward declarations and const-sized arrays are legal;
- the script's arrays (about 844 bytes) fit in the piano's 7200-byte program+heap budget. This one is inferred: nothing was compiled.

| # | Finding | Severity | Disposition |
|---|---|---|---|
| S1 | The app's main octave is the middle on-screen row, but the script put it on the piano's second octave, a whole octave high. | wrong | **Fixed** in `685af6fc`: device octave = main − 5, so octave 4 is C2–C6. |
| S2 | The octave range ran to +6 (copied from ROLI's example). Above +2 the top keys passed MIDI 127 and collapsed onto note 127, so lifting one key ended the others. | wrong | **Fixed** in `685af6fc`: range −4..+2, computed for the key count. |
| S3 | `setUseDefaultKeyHandler(false, false)` makes the script produce all the MIDI itself. That means it always sends channel pressure (the firmware default is poly aftertouch), ignores the tracking modes, and probably bypasses fixed velocity and the pedal. | risk | Device first. The alternative is `setUseDefaultKeyHandler(true, false)`, painting held keys with `isKeyPressed(i)` (added January 2025; the firmware it needs is unverified). |
| S4 | Palette CCs share pending registers, so one dropped CC commits the wrong colour or index. This matters more over Bluetooth. | risk | Deferred. USB is reliable, and the fix (index in the commit value) only covers part of it. |
| S5 | Unverified: whether `handleMIDI` fires over Bluetooth MIDI, and whether the piano echoes host notes back. | unknown | Device check. The app ignores an echoed hello (value 0). |

How the script gets onto the piano is only partly verified. ROLI's December 2025 example says to drag it onto the piano in Dashboard or use BLOCKS Code, and ROLI Dashboard is installed on this Mac. Whether ROLI Connect can also upload LittleFoot was not found.

## Before the first device session

1. Download the script again (Settings → MIDI → ROLI → Download) and load it with ROLI Dashboard. It must be protocol 2: the March copy still lights keys, but it maps octaves wrong and never answers the handshake. The panel should then read "Live sync on: <port> is running the EmotiTone script."
2. Run the checklist in BJS-571, plus these items from this audit:
   - the sustain pedal and any bend on the piano itself (A1, S3);
   - the port name macOS reports, over USB and over Bluetooth (A6, S5);
   - the octave buttons moving the on-screen octave, and the app's main octave sitting in the middle of the piano (A5, S1);
   - top-octave keys each sounding their own note (S2).
