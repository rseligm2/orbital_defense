import type { EnemyId, WeaponId } from '../data/config'

export type Phase = 'build' | 'wave' | 'gameover'

// Gameplay happens in a 2D plane (DESIGN.md §3); the render layer maps (x, y) -> (x, 0, z).
export interface Vec2 {
  x: number
  y: number
}

export interface Satellite {
  id: number
  weapon: WeaponId
  ring: number
  angle: number
  cooldown: number
}

export interface Enemy {
  id: number
  type: EnemyId
  pos: Vec2
  vel: Vec2
  hp: number
  maxHp: number
  radius: number
  damage: number
  reward: number
  spin: number
}

export interface Projectile {
  id: number
  pos: Vec2
  vel: Vec2
  speed: number
  turnRate: number
  damage: number
  targetId: number
  ttl: number
}

export interface SpawnItem {
  time: number
  type: EnemyId
  bearing: number
  dist: number
  hpMult: number
  speedMult: number
}

export type SimEvent =
  | { type: 'explosion'; x: number; y: number; size: number }
  | { type: 'earth-hit'; x: number; y: number; damage: number }
  | { type: 'launch'; x: number; y: number }
  | { type: 'wave-cleared'; wave: number; bonus: number }
  | { type: 'game-over' }

export interface SimState {
  phase: Phase
  time: number
  waveTime: number
  credits: number
  earthHp: number
  earthMaxHp: number
  waveNumber: number
  kills: number
  creditsEarned: number
  satellites: Satellite[]
  enemies: Enemy[]
  projectiles: Projectile[]
  spawnQueue: SpawnItem[]
  nextId: number
  events: SimEvent[]
}
