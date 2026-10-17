/** Cache API boundary for offline tests. Responses are copied on both sides,
 * as disk storage does; no decoded buffers or application results live here. */
export function memoryCaches() {
  const entries = new Map<string, Response>()
  type CacheRequest = string | Request | URL
  const key = (request: CacheRequest) => typeof request === 'string' ? request : request instanceof URL ? request.href : request.url
  const cache = {
    async match(request: CacheRequest) { return entries.get(key(request))?.clone() },
    async put(request: CacheRequest, response: Response) { entries.set(key(request), response.clone()) },
    async keys() { return [...entries.keys()].map(url => new Request(url)) },
    async delete(request: CacheRequest) { return entries.delete(key(request)) },
  }
  return { entries, cache, storage: { async open() { return cache } } }
}
