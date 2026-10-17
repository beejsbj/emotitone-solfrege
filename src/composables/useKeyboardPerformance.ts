import { computed, onScopeDispose, reactive, watch } from "vue";
import type {
  KeyboardChordIntent,
  KeyboardIntent,
  KeyboardRowView,
} from "@/components/compounds/Keyboard.vue";
import {
  chordMembers,
  degreeLabel,
  type KeyboardChordView,
} from "@/components/compounds/keyboardChords";
import type { NoteSurfaceStyle } from "@/components/primatives/Note.vue";
import { CHROMATIC_NOTES } from "@/data";
import type { HarmonyChord } from "@/domain/harmony";
import { spellPitch } from "@/domain/musicalIdentity";
import { useKeyboardControls } from "@/composables/useKeyboardControls";
import { usePerformer } from "@/composables/usePerformer";
import { getChromaticNoteForScaleIndex } from "@/services/musicColor";
import type { PerformerReleaseReason } from "@/services/performer";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import { triggerNoteHaptic } from "@/utils/hapticFeedback";
import {
  CHORD_ROW_KEYS,
  qwertyNoteMapping,
  qwertyShortcutsByKey,
} from "@/utils/qwertyLayout";

interface ActiveChordSnapshot {
  harmony: HarmonyChord;
  mode: MusicalMode;
  key: ChromaticNote;
  notePitches: string[];
}

const MELODY_OWNER_SCOPE = "melody";
const CHORD_OWNER_SCOPE = "chord";

/**
 * The production container for the Keyboard compound (W3). The compound is a
 * pure view: it renders the props this returns and emits press, release and
 * expression intents. This wires those intents to the performer, builds the
 * rows and chords from the stores, holds each pressed chord's snapshot until
 * its owner ends, and registers the QWERTY layout for the performance surface.
 *
 * Call it once, from the performance surface's setup; its owners end when
 * that scope ends.
 */
