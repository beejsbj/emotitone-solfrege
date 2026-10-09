/* Standalone experiment. No production engine imports or messages per beat. */
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = new Float32Array(sampleRate * 30);
    this.length = 0;
    this.startFrame = 0;
    this.recording = false;
    this.port.onmessage = ({ data }) => {
      if (data === 'start') {
        this.length = 0;
        this.startFrame = currentFrame;
        this.recording = true;
        this.port.postMessage({ type: 'started', frame: currentFrame });
      } else if (data === 'stop') {
        this.recording = false;
        const pcm = this.samples.slice(0, this.length);
        this.port.postMessage({ type: 'pcm', pcm, startFrame: this.startFrame }, [pcm.buffer]);
      }
    };
  }
  process(inputs, outputs) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    if (input) output.set(input);
    if (this.recording && this.length + output.length <= this.samples.length) {
      this.samples.set(output, this.length);
      this.length += output.length;
    }
    return true;
  }
}

class SampleInstrument extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sample = new Float32Array(0);
    this.held = [];
    this.voices = [];
    this.mode = 'repeat';
    this.step = sampleRate / 8;
    this.next = Infinity;
    this.index = 0;
    this.maxVoices = 16;
    this.peakVoices = 0;
    this.triggered = 0;
    this.attackFrames = sampleRate * 0.001;
    this.port.onmessage = ({ data }) => {
      if (data.type === 'sample') this.sample = data.pcm;
      if (data.type === 'held') {
        const previous = new Set(data.notes);
        for (const voice of this.voices) {
          if (!previous.has(voice.note)) voice.release = sampleRate * 0.005;
        }
        const wasEmpty = !this.held.length;
        this.held = data.notes.slice(0, this.maxVoices);
        this.mode = data.mode || this.mode;
        const oldStep = this.step;
        this.step = Math.max(128, sampleRate * (data.interval || 0.125));
        if (wasEmpty && this.held.length) {
          this.next = Math.max(currentFrame, Math.round((data.at || 0) * sampleRate));
          this.index = 0;
        } else if (!this.held.length) this.next = Infinity;
        else if (this.next !== Infinity) {
          this.next = currentFrame + Math.max(0, (this.next - currentFrame) / oldStep) * this.step;
        }
      }
      if (data.type === 'stats') {
        this.port.postMessage({ type: 'stats', active: this.voices.length, peak: this.peakVoices, triggered: this.triggered });
      }
    };
  }
  trigger(note) {
    if (this.voices.length >= this.maxVoices) {
      const releasing = this.voices.findIndex((voice) => voice.release !== undefined);
      this.voices.splice(releasing < 0 ? 0 : releasing, 1);
    }
    this.voices.push({ note, position: 0, age: 0, rate: 2 ** ((note - 69) / 12) });
    this.peakVoices = Math.max(this.peakVoices, this.voices.length);
    this.triggered++;
  }
  process(_inputs, outputs) {
    const out = outputs[0][0];
    for (let i = 0; i < out.length; i++) {
      if (this.held.length && currentFrame + i >= this.next) {
        const notes = this.mode === 'arp' ? [this.held[this.index++ % this.held.length]] : this.held;
        for (const note of notes) this.trigger(note);
        this.next += this.step;
      }
      let value = 0;
      for (let j = this.voices.length - 1; j >= 0; j--) {
        const voice = this.voices[j];
        if (voice.position >= this.sample.length - 1 || voice.release <= 0) {
          this.voices.splice(j, 1);
          continue;
        }
        const index = Math.floor(voice.position);
        const fraction = voice.position - index;
        const pcm = this.sample[index] + (this.sample[index + 1] - this.sample[index]) * fraction;
        const release = voice.release === undefined ? 1 : voice.release-- / (sampleRate * 0.005);
        value += pcm * 0.8 * Math.min(1, voice.age++ / this.attackFrames) * release;
        voice.position += voice.rate;
      }
      out[i] = value;
    }
    return true;
  }
}
registerProcessor('lab-capture', PcmCapture);
registerProcessor('lab-sample-instrument', SampleInstrument);
