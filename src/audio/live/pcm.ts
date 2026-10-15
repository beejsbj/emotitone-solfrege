import type { PreparedLiveInstrument } from './types'

/**
 * PCM ownership of a prepared bank. Source PCM is the loader's decoded copy;
 * derived PCM is the anti-alias pyramid built from it. Every zone channel and
 * pyramid level is its own ArrayBuffer, so a bank transfers as many small
 * buffers rather than one large one.
 */
function pcmBuffers(instrument: PreparedLiveInstrument) {
  const source = new Set<ArrayBuffer>(), derived = new Set<ArrayBuffer>()
  if (instrument.kind === 'sample-bank') for (const zone of instrument.zones) {
    for (const channel of zone.channels) source.add(channel.buffer as ArrayBuffer)
    for (const level of zone.mipmaps ?? []) for (const channel of level) derived.add(channel.buffer as ArrayBuffer)
  }
  for (const buffer of source) derived.delete(buffer)
  return { source, derived }
}

/** Every distinct PCM ArrayBuffer of a prepared bank, for a zero-copy transfer. */
export function pcmTransferList(instrument: PreparedLiveInstrument): ArrayBuffer[] {
  const { source, derived } = pcmBuffers(instrument)
  return [...new Set([...source, ...derived])]
}

/** Bytes of source and derived PCM, counted once per distinct buffer. */
export function preparedPcmBytes(instrument: PreparedLiveInstrument): { source: number; derived: number } {
  const { source, derived } = pcmBuffers(instrument)
  const sum = (buffers: Set<ArrayBuffer>) => [...buffers].reduce((total, buffer) => total + buffer.byteLength, 0)
  return { source: sum(source), derived: sum(derived) }
}
