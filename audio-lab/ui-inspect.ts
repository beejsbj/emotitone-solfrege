// Read-only diagnostics imported alongside the real application's modules.
// @ts-ignore superdough has no declarations
import { getSound, getSampleInfo, getLoadedBuffer } from 'superdough';
export function inspectPianoBank() {
  const samples = getSound('piano')?.data?.samples;
  if (!samples) return { error: 'No registered piano sample bank' };
  const entries = Array.isArray(samples) ? [['default', samples]] : Object.entries(samples).filter(([key]) => !key.startsWith('_'));
  const buffers = new Set<AudioBuffer>();
  const zones = entries.map(([key, value]) => {
    const info = getSampleInfo({ s: 'piano', note: 0 }, Array.isArray(samples) ? value : { [key]: value });
    const buffer = getLoadedBuffer(info.url.replace('#', '%23')) as AudioBuffer | undefined;
    if (buffer) buffers.add(buffer);
    return { key, rootMidi: -info.transpose, loaded: Boolean(buffer), frames: buffer?.length, channels: buffer?.numberOfChannels };
  });
  return { zones, uniqueBuffers: buffers.size,
    originalPcmBytes: [...buffers].reduce((total, buffer) => total + buffer.length * buffer.numberOfChannels * 4, 0) };
}
