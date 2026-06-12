// Pure simulation: no Three.js, no DOM (DESIGN.md §13). Fixed-timestep `step` plus
// the player commands `tryPlaceSatellite` and `startWave`.

import {
  EARTH_MAX_HP,
  EARTH_RADIUS,
  ENEMIES,
  RINGS,
  STARTING_CREDITS,
  WEAPONS,
  placementCost,
  waveClearBonus,
} from '../data/config'
import type { WeaponId } from '../data/config'
import { generateWave } from './waves'
import type { Enemy, Satellite, SimState, Vec2 } from './types'

export function createState(): SimState {
  return {
    phase: 'build',
    time: 0,
    waveTime: 0,
    credits: STARTING_CREDITS,
    earthHp: EARTH_MAX_HP,
    earthMaxHp: EARTH_MAX_HP,
    waveNumber: 1,
    kills: 0,
    creditsEarned: 0,
    satellites: [],
    enemies: [],
    projectiles: [],
    spawnQueue: [],
    nextId: 1,
    events: [],
  }
}

export function ringOmega(ring: number): number {
  return (Math.PI * 2) / RINGS[ring].periodSec
}

export function satPosition(sat: Satellite): Vec2 {
  const r = RINGS[sat.ring].radius
  return { x: Math.cos(sat.angle) * r, y: Math.sin(sat.angle) * r }
}

export function tryPlaceSatellite(
  state: SimState,
  weapon: WeaponId,
  ring: number,
  angle: number,
): boolean {
  if (state.phase !== 'build' || !RINGS[ring].unlocked) return false
  const cost = placementCost(weapon, ring)
  if (state.credits < cost) return false
  state.credits -= cost
  const sat: Satellite = { id: state.nextId++, weapon, ring, angle, cooldown: 0 }
  state.satellites.push(sat)
  const pos = satPosition(sat)
  state.events.push({ type: 'launch', x: pos.x, y: pos.y })
  return true
}

export function startWave(state: SimState): void {
  if (state.phase !== 'build') return
  state.spawnQueue = generateWave(state.waveNumber)
  state.waveTime = 0
  state.phase = 'wave'
}

function len(v: Vec2): number {
  return Math.hypot(v.x, v.y)
}

export function step(state: SimState, dt: number): void {
  state.time += dt

  // Satellites orbit in every phase — the world stays alive between waves.
  for (const sat of state.satellites) {
    sat.angle = (sat.angle + ringOmega(sat.ring) * dt) % (Math.PI * 2)
  }

  if (state.phase !== 'wave') return
  state.waveTime += dt

  while (state.spawnQueue.length > 0 && state.spawnQueue[0].time <= state.waveTime) {
    const item = state.spawnQueue.shift()!
    const cfg = ENEMIES[item.type]
    const pos = { x: Math.cos(item.bearing) * item.dist, y: Math.sin(item.bearing) * item.dist }
    const speed = cfg.speed * item.speedMult
    const inv = 1 / len(pos)
    state.enemies.push({
      id: state.nextId++,
      type: item.type,
      pos,
      vel: { x: -pos.x * inv * speed, y: -pos.y * inv * speed },
      hp: cfg.hp * item.hpMult,
      maxHp: cfg.hp * item.hpMult,
      radius: cfg.radius,
      damage: cfg.damage,
      reward: cfg.reward,
      spin: (Math.random() - 0.5) * 2,
    })
  }

  for (const enemy of state.enemies) {
    enemy.pos.x += enemy.vel.x * dt
    enemy.pos.y += enemy.vel.y * dt
    if (len(enemy.pos) <= EARTH_RADIUS + enemy.radius * 0.5) {
      state.earthHp = Math.max(0, state.earthHp - enemy.damage)
      enemy.hp = 0
      enemy.reward = 0 // impacts pay nothing
      state.events.push({ type: 'earth-hit', x: enemy.pos.x, y: enemy.pos.y, damage: enemy.damage })
    }
  }

  for (const sat of state.satellites) {
    sat.cooldown -= dt
    if (sat.cooldown > 0) continue
    const cfg = WEAPONS[sat.weapon]
    const pos = satPosition(sat)
    let target: Enemy | null = null
    let best = Infinity
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue
      const dx = enemy.pos.x - pos.x
      const dy = enemy.pos.y - pos.y
      if (dx * dx + dy * dy > cfg.range * cfg.range) continue
      const distToEarth = len(enemy.pos)
      if (distToEarth < best) {
        best = distToEarth
        target = enemy
      }
    }
    if (!target) continue
    const dx = target.pos.x - pos.x
    const dy = target.pos.y - pos.y
    const inv = 1 / (Math.hypot(dx, dy) || 1)
    state.projectiles.push({
      id: state.nextId++,
      pos: { ...pos },
      vel: { x: dx * inv * cfg.projectileSpeed, y: dy * inv * cfg.projectileSpeed },
      speed: cfg.projectileSpeed,
      turnRate: cfg.projectileTurnRate,
      damage: cfg.damage,
      targetId: target.id,
      ttl: 4,
    })
    sat.cooldown = cfg.reloadSec
  }

  const enemyById = new Map<number, Enemy>()
  for (const enemy of state.enemies) enemyById.set(enemy.id, enemy)

  for (const p of state.projectiles) {
    p.ttl -= dt
    const target = enemyById.get(p.targetId)
    if (target && target.hp > 0) {
      const desired = Math.atan2(target.pos.y - p.pos.y, target.pos.x - p.pos.x)
      const current = Math.atan2(p.vel.y, p.vel.x)
      let d = desired - current
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      const maxTurn = p.turnRate * dt
      const heading = current + Math.max(-maxTurn, Math.min(maxTurn, d))
      p.vel.x = Math.cos(heading) * p.speed
      p.vel.y = Math.sin(heading) * p.speed
    }
    p.pos.x += p.vel.x * dt
    p.pos.y += p.vel.y * dt

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue
      const dx = enemy.pos.x - p.pos.x
      const dy = enemy.pos.y - p.pos.y
      const hitDist = enemy.radius + 0.05
      if (dx * dx + dy * dy <= hitDist * hitDist) {
        enemy.hp -= p.damage
        p.ttl = 0
        state.events.push({ type: 'explosion', x: p.pos.x, y: p.pos.y, size: 0.12 })
        break
      }
    }
  }
  state.projectiles = state.projectiles.filter((p) => p.ttl > 0)

  for (const enemy of state.enemies) {
    if (enemy.hp > 0 || enemy.reward === 0) continue
    state.credits += enemy.reward
    state.creditsEarned += enemy.reward
    state.kills += 1
    state.events.push({ type: 'explosion', x: enemy.pos.x, y: enemy.pos.y, size: 0.3 })
  }
  state.enemies = state.enemies.filter((e) => e.hp > 0)

  if (state.earthHp <= 0) {
    state.phase = 'gameover'
    state.events.push({ type: 'game-over' })
    return
  }

  if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
    const bonus = waveClearBonus(state.waveNumber)
    state.credits += bonus
    state.creditsEarned += bonus
    state.events.push({ type: 'wave-cleared', wave: state.waveNumber, bonus })
    state.waveNumber += 1
    state.phase = 'build'
  }
}
