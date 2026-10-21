import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchInstrumentFile, INSTRUMENT_FILE_LIMIT, soundfontRuntimeCache } from './instrumentAssetCache'
import { sampleMapUrl, soundfontUrl, setSoundfontBaseUrl, SOUNDFONT_BASE_URL } from './sampleSources'
import { memoryCaches } from '../__tests__/helpers/memoryCaches'

const pwa = vi.hoisted(() => ({ configure: vi.fn(() => ({ name: 'test-pwa' })) }))
vi.mock('vite-plugin-pwa', () => ({ VitePWA: pwa.configure }))

afterEach(() => { vi.unstubAllGlobals(); setSoundfontBaseUrl(SOUNDFONT_BASE_URL) })

describe('instrument files on the device', () => {
  it.each([sampleMapUrl('piano'), 'https://raw.githubusercontent.com/sgossner/VCSL/master/c%234.wav', soundfontUrl('violin')])(
    'serves %s offline after the first download, including before SW control', async url => {
      const disk = memoryCaches()
      vi.stubGlobal('caches', disk.storage)
      const network = vi.fn(async () => new Response(new Uint8Array([3, 1, 4, 1, 5])))
      vi.stubGlobal('fetch', network)
      expect([...new Uint8Array(await (await fetchInstrumentFile(url)).arrayBuffer())]).toEqual([3, 1, 4, 1, 5])
      network.mockRejectedValue(new TypeError('offline'))
      // Independent callers consume their responses, so a rebuild can read again.
      for (let count = 0; count < 2; count++) {
        expect([...new Uint8Array(await (await fetchInstrumentFile(url)).arrayBuffer())]).toEqual([3, 1, 4, 1, 5])
      }
      expect(network).toHaveBeenCalledOnce()
    },
  )

  it('does not keep HTTP failures and lets an uncached offline failure propagate', async () => {
    const disk = memoryCaches()
    vi.stubGlobal('caches', disk.storage)
    const network = vi.fn().mockResolvedValueOnce(new Response('missing', { status: 404 })).mockRejectedValue(new TypeError('offline'))
    vi.stubGlobal('fetch', network)
    expect((await fetchInstrumentFile(soundfontUrl('missing'))).status).toBe(404)
    expect(disk.entries.size).toBe(0)
    await expect(fetchInstrumentFile(soundfontUrl('missing'))).rejects.toThrow('offline')
  })

  it.each(['unavailable', 'denied', 'full'])('keeps online playback working with storage %s', async failure => {
    vi.stubGlobal('caches', failure === 'unavailable' ? undefined : {
      open: async () => {
        if (failure === 'denied') throw new Error('denied')
        return { match: async () => undefined, put: async () => { throw new Error('quota') } }
      },
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('instrument')))
    expect(await (await fetchInstrumentFile(soundfontUrl('violin'))).text()).toBe('instrument')
  })

  it('bounds file count while scanning only once per 64 new files', async () => {
    const disk = memoryCaches()
    for (let index = 0; index < INSTRUMENT_FILE_LIMIT; index++) disk.entries.set(`https://samples.test/${index}`, new Response('old'))
    vi.stubGlobal('caches', disk.storage)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('new')))
    const scans = vi.spyOn(disk.cache, 'keys')
    for (let index = 0; index < 70; index++) {
      await fetchInstrumentFile(soundfontUrl(`new-${index}`))
      expect(disk.entries.size).toBeLessThanOrEqual(INSTRUMENT_FILE_LIMIT)
    }
    expect(scans).toHaveBeenCalledTimes(2)
    expect(disk.entries.has('https://samples.test/0')).toBe(false)
    expect(await (await fetchInstrumentFile(soundfontUrl('new-69'))).text()).toBe('new')
  })

  it('caches a self-hosted font through the same base URL switch', async () => {
    const disk = memoryCaches()
    vi.stubGlobal('caches', disk.storage)
    setSoundfontBaseUrl('https://instruments.test/gm')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('font')))
    await fetchInstrumentFile(soundfontUrl('violin'))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    expect(await (await fetchInstrumentFile(soundfontUrl('violin'))).text()).toBe('font')
    expect(disk.entries.has('https://instruments.test/gm/violin.js')).toBe(true)
  })

  it('routes the upstream GM host through a successful-response CacheFirst SW policy', async () => {
    await import('../../vite.config')
    const config = pwa.configure.mock.calls[0][0] as { workbox: { runtimeCaching: unknown[] } }
    expect(config.workbox.runtimeCaching).toContain(soundfontRuntimeCache)
    expect(soundfontRuntimeCache.urlPattern.test(soundfontUrl('violin'))).toBe(true)
    expect(soundfontRuntimeCache.urlPattern.test('https://felixroos.github.io/other/file.js')).toBe(false)
    expect(soundfontRuntimeCache.urlPattern.test('https://felixroosXgithub.io/webaudiofontdata/sound/font.js')).toBe(false)
    expect(soundfontRuntimeCache.handler).toBe('CacheFirst')
    expect(soundfontRuntimeCache.options.cacheableResponse.statuses).toEqual([200])
  })
})
