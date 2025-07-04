import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  SequencerBeat,
  SequencerInstance,
  MultiSequencerConfig,
  MultiSequencerProject,
} from "@/types/music";
import { SEQUENCER_ICONS } from "@/data";

export const useSequencerStore = defineStore(
  "sequencer",
  () => {
    // Add flag to track if we've been restored from persistence
    const hasInitialized = ref(false);

    // Global state
    const sequencers = ref<SequencerInstance[]>([]);
    const config = ref<MultiSequencerConfig>({
      tempo: 120,
      steps: 16,
      rings: 7,
      globalIsPlaying: false,
      activeSequencerId: null,
    });

    // Computed
    const activeSequencer = computed(
      () =>
        sequencers.value.find((s) => s.id === config.value.activeSequencerId) ||
        null
    );

    const playingSequencers = computed(() =>
      sequencers.value.filter((s) => s.isPlaying && !s.isMuted)
    );

    const unmutedSequencers = computed(() =>
      sequencers.value.filter((s) => !s.isMuted)
    );

    // Sequencer management
    const createSequencer = (name?: string, instrument?: string) => {
      const newSequencer: SequencerInstance = {
        id: `seq-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: name || "", // Empty string means use auto-generated name
        instrument: instrument || "piano", // Default to Salamander Piano
        octave: 4,
        beats: [],
        isPlaying: false,
        currentStep: 0,
        isMuted: false,
        volume: 1,
        icon: SEQUENCER_ICONS[sequencers.value.length % SEQUENCER_ICONS.length],
        color: undefined,
      };

      sequencers.value.push(newSequencer);
      config.value.activeSequencerId = newSequencer.id;
      return newSequencer;
    };

    const deleteSequencer = (id: string) => {
      const index = sequencers.value.findIndex((s) => s.id === id);
      if (index > -1) {
        sequencers.value.splice(index, 1);
        // Update active sequencer if needed
        if (config.value.activeSequencerId === id) {
          config.value.activeSequencerId = sequencers.value[0]?.id || null;
        }
      }
    };

    const updateSequencer = (
      id: string,
      updates: Partial<SequencerInstance>
    ) => {
      const index = sequencers.value.findIndex((s) => s.id === id);
      if (index > -1) {
        sequencers.value[index] = { ...sequencers.value[index], ...updates };
      }
    };

    const setActiveSequencer = (id: string) => {
      console.log("setActiveSequencer called with:", id);
      console.log("Current activeSequencerId:", config.value.activeSequencerId);

      if (id === "" || id === null) {
        // Clear active sequencer
        console.log("Clearing active sequencer");
        config.value.activeSequencerId = null;
      } else if (sequencers.value.find((s) => s.id === id)) {
        // Set valid sequencer as active
        console.log("Setting active sequencer to:", id);
        config.value.activeSequencerId = id;
      } else {
        console.log("Invalid sequencer ID, not setting");
      }

      console.log("New activeSequencerId:", config.value.activeSequencerId);
    };

    const duplicateSequencer = (id: string) => {
      const source = sequencers.value.find((s) => s.id === id);
      if (!source) return null;

      const duplicate = createSequencer(
        `${source.name} Copy`,
        source.instrument
      );

      // Copy all properties except id
      updateSequencer(duplicate.id, {
        octave: source.octave,
        beats: source.beats.map((beat) => ({
          ...beat,
          id: `beat-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        })),
        volume: source.volume,
        icon: source.icon,
        color: source.color,
      });

      return duplicate;
    };

    // Beat management for specific sequencer
    const addBeatToSequencer = (sequencerId: string, beat: SequencerBeat) => {
      const sequencerIndex = sequencers.value.findIndex(
        (s) => s.id === sequencerId
      );
      if (sequencerIndex > -1) {
        // Create a new array to ensure reactivity
        sequencers.value[sequencerIndex] = {
          ...sequencers.value[sequencerIndex],
          beats: [...sequencers.value[sequencerIndex].beats, beat],
        };
      }
    };

    const removeBeatFromSequencer = (sequencerId: string, beatId: string) => {
      const sequencerIndex = sequencers.value.findIndex(
        (s) => s.id === sequencerId
      );
      if (sequencerIndex > -1) {
        const beatIndex = sequencers.value[sequencerIndex].beats.findIndex(
          (b) => b.id === beatId
        );
        if (beatIndex > -1) {
          // Create a new array to ensure reactivity
          const newBeats = [...sequencers.value[sequencerIndex].beats];
          newBeats.splice(beatIndex, 1);
          sequencers.value[sequencerIndex] = {
            ...sequencers.value[sequencerIndex],
            beats: newBeats,
          };
        }
      }
    };

    const updateBeatInSequencer = (
      sequencerId: string,
      beatId: string,
      updates: Partial<SequencerBeat>
    ) => {
      const sequencerIndex = sequencers.value.findIndex(
        (s) => s.id === sequencerId
      );
      if (sequencerIndex > -1) {
        const beatIndex = sequencers.value[sequencerIndex].beats.findIndex(
          (b) => b.id === beatId
        );
        if (beatIndex > -1) {
          // Create new arrays to ensure reactivity
          const newBeats = [...sequencers.value[sequencerIndex].beats];
          newBeats[beatIndex] = { ...newBeats[beatIndex], ...updates };
          sequencers.value[sequencerIndex] = {
            ...sequencers.value[sequencerIndex],
            beats: newBeats,
          };
        }
      }
    };

    const clearBeatsInSequencer = (sequencerId: string) => {
      const sequencerIndex = sequencers.value.findIndex(
        (s) => s.id === sequencerId
      );
      if (sequencerIndex > -1) {
        sequencers.value[sequencerIndex] = {
          ...sequencers.value[sequencerIndex],
          beats: [],
        };
      }
    };

    // Global configuration
    const setTempo = (tempo: number) => {
      config.value.tempo = tempo;
    };

    const setSteps = (steps: number) => {
      config.value.steps = steps;
    };

    // Global playback coordination
    const startAllSequencers = async () => {
      config.value.globalIsPlaying = true;
      sequencers.value.forEach((seq) => {
        if (!seq.isMuted && seq.beats.length > 0) {
          seq.isPlaying = true;
          seq.currentStep = 0;
        }
      });
    };

    const stopAllSequencers = () => {
      config.value.globalIsPlaying = false;
      sequencers.value.forEach((seq) => {
        seq.isPlaying = false;
        seq.currentStep = 0;
      });
    };

    // Individual sequencer playback
    const startSequencer = (id: string) => {
      const sequencer = sequencers.value.find((s) => s.id === id);
      if (sequencer && !sequencer.isMuted && sequencer.beats.length > 0) {
        sequencer.isPlaying = true;
        sequencer.currentStep = 0;
      }
    };

    const stopSequencer = (id: string) => {
      const sequencer = sequencers.value.find((s) => s.id === id);
      if (sequencer) {
        sequencer.isPlaying = false;
        sequencer.currentStep = 0;
      }
    };

    const toggleSequencerMute = (id: string) => {
      const sequencer = sequencers.value.find((s) => s.id === id);
      if (sequencer) {
        sequencer.isMuted = !sequencer.isMuted;
        if (sequencer.isMuted && sequencer.isPlaying) {
          stopSequencer(id);
        }
      }
    };

    const setSequencerVolume = (id: string, volume: number) => {
      const sequencer = sequencers.value.find((s) => s.id === id);
      if (sequencer) {
        sequencer.volume = Math.max(0, Math.min(1, volume));
      }
    };

    const updateSequencerStep = (id: string, step: number) => {
      const sequencer = sequencers.value.find((s) => s.id === id);
      if (sequencer) {
        sequencer.currentStep = step;
      }
    };

    // Project management
    const saveProject = (
      name: string,
      description: string,
      emotion: string
    ): MultiSequencerProject => {
      const project: MultiSequencerProject = {
        id: `project-${Date.now()}`,
        name,
        description,
        emotion,
        sequencers: JSON.parse(JSON.stringify(sequencers.value)), // Deep clone
        config: { ...config.value },
        createdAt: new Date(),
        modifiedAt: new Date(),
      };
      return project;
    };

    const loadProject = (project: MultiSequencerProject) => {
      // Clear existing sequencers
      sequencers.value = [];

      // Load sequencers from project
      sequencers.value = project.sequencers.map((seq) => ({
        ...seq,
        isPlaying: false,
        currentStep: 0,
      }));

      // Load config
      config.value = {
        ...project.config,
        globalIsPlaying: false,
      };

      // Set first sequencer as active if none specified
      if (!config.value.activeSequencerId && sequencers.value.length > 0) {
        config.value.activeSequencerId = sequencers.value[0].id;
      }
    };

    // Migration from old single sequencer
    const migrateFromSingleSequencer = (
      beats: SequencerBeat[],
      tempo: number,
      baseOctave: number
    ) => {
      // Clear existing
      sequencers.value = [];

      // Create single sequencer with migrated data
      const migrated = createSequencer("Migrated Sequencer", "synth");
      updateSequencer(migrated.id, {
        octave: baseOctave,
        beats: beats.map((beat) => ({ ...beat })),
      });

      // Update global config
      config.value.tempo = tempo;
    };

    // Initialize with at least one sequencer
    const initialize = () => {
      // Only create a default sequencer if we haven't been restored from persistence
      // and there are no sequencers
      if (!hasInitialized.value && sequencers.value.length === 0) {
        createSequencer();
      }
      hasInitialized.value = true;
    };

    // Reset everything
    const reset = () => {
      stopAllSequencers();
      sequencers.value = [];
      config.value = {
        tempo: 120,
        steps: 16,
        rings: 7,
        globalIsPlaying: false,
        activeSequencerId: null,
      };
      hasInitialized.value = false;
      initialize();
    };

    return {
      // State - return the actual refs, not computed wrappers!
      sequencers,
      config,
      hasInitialized,

      // Computed
      activeSequencer,
      playingSequencers,
      unmutedSequencers,

      // Sequencer management
      createSequencer,
      deleteSequencer,
      updateSequencer,
      setActiveSequencer,
      duplicateSequencer,

      // Beat management
      addBeatToSequencer,
      removeBeatFromSequencer,
      updateBeatInSequencer,
      clearBeatsInSequencer,

      // Configuration
      setTempo,
      setSteps,

      // Playback
      startAllSequencers,
      stopAllSequencers,
      startSequencer,
      stopSequencer,
      toggleSequencerMute,
      setSequencerVolume,
      updateSequencerStep,

      // Project management
      saveProject,
      loadProject,
      migrateFromSingleSequencer,

      // Utility
      initialize,
      reset,
    };
  },
  {
    persist: true,
  }
);
