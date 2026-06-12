import {
  AUDIO_EXPLOSION,
  AUDIO_LASER,
  AUDIO_VOICE_BUDGETS,
} from '../data/audio'
import type { AudioEngine } from './engine'

const NOISE_BUFFERS = new WeakMap<BaseAudioContext, AudioBuffer>()

function noise(ctx: BaseAudioContext): AudioBuffer {
  let buffer = NOISE_BUFFERS.get(ctx)
  if (buffer) return buffer
  buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  NOISE_BUFFERS.set(ctx, buffer)
  return buffer
}

function makeVoice(e: AudioEngine, name: string, seconds: number, gain: number, pan = 0): GainNode {
  const ctx = e.ctx
  const out = ctx.createGain()
  out.gain.value = gain
  const panner = ctx.createStereoPanner()
  panner.pan.value = clamp(pan, -1, 1)
  out.connect(panner).connect(e.sfxBus)
  globalThis.setTimeout(() => {
    e.releaseVoice(name)
    disconnect(out)
    disconnect(panner)
  }, seconds * 1000 + 120)
  return out
}

export function explosion(e: AudioEngine, size: number, pan = 0): void {
  const scale = e.allocVoice('boom', AUDIO_VOICE_BUDGETS.boom)
  if (scale === null) return

  const ctx = e.ctx
  const t = ctx.currentTime
  const normalizedSize = clamp(size, AUDIO_EXPLOSION.minSize, AUDIO_EXPLOSION.maxSize)
  const dur = 0.25 + normalizedSize * 1.2
  const jitter = 1 - AUDIO_EXPLOSION.detuneJitter + Math.random() * AUDIO_EXPLOSION.detuneJitter * 2
  const out = makeVoice(e, 'boom', dur, 0.55 * scale, pan)

  const body = ctx.createOscillator()
  body.type = 'sine'
  body.frequency.setValueAtTime(Math.max(50, 150 - normalizedSize * 180) * jitter, t)
  body.frequency.exponentialRampToValueAtTime(38, t + dur * 0.8)
  const bodyGain = ctx.createGain()
  bodyGain.gain.setValueAtTime(1, t)
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  body.connect(bodyGain).connect(out)
  body.start(t)
  body.stop(t + dur)

  const debris = ctx.createBufferSource()
  debris.buffer = noise(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(2600 * jitter, t)
  filter.frequency.exponentialRampToValueAtTime(120, t + dur)
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.8, t)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  debris.connect(filter).connect(noiseGain).connect(out)
  debris.start(t)
  debris.stop(t + dur)

  e.duckMusic(0.3 + normalizedSize)
}

export function earthHit(e: AudioEngine, pan = 0): void {
  const scale = e.allocVoice('earth-hit', AUDIO_VOICE_BUDGETS.earthHit)
  if (scale === null) return

  const ctx = e.ctx
  const t = ctx.currentTime
  const out = makeVoice(e, 'earth-hit', 1.2, 0.8 * scale, pan * 0.4)

  const sub = ctx.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(70, t)
  sub.frequency.exponentialRampToValueAtTime(24, t + 0.9)
  const subGain = ctx.createGain()
  subGain.gain.setValueAtTime(1, t)
  subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1)
  sub.connect(subGain).connect(out)
  sub.start(t)
  sub.stop(t + 1.1)

  const rumble = ctx.createBufferSource()
  rumble.buffer = noise(ctx)
  const rumbleFilter = ctx.createBiquadFilter()
  rumbleFilter.type = 'lowpass'
  rumbleFilter.frequency.value = 160
  const rumbleGain = ctx.createGain()
  rumbleGain.gain.setValueAtTime(0.6, t)
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0)
  rumble.connect(rumbleFilter).connect(rumbleGain).connect(out)
  rumble.start(t)
  rumble.stop(t + 1.0)

  const pip = ctx.createOscillator()
  pip.type = 'square'
  pip.frequency.value = 392
  const pipGain = ctx.createGain()
  pipGain.gain.setValueAtTime(0.12, t + 0.05)
  pipGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
  pip.connect(pipGain).connect(out)
  pip.start(t + 0.05)
  pip.stop(t + 0.25)

  e.duckMusic(1)
}

