import type { LiveOrbitSends } from './liveShaping'

// The impulse recipe is adapted from reverbGen.mjs, Copyright 2014 Alan deLespinasse.
// Licensed under the Apache License, Version 2.0 (licenses/Apache-2.0.txt).
// Changes: promise-based generation, local native nodes, no window/debug state.
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and limitations.

/** Same noise/fade/swept lowpass recipe as superdough's reverbGen (Apache-2.0,
 * Copyright 2014 Alan deLespinasse). Native convolution retains phone headroom. */
export async function createRoomImpulse(context: BaseAudioContext, random = Math.random): Promise<AudioBuffer> {
  const rate = context.sampleRate
  const frames = Math.round(3 * rate)
  const fade = Math.round(.1 * rate)
  const decayBase = Math.pow(1 / 1000, 1 / Math.round(2 * rate))
  const buffer = context.createBuffer(2, frames, rate)
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    for (let frame = 0; frame < frames; frame++) data[frame] = (random() * 2 - 1) * Math.pow(decayBase, frame)
    for (let frame = 0; frame < fade; frame++) data[frame] *= frame / fade
  }
  const offline = new OfflineAudioContext(2, frames, rate)
  const source = offline.createBufferSource()
  source.buffer = buffer
  const filter = offline.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = .0001
  filter.frequency.setValueAtTime(Math.min(15000, rate / 2), 0)
  filter.frequency.linearRampToValueAtTime(Math.min(1000, rate / 2), 2)
  source.connect(filter).connect(offline.destination)
  source.start()
  try { return await offline.startRendering() }
  finally { source.disconnect(); filter.disconnect() }
}

function stereo(context: BaseAudioContext) {
  return new GainNode(context, { channelCount: 2, channelCountMode: 'explicit' })
}

/** Stable input buses survive a sample-rate rebuild; only effect nodes change. */
export class EffectOrbit implements LiveOrbitSends {
  readonly output: GainNode
  readonly summingNode: GainNode
  readonly roomInput: GainNode
  readonly delayInput: GainNode
  private delay?: DelayNode
  private feedback?: GainNode
  private wet?: GainNode
  private convolver?: ConvolverNode
  private roomReady?: Promise<void>
  private generation = 0
  private roomWarningLogged = false
  constructor(private context: BaseAudioContext, destination: AudioNode) {
    this.output = stereo(context)
    this.summingNode = stereo(context)
    this.roomInput = stereo(context)
    this.delayInput = stereo(context)
    this.summingNode.connect(this.output).connect(destination)
  }
  connectToOutput(node: AudioNode) { node.connect(this.summingNode) }
  getDelay(time = .25, feedback = .3, at = this.context.currentTime): AudioNode {
    if (!this.delay) {
      this.delay = new DelayNode(this.context, { delayTime: time })
      this.feedback = new GainNode(this.context, { gain: feedback })
      this.wet = new GainNode(this.context, { gain: 1 })
      this.delayInput.connect(this.delay)
      this.delay.connect(this.feedback).connect(this.delay)
      this.delay.connect(this.wet).connect(this.summingNode)
      // Match feedbackdelay.start(t): first wet automation is at t + delayTime.
      // Its default gain is already 1; setting it to zero here would change PCM.
      this.wet.gain.setValueAtTime(1, at + time)
    }
    this.delay.delayTime.setValueAtTime(time, at)
    this.feedback!.gain.setValueAtTime(Math.max(0, Math.min(.98, feedback)), at)
    return this.delayInput
  }
  getReverb(): AudioNode {
    if (!this.roomReady) {
      const generation = this.generation
      const convolver = this.convolver = new ConvolverNode(this.context)
      this.roomInput.connect(convolver).connect(this.summingNode)
      this.roomReady = createRoomImpulse(this.context).then(buffer => {
        if (generation === this.generation) convolver.buffer = buffer
      }).catch(error => {
        if (generation === this.generation) {
          this.roomInput.disconnect(convolver); convolver.disconnect()
          this.convolver = undefined
          if (!this.roomWarningLogged) {
            this.roomWarningLogged = true
            console.warn("Room reverb unavailable; continuing with dry audio and delay", error)
          }
        }
      })
    }
    return this.roomInput
  }
  async ready() { this.getReverb(); await this.roomReady }
  sendDelay(from: AudioNode, amount: number): GainNode { return this.send(from, this.delayInput, amount) }
  sendReverb(from: AudioNode, amount: number): GainNode { return this.send(from, this.roomInput, amount) }
  private send(from: AudioNode, to: AudioNode, amount: number) {
    const send = new GainNode(this.context, { gain: amount })
    from.connect(send).connect(to)
    return send
  }
  async rebuild() {
    const hadDelay = !!this.delay
    const time = this.delay?.delayTime.value ?? .25
    const feedback = this.feedback?.gain.value ?? .3
    const hadRoom = !!this.convolver
    this.disconnectEffects()
    if (hadDelay) this.getDelay(time, feedback)
    if (hadRoom) await this.ready()
  }
  private disconnectEffects() {
    this.generation++
    this.roomInput.disconnect(); this.delayInput.disconnect()
    this.delay?.disconnect(); this.feedback?.disconnect(); this.wet?.disconnect(); this.convolver?.disconnect()
    this.delay = undefined; this.feedback = undefined; this.wet = undefined; this.convolver = undefined
    this.roomReady = undefined
  }
  disconnect() {
    this.disconnectEffects()
    this.output.disconnect(); this.summingNode.disconnect()
  }
}

/** Temporary superdough adapter. It creates no context, master or effect nodes. */
export class EngineAudioGraph {
  readonly master: GainNode
  readonly output: { destinationGain: GainNode; connectToDestination: (node: AudioNode) => void }
  readonly nodes: Record<string, EffectOrbit> = {}
  readonly buses: Record<string, GainNode> = {}
  constructor(readonly audioContext: BaseAudioContext) {
    this.master = stereo(audioContext)
    this.master.connect(audioContext.destination)
    this.output = { destinationGain: this.master, connectToDestination: node => { node.connect(this.master) } }
  }
  getOrbit(id: number, _channels?: number[]): EffectOrbit {
    return this.nodes[id] ??= new EffectOrbit(this.audioContext, this.master)
  }
  getBus(id: number) { return this.buses[id] ??= stereo(this.audioContext) }
  async rebuildEffects() { await Promise.all(Object.values(this.nodes).map(orbit => orbit.rebuild())) }
  reset() {
    for (const [id, orbit] of Object.entries(this.nodes)) { orbit.disconnect(); delete this.nodes[id] }
    for (const [id, bus] of Object.entries(this.buses)) { bus.disconnect(); delete this.buses[id] }
  }
}
