/**
 * Bracket Notation Utilities
 * Functions to convert Pattern data to bracket notation for display/export
 */

import type { Pattern, HistoryNote } from '@/types/patterns'

interface ConvertedNote {
  name: string
  start: number
  release: number
  velocity: number
}

/**
 * Pure function to convert your Pattern to bracket notation
 */
export function patternToBracketNotation(
  pattern: Pattern,
  options: {
    isChromatic?: boolean // Use note names instead of scale degrees
    includeVelocity?: boolean // Include velocity pattern
  } = {}
): {
  notation: string
  velocityPattern?: string
  scaleString: string
} {
  // Extract settings with defaults
  const bpm = pattern.bpm ?? 60 // Default: 1 bar = 1 second (60 BPM at 4/4)
  const timeSignature = parseTimeSignature(pattern.timeSignature ?? '4/4')

  // Calculate cycles per second (1 cycle = 1 bar)
  // At 60 BPM with 4/4: 60/60/4 = 0.25 cycles/second
  const cyclesPerSecond = bpm / 60 / timeSignature.numerator

  // Convert notes from milliseconds to cycles (beats)
  const convertedNotes = pattern.notes.map((note) => ({
    // Use scale degree (0-indexed) or note name based on isChromatic
    name: options.isChromatic ? note.note : String(note.scaleDegree - 1), // Convert 1-7 to 0-6 for Strudel
    start: (note.pressTime / 1000) * cyclesPerSecond,
    release:
      ((note.releaseTime ?? note.pressTime + (note.duration ?? 0)) / 1000) *
      cyclesPerSecond,
    velocity: note.velocity ?? 0.8,
  }))

  // Sort by start time
  const sortedNotes = [...convertedNotes].sort((a, b) => a.start - b.start)

  // Generate main notation
  const notation = generateBracketNotation(sortedNotes)

  // Generate velocity pattern if requested
  const velocityPattern = options.includeVelocity
    ? generateVelocityPattern(sortedNotes)
    : undefined

  // Format scale string for Strudel
  const scaleString = `${pattern.key} ${pattern.mode}`.toLowerCase()

  return {
    notation,
    velocityPattern,
    scaleString,
  }
}

/**
 * Convert a single HistoryNote to simple bracket notation
 */
export function historyNoteToBracketNotation(note: HistoryNote): string {
  // Simple representation: just the scale degree or note name
  return note.solfege.name.toLowerCase()
}

/**
 * Convert an array of HistoryNotes to a display-friendly string
 */
export function historyNotesToDisplay(notes: HistoryNote[]): string {
  if (notes.length === 0) return ''
  
  // Group consecutive notes that are very close together (chords)
  const grouped: string[] = []
  let currentGroup: HistoryNote[] = []
  let lastTime = 0
  
  for (const note of notes) {
    if (currentGroup.length > 0 && note.pressTime - lastTime > 100) {
      // More than 100ms gap, flush current group
      if (currentGroup.length === 1) {
        grouped.push(currentGroup[0].solfege.name)
      } else {
        // Chord notation
        grouped.push(`[${currentGroup.map(n => n.solfege.name).join(',')}]`)
      }
      currentGroup = [note]
    } else {
      currentGroup.push(note)
    }
    lastTime = note.pressTime
  }
  
  // Flush last group
  if (currentGroup.length === 1) {
    grouped.push(currentGroup[0].solfege.name)
  } else if (currentGroup.length > 1) {
    grouped.push(`[${currentGroup.map(n => n.solfege.name).join(',')}]`)
  }
  
  return grouped.join(' ')
}

// Helper to parse time signature string
function parseTimeSignature(timeSig: string): {
  numerator: number
  denominator: number
} {
  const [num, denom] = timeSig.split('/').map(Number)
  return {
    numerator: num || 4,
    denominator: denom || 4,
  }
}

