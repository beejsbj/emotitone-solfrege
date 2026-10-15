import { SOUNDFONT_BASE_URL } from './sampleSources'

/** Encoded files on disk only: decoded PCM belongs to the active renderer. */
export const INSTRUMENT_FILE_CACHE = 'audio-samples-cache'
export const INSTRUMENT_FILE_LIMIT = 2000

export const instrumentCacheOptions = {
  cacheName: INSTRUMENT_FILE_CACHE,
  expiration: { maxEntries: INSTRUMENT_FILE_LIMIT, maxAgeSeconds: 60 * 60 * 24 * 365 },
  cacheableResponse: { statuses: [200] },
}

export const soundfontRuntimeCache = {
  urlPattern: new RegExp(`^${SOUNDFONT_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
  handler: 'CacheFirst' as const,
  options: instrumentCacheOptions,
}

/** Also works before the first service worker takes control. Storage denial or
 * quota pressure must not prevent online play; an uncached offline fetch fails
 * normally, reaching the instrument's existing warmup error. */
export async function fetchInstrumentFile(url: string): Promise<Response> {
  const escaped = url.replace(/#/g, '%23')
  let cache: Cache | undefined
  try {
    cache = await globalThis.caches?.open(INSTRUMENT_FILE_CACHE)
    const stored = await cache?.match(escaped)
    if (stored) return stored
  } catch { /* Private browsing or unavailable storage: use the network. */ }
  const response = await fetch(escaped)
  if (cache && response.status === 200) {
    try {
      await cache.put(escaped, response.clone())
      const keys = await cache.keys()
      await Promise.all(keys.slice(0, Math.max(0, keys.length - INSTRUMENT_FILE_LIMIT)).map(key => cache!.delete(key)))
    } catch { /* A full device can still play the downloaded instrument. */ }
  }
  return response
}
