import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestWrapper } from '../helpers/test-utils'
import { useMusicStore } from '@/stores/music'
import { useInstrumentStore } from '@/stores/instrument'

const audioMocks = vi.hoisted(() => ({
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  isPrewarmed: vi.fn(() => true),
  prewarmSoundSamples: vi.fn().mockResolvedValue(undefined),
  attackNote: vi.fn().mockResolvedValue('note-1'),
  releaseNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
  getRegisteredSounds: vi.fn(() => ['piano', 'triangle']),
}))

vi.mock('@/services/superdoughAudio', () => ({
  ...audioMocks,
}))

const TestComponent = {
  name: 'TestComponent',
  template: '<div id="test">Test Component</div>',
}

describe('Basic E2E Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    audioMocks.isPrewarmed.mockReturnValue(true)
    audioMocks.attackNote.mockResolvedValue('note-1')
  })

  it('creates the test wrapper and initializes the current stores', () => {
    const wrapper = createTestWrapper(TestComponent)
    const musicStore = useMusicStore()
    const instrumentStore = useInstrumentStore()

    expect(wrapper.find('#test').exists()).toBe(true)
    expect(musicStore.currentKey).toBe('C')
    expect(musicStore.currentMode).toBe('major')
    expect(musicStore.solfegeData).toHaveLength(7)
    expect(instrumentStore.currentInstrument).toBe('piano')
  })

  it('updates the music context through the current store API', () => {
    createTestWrapper(TestComponent)
    const musicStore = useMusicStore()

    musicStore.setKey('G')
    musicStore.setMode('minor')

    expect(musicStore.currentKey).toBe('G')
    expect(musicStore.currentMode).toBe('minor')
    expect(musicStore.currentScaleNotes).toHaveLength(7)
  })

  it('plays and releases notes through the mocked audio engine', async () => {
    createTestWrapper(TestComponent)
    const musicStore = useMusicStore()

    await musicStore.attackNote(0)

    expect(audioMocks.attackNote).toHaveBeenCalledTimes(1)
    expect(musicStore.activeNotes.size).toBe(1)

    const [noteId] = Array.from(musicStore.activeNotes.keys())
    musicStore.releaseNote(noteId)

    expect(audioMocks.releaseNote).toHaveBeenCalledWith(noteId)
    expect(musicStore.activeNotes.size).toBe(0)
  })

  it('switches instruments without forcing an unnecessary warmup', async () => {
    createTestWrapper(TestComponent)
    const instrumentStore = useInstrumentStore()

    await instrumentStore.setInstrument('triangle')

    expect(instrumentStore.currentInstrument).toBe('triangle')
    expect(audioMocks.isPrewarmed).toHaveBeenCalledWith('triangle')
    expect(audioMocks.prewarmSoundSamples).not.toHaveBeenCalled()
  })
})