// Core bracket notation generation
function generateBracketNotation(
  notes: ConvertedNote[]
): string {
  if (notes.length === 0) return ''

  // Group overlapping notes
  const groups = groupOverlappingNotes(notes)
  const sortedGroups = groups.sort(
    (a, b) =>
      Math.min(...a.map((n) => n.start)) - Math.min(...b.map((n) => n.start))
  )

  const parts: string[] = []
  let lastEnd = 0
  let totalRestDuration = 0
  let isCollectingInitialRests = true

  for (const group of sortedGroups) {
    const groupStart = Math.min(...group.map((n) => n.start))
    const groupEnd = Math.max(...group.map((n) => n.release))

    // Add rest if there's a gap
    const restDuration = groupStart - lastEnd
    if (restDuration > 0.0001) {
      // Floating point threshold
      if (isCollectingInitialRests) {
        // Collect initial rests
        totalRestDuration += restDuration
      } else {
        // Add individual rest between notes
        parts.push(`~@${formatDuration(restDuration)}`)
      }
    }

    // Generate notation for this group
    const groupNotation = generateGroupNotation(group)
    if (groupNotation) {
      // If we were collecting initial rests, add them now as a single bundled rest
      if (isCollectingInitialRests && totalRestDuration > 0.0001) {
        parts.push(`~@${formatDuration(totalRestDuration)}`)
        isCollectingInitialRests = false
      }
      isCollectingInitialRests = false
      parts.push(groupNotation)
      lastEnd = groupEnd
    }
  }

  // If we only had rests, add the total
  if (isCollectingInitialRests && totalRestDuration > 0.0001) {
    parts.push(`~@${formatDuration(totalRestDuration)}`)
  }

  return bundleConsecutiveRests(parts.join(' '))
}

// Generate notation for a single group
function generateGroupNotation(
  group: ConvertedNote[]
): string {
  // Single note
  if (group.length === 1) {
    const note = group[0]
    const duration = note.release - note.start
    if (duration <= 0.0001) return ''
    return `${note.name}${formatDurationString(duration)}`
  }

  // Multiple overlapping notes
  const earliestStart = Math.min(...group.map((n) => n.start))
  const latestRelease = Math.max(...group.map((n) => n.release))
  const bracketLength = latestRelease - earliestStart

  if (bracketLength <= 0.0001) return ''

  const entries: string[] = []

  for (const note of group) {
    const offset = note.start - earliestStart
    const duration = note.release - note.start
    if (duration <= 0.0001) continue
    const pad = bracketLength - offset - duration

    let entry = ''

    // Add pre-rest if note doesn't start immediately
    if (offset > 0.0001) {
      entry += `~${formatDurationString(offset)} `
    }

    // Add the note
    entry += `${note.name}${formatDurationString(duration)}`

    // Add post-rest if bracket continues beyond note
    if (pad > 0.0001) {
      entry += ` ~${formatDurationString(pad)}`
    }

    entries.push(entry)
  }

  if (entries.length === 0) return ''
  return `{${entries.join(', ')}}${formatDurationString(bracketLength)}`
}

// Generate velocity pattern matching the note structure
function generateVelocityPattern(
  notes: ConvertedNote[]
): string {
  if (notes.length === 0) return ''

  const groups = groupOverlappingNotes(notes)
  const sortedGroups = groups.sort(
    (a, b) =>
      Math.min(...a.map((n) => n.start)) - Math.min(...b.map((n) => n.start))
  )

  const parts: string[] = []
  let lastEnd = 0

  for (const group of sortedGroups) {
    const groupStart = Math.min(...group.map((n) => n.start))
    const groupEnd = Math.max(...group.map((n) => n.release))

    // Add rest if there's a gap
    const restDuration = groupStart - lastEnd
    if (restDuration > 0.0001) {
      parts.push(`~@${formatDuration(restDuration)}`)
    }

    // Generate velocity notation for this group
    const groupNotation = generateVelocityGroupNotation(group)
    if (groupNotation) {
      parts.push(groupNotation)
      lastEnd = groupEnd
    }
  }

  return parts.join(' ')
}

// Generate velocity notation for a group
function generateVelocityGroupNotation(
  group: ConvertedNote[]
): string {
  // Single velocity
  if (group.length === 1) {
    const note = group[0]
    const duration = note.release - note.start
    if (duration <= 0.0001) return ''
    return `${note.velocity.toFixed(2)}${formatDurationString(duration)}`
  }

  // Multiple overlapping velocities
  const earliestStart = Math.min(...group.map((n) => n.start))
  const latestRelease = Math.max(...group.map((n) => n.release))
  const bracketLength = latestRelease - earliestStart

  if (bracketLength <= 0.0001) return ''

  const entries: string[] = []

  for (const note of group) {
    const offset = note.start - earliestStart
    const duration = note.release - note.start
    if (duration <= 0.0001) continue
    const pad = bracketLength - offset - duration

    let entry = ''

    if (offset > 0.0001) {
      entry += `~${formatDurationString(offset)} `
    }

    entry += `${note.velocity.toFixed(2)}${formatDurationString(duration)}`

    if (pad > 0.0001) {
      entry += ` ~${formatDurationString(pad)}`
    }

    entries.push(entry)
  }

  if (entries.length === 0) return ''
  return `{${entries.join(', ')}}${formatDurationString(bracketLength)}`
}

