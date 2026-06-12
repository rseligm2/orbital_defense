import {
  AUDIO_BUS_GAINS,
  AUDIO_DUCKING,
  AUDIO_LIMITER,
  type AudioVoiceBudget,
} from '../data/audio'

type AudioGlobal = typeof globalThis & {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

export interface AudioTriggerLogEntry {
  name: string
  t: number
}

export class AudioEngine {
  private context: AudioContext | null = null
  private unavailable = false
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private duckGain: GainNode | null = null
  private unlockHandler: (() => void) | null = null
  private muted = false
  private paused = false
  private readonly lastAt = new Map<string, number>()
  private readonly liveCount = new Map<string, number>()
  readonly triggerLog: AudioTriggerLogEntry[] = []

  constructor() {
    this.installUnlockListeners()
  }

  get ready(): boolean {
    return this.context?.state === 'running'
  }

  get hasContext(): boolean {
    return this.context !== null
  }

  get ctx(): AudioContext {
    if (!this.context) throw new Error('AudioContext is not available')
    return this.context
  }

  get sfxBus(): GainNode {
    if (!this.sfxGain) throw new Error('SFX bus is not available')
    return this.sfxGain
  }

  get musicBus(): GainNode {
    if (!this.musicGain) throw new Error('Music bus is not available')
    return this.musicGain
  }

  resume(): void {
    const ctx = this.ensureContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => this.removeUnlockListeners()).catch(() => undefined)
      return
    }
    if (ctx.state === 'running') this.removeUnlockListeners()
  }

  allocVoice(name: string, budget: AudioVoiceBudget): number | null {
    if (!this.ready) return null
    const now = performance.now()
    if (now - (this.lastAt.get(name) ?? -1e9) < budget.minGapMs) return null
    const live = this.liveCount.get(name) ?? 0
    if (live >= budget.maxConcurrent) return null
    this.lastAt.set(name, now)
    this.liveCount.set(name, live + 1)
    this.logTrigger(name, now)
    return 1 / Math.sqrt(live + 1)
  }

  releaseVoice(name: string): void {
    const live = this.liveCount.get(name) ?? 0
    if (live <= 1) {
      this.liveCount.delete(name)
      return
    }
    this.liveCount.set(name, live - 1)
  }

  duckMusic(weight: number): void {
    if (!this.duckGain || !this.context) return
    const t = this.context.currentTime
    const amount = Math.max(0, Math.min(1, weight))
    const floor = 1 - AUDIO_DUCKING.maxDepth * amount
    this.duckGain.gain.cancelScheduledValues(t)
    this.duckGain.gain.setTargetAtTime(floor, t, AUDIO_DUCKING.attackTime)
    this.duckGain.gain.setTargetAtTime(1, t + AUDIO_DUCKING.holdSec, AUDIO_DUCKING.releaseTime)
  }

  fadeMusicTo(level: number, seconds: number): void {
    if (!this.musicGain || !this.context) return
    const t = this.context.currentTime
    this.musicGain.gain.cancelScheduledValues(t)
    this.musicGain.gain.setTargetAtTime(clamp01(level) * AUDIO_BUS_GAINS.music, t, Math.max(0.001, seconds / 4))
  }

  setPaused(paused: boolean): void {
    this.paused = paused
    this.applySfxGain()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.applyMasterGain()
  }

  dispose(): void {
    this.removeUnlockListeners()
    if (this.context) void this.context.close()
    this.context = null
    this.masterGain = null
    this.sfxGain = null
    this.musicGain = null
    this.duckGain = null
    this.lastAt.clear()
    this.liveCount.clear()
  }

  private installUnlockListeners(): void {
    if (typeof window === 'undefined') return
    const unlock = () => this.resume()
    this.unlockHandler = unlock
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    window.addEventListener('touchstart', unlock, { capture: true })
  }

  private removeUnlockListeners(): void {
    if (!this.unlockHandler || typeof window === 'undefined') return
    window.removeEventListener('pointerdown', this.unlockHandler, { capture: true })
    window.removeEventListener('keydown', this.unlockHandler, { capture: true })
    window.removeEventListener('touchstart', this.unlockHandler, { capture: true })
    this.unlockHandler = null
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context
    if (this.unavailable) return null
    const audioGlobal = globalThis as AudioGlobal
    const AudioContextCtor = audioGlobal.AudioContext ?? audioGlobal.webkitAudioContext
    if (!AudioContextCtor) {
      this.unavailable = true
      this.removeUnlockListeners()
      return null
    }

    try {
      this.context = new AudioContextCtor()
      this.buildMixer(this.context)
      return this.context
    } catch {
      this.unavailable = true
      this.removeUnlockListeners()
      return null
    }
  }

  private buildMixer(ctx: AudioContext): void {
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = AUDIO_LIMITER.threshold
    limiter.knee.value = AUDIO_LIMITER.knee
    limiter.ratio.value = AUDIO_LIMITER.ratio
    limiter.attack.value = AUDIO_LIMITER.attack
    limiter.release.value = AUDIO_LIMITER.release

    this.masterGain = ctx.createGain()
    this.sfxGain = ctx.createGain()
    this.musicGain = ctx.createGain()
    this.duckGain = ctx.createGain()

    this.musicGain.gain.value = AUDIO_BUS_GAINS.music
    this.duckGain.gain.value = 1
    this.sfxGain.connect(this.masterGain)
    this.musicGain.connect(this.duckGain).connect(this.masterGain)
    this.masterGain.connect(limiter).connect(ctx.destination)

    this.applyMasterGain()
    this.applySfxGain()
  }

  private applyMasterGain(): void {
    if (!this.masterGain || !this.context) return
    const t = this.context.currentTime
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : AUDIO_BUS_GAINS.master, t, 0.02)
  }

  private applySfxGain(): void {
    if (!this.sfxGain || !this.context) return
    const t = this.context.currentTime
    const gain = this.paused ? AUDIO_BUS_GAINS.pausedSfx : AUDIO_BUS_GAINS.sfx
    this.sfxGain.gain.setTargetAtTime(gain, t, 0.02)
  }

  private logTrigger(name: string, t: number): void {
    this.triggerLog.push({ name, t })
    if (this.triggerLog.length > 80) this.triggerLog.splice(0, this.triggerLog.length - 80)
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}
