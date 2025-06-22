import * as Tone from 'tone'
import { noteToFrequency } from './music'

// Ensure audio context is initialized
let isInitialized = false

async function initializeAudio() {
  if (!isInitialized) {
    await Tone.start()
    isInitialized = true
  }
}

// Create a warm, vintage synth sound
const createSynth = () => {
  return new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: 'triangle',
    },
    envelope: {
      attack: 0.02,
      decay: 0.1,
      sustain: 0.3,
      release: 0.8,
    },
    volume: -12,
  }).toDestination()
}

// Add reverb for ambience
const reverb = new Tone.Reverb({
  decay: 2.5,
  wet: 0.3,
}).toDestination()

// Main synth instance
const synth = createSynth().connect(reverb)

// Play a single note
export async function playNote(note: string, duration = '8n') {
  await initializeAudio()

  // Add velocity variation for more natural sound
  const velocity = 0.7 + Math.random() * 0.3

  try {
    synth.triggerAttackRelease(note, duration, undefined, velocity)
  } catch (error) {
    console.error('Error playing note:', error)
  }
}

// Play a sequence of notes
export async function playSequence(notes: string[], tempo = 120) {
  await initializeAudio()

  // Set tempo
  Tone.Transport.bpm.value = tempo

  // Clear any existing events
  Tone.Transport.cancel()

  // Schedule notes
  const sequence = new Tone.Sequence(
    (time, note) => {
      if (note) {
        synth.triggerAttackRelease(note, '8n', time)
      }
    },
    notes,
    '4n',
  )

  // Play the sequence once
  sequence.start(0)
  sequence.loop = false

  // Start transport
  Tone.Transport.start()

  // Stop after sequence completes
  setTimeout(
    () => {
      Tone.Transport.stop()
      sequence.dispose()
    },
    ((notes.length * 60) / tempo) * 1000 + 500,
  )
}

// Play a chord
export async function playChord(notes: string[], duration = '2n') {
  await initializeAudio()

  try {
    synth.triggerAttackRelease(notes, duration)
  } catch (error) {
    console.error('Error playing chord:', error)
  }
}

// Stop all sounds
export function stopAllSounds() {
  Tone.Transport.stop()
  Tone.Transport.cancel()
  synth.releaseAll()
}

// Adjust global volume
export function setVolume(decibels: number) {
  Tone.Destination.volume.value = decibels
}

// Get frequency for visual feedback
export function getFrequencyForNote(note: string): number {
  return noteToFrequency(note)
}
