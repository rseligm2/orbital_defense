export interface AudioVoiceBudget {
  minGapMs: number
  maxConcurrent: number
}

export const AUDIO_BUS_GAINS = {
  master: 1.0,
  sfx: 0.9,
  music: 0.5,
  pausedSfx: 0.0,
} as const

export const AUDIO_LIMITER = {
  threshold: -9,
  knee: 6,
  ratio: 16,
  attack: 0.002,
  release: 0.25,
} as const

export const AUDIO_DUCKING = {
  maxDepth: 0.45,
  attackTime: 0.015,
  holdSec: 0.12,
  releaseTime: 0.4,
} as const

export const AUDIO_VOICE_BUDGETS = {
  boom: { minGapMs: 35, maxConcurrent: 6 },
  earthHit: { minGapMs: 90, maxConcurrent: 3 },
  launch: { minGapMs: 80, maxConcurrent: 3 },
  waveAlert: { minGapMs: 1000, maxConcurrent: 1 },
  fanfare: { minGapMs: 1000, maxConcurrent: 1 },
  gameOver: { minGapMs: 2000, maxConcurrent: 1 },
} satisfies Record<string, AudioVoiceBudget>

export const AUDIO_SPATIAL = {
  worldPanRadius: 4,
  maxPan: 0.5,
} as const

export const AUDIO_EXPLOSION = {
  minBoomSize: 0.1,
  minSize: 0.08,
  maxSize: 0.35,
  detuneJitter: 0.06,
} as const

export const AUDIO_LASER = {
  beamLingerMs: 120,
  maxVoices: 6,
  baseFrequency: 92,
  beatDetuneCents: 9,
  maxHeatDetuneCents: 700,
  minFilterHz: 500,
  maxFilterHz: 3100,
  voiceGain: 0.1,
  fadeInTime: 0.035,
  fadeOutTime: 0.04,
  stopDelaySec: 0.3,
} as const

export const AUDIO_MUSIC = {
  tempoBpm: 92,
  schedulerLookaheadSec: 0.12,
  schedulerStepSec: 60 / 92 / 4,
  fadeTimeSec: 1.2,
  buildArpGain: 0.045,
  waveArpGain: 0.09,
  padGain: 0.18,
  bassGain: 0.12,
  drumGain: 0.12,
  leadGain: 0.055,
  filterBuildHz: 720,
  filterWaveHz: 1800,
  rotateEveryWaves: 3,
} as const
