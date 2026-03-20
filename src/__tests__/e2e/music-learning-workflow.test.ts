import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import { useMusicStore } from '@/stores/music'
import { useInstrumentStore } from '@/stores/instrument'

const audioMocks = vi.hoisted(() => ({
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  isPrewarmed: vi.fn(() => true),
  prewarmSoundSamples: vi.fn().mockResolvedValue(undefined),
  attackNote: vi.fn(),
  releaseNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
  getRegisteredSounds: vi.fn(() => ['piano', 'triangle']),
}))

vi.mock('@/services/superdoughAudio', () => ({
  ...audioMocks,
}))

const TestComponent = {
  name: 'WorkflowHarness',
  template: '<div id="workflow-harness">Workflow Harness</div>',
}

describe('Music Learning Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    audioMocks.isPrewarmed.mockReturnValue(true)
    audioMocks.attackNote
      .mockResolvedValueOnce('note-1')
      .mockResolvedValueOnce('note-2')
      .mockResolvedValueOnce('note-3')
  })

  it('updates scale notes when the key changes', () => {
    createTestWrapper(TestComponent)
    const musicStore = useMusicStore()

    musicStore.setKey('G')

    expect(musicStore.currentKey).toBe('G')
    expect(musicStore.currentScaleNotes).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F#'])
    expect(musicStore.solfegeData[0].note).toBe('G')
  })

  it('updates solfege spellings when the mode changes', () => {
    createTestWrapper(TestComponent)
    const musicStore = useMusicStore()

    musicStore.setMode('minor')

    expect(musicStore.currentMode).toBe('minor')
    expect(musicStore.currentScaleNotes).toEqual(['C', 'D', 'D#', 'F', 'G', 'G#', 'A#'])
    expect(musicStore.solfegeData[2].name).toBe('Me')
  })

  it('tracks polyphonic notes through attack and release', async () => {
    createTestWrapper(TestComponent)
    const musicStore = useMusicStore()

    const first = await musicStore.attackNote(0)
    const second = await musicStore.attackNote(4)

    expect(musicStore.activeNotes.size).toBe(2)
    expect(first).toBeTruthy()
    expect(second).toBeTruthy()

    if (first) {
      musicStore.releaseNote(first)
    }
    if (second) {
      musicStore.releaseNote(second)
    }

    expect(audioMocks.releaseNote).toHaveBeenCalledTimes(2)
    expect(musicStore.activeNotes.size).toBe(0)
  })

  it('warms a newly selected instrument before later note playback', async () => {
    createTestWrapper(TestComponent)
    const musicStore = useMusicStore()
    const instrumentStore = useInstrumentStore()

    audioMocks.isPrewarmed.mockReturnValue(false)

    await instrumentStore.setInstrument('triangle')
    await musicStore.attackNote(0)

    expect(audioMocks.prewarmSoundSamples).toHaveBeenCalledWith('triangle')
    expect(audioMocks.attackNote).toHaveBeenLastCalledWith(
      expect.any(String),
      'C4',
      'triangle'
    )
  })
})