export function launch(e: AudioEngine): void {
  const scale = e.allocVoice('launch', AUDIO_VOICE_BUDGETS.launch)
  if (scale === null) return

  const ctx = e.ctx
  const t = ctx.currentTime
  const out = makeVoice(e, 'launch', 0.6, 0.5 * scale)

  const whoosh = ctx.createBufferSource()
  whoosh.buffer = noise(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(180, t)
  filter.frequency.exponentialRampToValueAtTime(1400, t + 0.45)
  const whooshGain = ctx.createGain()
  whooshGain.gain.setValueAtTime(0.0001, t)
  whooshGain.gain.exponentialRampToValueAtTime(0.7, t + 0.12)
  whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
  whoosh.connect(filter).connect(whooshGain).connect(out)
  whoosh.start(t)
  whoosh.stop(t + 0.6)

  const chirp = ctx.createOscillator()
  chirp.type = 'triangle'
  chirp.frequency.setValueAtTime(330, t)
  chirp.frequency.exponentialRampToValueAtTime(660, t + 0.25)
  const chirpGain = ctx.createGain()
  chirpGain.gain.setValueAtTime(0.15, t)
  chirpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
  chirp.connect(chirpGain).connect(out)
  chirp.start(t)
  chirp.stop(t + 0.3)
}

export function waveStart(e: AudioEngine): void {
  const scale = e.allocVoice('wave-alert', AUDIO_VOICE_BUDGETS.waveAlert)
  if (scale === null) return

  const ctx = e.ctx
  const t = ctx.currentTime
  const out = makeVoice(e, 'wave-alert', 1.6, 0.35 * scale)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 2200
  filter.connect(out)

  const tones = [440, 311]
  for (let i = 0; i < 6; i++) {
    const tone = ctx.createOscillator()
    tone.type = 'square'
    tone.frequency.value = tones[i % 2]
    const gain = ctx.createGain()
    const t0 = t + i * 0.22
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(1, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16)
    tone.connect(gain).connect(filter)
    tone.start(t0)
    tone.stop(t0 + 0.2)
  }
  e.duckMusic(0.8)
}

export function waveCleared(e: AudioEngine): void {
  const scale = e.allocVoice('fanfare', AUDIO_VOICE_BUDGETS.fanfare)
  if (scale === null) return

  const ctx = e.ctx
  const t = ctx.currentTime
  const out = makeVoice(e, 'fanfare', 1.2, 0.3 * scale)
  const notes = [440, 523.25, 659.25, 880]

  notes.forEach((freq, index) => {
    const t0 = t + index * 0.09
    const hold = index === notes.length - 1 ? 0.5 : 0.12
    playBlip(ctx, out, 'square', freq, 1, t0, hold)
    playBlip(ctx, out, 'triangle', freq * 0.5, 0.7, t0, hold)
  })

  e.duckMusic(1)
}

export function gameOver(e: AudioEngine): void {
  const scale = e.allocVoice('gameover', AUDIO_VOICE_BUDGETS.gameOver)
  if (scale === null) return

  const ctx = e.ctx
  const t = ctx.currentTime
  const out = makeVoice(e, 'gameover', 3.2, 0.4 * scale)
  const steps: Array<[number, number]> = [
    [220, 0.0],
    [164.81, 0.6],
    [130.81, 1.2],
    [110, 1.8],
  ]

  e.fadeMusicTo(0, 0.25)
  for (const [freq, offset] of steps) {
    for (const detune of [-7, 7]) {
      const saw = ctx.createOscillator()
      saw.type = 'sawtooth'
      saw.frequency.value = freq
      saw.detune.value = detune
      const gain = ctx.createGain()
      const t0 = t + offset
      const hold = offset >= 1.8 ? 1.3 : 0.7
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + hold)
      saw.connect(gain).connect(out)
      saw.start(t0)
      saw.stop(t0 + hold + 0.1)
    }
  }

  const sub = ctx.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(55, t + 1.8)
  sub.frequency.exponentialRampToValueAtTime(28, t + 3.0)
  const subGain = ctx.createGain()
  subGain.gain.setValueAtTime(0.8, t + 1.8)
  subGain.gain.exponentialRampToValueAtTime(0.001, t + 3.1)
  sub.connect(subGain).connect(out)
  sub.start(t + 1.8)
  sub.stop(t + 3.1)
}

