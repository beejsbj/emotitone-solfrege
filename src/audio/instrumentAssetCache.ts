import { SOUNDFONT_BASE_URL } from './sampleSources'

/** Encoded files on disk only: decoded PCM belongs to the active renderer. */
export const INSTRUMENT_FILE_CACHE = 'audio-samples-cache'
export const INSTRUMENT_FILE_LIMIT = 2000
const TRIM_EVERY = 64
const writes = new WeakMap<CacheStorage, number>()
// Workbox ages only its own writes; page-written files have no age expiry.
// Page count trimming is their bound. Reserve 63 slots per scan so subsequent
// page writes stay within 2,000 entries without enumerating the cache per file.
// Other tabs/SW can refill that reserve; the next scan reapplies the count bound.

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
  let storage: CacheStorage | undefined
  let cache: Cache | undefined
  try {
    storage = globalThis.caches
    cache = await storage?.open(INSTRUMENT_FILE_CACHE)
    const stored = await cache?.match(escaped)
    if (stored) return stored
  } catch { /* Private browsing or unavailable storage: use the network. */ }
  const response = await fetch(escaped)
  if (cache && storage && response.status === 200) {
    try {
      await cache.put(escaped, response.clone())
      const count = writes.get(storage) ?? 0
      writes.set(storage, count + 1)
      if (count % TRIM_EVERY === 0) {
        const keys = await cache.keys()
        const keep = INSTRUMENT_FILE_LIMIT - TRIM_EVERY + 1
        await Promise.all(keys.slice(0, Math.max(0, keys.length - keep)).map(key => cache!.delete(key)))
      }
    } catch { /* A full device can still play the downloaded instrument. */ }
  }
  return response
}
