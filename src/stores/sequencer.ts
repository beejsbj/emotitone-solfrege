import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  SequencerBeat,
  SavedMelody,
  SequencerConfig,
  MelodicPattern,
} from "@/types/music";
import { useMusicStore } from "@/stores/music";
import { getAllMelodicPatterns } from "@/data";
import * as Tone from "tone";

export const useSequencerStore = defineStore(
  "sequencer",
  () => {
    // State
    const beats = ref<SequencerBeat[]>([]);
    const savedMelodies = ref<SavedMelody[]>([]);
    const config = ref<SequencerConfig>({
      steps: 16,
      rings: 7, // 7 rings for Do, Re, Mi, Fa, Sol, La, Ti
      tempo: 120,
      baseOctave: 4,
      isPlaying: false,
      currentStep: 0,
    });

    // Playback state
    const currentlyPlaying = ref<string | null>(null);
    const currentScheduleIds = ref<number[]>([]);

    // Getters
    const beatCount = computed(() => beats.value.length);
    const isPlaying = computed(() => config.value.isPlaying);
    const currentStep = computed(() => config.value.currentStep);
    const tempo = computed(() => config.value.tempo);
    const baseOctave = computed(() => config.value.baseOctave);
    const steps = computed(() => config.value.steps);

    // Get melodic patterns from data
    const melodicPatterns = computed(() => getAllMelodicPatterns());

    // Beat management
    function addBeat(beat: SequencerBeat) {
      beats.value.push(beat);
    }

    function removeBeat(beatId: string) {
      const index = beats.value.findIndex((beat) => beat.id === beatId);
      if (index > -1) {
        beats.value.splice(index, 1);
      }
    }

    function updateBeat(beatId: string, updates: Partial<SequencerBeat>) {
      const index = beats.value.findIndex((beat) => beat.id === beatId);
      if (index > -1) {
        beats.value[index] = { ...beats.value[index], ...updates };
      }
    }

    function clearBeats() {
      beats.value = [];
    }

    function setBeats(newBeats: SequencerBeat[]) {
      beats.value = [...newBeats];
    }

    // Config management
    function updateConfig(updates: Partial<SequencerConfig>) {
      config.value = { ...config.value, ...updates };
    }

    function setTempo(newTempo: number) {
      updateConfig({ tempo: newTempo });
    }

    function setBaseOctave(newOctave: number) {
      updateConfig({ baseOctave: newOctave });
    }

    function setCurrentStep(step: number) {
      updateConfig({ currentStep: step });
    }

    function setIsPlaying(playing: boolean) {
      updateConfig({ isPlaying: playing });
    }

    // Pattern loading
    function loadPattern(pattern: MelodicPattern) {
      const musicStore = useMusicStore();
      const newBeats: SequencerBeat[] = [];
      let stepPosition = 0;

      pattern.sequence.forEach((noteData, index) => {
        const solfegeName = noteData.note;
        const solfegeIndex = musicStore.solfegeData.findIndex(
          (s) => s.name === solfegeName
        );

        // Only use the first 7 solfege notes (exclude Do' if present)
        if (solfegeIndex >= 0 && solfegeIndex < 7) {
          // Convert duration from Tone.js notation to step duration
          const noteDuration = noteData.duration;
          let stepDuration = 1; // Default to 1 step

          // Convert common durations to step lengths (assuming 16 steps = 1 bar)
          switch (noteDuration) {
            case "1n":
              stepDuration = 16;
              break; // Whole note
            case "2n":
              stepDuration = 8;
              break; // Half note
            case "4n":
              stepDuration = 4;
              break; // Quarter note
            case "8n":
              stepDuration = 2;
              break; // Eighth note
            case "16n":
              stepDuration = 1;
              break; // Sixteenth note
            case "32n":
              stepDuration = 0.5;
              break; // Thirty-second note (rare)
            default:
              stepDuration = 1;
              break; // Default to sixteenth note
          }

          // Ensure step duration is at least 1 and fits in remaining steps
          stepDuration = Math.max(1, Math.floor(stepDuration));

          const beat: SequencerBeat = {
            id: `pattern-${Date.now()}-${index}`,
            ring: 6 - solfegeIndex, // Reverse for visual representation (outer ring = higher notes)
            step: stepPosition,
            duration: stepDuration,
            solfegeName,
            solfegeIndex,
            octave: config.value.baseOctave,
          };
          newBeats.push(beat);

          // Move to next position based on the actual duration
          stepPosition += stepDuration;

          // Ensure we don't exceed the sequence length
          if (stepPosition >= config.value.steps) {
            stepPosition = stepPosition % config.value.steps;
          }
        }
      });

      setBeats(newBeats);
    }

    // Pattern playback (for melody library preview)
    async function playPattern(pattern: MelodicPattern): Promise<void> {
      if (currentlyPlaying.value === pattern.name) return;

      try {
        await Tone.start();
        const transport = Tone.getTransport();
        const musicStore = useMusicStore();

        // Clear any existing playback
        stopPatternPlayback();

        transport.cancel();
        transport.stop();
        transport.position = 0;
        transport.bpm.value = 120;

        currentlyPlaying.value = pattern.name;
        currentScheduleIds.value = [];

        let currentTime = 0;

        pattern.sequence.forEach((noteData, index) => {
          const solfegeName = noteData.note;
          const duration = noteData.duration;

          // Find the solfege index
          const solfegeIndex = musicStore.solfegeData.findIndex(
            (s) => s.name === solfegeName
          );

          if (solfegeIndex >= 0) {
            // Calculate duration in seconds
            const durationSeconds = Tone.Time(duration).toSeconds();

            // Schedule note play with duration
            const playId = transport.schedule((time) => {
              musicStore.playNoteWithDuration(
                solfegeIndex,
                config.value.baseOctave,
                duration,
                time
              );
            }, currentTime);

            currentScheduleIds.value.push(playId);
            currentTime += durationSeconds;
          }
        });

        // Schedule playback end
        const endId = transport.schedule(() => {
          stopPatternPlayback();
        }, currentTime);

        currentScheduleIds.value.push(endId);
        transport.start();
      } catch (error) {
        console.error("Error playing pattern:", error);
        stopPatternPlayback();
      }
    }

    function stopPatternPlayback() {
      if (!currentlyPlaying.value) return;

      const transport = Tone.getTransport();
      const musicStore = useMusicStore();

      // Clear all scheduled events
      currentScheduleIds.value.forEach((id) => transport.clear(id));
      currentScheduleIds.value = [];

      // Stop transport and release notes
      transport.cancel();
      transport.stop();
      transport.position = 0;

      musicStore.releaseAllNotes();
      currentlyPlaying.value = null;
    }

    // Melody management
    function saveMelody(
      name: string,
      description: string,
      emotion: string
    ): SavedMelody {
      const melody: SavedMelody = {
        id: `melody-${Date.now()}`,
        name,
        description,
        emotion,
        beats: [...beats.value],
        tempo: config.value.tempo,
        baseOctave: config.value.baseOctave,
        steps: config.value.steps,
        createdAt: new Date(),
        modifiedAt: new Date(),
      };

      savedMelodies.value.push(melody);
      return melody;
    }

    function loadMelody(melodyId: string) {
      const melody = savedMelodies.value.find((m) => m.id === melodyId);
      if (melody) {
        setBeats(melody.beats);
        updateConfig({
          tempo: melody.tempo,
          baseOctave: melody.baseOctave,
          steps: melody.steps,
        });
      }
    }

    function deleteMelody(melodyId: string) {
      const index = savedMelodies.value.findIndex((m) => m.id === melodyId);
      if (index > -1) {
        savedMelodies.value.splice(index, 1);
      }
    }

    function updateMelody(melodyId: string, updates: Partial<SavedMelody>) {
      const index = savedMelodies.value.findIndex((m) => m.id === melodyId);
      if (index > -1) {
        savedMelodies.value[index] = {
          ...savedMelodies.value[index],
          ...updates,
          modifiedAt: new Date(),
        };
      }
    }

    // Sequencer playback control
    function startPlayback() {
      setIsPlaying(true);
      setCurrentStep(0);
    }

    function stopPlayback() {
      setIsPlaying(false);
      setCurrentStep(0);
    }

    function reset() {
      stopPlayback();
      clearBeats();
    }

    return {
      // State
      beats: computed(() => beats.value),
      savedMelodies: computed(() => savedMelodies.value),
      config: computed(() => config.value),
      currentlyPlaying: computed(() => currentlyPlaying.value),

      // Getters
      beatCount,
      isPlaying,
      currentStep,
      tempo,
      baseOctave,
      steps,
      melodicPatterns,

      // Beat management
      addBeat,
      removeBeat,
      updateBeat,
      clearBeats,
      setBeats,

      // Config management
      updateConfig,
      setTempo,
      setBaseOctave,
      setCurrentStep,
      setIsPlaying,

      // Pattern management
      loadPattern,
      playPattern,
      stopPatternPlayback,

      // Melody management
      saveMelody,
      loadMelody,
      deleteMelody,
      updateMelody,

      // Playback control
      startPlayback,
      stopPlayback,
      reset,
    };
  },
  {
    persist: true,
  }
);