export function useKeyboardPerformance() {
  const store = useKeyboardDrawerStore();
  const musicStore = useMusicStore();
  const performer = usePerformer();
  const config = computed(() => store.keyboardConfig);
  const mainOctave = computed(() => config.value.mainOctave);
  const currentMusicKey = computed(() => musicStore.currentKey as ChromaticNote);
  const surfaceStyle = computed<NoteSurfaceStyle>(() =>
    config.value.surfaceStyle === "monochrome" ? "monochrome" : "colored",
  );
  const gap = computed(() => ({
    none: 0,
    small: 2,
    medium: 4,
  })[config.value.keyGaps] ?? 2);
  const activeChordSnapshots = reactive(new Map<string, ActiveChordSnapshot>());
  // The performer can end a chord owner itself (blur, page hide, lock); the
  // held snapshot ends with it.
  const stopFollowingReleases = performer.subscribe((intent) => {
    if (intent.type === "release") activeChordSnapshots.delete(intent.owner);
  });

  // The performance surface, not the Keyboard view, owns the QWERTY layout.
  useKeyboardControls(mainOctave);

  const noteKey = (scaleIndex: number, octave: number) => `${scaleIndex}_${octave}`;
  /** Sharps-only scientific pitch: the internal key the store attacks. */
  const noteName = (scaleIndex: number, octave: number) =>
    musicStore.getNoteName(scaleIndex, octave);
  /** Spelled for the key (Bb4 in F major); labels only, never attacked. */
  const spelledPitch = (pitch: string) => spellPitch(pitch, {
    tonic: currentMusicKey.value,
    mode: musicStore.currentMode,
  }) ?? pitch;
  // Surface tone follows the black-key pitch class, not the spelling (E# is white).
  const isAccidental = (scaleIndex: number, octave: number) =>
    /[#b♯♭]/.test(noteName(scaleIndex, octave));
  const pitchClassIndex = (scaleIndex: number) => {
    const pitch = getChromaticNoteForScaleIndex(
      scaleIndex,
      musicStore.currentMode,
      currentMusicKey.value,
    );
    return pitch ? CHROMATIC_NOTES.indexOf(pitch) : undefined;
  };
  const scientificOctave = (rawPitch: string, fallback: number) => {
    const match = rawPitch.match(/(-?\d+)$/);
    return match ? Number(match[1]) : fallback;
  };
  const soundingNoteKeys = computed(() => new Set(
    musicStore
      .getActiveNotes()
      .map((note) => `${note.solfegeIndex}_${note.keyboardOctave ?? note.octave}`),
  ));
  const chordPressedPitches = computed(() => new Set(
    Array.from(activeChordSnapshots.values()).flatMap((snapshot) => snapshot.notePitches),
  ));
  /** The same layout the QWERTY adapter plays, by on-screen key id. */
  const keyShortcuts = computed(() => qwertyShortcutsByKey(qwertyNoteMapping({
    degreeCount: musicStore.currentScale.degreeCount,
    mainOctave: mainOctave.value,
    visibleOctaves: store.visibleOctaves,
  })));
  const rows = computed<KeyboardRowView[]>(() =>
    store.visibleOctaves.map((octave) => ({
      octave,
      keys: store.solfegeData.map((solfege, scaleIndex) => {
        const id = noteKey(scaleIndex, octave);
        const pitch = noteName(scaleIndex, octave);
        return {
          id,
          syllable: solfege.name,
          degree: degreeLabel(solfege.number),
          rawPitch: spelledPitch(pitch),
          scaleIndex,
          pitchClassIndex: pitchClassIndex(scaleIndex),
          // Physical octave of the sounding pitch (Cb5 sounds in octave 4).
          colorOctave: scientificOctave(pitch, octave),
          mode: musicStore.currentMode,
          musicKey: currentMusicKey.value,
          accidental: isAccidental(scaleIndex, octave),
          keyBrightness: config.value.keyBrightness,
          keySaturation: config.value.keySaturation,
          sounding: store.isVisualNoteActive(id) || soundingNoteKeys.value.has(id),
          pressed: store.isKeyPressed(id) || chordPressedPitches.value.has(pitch),
          shortcut: keyShortcuts.value.get(id),
        };
      }),
    })),
  );

  const chords = computed<KeyboardChordView[]>(() => {
    // The number row presses `chordsAt(mainOctave)[index]` too.
    const liveHarmony = performer.chordsAt(mainOctave.value);
    const snapshots = Array.from(activeChordSnapshots.values());
    const rendered = liveHarmony.map((harmony, index): KeyboardChordView => {
      const snapshot = snapshots.find(
        (candidate) => candidate.harmony.id === harmony.id,
      );
      const displayedHarmony = snapshot?.harmony ?? harmony;
      return {
        attackHarmony: harmony,
        harmony: displayedHarmony,
        members: chordMembers(
          displayedHarmony,
          snapshot?.mode ?? musicStore.currentMode,
          snapshot?.key ?? currentMusicKey.value,
          surfaceStyle.value,
          config.value.primaryLabel,
          config.value.keyBrightness,
          config.value.keySaturation,
          musicStore.laBasedMinor,
        ),
        pressed: Boolean(snapshot) || store.isKeyPressed(`chord:${harmony.id}`),
        orphaned: false,
        shortcut: CHORD_ROW_KEYS[index]?.label,
      };
    });
    const liveIds = new Set(liveHarmony.map((harmony) => harmony.id));
    const orphanSnapshots = snapshots.filter(
      (snapshot, index) => !liveIds.has(snapshot.harmony.id)
        && snapshots.findIndex(
          (candidate) => candidate.harmony.id === snapshot.harmony.id,
        ) === index,
    );

    return rendered.concat(orphanSnapshots.map((snapshot) => ({
      attackHarmony: snapshot.harmony,
      harmony: snapshot.harmony,
      members: chordMembers(
        snapshot.harmony,
        snapshot.mode,
        snapshot.key,
        surfaceStyle.value,
        config.value.primaryLabel,
        config.value.keyBrightness,
        config.value.keySaturation,
        musicStore.laBasedMinor,
      ),
      pressed: true,
      orphaned: true,
    })));
  });

  // Every contact on a key is its own owner with its own voice: two fingers on
  // one key never merge, and each bends only what it plays.
  const melodyOwner = (intent: KeyboardIntent) =>
    `${MELODY_OWNER_SCOPE}:${intent.inputId}:${intent.keyId}`;
  const chordOwner = (intent: KeyboardChordIntent) =>
    `${CHORD_OWNER_SCOPE}:${intent.inputId}:${intent.chordId}`;

  function press(intent: KeyboardIntent) {
    const owner = melodyOwner(intent);
    if (performer.isLocked || performer.isHeld(owner)) return;
    // The performer submits audio before reactive feedback and haptics.
    void performer.press({
      owner,
      kind: "note",
      voices: [{ kind: "degree", scaleIndex: intent.scaleIndex, octave: intent.octave }],
      touchKey: intent.keyId,
    });
    if (intent.source === "pointer" && config.value.hapticFeedback) {
      triggerNoteHaptic();
    }
  }

  function release(intent: KeyboardIntent) {
    performer.release(melodyOwner(intent));
  }

  function pitchBend(intent: KeyboardIntent & { cents: number; sampleTime?: number }) {
    performer.pitchBend(melodyOwner(intent), intent.cents, intent.sampleTime);
  }

  function gainChange(intent: KeyboardIntent & { gain: number; sampleTime?: number }) {
    performer.setGain(melodyOwner(intent), intent.gain, intent.sampleTime);
  }

  function chordPress(intent: KeyboardChordIntent) {
    const owner = chordOwner(intent);
    if (performer.isLocked || performer.isHeld(owner)) return;
    // The chord object is the setting snapshot captured at attack time.
    void performer.press({
      owner,
      kind: "chord",
      voices: intent.chord.voicing.pitches.map((pitch) => ({ kind: "pitch" as const, pitch: pitch.name })),
      touchKey: `chord:${intent.chordId}`,
    });
    activeChordSnapshots.set(owner, {
      harmony: intent.chord,
      mode: musicStore.currentMode,
      key: currentMusicKey.value,
      notePitches: intent.chord.voicing.pitches.map((pitch) => pitch.name),
    });
    if (intent.source === "pointer" && config.value.hapticFeedback) {
      triggerNoteHaptic();
    }
  }

  function chordRelease(intent: KeyboardChordIntent) {
    const owner = chordOwner(intent);
    activeChordSnapshots.delete(owner);
    performer.release(owner);
  }

  function chordPitchBend(intent: KeyboardChordIntent & { cents: number; sampleTime?: number }) {
    performer.pitchBend(chordOwner(intent), intent.cents, intent.sampleTime);
  }

  function chordGainChange(intent: KeyboardChordIntent & { gain: number; sampleTime?: number }) {
    performer.setGain(chordOwner(intent), intent.gain, intent.sampleTime);
  }

  /** Ends every Keyboard owner (pointer, focus, chord row), and only those. */
  function clear(reason: PerformerReleaseReason = "teardown") {
    activeChordSnapshots.clear();
    performer.releaseAllFor(MELODY_OWNER_SCOPE, reason);
    performer.releaseAllFor(CHORD_OWNER_SCOPE, reason);
  }

  const isInteractionLocked = computed(() => performer.isLocked);
  watch(isInteractionLocked, (locked) => {
    if (locked) clear("locked");
  });

  onScopeDispose(() => {
    clear();
    stopFollowingReleases();
  });

  /** Props for the Keyboard view (add `availableHeight` from the host). */
  const view = computed(() => ({
    usage: "production" as const,
    rows: rows.value,
    chords: chords.value,
    mainOctave: mainOctave.value,
    tonic: currentMusicKey.value,
    scaleType: musicStore.currentMode,
    primaryLabel: config.value.primaryLabel,
    showLabels: config.value.showLabels,
    keyboardPadding: config.value.keyboardPadding,
    surfaceStyle: surfaceStyle.value,
    gap: gap.value,
    interactionLocked: isInteractionLocked.value,
  }));

  return {
    view,
    press,
    release,
    pitchBend,
    gainChange,
    chordPress,
    chordRelease,
    chordPitchBend,
    chordGainChange,
    clear,
  };
}

export type KeyboardPerformance = ReturnType<typeof useKeyboardPerformance>;
