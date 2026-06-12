import type { Phase, SimState } from '../sim/types'
import { AUDIO_MUSIC } from '../data/audio'
import type { AudioEngine } from './engine'

interface StemSet {
  pad: [number, number, number]
  arp: number[]
  bass: number[]
  lead: number[]
}

interface MusicNodes {
  padGain: GainNode
  arpGain: GainNode
  bassGain: GainNode
  drumGain: GainNode
  leadGain: GainNode
  padFilter: BiquadFilterNode
  padOsc: OscillatorNode[]
  bassOsc: OscillatorNode
}

const SETS: StemSet[] = [
  {
    pad: [110, 164.81, 261.63],
    arp: [440, 523.25, 659.25, 880, 659.25, 523.25],
    bass: [55, 55, 82.41, 65.41],
    lead: [880, 783.99, 659.25, 587.33],
  },
  {
    pad: [98, 146.83, 220],
    arp: [392, 440, 523.25, 659.25, 783.99, 659.25],
    bass: [49, 55, 73.42, 55],
    lead: [783.99, 880, 987.77, 880],
  },
  {
    pad: [82.41, 130.81, 220],
    arp: [329.63, 440, 493.88, 659.25, 587.33, 493.88],
    bass: [41.2, 55, 65.41, 55],
    lead: [659.25, 587.33, 493.88, 440],
  },
]

export class MusicDirector {
  private nodes: MusicNodes | null = null
  private phase: Phase = 'build'
  private setIndex = 0
  private threatAtWaveStart = 1
  private nextStepTime = 0
  private stepIndex = 0
  private intensity = 0
  private noiseBuffer: AudioBuffer | null = null

  constructor(private readonly engine: AudioEngine) {}

  setPhase(phase: Phase, _waveNumber: number): void {
    this.phase = phase
    if (phase === 'build') {
      this.setIndex = Math.floor(Math.max(0, _waveNumber - 1) / AUDIO_MUSIC.rotateEveryWaves) % SETS.length
      this.threatAtWaveStart = 1
    }
    if (phase === 'gameover') {
      this.engine.fadeMusicTo(0, 0.25)
      return
    }
    this.engine.fadeMusicTo(1, phase === 'wave' ? 1.5 : 0.35)
  }

  update(state: SimState): void {
    if (!this.engine.ready) return
    this.ensureStarted()
    if (!this.nodes) return

    if (state.phase === 'wave' && this.phase !== 'wave') this.setPhase('wave', state.waveNumber)
    if (state.phase === 'build' && this.phase !== 'build') this.setPhase('build', state.waveNumber)
    if (state.phase === 'gameover' && this.phase !== 'gameover') this.setPhase('gameover', state.waveNumber)

    if (state.phase === 'wave') {
      const threat = state.enemies.length + state.spawnQueue.length
      if (this.threatAtWaveStart <= 1 && threat > 0) this.threatAtWaveStart = threat
      this.intensity = this.computeIntensity(state, threat)
    } else if (state.phase === 'build') {
      this.intensity = 0
    }

    this.applyStemGains()
    this.schedulePattern()
  }

  gameOver(): void {
    this.engine.fadeMusicTo(0, 0.25)
  }

  reset(): void {
    this.phase = 'build'
    this.setIndex = 0
    this.threatAtWaveStart = 1
    this.intensity = 0
    this.engine.fadeMusicTo(1, 0.2)
    this.applyStemGains()
  }

  private ensureStarted(): void {
    if (this.nodes) return
    const ctx = this.engine.ctx
    const padGain = ctx.createGain()
    const arpGain = ctx.createGain()
    const bassGain = ctx.createGain()
    const drumGain = ctx.createGain()
    const leadGain = ctx.createGain()
    const padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.value = AUDIO_MUSIC.filterBuildHz
    padFilter.Q.value = 0.6

    padGain.gain.value = 0
    arpGain.gain.value = 0
    bassGain.gain.value = 0
    drumGain.gain.value = 0
    leadGain.gain.value = 0

    const set = SETS[this.setIndex]
    const padOsc = set.pad.map((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = i === 1 ? 'triangle' : 'sawtooth'
      osc.frequency.value = freq
      osc.detune.value = i === 0 ? -6 : i === 2 ? 5 : 0
      osc.connect(padFilter)
      osc.start()
      return osc
    })
    padFilter.connect(padGain).connect(this.engine.musicBus)

    const bassOsc = ctx.createOscillator()
    bassOsc.type = 'sawtooth'
    bassOsc.frequency.value = set.bass[0]
    const bassFilter = ctx.createBiquadFilter()
    bassFilter.type = 'lowpass'
    bassFilter.frequency.value = 240
    bassOsc.connect(bassFilter).connect(bassGain).connect(this.engine.musicBus)
    bassOsc.start()

    arpGain.connect(this.engine.musicBus)
    drumGain.connect(this.engine.musicBus)
    leadGain.connect(this.engine.musicBus)

    this.nodes = { padGain, arpGain, bassGain, drumGain, leadGain, padFilter, padOsc, bassOsc }
    this.nextStepTime = ctx.currentTime + 0.05
    this.applyStemGains()
  }

  private computeIntensity(state: SimState, threat: number): number {
    let closest = Infinity
    for (const enemy of state.enemies) closest = Math.min(closest, Math.hypot(enemy.pos.x, enemy.pos.y))
    const proximity = Number.isFinite(closest) ? clamp01((1.85 - closest) / 0.85) : 0
    const progress = clamp01(1 - threat / Math.max(1, this.threatAtWaveStart))
    const danger = 1 - state.earthHp / state.earthMaxHp
    const floor = Math.min(0.25 + state.waveNumber * 0.03, 0.55)
    const boss = state.waveNumber % 5 === 0 ? 0.18 : 0
    return clamp01(Math.max(floor, danger) + proximity * 0.35 + progress * 0.12 + boss)
  }

