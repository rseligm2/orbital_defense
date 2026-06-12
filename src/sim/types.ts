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
  heat: number // beam weapons only
  overheated: boolean
  sparkTimer: number // paces beam impact-flash events
  shots: number // launch counter (nuke fires every Nth)
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

export type ProjectileKind = 'missile' | 'shell'

export interface Projectile {
  id: number
  kind: ProjectileKind
  pos: Vec2
  vel: Vec2
  speed: number
  turnRate: number
  damage: number
  blastRadius: number
  fuseRadius: number // shells detonate this close to any enemy; missiles on contact
  shrapnel: boolean // researched flak: secondary damage ring on detonation
  targetId: number // -1 for unguided shells
  ttl: number
}

// Live laser beams, rebuilt by the sim every step; the render layer draws them.
export interface Beam {
  satId: number
  sx: number
  sy: number
  tx: number
  ty: number
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
  unlockedRings: number // rings [0, unlockedRings) are available
  research: Record<string, true> // purchased node ids (src/data/research.ts)
  // Open heavy-lift rocket: follow-up satellites to this ring launch fee-free.
  launchBatch: { ring: number; remaining: number } | null
  satellites: Satellite[]
  enemies: Enemy[]
  projectiles: Projectile[]
  beams: Beam[]
  spawnQueue: SpawnItem[]
  nextId: number
  events: SimEvent[]
}
