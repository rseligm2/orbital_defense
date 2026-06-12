// All tunable gameplay numbers live here (DESIGN.md §16).

export const EARTH_RADIUS = 1
export const EARTH_MAX_HP = 100
export const SPAWN_DIST = 5.2
export const STARTING_CREDITS = 400

export interface RingConfig {
  radius: number
  periodSec: number
  launchFee: number
  unlocked: boolean
}

export const RINGS: RingConfig[] = [
  { radius: 1.5, periodSec: 20, launchFee: 20, unlocked: true },
  { radius: 2.2, periodSec: 35, launchFee: 40, unlocked: false },
  { radius: 3.0, periodSec: 55, launchFee: 70, unlocked: false },
  { radius: 4.0, periodSec: 80, launchFee: 110, unlocked: false },
]

export type WeaponId = 'missile'

export interface WeaponConfig {
  name: string
  hardwareCost: number
  range: number
  damage: number
  reloadSec: number
  projectileSpeed: number
  projectileTurnRate: number
}

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  missile: {
    name: 'Missile Pod',
    hardwareCost: 100,
    range: 1.7,
    damage: 20,
    reloadSec: 1.4,
    projectileSpeed: 1.6,
    projectileTurnRate: 5,
  },
}

export type EnemyId = 'asteroid'

export interface EnemyConfig {
  hp: number
  speed: number
  damage: number
  radius: number
  reward: number
  budgetCost: number
}

export const ENEMIES: Record<EnemyId, EnemyConfig> = {
  asteroid: { hp: 40, speed: 0.13, damage: 10, radius: 0.09, reward: 10, budgetCost: 10 },
}

export const WAVE_BASE_BUDGET = 50
export const WAVE_BUDGET_GROWTH = 1.18
export const ENEMY_HP_GROWTH = 0.04

export function waveClearBonus(wave: number): number {
  return 40 + 10 * wave
}

export function placementCost(weapon: WeaponId, ring: number): number {
  return WEAPONS[weapon].hardwareCost + RINGS[ring].launchFee
}
