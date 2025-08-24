import { vi } from 'vitest'

vi.mock('@/stores/music', () => ({
  useMusicStore: () => ({
    playNoteWithDuration: vi.fn()
  })
}))

import { mount } from '@vue/test-utils'
import DomSolfegePalette from '@/components/DomSolfegePalette.vue'

describe.skip('DomSolfegePalette', () => {
  const createWrapper = () => mount(DomSolfegePalette)

  it('renders three rows by default', () => {
    const wrapper = createWrapper()
    expect(wrapper.findAll('.solfege-row').length).toBe(3)
  })

  it('changes octave when buttons clicked', async () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.octave-display').text()).toContain('4')
    await wrapper.find('.octave-up').trigger('click')
    expect(wrapper.find('.octave-display').text()).toContain('5')
    await wrapper.find('.octave-down').trigger('click')
    expect(wrapper.find('.octave-display').text()).toContain('4')
  })
})
