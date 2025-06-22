import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { type Mode, type SolfegeNote, getSolfegeWithNotes, KEYS } from '@/services/music'

export const useMusicStore = defineStore('music', () => {
  // State
  const currentKey = ref<string>('C')
  const currentMode = ref<Mode>('major')
  const sequence = ref<SolfegeNote[]>([])
  const isPlaying = ref(false)

  // Getters
  const scaleNotes = computed(() => getSolfegeWithNotes(currentKey.value, currentMode.value))

  const sequenceLength = computed(() => sequence.value.length)

  // Actions
  function setKey(key: string) {
    if (KEYS.includes(key)) {
      currentKey.value = key
    }
  }

  function setMode(mode: Mode) {
    currentMode.value = mode
  }

  function addToSequence(note: SolfegeNote) {
    if (sequence.value.length < 16) {
      // Max 4 sections of 4 notes
      sequence.value.push(note)
    }
  }

  function removeFromSequence(index: number) {
    sequence.value.splice(index, 1)
  }

  function clearSequence() {
    sequence.value = []
  }

  function setIsPlaying(playing: boolean) {
    isPlaying.value = playing
  }

  return {
    // State
    currentKey,
    currentMode,
    sequence,
    isPlaying,
    // Getters
    scaleNotes,
    sequenceLength,
    // Actions
    setKey,
    setMode,
    addToSequence,
    removeFromSequence,
    clearSequence,
    setIsPlaying,
  }
})
