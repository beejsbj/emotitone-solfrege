/**
 * String Rendering System
 * Handles vibrating string visualization with realistic physics
 */

import { ref, watch } from "vue";
import type {
  VibratingStringConfig,
  StringConfig,
  AnimationConfig,
} from "@/types/visual";
import { useMusicColor } from "../useMusicColor";
import {
  createVisualFrequency,
  createHarmonicVibration,
  createStringDamping,
} from "@/utils/visualEffects";
import { useMusicStore } from "@/stores/music";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useVisualConfigStore } from "@/stores/visualConfig";
import useGSAP from "../useGSAP";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import type { StageAudioFrame } from "./stageRuntime";

export function useStringRenderer() {
  const {
    getPrimaryColor,
    getStaticPrimaryColor,
    getPrimaryColorByScaleIndex,
  } = useMusicColor({ animated: true });
  const { gsap } = useGSAP();
  const musicStore = useMusicStore();
  const keyboardDrawerStore = useKeyboardDrawerStore();
  const visualConfigStore = useVisualConfigStore();

  // String state
  const strings = ref<VibratingStringConfig[]>([]);

  // Cache the last canvas size for reinitialization
  let lastCanvasWidth = 0;
  let lastCanvasHeight = 0;

  // Event-based activation for sequencer notes
  const eventActivatedStrings = ref(
    new Map<
      string,
      {
        solfegeIndex: number;
        frequency: number;
        octave: number;
        mode: MusicalMode;
        key: ChromaticNote;
        pitchClassIndex?: number;
        endTime: number | null;
      }
    >()
  );

  const getStringActivationKey = (solfegeIndex: number, octave: number) =>
    `${solfegeIndex}_${octave}`;

  /**
   * Initialize string configurations
   */
  const initializeStrings = (
    stringConfig: StringConfig,
    canvasWidth: number,
    _canvasHeight: number,
    solfegeData: any[]
  ) => {
    if (!stringConfig.isEnabled) return;

    // Cache canvas size for reactive updates
    lastCanvasWidth = canvasWidth;
    lastCanvasHeight = _canvasHeight;

    // Get visible octaves from keyboard drawer store
    const visibleOctaves = keyboardDrawerStore.visibleOctaves;
    const scaleDegreesCount = solfegeData.length;

    // Create strings for each scale degree in each visible octave
    const stringsToCreate: VibratingStringConfig[] = [];

    // Group by octave first, then distribute scale degrees within each group
    // Cluster by scale degree: for each degree, group all octaves together
    solfegeData.forEach((solfege, degreeIndex) => {
      // Center of this group (leftmost = degree 0)
      const usableWidth = canvasWidth * 1.15; // How much space for groups
      const leftMargin = (canvasWidth - usableWidth) / 2; // Center them
      const groupCenter =
        (usableWidth / (scaleDegreesCount + 1)) * (degreeIndex + 1) +
        leftMargin;

      visibleOctaves.forEach((octave, octaveIndex) => {
        let x;
        if (stringConfig.octaveOffset === 0) {
          x = groupCenter;
        } else {
          // Offset each octave within the group
          const configuredMainIndex = visibleOctaves.indexOf(
            keyboardDrawerStore.keyboardConfig.mainOctave,
          );
          const mainOctaveIndex = configuredMainIndex >= 0
            ? configuredMainIndex
            : Math.floor(visibleOctaves.length / 2);
          const octaveOffsetDirection = octaveIndex - mainOctaveIndex;
          x = groupCenter + octaveOffsetDirection * stringConfig.octaveOffset;
        }
        stringsToCreate.push({
          x,
          baseY: 0,
          amplitude: 0,
          frequency: 1,
          phase: Math.random() * Math.PI * 2,
          color: getPrimaryColorByScaleIndex(
            degreeIndex,
            musicStore.currentMode,
            musicStore.currentKey as any,
            octave
          ),
          opacity: stringConfig.baseOpacity,
          isActive: false,
          noteIndex: degreeIndex,
          octave: octave,
        });
      });
    });

    strings.value = stringsToCreate;
  };

  /**
   * Reinitialize strings when configuration changes
   */
  const reinitializeStrings = () => {
    if (lastCanvasWidth > 0 && lastCanvasHeight > 0) {
      initializeStrings(
        visualConfigStore.effectiveConfig.strings,
        lastCanvasWidth,
        lastCanvasHeight,
        musicStore.solfegeData
      );
    }
  };

  // Watch for changes that should trigger reinitialization
  watch(
    [
      () => visualConfigStore.effectiveConfig.strings.octaveOffset,
      () => keyboardDrawerStore.keyboardConfig.mainOctave,
      () => keyboardDrawerStore.keyboardConfig.rowCount,
      () => musicStore.currentKey,
      () => musicStore.currentMode,
    ],
    () => {
      reinitializeStrings();
    },
    { deep: true }
  );

  /**
   * Handle note played events (for sequencer integration)
   */
  const handleNotePlayed = (event: CustomEvent) => {
    const {
      solfegeIndex,
      frequency,
      octave,
      keyboardOctave,
      duration,
      durationMs: eventDurationMs,
      noteId,
      mode,
      key,
      pitchClassIndex,
    } = event.detail;
    const activationOctave = keyboardOctave ?? octave;

    if (
      solfegeIndex !== undefined
      && frequency
      && typeof activationOctave === "number"
    ) {
      // Calculate end time based on duration or default to 500ms
      let durationMs = 500; // Default duration

      if (typeof eventDurationMs === "number") {
        durationMs = eventDurationMs;
      } else if (duration) {
        // Convert Tone.js duration to milliseconds (rough approximation)
        const durationMap: Record<string, number> = {
          "1n": 2000, // whole note
          "2n": 1000, // half note
          "4n": 500, // quarter note
          "8n": 250, // eighth note
          "16n": 125, // sixteenth note
          "32n": 62.5, // thirty-second note
        };
        durationMs = durationMap[duration] || 500;
      }

      const hasExplicitDuration = typeof eventDurationMs === "number" || Boolean(duration);
      const endTime = noteId && !hasExplicitDuration
        ? null
        : Date.now() + durationMs;

      // Add to event-activated strings
      eventActivatedStrings.value.set(
        noteId ?? getStringActivationKey(solfegeIndex, activationOctave),
        {
          solfegeIndex,
          frequency,
          octave: activationOctave,
          mode: (mode ?? musicStore.currentMode) as MusicalMode,
          key: (key ?? musicStore.currentKey) as ChromaticNote,
          pitchClassIndex,
          endTime,
        },
      );
    }
  };

  const handleNoteReleased = (event: CustomEvent) => {
    const noteId = event.detail?.noteId;
    if (noteId) eventActivatedStrings.value.delete(noteId);
  };

  /**
   * Clean up expired event activations
   */
  const cleanupExpiredActivations = () => {
    const now = Date.now();
    for (const [
      activationKey,
      activation,
    ] of eventActivatedStrings.value.entries()) {
      if (activation.endTime !== null && now > activation.endTime) {
        eventActivatedStrings.value.delete(activationKey);
      }
    }
  };

  /**
   * Update string properties based on current note
   */
  const updateStringProperties = (
    stringConfig: StringConfig,
    animationConfig: AnimationConfig,
    musicStore: any,
    audioFrame: StageAudioFrame = { envelope: 1, hasSignal: true },
    reducedMotion = false,
  ) => {
    // Clean up expired event activations
    cleanupExpiredActivations();

    strings.value.forEach((string) => {
      const solfege = musicStore.solfegeData[string.noteIndex];
      if (!solfege) return;

      // Check if this string's note is currently active for its specific octave (from direct input)
      const activeNotes = musicStore.getActiveNotes();
      const stringPitchClass = resolveStringPitchClass(
        string.noteIndex,
        musicStore.currentMode,
        musicStore.currentKey,
      );
      const matchingActiveNote = activeNotes.find((activeNote: any) => {
        const activePitchClass = activeNote.pitchClassIndex;
        const pitchMatches = typeof activePitchClass === "number"
          ? activePitchClass === stringPitchClass
          : activeNote.solfegeIndex === string.noteIndex;
        return pitchMatches
          && (activeNote.keyboardOctave ?? activeNote.octave) === string.octave;
      });
      const isStringActiveFromInput = Boolean(matchingActiveNote);

      // Check if this string is activated by sequencer events (for the specific octave)
      const eventActivation = Array.from(eventActivatedStrings.value.values()).find(
        (activation) =>
          (typeof activation.pitchClassIndex === "number"
            ? activation.pitchClassIndex === stringPitchClass
            : activation.solfegeIndex === string.noteIndex)
          && activation.octave === string.octave,
      );
      const isStringActiveFromEvent =
        eventActivation &&
        (eventActivation.endTime === null || Date.now() <= eventActivation.endTime) &&
        eventActivation.octave === string.octave;

      const isStringActive = isStringActiveFromInput || isStringActiveFromEvent;

      // Update string properties based on active notes
      if (isStringActive) {
        string.isActive = true;
        const targetAmplitude = reducedMotion
          ? 0
          : stringConfig.maxAmplitude * audioFrame.envelope;
        string.amplitude = reducedMotion
          ? 0
          : gsap.utils.interpolate(
              string.amplitude,
              targetAmplitude,
              stringConfig.interpolationSpeed
            );
        string.opacity = reducedMotion
          ? stringConfig.activeOpacity
          : gsap.utils.interpolate(
              string.opacity,
              stringConfig.activeOpacity,
              stringConfig.opacityInterpolationSpeed
            );
        const noteMode = (matchingActiveNote?.mode ??
          eventActivation?.mode ??
          musicStore.currentMode) as MusicalMode;
        const noteKey = (matchingActiveNote?.key ??
          eventActivation?.key ??
          musicStore.currentKey) as ChromaticNote;
        string.color = (reducedMotion ? getStaticPrimaryColor : getPrimaryColor)(
          solfege.name,
          noteMode,
          string.octave,
          noteKey
        );

        // Determine frequency for visual vibration
        let visualFrequency;

        if (isStringActiveFromInput) {
          // Use the frequency from the matching octave note
          visualFrequency =
            matchingActiveNote?.frequency ||
            musicStore.getNoteFrequency(string.noteIndex, string.octave);
        } else if (eventActivation) {
          // Use frequency from event activation (sequencer)
          visualFrequency = eventActivation.frequency;
        } else {
          // Fallback
          visualFrequency = musicStore.getNoteFrequency(
            string.noteIndex,
            string.octave
          );
        }

        string.frequency = createVisualFrequency(
          visualFrequency,
          animationConfig.visualFrequencyDivisor
        );
      } else {
        string.isActive = false;
        string.amplitude = reducedMotion
          ? 0
          : gsap.utils.interpolate(
              string.amplitude,
              0,
              stringConfig.dampingFactor
            );
        string.opacity = reducedMotion
          ? stringConfig.baseOpacity
          : gsap.utils.interpolate(
              string.opacity,
              stringConfig.baseOpacity,
              0.05
            );

        // Keep a subtle base frequency when inactive
        const noteFrequency = musicStore.getNoteFrequency(
          string.noteIndex,
          string.octave
        );
        string.frequency = createVisualFrequency(noteFrequency, 200);
      }
    });
  };

  /**
   * Render strings
   */
  const renderStrings = (
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    canvasHeight: number,
    reducedMotion = false,
  ) => {
    if (!ctx) return;

    strings.value.forEach((string) => {
      if (!ctx) return;

      ctx.globalAlpha = string.opacity;
      ctx.strokeStyle = string.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Create vibrating line with realistic frequency-based movement
      const segments = 100;
      for (let i = 0; i <= segments; i++) {
        const y = i * (canvasHeight / segments);
        const normalizedY = y / canvasHeight;

        // Create harmonic vibration
        const totalVibration = createHarmonicVibration(
          reducedMotion ? 0 : elapsed,
          string.frequency,
          string.amplitude,
          y,
          string.phase
        );

        // Apply damping effect towards the ends (like a real string fixed at both ends)
        const damping = createStringDamping(normalizedY);
        const dampedVibration = totalVibration * damping;

        const x = string.x + dampedVibration;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Add glow effect for active strings
      if (string.isActive && string.amplitude > 5) {
        ctx.shadowColor = string.color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
    });
  };

  /**
   * Get active string count
   */
  const getActiveStringCount = () => {
    return strings.value.filter((string) => string.isActive).length;
  };

  /**
   * Clear all strings
   */
  const clearAllStrings = () => {
    strings.value = [];
    eventActivatedStrings.value.clear();
  };

  /**
   * Add event listeners for sequencer integration
   */
  const addEventListeners = () => {
    window.addEventListener("note-played", handleNotePlayed as EventListener);
    window.addEventListener("note-released", handleNoteReleased as EventListener);
  };

  /**
   * Remove event listeners
   */
  const removeEventListeners = () => {
    window.removeEventListener(
      "note-played",
      handleNotePlayed as EventListener
    );
    window.removeEventListener(
      "note-released",
      handleNoteReleased as EventListener
    );
  };

  return {
    // State
    strings,

    // Methods
    initializeStrings,
    updateStringProperties,
    renderStrings,
    getActiveStringCount,
    clearAllStrings,

    // Event system
    addEventListeners,
    removeEventListeners,
    handleNotePlayed,
    handleNoteReleased,
  };
}

function resolveStringPitchClass(
  degreeIndex: number,
  mode: MusicalMode,
  key: ChromaticNote,
) {
  const scale = getScaleForMode(mode);
  const tonic = CHROMATIC_NOTES.indexOf(key);
  return (tonic + (scale.intervals[degreeIndex] ?? 0) + 12) % 12;
}
