// All tunable gameplay numbers live here (DESIGN.md §16).

export const EARTH_RADIUS = 1
export const EARTH_MAX_HP = 100
export const SPAWN_DIST = 5.2
export const STARTING_CREDITS = 400

export interface RingConfig {
  name: string
  radius: number
  periodSec: number
  launchFee: number
}

// Rings 2-4 unlock via the rocketry research tree (src/data/research.ts).
export const RINGS: RingConfig[] = [
  { name: 'LEO', radius: 1.5, periodSec: 20, launchFee: 20 },
  { name: 'MEO', radius: 2.2, periodSec: 35, launchFee: 40 },
  { name: 'HEO', radius: 3.0, periodSec: 55, launchFee: 70 },
  { name: 'GEO', radius: 4.0, periodSec: 80, launchFee: 110 },
]

export type WeaponId = 'missile' | 'laser' | 'flak'

interface WeaponBase {
  name: string
  tagline: string
  hardwareCost: number
  maxHp: number
  range: number
}

export interface HomingWeaponConfig extends WeaponBase {
  kind: 'homing'
  damage: number
  reloadSec: number
  projectileSpeed: number
  projectileTurnRate: number
  blastRadius: number
}

export interface BeamWeaponConfig extends WeaponBase {
  kind: 'beam'
  dps: number
  heatCapacity: number // seconds of continuous fire before overheating
  coolPerSec: number // heat shed per second while not firing
  refireHeat: number // after overheating, may fire again once heat falls below this
}

export interface FlakWeaponConfig extends WeaponBase {
  kind: 'flak'
  damage: number
  reloadSec: number
  projectileSpeed: number
  blastRadius: number
  fuseRadius: number
}

export type WeaponConfig = HomingWeaponConfig | BeamWeaponConfig | FlakWeaponConfig

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  missile: {
    kind: 'homing',
    name: 'Missile Pod',
    tagline: 'Homing · long range',
    hardwareCost: 100,
    maxHp: 80,
    range: 1.7,
    damage: 20,
    reloadSec: 1.4,
    projectileSpeed: 1.6,
    projectileTurnRate: 5,
    blastRadius: 0.14,
  },
  laser: {
    kind: 'beam',
    name: 'Laser',
    tagline: 'Hitscan · overheats',
    hardwareCost: 150,
    maxHp: 70,
    range: 1.35,
    dps: 18,
    heatCapacity: 3,
    coolPerSec: 1.2,
    refireHeat: 0.75,
  },
  flak: {
    kind: 'flak',
    name: 'Flak Cannon',
    tagline: 'AoE bursts · short range',
    hardwareCost: 80,
    maxHp: 90,
    range: 1.0,
    damage: 9,
    reloadSec: 0.45,
    projectileSpeed: 2.0,
    blastRadius: 0.3,
    fuseRadius: 0.12,
  },
}

export type EnemyId = 'asteroid' | 'fighter' | 'bomber' | 'carrier'
export const TARGET_PRIORITIES = ['closest', 'strongest', 'weakest', 'fastest'] as const
export type TargetPriority = (typeof TARGET_PRIORITIES)[number]

export interface EnemyConfig {
  name: string
  hp: number
  speed: number
  damage: number
  radius: number
  reward: number
  budgetCost: number
  weaveStrength?: number
  weaveFreq?: number
  attackRange?: number
  attackDamage?: number
  attackReloadSec?: number
  projectileSpeed?: number
  carrierSpawnSec?: number
}

export const ENEMIES: Record<EnemyId, EnemyConfig> = {
  asteroid: {
    name: 'Asteroid',
    hp: 40,
    speed: 0.13,
    damage: 10,
    radius: 0.09,
    reward: 10,
    budgetCost: 10,
  },
  fighter: {
    name: 'Fighter',
    hp: 14,
    speed: 0.28,
    damage: 5,
    radius: 0.055,
    reward: 6,
    budgetCost: 6,
    weaveStrength: 0.72,
    weaveFreq: 4.4,
  },
  bomber: {
    name: 'Bomber',
    hp: 65,
    speed: 0.11,
    damage: 14,
    radius: 0.11,
    reward: 18,
    budgetCost: 24,
    attackRange: 1.25,
    attackDamage: 16,
    attackReloadSec: 1.7,
    projectileSpeed: 1.25,
  },
  carrier: {
    name: 'Carrier',
    hp: 420,
    speed: 0.065,
    damage: 35,
    radius: 0.22,
    reward: 90,
    budgetCost: 110,
    carrierSpawnSec: 2.4,
  },
}

export const WAVE_BASE_BUDGET = 50
export const WAVE_BUDGET_GROWTH = 1.18
export const ENEMY_HP_GROWTH = 0.04

// Researched weapon specials (flags defined in src/data/research.ts).
export const MIRV_WARHEADS = 3
export const MIRV_DAMAGE_MULT = 0.6
export const NUKE_EVERY = 5
export const NUKE_DAMAGE_MULT = 3
export const NUKE_BLAST_MULT = 4
export const BEAM_SPLIT_RATIO = 0.5
export const SHRAPNEL_DAMAGE_MULT = 0.5
export const SHRAPNEL_RADIUS_MULT = 1.6
export const SATELLITE_SELL_REFUND = 0.5
export const BOMB_TTL_SEC = 4
export const REPAIR_BETWEEN_WAVES = 4
export const REPAIR_DURING_WAVES = 1.5

export function waveClearBonus(wave: number): number {
  return 40 + 10 * wave
}