export class LaserVoice {
  private readonly oscA: OscillatorNode
  private readonly oscB: OscillatorNode
  private readonly filter: BiquadFilterNode
  private readonly gain: GainNode
  private readonly panner: StereoPannerNode
  private stopped = false

  constructor(private readonly engine: AudioEngine, pan = 0) {
    const ctx = engine.ctx
    this.oscA = ctx.createOscillator()
    this.oscA.type = 'sawtooth'
    this.oscA.frequency.value = AUDIO_LASER.baseFrequency

    this.oscB = ctx.createOscillator()
    this.oscB.type = 'sawtooth'
    this.oscB.frequency.value = AUDIO_LASER.baseFrequency
    this.oscB.detune.value = AUDIO_LASER.beatDetuneCents

    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = AUDIO_LASER.minFilterHz
    this.filter.Q.value = 2

    this.gain = ctx.createGain()
    this.gain.gain.value = 0
    this.panner = ctx.createStereoPanner()
    this.panner.pan.value = clamp(pan, -1, 1)

    this.oscA.connect(this.filter)
    this.oscB.connect(this.filter)
    this.filter.connect(this.gain).connect(this.panner).connect(engine.sfxBus)
    this.oscA.start()
    this.oscB.start()
    this.gain.gain.setTargetAtTime(AUDIO_LASER.voiceGain, ctx.currentTime, AUDIO_LASER.fadeInTime)
  }

  setHeat(heat: number): void {
    if (this.stopped) return
    const t = this.engine.ctx.currentTime
    const clampedHeat = clamp(heat, 0, 1)
    const heatDetune = clampedHeat * AUDIO_LASER.maxHeatDetuneCents
    this.oscA.detune.setTargetAtTime(heatDetune, t, 0.1)
    this.oscB.detune.setTargetAtTime(AUDIO_LASER.beatDetuneCents + heatDetune, t, 0.1)
    this.filter.frequency.setTargetAtTime(
      AUDIO_LASER.minFilterHz + (AUDIO_LASER.maxFilterHz - AUDIO_LASER.minFilterHz) * clampedHeat,
      t,
      0.1,
    )
  }

  setPan(pan: number): void {
    if (this.stopped) return
    this.panner.pan.setTargetAtTime(clamp(pan, -1, 1), this.engine.ctx.currentTime, 0.08)
  }

  stop(): void {
    if (this.stopped) return
    this.stopped = true
    const ctx = this.engine.ctx
    const t = ctx.currentTime
    this.gain.gain.cancelScheduledValues(t)
    this.gain.gain.setTargetAtTime(0, t, AUDIO_LASER.fadeOutTime)
    this.oscA.stop(t + AUDIO_LASER.stopDelaySec)
    this.oscB.stop(t + AUDIO_LASER.stopDelaySec)
    globalThis.setTimeout(() => {
      disconnect(this.oscA)
      disconnect(this.oscB)
      disconnect(this.filter)
      disconnect(this.gain)
      disconnect(this.panner)
    }, (AUDIO_LASER.stopDelaySec + 0.1) * 1000)
  }
}

function playBlip(
  ctx: AudioContext,
  destination: AudioNode,
  type: OscillatorType,
  freq: number,
  amp: number,
  startAt: number,
  hold: number,
): void {
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.value = freq
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(amp, startAt + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + hold)
  osc.connect(gain).connect(destination)
  osc.start(startAt)
  osc.stop(startAt + hold + 0.05)
}

function disconnect(node: AudioNode): void {
  try {
    node.disconnect()
  } catch {
    // The node may already have been GC-disconnected by the browser.
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
