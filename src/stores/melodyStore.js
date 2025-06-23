import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { melodies } from "../utils/melodies";
import { startNote, stopNote, setBPM } from "../utils/audio";
import * as Tone from "tone";

export const useMelodyStore = defineStore("melody", () => {
  const selectedMelody = ref(Object.keys(melodies)[0]);
  const isPlaying = ref(false);
  const bpm = ref(melodies[selectedMelody.value].defaultBpm || 120);
  const highlightedNote = ref(null);
  let currentScheduleId = null;

  // Helper function to get base note without octave
  function getBaseNote(note) {
    return note.replace(/\d+$/, "");
  }

  console.log(melodies);

  function setSelectedMelody(melodyName) {
    selectedMelody.value = melodyName;
    const melody = melodies[melodyName];
    if (melody && melody.defaultBpm) {
      setBpm(melody.defaultBpm);
    }
  }

  function setBpm(newBpm) {
    const validBpm = Math.max(40, Math.min(240, newBpm));
    bpm.value = validBpm;
    setBPM(validBpm);
  }

  async function playMelody() {
    if (isPlaying.value) {
      // If already playing, stop the current playback first
      stopPlayback();
    }

    const melody = melodies[selectedMelody.value];
    if (!melody) return;

    isPlaying.value = true;

    // Make sure Transport is started
    await Tone.start();
    const transport = Tone.getTransport();
    transport.cancel(); // Clear any previous schedules
    transport.stop(); // Stop transport if it was running
    transport.position = 0; // Reset position
    transport.start();

    let currentTime = 0;

    try {
      melody.notes.forEach(({ note, duration }) => {
        // Schedule note start
        const startId = transport.schedule((time) => {
          startNote(note);
          highlightedNote.value = getBaseNote(note);
        }, currentTime);

        // Schedule note stop and calculate next time
        const durationSeconds = new Tone.Time(duration).toSeconds();
        const stopId = transport.schedule((time) => {
          stopNote(note);
          highlightedNote.value = null;
        }, currentTime + durationSeconds);

        // Store schedule IDs for cleanup
        if (!currentScheduleId) currentScheduleId = [];
        currentScheduleId.push(startId, stopId);

        currentTime += durationSeconds;
      });

      // Schedule playback stop
      const finalId = transport.schedule((time) => {
        stopPlayback();
      }, currentTime);

      if (currentScheduleId) currentScheduleId.push(finalId);
    } catch (error) {
      console.error("Error playing melody:", error);
      stopPlayback();
    }
  }

  function stopPlayback() {
    const transport = Tone.getTransport();

    // Clear all scheduled events
    if (currentScheduleId) {
      if (Array.isArray(currentScheduleId)) {
        currentScheduleId.forEach((id) => transport.clear(id));
      } else {
        transport.clear(currentScheduleId);
      }
      currentScheduleId = null;
    }

    // Stop all active notes
    const melody = melodies[selectedMelody.value];
    if (melody) {
      melody.notes.forEach(({ note }) => stopNote(note));
    }

    transport.cancel(); // Clear all scheduled events
    transport.stop(); // Stop the transport
    transport.position = 0; // Reset position

    isPlaying.value = false;
    highlightedNote.value = null;
  }

  return {
    selectedMelody,
    setSelectedMelody,
    isPlaying,
    bpm,
    highlightedNote,
    melodies,
    playMelody,
    stopPlayback,
    setBpm,
  };
});