  private applyStemGains(): void {
    if (!this.nodes || !this.engine.hasContext) return
    const ctx = this.engine.ctx
    const t = ctx.currentTime
    const isWave = this.phase === 'wave'
    const pad = AUDIO_MUSIC.padGain * (this.phase === 'gameover' ? 0 : 1)
    const arp = this.phase === 'gameover'
      ? 0
      : isWave
        ? lerp(AUDIO_MUSIC.buildArpGain, AUDIO_MUSIC.waveArpGain, this.intensity)
        : AUDIO_MUSIC.buildArpGain
    const bass = isWave ? AUDIO_MUSIC.bassGain * clamp01((this.intensity - 0.18) / 0.35) : 0
    const drums = isWave ? AUDIO_MUSIC.drumGain * clamp01((this.intensity - 0.34) / 0.4) : 0
    const lead = isWave ? AUDIO_MUSIC.leadGain * clamp01((this.intensity - 0.72) / 0.2) : 0
    this.nodes.padGain.gain.setTargetAtTime(pad, t, AUDIO_MUSIC.fadeTimeSec)
    this.nodes.arpGain.gain.setTargetAtTime(arp, t, AUDIO_MUSIC.fadeTimeSec)
    this.nodes.bassGain.gain.setTargetAtTime(bass, t, AUDIO_MUSIC.fadeTimeSec)
    this.nodes.drumGain.gain.setTargetAtTime(drums, t, AUDIO_MUSIC.fadeTimeSec * 0.65)
    this.nodes.leadGain.gain.setTargetAtTime(lead, t, AUDIO_MUSIC.fadeTimeSec * 0.8)
    this.nodes.padFilter.frequency.setTargetAtTime(
      lerp(AUDIO_MUSIC.filterBuildHz, AUDIO_MUSIC.filterWaveHz, isWave ? this.intensity : 0),
      t,
      0.6,
    )

    const set = SETS[this.setIndex]
    this.nodes.padOsc.forEach((osc, i) => osc.frequency.setTargetAtTime(set.pad[i], t, 2.5))
    const bassStep = Math.floor(this.stepIndex / 8) % set.bass.length
    this.nodes.bassOsc.frequency.setTargetAtTime(set.bass[bassStep], t, 0.06)
  }

  private schedulePattern(): void {
    if (!this.nodes) return
    const ctx = this.engine.ctx
    while (this.nextStepTime < ctx.currentTime + AUDIO_MUSIC.schedulerLookaheadSec) {
      this.scheduleStep(this.nextStepTime, this.stepIndex)
      this.stepIndex += 1
      this.nextStepTime += AUDIO_MUSIC.schedulerStepSec
    }
  }

  private scheduleStep(time: number, step: number): void {
    if (!this.nodes) return
    const set = SETS[this.setIndex]
    const isWave = this.phase === 'wave'
    if (step % (isWave ? 2 : 4) === 0) {
      const note = set.arp[Math.floor(step / (isWave ? 2 : 4)) % set.arp.length]
      this.playTone(time, note, 0.12, 'square', this.nodes.arpGain, 0.22)
      this.playTone(time, note * 0.5, 0.18, 'triangle', this.nodes.arpGain, 0.12)
    }

    if (isWave && this.intensity > 0.35) {
      if (step % 4 === 0) this.playKick(time)
      if (step % 2 === 1) this.playHat(time)
    }

    if (isWave && this.intensity > 0.74 && step % 16 === 8) {
      const note = set.lead[(step / 8) % set.lead.length]
      this.playTone(time, note, 0.32, 'sawtooth', this.nodes.leadGain, 0.28)
    }
  }

  private playTone(
    start: number,
    freq: number,
    length: number,
    type: OscillatorType,
    destination: AudioNode,
    gainValue: number,
  ): void {
    const ctx = this.engine.ctx
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
    osc.connect(gain).connect(destination)
    osc.start(start)
    osc.stop(start + length + 0.04)
    osc.onended = () => {
      disconnect(osc)
      disconnect(gain)
    }
  }

  private playKick(start: number): void {
    if (!this.nodes) return
    const ctx = this.engine.ctx
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(82, start)
    osc.frequency.exponentialRampToValueAtTime(42, start + 0.16)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, start)
    gain.gain.exponentialRampToValueAtTime(0.7, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22)
    osc.connect(gain).connect(this.nodes.drumGain)
    osc.start(start)
    osc.stop(start + 0.25)
    osc.onended = () => {
      disconnect(osc)
      disconnect(gain)
    }
  }

  private playHat(start: number): void {
    if (!this.nodes) return
    const ctx = this.engine.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.getNoiseBuffer()
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 5000
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, start)
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.055)
    src.connect(filter).connect(gain).connect(this.nodes.drumGain)
    src.start(start)
    src.stop(start + 0.07)
    src.onended = () => {
      disconnect(src)
      disconnect(filter)
      disconnect(gain)
    }
  }

  private getNoiseBuffer(): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer
    const ctx = this.engine.ctx
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuffer = buffer
    return buffer
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t)
}

function disconnect(node: AudioNode): void {
  try {
    node.disconnect()
  } catch {
    // Already disconnected.
  }
}
