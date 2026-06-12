import {
  AUDIO_EXPLOSION,
  AUDIO_LASER,
  AUDIO_SPATIAL,
} from '../data/audio'
import { WEAPONS } from '../data/config'
import type { BeamWeaponConfig, WeaponConfig, WeaponId } from '../data/config'
import type { Phase, SimEvent, SimState } from '../sim/types'
import { AudioEngine } from './engine'
import { MusicDirector } from './music'
import * as sfx from './sfx'

export interface AudioDirectorOptions {
  weaponStats?: (state: SimState, weapon: WeaponId) => WeaponConfig
}

interface LaserEntry {
  voice: sfx.LaserVoice
  lingerMs: number
}

export class AudioDirector {
  readonly engine: AudioEngine
  private readonly music: MusicDirector
  private readonly weaponStats: (state: SimState, weapon: WeaponId) => WeaponConfig
  private readonly beamVoices = new Map<number, LaserEntry>()
  private readonly overheated = new Set<number>()
  private prevPhase: Phase | null = null

  constructor(options: AudioDirectorOptions = {}) {
    this.engine = new AudioEngine()
    this.music = new MusicDirector(this.engine)
    this.weaponStats = options.weaponStats ?? ((_state, weapon) => WEAPONS[weapon])
  }

  sync(state: SimState, dtSeconds?: number): void
  sync(state: SimState, events: readonly SimEvent[], dtSeconds?: number): void
  sync(state: SimState, eventsOrDt: readonly SimEvent[] | number = state.events, maybeDtSeconds = 1 / 60): void {
    const events = typeof eventsOrDt === 'number' ? state.events : eventsOrDt
    const dtSeconds = typeof eventsOrDt === 'number' ? eventsOrDt : maybeDtSeconds
    const dtMs = Math.max(0, dtSeconds * 1000)

    this.handleEvents(events)
    this.handlePhase(state)
    this.syncLaserVoices(state, dtMs)
    this.syncOverheatEdges(state)
    this.music.update(state)
  }

  setPaused(paused: boolean): void {
    this.engine.setPaused(paused)
  }

  setMuted(muted: boolean): void {
    this.engine.setMuted(muted)
  }

  reset(): void {
    this.stopLaserVoices()
    this.overheated.clear()
    this.prevPhase = null
    this.music.reset()
  }

  dispose(): void {
    this.stopLaserVoices()
    this.overheated.clear()
    this.engine.dispose()
  }

  private handleEvents(events: readonly SimEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'explosion':
          if (event.size >= AUDIO_EXPLOSION.minBoomSize) {
            sfx.explosion(this.engine, event.size, pan(event.x))
          }
          break
        case 'earth-hit':
          sfx.earthHit(this.engine, pan(event.x))
          break
        case 'launch':
          sfx.launch(this.engine)
          break
        case 'wave-cleared':
          sfx.waveCleared(this.engine)
          this.music.setPhase('build', event.wave + 1)
          break
        case 'game-over':
          sfx.gameOver(this.engine)
          this.music.gameOver()
          break
      }
    }
  }

  private handlePhase(state: SimState): void {
    if (this.prevPhase === null) {
      this.prevPhase = state.phase
      this.music.setPhase(state.phase, state.waveNumber)
      return
    }

    if (state.phase === this.prevPhase) return
    if (state.phase === 'wave') sfx.waveStart(this.engine)
    this.music.setPhase(state.phase, state.waveNumber)
    this.prevPhase = state.phase
  }

  private syncLaserVoices(state: SimState, dtMs: number): void {
    const beaming = new Map<number, number>()
    for (const beam of state.beams) {
      if (!beaming.has(beam.satId)) beaming.set(beam.satId, beamPan(beam))
    }

    for (const sat of state.satellites) {
      const beamPanValue = beaming.get(sat.id)
      if (beamPanValue === undefined) continue
      const cfg = this.weaponStats(state, sat.weapon)
      if (!isBeamWeapon(cfg)) continue

      let entry = this.beamVoices.get(sat.id)
      if (!entry && this.engine.ready && this.beamVoices.size < AUDIO_LASER.maxVoices) {
        entry = {
          voice: new sfx.LaserVoice(this.engine, beamPanValue),
          lingerMs: AUDIO_LASER.beamLingerMs,
        }
        this.beamVoices.set(sat.id, entry)
      }

      if (!entry) continue
      entry.lingerMs = AUDIO_LASER.beamLingerMs
      entry.voice.setPan(beamPanValue)
      entry.voice.setHeat(sat.heat / cfg.heatCapacity)
    }

    for (const [satId, entry] of this.beamVoices) {
      if (beaming.has(satId)) continue
      entry.lingerMs -= dtMs
      if (entry.lingerMs > 0) continue
      entry.voice.stop()
      this.beamVoices.delete(satId)
    }
  }

  private syncOverheatEdges(state: SimState): void {
    const liveSatIds = new Set<number>()
    for (const sat of state.satellites) {
      liveSatIds.add(sat.id)
      if (sat.overheated) this.overheated.add(sat.id)
      else this.overheated.delete(sat.id)
    }

    for (const satId of this.overheated) {
      if (!liveSatIds.has(satId)) this.overheated.delete(satId)
    }
  }

  private stopLaserVoices(): void {
    for (const entry of this.beamVoices.values()) entry.voice.stop()
    this.beamVoices.clear()
  }
}

function isBeamWeapon(cfg: WeaponConfig): cfg is BeamWeaponConfig {
  return cfg.kind === 'beam'
}

function beamPan(beam: { sx: number; tx: number }): number {
  return pan((beam.sx + beam.tx) * 0.5)
}

function pan(x: number): number {
  return clamp(x / AUDIO_SPATIAL.worldPanRadius, -1, 1) * AUDIO_SPATIAL.maxPan
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
