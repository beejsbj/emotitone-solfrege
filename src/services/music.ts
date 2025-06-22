export type Mode = 'major' | 'minor'
export type SolfegeNote = {
  name: string
  number: number
  degree: string
  colorGradient: string[]
  flecks?: string
  emotion: string
  texture: string
  description: string
}

// Note frequencies for equal temperament (A4 = 440Hz)
const A4_FREQ = 440
const SEMITONE_RATIO = Math.pow(2, 1 / 12)

// Convert note name to MIDI number
function noteToMidi(note: string): number {
  const noteMap: { [key: string]: number } = {
    C: 0,
    'C#': 1,
    Db: 1,
    D: 2,
    'D#': 3,
    Eb: 3,
    E: 4,
    F: 5,
    'F#': 6,
    Gb: 6,
    G: 7,
    'G#': 8,
    Ab: 8,
    A: 9,
    'A#': 10,
    Bb: 10,
    B: 11,
  }

  const match = note.match(/^([A-G][#b]?)(\d+)$/)
  if (!match) return 60 // Default to C4

  const [, noteName, octave] = match
  return (parseInt(octave) + 1) * 12 + (noteMap[noteName] ?? 0)
}

// Convert MIDI number to frequency
export function midiToFrequency(midi: number): number {
  return A4_FREQ * Math.pow(SEMITONE_RATIO, midi - 69)
}

// Major scale intervals (in semitones)
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12]
// Natural minor scale intervals
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10, 12]

// All 12 keys
export const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

// Note names in chromatic order
const CHROMATIC_NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

// Solfege data for major scale
const MAJOR_SOLFEGE: Omit<SolfegeNote, 'degree'>[] = [
  {
    name: 'Do',
    number: 1,
    colorGradient: ['#1e3a8a', '#fb923c', '#fbbf24'],
    flecks: 'soft radiance',
    emotion: 'Home, rest, stability',
    texture: 'foundation, trust, warmth from peace',
    description: 'The foundation. Complete resolution.',
  },
  {
    name: 'Re',
    number: 2,
    colorGradient: ['#0ea5e9', '#06b6d4', '#c0c0c0'],
    flecks: 'airy flecks',
    emotion: 'Forward motion, stepping up',
    texture: 'hopeful lift, gentle curiosity',
    description: 'Moving away from home with purpose.',
  },
  {
    name: 'Mi',
    number: 3,
    colorGradient: ['#facc15', '#fb923c', '#f59e0b'],
    flecks: 'glowing points',
    emotion: 'Bright, joyful optimism',
    texture: 'clarity and rising joy',
    description: 'Sunny and optimistic, wants to rise.',
  },
  {
    name: 'Fa',
    number: 4,
    colorGradient: ['#22c55e', '#fb923c', '#ef4444'],
    emotion: 'Tension, unease',
    texture: 'inward pull, leaning fall, yearning',
    description: 'Unstable, wants to fall back to Mi.',
  },
  {
    name: 'Sol',
    number: 5,
    colorGradient: ['#dc2626', '#facc15', '#2563eb'],
    emotion: 'Strength, confidence, dominance',
    texture: 'a triumphant beacon',
    description: 'Confident and stable, but not quite home.',
  },
  {
    name: 'La',
    number: 6,
    colorGradient: ['#ec4899', '#f43f5e', '#7c3aed'],
    flecks: 'Deep Purple',
    emotion: 'Longing, wistfulness',
    texture: 'emotional openness, romantic ache',
    description: 'Beautiful sadness, reaching for Do.',
  },
  {
    name: 'Ti',
    number: 7,
    colorGradient: ['#eab308', '#a855f7'],
    flecks: 'sparkling intensity',
    emotion: 'Urgency, restlessness',
    texture: 'spiritual tension, strong upward pull',
    description: 'Restless, must resolve up to Do!',
  },
  {
    name: 'Do',
    number: 8,
    colorGradient: ['#1e3a8a', '#fb923c', '#fbbf24'],
    flecks: 'soft radiance',
    emotion: 'Resolution, completion, home',
    texture: 'warmth rising from peace',
    description: 'Back home, one octave higher.',
  },
]

// Solfege data for minor scale
const MINOR_SOLFEGE: Omit<SolfegeNote, 'degree'>[] = [
  {
    name: 'Do',
    number: 1,
    colorGradient: ['#475569', '#60a5fa', '#fbbf24'],
    flecks: 'Faint Gold flecks',
    emotion: 'Grounded, somber home',
    texture: 'dignified stability with emotional weight',
    description: 'Dark but stable foundation.',
  },
  {
    name: 'Re',
    number: 2,
    colorGradient: ['#047857', '#6b7280', '#14b8a6'],
    flecks: 'mist',
    emotion: 'Gentle, uncertain step',
    texture: 'cautious, introverted motion',
    description: 'Cautious movement forward.',
  },
  {
    name: 'Me',
    number: 3,
    colorGradient: ['#be185d', '#f59e0b', '#6b7280'],
    emotion: 'Melancholy, introspection',
    texture: 'tender vulnerability',
    description: 'Minor third - tender sadness.',
  },
  {
    name: 'Fa',
    number: 4,
    colorGradient: ['#064e3b', '#f97316'],
    flecks: 'slow drip of warmth',
    emotion: 'Tension, yearning',
    texture: 'a shadowed inward pull',
    description: 'Same tension, deeper in minor.',
  },
  {
    name: 'Sol',
    number: 5,
    colorGradient: ['#581c87', '#ca8a04', '#1e3a8a'],
    flecks: 'stormy blue',
    emotion: 'Bittersweet strength',
    texture: 'noble sorrow with resilience',
    description: 'Strong but tinged with sadness.',
  },
  {
    name: 'Le',
    number: 6,
    colorGradient: ['#1e3a8a', '#7f1d1d', '#451a03'],
    flecks: 'matte texture',
    emotion: 'Deep longing, sorrow',
    texture: 'grounded grief, ancient ache',
    description: 'Minor sixth - profound yearning.',
  },
  {
    name: 'Te',
    number: 7,
    colorGradient: ['#7c3aed', '#475569', '#f43f5e'],
    flecks: 'subtle sparkles',
    emotion: 'Gentle leading, subdued',
    texture: 'shadowed anticipation',
    description: 'Softer leading tone than Ti.',
  },
  {
    name: 'Do',
    number: 8,
    colorGradient: ['#475569', '#60a5fa', '#fbbf24'],
    flecks: 'Faint Gold flecks',
    emotion: 'Somber resolution',
    texture: 'dignified return with minor character',
    description: 'Home, but with minor character.',
  },
]

// Generate scale notes for a given key and mode
export function generateScale(key: string, mode: Mode): string[] {
  const rootIndex = CHROMATIC_NOTES.indexOf(key)
  const intervals = mode === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS

  return intervals.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12
    return CHROMATIC_NOTES[noteIndex]
  })
}

// Get solfege data with actual note names
export function getSolfegeWithNotes(key: string, mode: Mode): SolfegeNote[] {
  const scaleNotes = generateScale(key, mode)
  const solfegeData = mode === 'major' ? MAJOR_SOLFEGE : MINOR_SOLFEGE

  return solfegeData.map((solfege, index) => ({
    ...solfege,
    degree: scaleNotes[index] + (index === 7 ? '5' : '4'), // Octave higher for last Do
  }))
}

// Convert note to frequency for playback
export function noteToFrequency(note: string): number {
  const midi = noteToMidi(note)
  return midiToFrequency(midi)
}
