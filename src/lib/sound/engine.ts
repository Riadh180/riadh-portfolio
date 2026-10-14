import { BEDS, type Bed, bedWeights } from './beds'

/** Master level: ambience is felt more than heard. */
const MASTER = 0.14
const FADE = 1.2

type Voice = { gain: GainNode }

/**
 * The site's sound, synthesised with Web Audio (no files): an ambient bed per place that
 * crossfades along the journey, and soft interaction sounds. Created on first enable
 * (a user gesture); everything fades, nothing starts abruptly.
 */
class SoundEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private voices: Voice[] = []
  private noise: AudioBuffer | null = null
  private calm = false
  private on = false

  /** Turns sound on or off (fading); `calm` (reduced motion) drops the sharp sounds. */
  setEnabled(on: boolean, calm: boolean) {
    this.on = on
    this.calm = calm
    if (on) this.start()
    if (!this.context || !this.master) return
    const now = this.context.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setTargetAtTime(on ? MASTER : 0, now, FADE / 3)
    if (on) void this.context.resume()
  }

  /** Follows the journey: each place's bed rises and falls with the camera. */
  setProgress(progress: number) {
    if (!this.context || !this.on) return
    const now = this.context.currentTime
    bedWeights(progress).forEach((weight, i) => {
      const bed = BEDS[i]
      this.voices[i]?.gain.gain.setTargetAtTime(weight * (bed?.level ?? 1), now, 0.6)
    })
  }

  /** A soft tick when something reacts to the cursor. */
  tick() {
    if (this.calm) return
    this.blip(2400, 0.035, 0.05)
  }

  /** A card opens (rising air) or closes (falling). */
  open() {
    this.whoosh(300, 2400, 0.7, 0.16)
    this.blip(880, 0.4, 0.04, 0.12)
  }

  close() {
    this.whoosh(2000, 260, 0.6, 0.12)
  }

  /** A nav flight between places: a long, low rush. */
  flight() {
    this.whoosh(140, 900, 1.4, 0.18)
  }

  private start() {
    if (this.context) return
    const Context = window.AudioContext
    if (!Context) return
    const context = new Context()
    const compressor = context.createDynamicsCompressor()
    const master = context.createGain()
    master.gain.value = 0
    master.connect(compressor).connect(context.destination)
    this.context = context
    this.master = master
    this.noise = this.createNoise(context)
    this.voices = BEDS.map((bed) => this.createBed(context, master, bed))
  }

  private createBed(context: AudioContext, out: AudioNode, bed: Bed): Voice {
    const gain = context.createGain()
    gain.gain.value = 0
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = bed.cutoff
    filter.Q.value = 0.7
    // The filter breathes slowly.
    const lfo = context.createOscillator()
    const depth = context.createGain()
    lfo.frequency.value = bed.rate
    depth.gain.value = bed.sweep
    lfo.connect(depth).connect(filter.frequency)
    lfo.start()
    bed.tones.forEach((frequency, i) => {
      for (const detune of [-6, 5]) {
        const oscillator = context.createOscillator()
        oscillator.type = bed.wave
        oscillator.frequency.value = frequency
        oscillator.detune.value = detune + i
        const level = context.createGain()
        level.gain.value = 0.18 / (1 + i * 0.6)
        oscillator.connect(level).connect(filter)
        oscillator.start()
      }
    })
    if (this.noise) {
      const source = context.createBufferSource()
      source.buffer = this.noise
      source.loop = true
      const level = context.createGain()
      level.gain.value = bed.noise
      source.connect(level).connect(filter)
      source.start()
    }
    filter.connect(gain).connect(out)
    return { gain }
  }

  /** Brownish noise: soft air rather than hiss. */
  private createNoise(context: AudioContext) {
    const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      data[i] = last * 3.5
    }
    return buffer
  }

  private blip(frequency: number, length: number, level: number, attack = 0.004) {
    if (!this.context || !this.master || !this.on) return
    const now = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(level, now + (this.calm ? Math.max(attack, 0.08) : attack))
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length + attack)
    oscillator.connect(gain).connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + length + attack + 0.05)
  }

  private whoosh(from: number, to: number, length: number, level: number) {
    if (!this.context || !this.master || !this.noise || !this.on) return
    const now = this.context.currentTime
    const source = this.context.createBufferSource()
    source.buffer = this.noise
    const filter = this.context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 1.2
    filter.frequency.setValueAtTime(from, now)
    filter.frequency.exponentialRampToValueAtTime(to, now + length)
    const gain = this.context.createGain()
    // Reduced motion: a slower swell, never a sudden rush.
    const attack = this.calm ? length * 0.5 : length * 0.3
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(level * (this.calm ? 0.6 : 1), now + attack)
    gain.gain.linearRampToValueAtTime(0, now + length)
    source.connect(filter).connect(gain).connect(this.master)
    source.start(now)
    source.stop(now + length + 0.05)
  }
}

export const sound = new SoundEngine()

// Development only: lets test scripts inspect the audio state.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  ;(window as unknown as { __sound?: SoundEngine }).__sound = sound
}
