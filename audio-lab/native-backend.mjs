import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** The native scheduling experiment is reachable only from explicit lab runs. */
export function nativeBackendPlugin(backend, appRoot) {
  const reference = resolve(appRoot, 'audio-lab/reference/livePlayback.ts');
  // Historical revisions already contain the original environment selector.
  if (backend !== 'native' || !existsSync(reference)) return null;
  const production = resolve(appRoot, 'src/services/livePlayback');
  return {
    name: 'lab-native-backend',
    enforce: 'pre',
    resolveId(id) {
      if (id === production || id === `${production}.ts`) return reference;
    },
  };
}