// Helper: Group overlapping notes
function groupOverlappingNotes<T extends { start: number; release: number }>(
  notes: T[]
): T[][] {
  const groups: T[][] = []

  for (const note of notes) {
    let addedToGroup = false

    for (const group of groups) {
      if (group.some((gNote) => notesOverlap(note, gNote))) {
        group.push(note)
        addedToGroup = true
        break
      }
    }

    if (!addedToGroup) {
      groups.push([note])
    }
  }

  return groups
}

// Helper: Check if notes overlap
function notesOverlap(
  note1: { start: number; release: number },
  note2: { start: number; release: number }
): boolean {
  return (
    Math.max(note1.start, note2.start) <
    Math.min(note1.release, note2.release)
  )
}

// Format duration for output
function formatDurationString(duration: number): string {
  // Special cases for common durations
  if (Math.abs(duration - 1) < 0.0001) return '' // Whole note has no @
  if (Math.abs(duration - 0.5) < 0.0001) return '@0.5'
  if (Math.abs(duration - 0.25) < 0.0001) return '@0.25'
  if (Math.abs(duration - 0.125) < 0.0001) return '@0.125'

  // Round to 4 decimal places
  return `@${formatDuration(duration)}`
}

// Round duration to 4 decimal places
function formatDuration(duration: number): string {
  return String(Math.round(duration * 10000) / 10000)
}

// Bundle consecutive rests in notation string
function bundleConsecutiveRests(notation: string): string {
  if (!notation) return ''
  
  // Split the notation into parts
  const parts = notation.split(' ')
  const bundled: string[] = []
  let restAccumulator = 0
  let hasAccumulatedRest = false
  
  for (const part of parts) {
    // Check if this part is a rest (starts with ~@)
    if (part.startsWith('~@')) {
      // Extract the duration
      const duration = parseFloat(part.substring(2))
      if (!isNaN(duration)) {
        restAccumulator += duration
        hasAccumulatedRest = true
      } else {
        // If we can't parse it, just add it as is
        if (hasAccumulatedRest) {
          bundled.push(`~@${formatDuration(restAccumulator)}`)
          restAccumulator = 0
          hasAccumulatedRest = false
        }
        bundled.push(part)
      }
    } else {
      // Not a rest, flush any accumulated rests
      if (hasAccumulatedRest) {
        bundled.push(`~@${formatDuration(restAccumulator)}`)
        restAccumulator = 0
        hasAccumulatedRest = false
      }
      bundled.push(part)
    }
  }
  
  // Flush any remaining accumulated rests
  if (hasAccumulatedRest) {
    bundled.push(`~@${formatDuration(restAccumulator)}`)
  }
  
  // Now trim long rests at start and end
  return trimLongRests(bundled)
}

// Trim long rests at the start and end of notation
function trimLongRests(parts: string[]): string {
  if (parts.length === 0) return ''
  
  const result = [...parts]
  const REST_THRESHOLD = 10 // Threshold for "long" rests
  const TRIMMED_REST = '~@2' // What to replace long rests with
  
  // Check and trim first element if it's a long rest
  if (result.length > 0 && result[0].startsWith('~@')) {
    const duration = parseFloat(result[0].substring(2))
    if (!isNaN(duration) && duration > REST_THRESHOLD) {
      result[0] = TRIMMED_REST
    }
  }
  
  // Check and trim last element if it's a long rest
  if (result.length > 0 && result[result.length - 1].startsWith('~@')) {
    const duration = parseFloat(result[result.length - 1].substring(2))
    if (!isNaN(duration) && duration > REST_THRESHOLD) {
      result[result.length - 1] = TRIMMED_REST
    }
  }
  
  return result.join(' ')
}

// Generate Strudel code from the bracket notation
export function generateStrudelCode(
  notation: string,
  scaleString: string,
  options: {
    isChromatic?: boolean
    sound?: string
    velocityPattern?: string
  } = {}
): string {
  const sound = options.sound ?? 'piano'

  let code: string
  if (options.isChromatic) {
    // Chromatic mode - use note() with note names
    code = `note(\`${notation}\`).sound("${sound}")`
  } else {
    // Scale degree mode - use n() with scale
    code = `n(\`${notation}\`).scale("${scaleString}").sound("${sound}")`
  }

  // Add velocity if available
  if (options.velocityPattern) {
    code += `.velocity(\`${options.velocityPattern}\`)`
  }

  return code
}
