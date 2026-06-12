// Pure simulation: no Three.js, no DOM (DESIGN.md §13). Fixed-timestep `step` plus
// the player commands `tryPlaceSatellite`, `tryResearch` (see research.ts),
// `closeLaunchBatch`, and `startWave`.

import {
  BEAM_SPLIT_RATIO,
  BOMB_TTL_SEC,
  EARTH_MAX_HP,
  EARTH_RADIUS,
  ENEMIES,
  MIRV_DAMAGE_MULT,
  MIRV_WARHEADS,
  NUKE_BLAST_MULT,
  NUKE_DAMAGE_MULT,
  NUKE_EVERY,
  RINGS,
  SATELLITE_SELL_REFUND,
  SHRAPNEL_DAMAGE_MULT,
  SHRAPNEL_RADIUS_MULT,
  STARTING_CREDITS,
  WEAPONS,
  waveClearBonus,
} from '../data/config'
import type { EnemyConfig, EnemyId, HomingWeaponConfig, TargetPriority, WeaponId } from '../data/config'
import { generateWave } from './waves'
import {
  effectiveWeapon,
  hasFlag,
  heavyLiftCapacity,
  launchFee,
  salvageMult,
  satelliteRepairRate,
} from './research'
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
    unlockedRings: 1,
    research: {},
    launchBatch: null,
    satellites: [],
    enemies: [],
    projectiles: [],
    beams: [],
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

// Hardware + launch fee, after booster discounts and any open heavy-lift batch.
export function deployCost(state: SimState, weapon: WeaponId, ring: number): number {
  const batched =
    state.launchBatch !== null && state.launchBatch.ring === ring && state.launchBatch.remaining > 0
  return WEAPONS[weapon].hardwareCost + (batched ? 0 : launchFee(state, ring))
}

function canDeploy(state: SimState): boolean {
  return state.phase === 'build' || (state.phase === 'wave' && hasFlag(state, 'rapidDeploy'))
}

export function tryPlaceSatellite(
  state: SimState,
  weapon: WeaponId,
  ring: number,
  angle: number,
): boolean {
  if (!canDeploy(state) || ring >= state.unlockedRings) return false
  const cost = deployCost(state, weapon, ring)
  if (state.credits < cost) return false
  state.credits -= cost

  if (state.launchBatch && state.launchBatch.ring === ring && state.launchBatch.remaining > 0) {
    state.launchBatch.remaining -= 1
    if (state.launchBatch.remaining === 0) state.launchBatch = null
  } else {
    const cap = heavyLiftCapacity(state)
    state.launchBatch = cap > 1 ? { ring, remaining: cap - 1 } : null
  }

  const sat: Satellite = {
    id: state.nextId++,
    weapon,
    ring,
    angle,
    hp: WEAPONS[weapon].maxHp,
    maxHp: WEAPONS[weapon].maxHp,
    priority: 'closest',
    cooldown: 0,
    heat: 0,
    overheated: false,
    sparkTimer: 0,
    shots: 0,
  }
  state.satellites.push(sat)
  const pos = satPosition(sat)
  state.events.push({ type: 'launch', x: pos.x, y: pos.y, ring, angle, satId: sat.id })
  return true
}

// The heavy-lift rocket "closes" when the player disarms or switches rings.
export function closeLaunchBatch(state: SimState): void {
  state.launchBatch = null
}

export function sellSatellite(state: SimState, id: number): boolean {
  if (state.phase !== 'build') return false
  const index = state.satellites.findIndex((sat) => sat.id === id)
  if (index === -1) return false
  const [sat] = state.satellites.splice(index, 1)
  const refund = Math.round(WEAPONS[sat.weapon].hardwareCost * SATELLITE_SELL_REFUND)
  state.credits += refund
  return true
}

export function setSatellitePriority(
  state: SimState,
  id: number,
  priority: TargetPriority,
): boolean {
  if (!hasFlag(state, 'targetingComputer')) return false
  const sat = state.satellites.find((s) => s.id === id)
  if (!sat) return false
  sat.priority = priority
  return true
}

export function startWave(state: SimState): void {
  if (state.phase !== 'build') return
  closeLaunchBatch(state)
  state.spawnQueue = generateWave(state.waveNumber)
  state.waveTime = 0
  state.phase = 'wave'
}

function len(v: Vec2): number {
  return Math.hypot(v.x, v.y)
}

function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

function priorityScore(enemy: Enemy, priority: TargetPriority): number {
  if (priority === 'strongest') return -enemy.hp
  if (priority === 'weakest') return enemy.hp
  if (priority === 'fastest') return -len(enemy.vel)
  return len(enemy.pos)
}

// Up to n living enemies in range, ordered by the satellite's priority.
function findTargets(
  state: SimState,
  pos: Vec2,
  range: number,
  n: number,
  priority: TargetPriority,
): Enemy[] {
  const inRange: Enemy[] = []
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue
    if (dist2(enemy.pos, pos) <= range * range) inRange.push(enemy)
  }
  inRange.sort((a, b) => priorityScore(a, priority) - priorityScore(b, priority))
  return inRange.slice(0, n)
}

function pushEnemy(
  state: SimState,
  type: EnemyId,
  pos: Vec2,
  hpMult: number,
  speedMult: number,
): Enemy {
  const cfg = ENEMIES[type]
  const speed = cfg.speed * speedMult
  const inv = 1 / (len(pos) || 1)
  const enemy: Enemy = {
    id: state.nextId++,
    type,
    pos,
    vel: { x: -pos.x * inv * speed, y: -pos.y * inv * speed },
    hp: cfg.hp * hpMult,
    maxHp: cfg.hp * hpMult,
    radius: cfg.radius,
    damage: cfg.damage,
    reward: cfg.reward,
    speed,
    cooldown: cfg.attackReloadSec ? cfg.attackReloadSec * 0.5 : 0,
    spawnTimer: cfg.carrierSpawnSec ?? 0,
    targetSatId: null,
    weavePhase: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 2,
  }
  state.enemies.push(enemy)
  return enemy
}

function detonate(
  state: SimState,
  x: number,
  y: number,
  damage: number,
  blastRadius: number,
  shrapnel: boolean,
): void {
  const outerRadius = blastRadius * SHRAPNEL_RADIUS_MULT
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue
    const dx = enemy.pos.x - x
    const dy = enemy.pos.y - y
    const d2 = dx * dx + dy * dy
    const inner = blastRadius + enemy.radius
    if (d2 <= inner * inner) {
      enemy.hp -= damage
    } else if (shrapnel) {
      const outer = outerRadius + enemy.radius
      if (d2 <= outer * outer) enemy.hp -= damage * SHRAPNEL_DAMAGE_MULT
    }
  }
  state.events.push({
    type: 'explosion',
    x,
    y,
    size: Math.max(0.12, (shrapnel ? outerRadius : blastRadius) * 0.85),
  })
}

function spawnMissile(
  state: SimState,
  pos: Vec2,
  target: Enemy,
  cfg: HomingWeaponConfig,
  damage: number,
  blastRadius: number,
): void {
  const dx = target.pos.x - pos.x
  const dy = target.pos.y - pos.y
  const inv = 1 / (Math.hypot(dx, dy) || 1)
  state.projectiles.push({
    id: state.nextId++,
    kind: 'missile',
    pos: { ...pos },
    vel: { x: dx * inv * cfg.projectileSpeed, y: dy * inv * cfg.projectileSpeed },
    speed: cfg.projectileSpeed,
    turnRate: cfg.projectileTurnRate,
    damage,
    blastRadius,
    fuseRadius: 0,
    shrapnel: false,
    targetId: target.id,
    ttl: 4,
  })
}

function coolBeam(state: SimState, sat: Satellite, dt: number): void {
  const cfg = effectiveWeapon(state, sat.weapon)
  if (cfg.kind !== 'beam') return
  sat.heat = Math.max(0, sat.heat - cfg.coolPerSec * dt)
  if (sat.overheated && sat.heat <= cfg.refireHeat) sat.overheated = false
}

function repairSatellites(state: SimState, dt: number): void {
  const repair = satelliteRepairRate(state)
  if (repair <= 0) return
  for (const sat of state.satellites) {
    sat.hp = Math.min(sat.maxHp, sat.hp + repair * dt)
  }
}

function closestSatellite(state: SimState, pos: Vec2, maxRange: number): Satellite | null {
  let best: Satellite | null = null
  let bestD2 = maxRange * maxRange
  for (const sat of state.satellites) {
    if (sat.hp <= 0) continue
    const d2 = dist2(pos, satPosition(sat))
    if (d2 <= bestD2) {
      best = sat
      bestD2 = d2
    }
  }
  return best
}

function moveTowardEarth(enemy: Enemy, dt: number, cfg: EnemyConfig, now: number): void {
  const inv = 1 / (len(enemy.pos) || 1)
  let dx = -enemy.pos.x * inv
  let dy = -enemy.pos.y * inv
  if (cfg.weaveStrength && cfg.weaveFreq) {
    const weave = Math.sin(now * cfg.weaveFreq + enemy.weavePhase) * cfg.weaveStrength
    const tx = -dy
    const ty = dx
    dx += tx * weave
    dy += ty * weave
    const wInv = 1 / (Math.hypot(dx, dy) || 1)
    dx *= wInv
    dy *= wInv
  }
  enemy.vel.x = dx * enemy.speed
  enemy.vel.y = dy * enemy.speed
  enemy.pos.x += enemy.vel.x * dt
  enemy.pos.y += enemy.vel.y * dt
}

function spawnBomb(state: SimState, enemy: Enemy, target: Satellite, cfg: EnemyConfig): void {
  const pos = { ...enemy.pos }
  const targetPos = satPosition(target)
  const dx = targetPos.x - pos.x
  const dy = targetPos.y - pos.y
  const inv = 1 / (Math.hypot(dx, dy) || 1)
  const speed = cfg.projectileSpeed ?? 1
  state.projectiles.push({
    id: state.nextId++,
    kind: 'bomb',
    pos,
    vel: { x: dx * inv * speed, y: dy * inv * speed },
    speed,
    turnRate: 3,
    damage: cfg.attackDamage ?? 0,
    blastRadius: 0,
    fuseRadius: 0.08,
    shrapnel: false,
    targetId: target.id,
    ttl: BOMB_TTL_SEC,
  })
}

function updateBomber(state: SimState, enemy: Enemy, cfg: EnemyConfig, dt: number): boolean {
  const range = cfg.attackRange ?? 0
  const current =
    enemy.targetSatId === null ? null : state.satellites.find((sat) => sat.id === enemy.targetSatId)
  const target =
    current && current.hp > 0 && dist2(enemy.pos, satPosition(current)) <= range * range
      ? current
      : closestSatellite(state, enemy.pos, range)

  if (!target) return false
  enemy.targetSatId = target.id
  enemy.vel.x = 0
  enemy.vel.y = 0
  enemy.cooldown -= dt
  if (enemy.cooldown <= 0) {
    spawnBomb(state, enemy, target, cfg)
    enemy.cooldown = cfg.attackReloadSec ?? 1
  }
  return true
}

function updateCarrier(state: SimState, enemy: Enemy, cfg: EnemyConfig, dt: number): void {
  enemy.spawnTimer -= dt
  if (enemy.spawnTimer > 0) return
  const inv = 1 / (len(enemy.pos) || 1)
  const tangent = { x: -enemy.pos.y * inv, y: enemy.pos.x * inv }
  const side = Math.random() < 0.5 ? -1 : 1
  const pos = {
    x: enemy.pos.x + tangent.x * side * 0.18,
    y: enemy.pos.y + tangent.y * side * 0.18,
  }
  pushEnemy(state, 'fighter', pos, Math.max(1, enemy.maxHp / cfg.hp) * 0.8, 1.04)
  enemy.spawnTimer = cfg.carrierSpawnSec ?? 2.5
}

export function step(state: SimState, dt: number): void {
  state.time += dt
  state.beams.length = 0

  // Satellites orbit in every phase — the world stays alive between waves.
  for (const sat of state.satellites) {
    sat.angle = (sat.angle + ringOmega(sat.ring) * dt) % (Math.PI * 2)
  }
  repairSatellites(state, dt)

  if (state.phase !== 'wave') {
    for (const sat of state.satellites) coolBeam(state, sat, dt)
    return
  }
  state.waveTime += dt

  while (state.spawnQueue.length > 0 && state.spawnQueue[0].time <= state.waveTime) {
    const item = state.spawnQueue.shift()!
    const pos = { x: Math.cos(item.bearing) * item.dist, y: Math.sin(item.bearing) * item.dist }
    pushEnemy(state, item.type, pos, item.hpMult, item.speedMult)
  }

  for (const enemy of state.enemies) {
    const cfg = ENEMIES[enemy.type]
    if (enemy.type === 'bomber' && updateBomber(state, enemy, cfg, dt)) {
      // Parked bombers spend the step firing at satellites instead of closing on Earth.
    } else {
      enemy.targetSatId = null
      moveTowardEarth(enemy, dt, cfg, state.time)
    }
    if (enemy.type === 'carrier') updateCarrier(state, enemy, cfg, dt)
    if (len(enemy.pos) <= EARTH_RADIUS + enemy.radius * 0.5) {
      state.earthHp = Math.max(0, state.earthHp - enemy.damage)
      enemy.hp = 0
      enemy.reward = 0 // impacts pay nothing
      state.events.push({ type: 'earth-hit', x: enemy.pos.x, y: enemy.pos.y, damage: enemy.damage })
    }
  }

  for (const sat of state.satellites) {
    const cfg = effectiveWeapon(state, sat.weapon)
    const pos = satPosition(sat)

    if (cfg.kind === 'beam') {
      const split = hasFlag(state, 'beamSplitter')
      const targets = sat.overheated
        ? []
        : findTargets(state, pos, cfg.range, split ? 2 : 1, sat.priority)
      if (targets.length === 0) {
        coolBeam(state, sat, dt)
        continue
      }
      targets[0].hp -= cfg.dps * dt
      state.beams.push({ satId: sat.id, sx: pos.x, sy: pos.y, tx: targets[0].pos.x, ty: targets[0].pos.y })
      if (targets.length > 1) {
        targets[1].hp -= cfg.dps * BEAM_SPLIT_RATIO * dt
        state.beams.push({ satId: sat.id, sx: pos.x, sy: pos.y, tx: targets[1].pos.x, ty: targets[1].pos.y })
      }
      sat.heat += dt
      if (sat.heat >= cfg.heatCapacity) sat.overheated = true
      sat.sparkTimer -= dt
      if (sat.sparkTimer <= 0) {
        state.events.push({ type: 'explosion', x: targets[0].pos.x, y: targets[0].pos.y, size: 0.07 })
        sat.sparkTimer = 0.12
      }
      continue
    }

    sat.cooldown -= dt
    if (sat.cooldown > 0) continue

    if (cfg.kind === 'homing') {
      const mirv = hasFlag(state, 'mirv')
      const targets = findTargets(state, pos, cfg.range, mirv ? MIRV_WARHEADS : 1, sat.priority)
      if (targets.length === 0) continue
      sat.shots += 1
      if (hasFlag(state, 'nuke') && sat.shots % NUKE_EVERY === 0) {
        spawnMissile(state, pos, targets[0], cfg, cfg.damage * NUKE_DAMAGE_MULT, cfg.blastRadius * NUKE_BLAST_MULT)
      } else if (mirv) {
        for (let i = 0; i < MIRV_WARHEADS; i++) {
          spawnMissile(state, pos, targets[i % targets.length], cfg, cfg.damage * MIRV_DAMAGE_MULT, cfg.blastRadius)
        }
      } else {
        spawnMissile(state, pos, targets[0], cfg, cfg.damage, cfg.blastRadius)
      }
    } else {
      const targets = findTargets(state, pos, cfg.range, 1, sat.priority)
      if (targets.length === 0) continue
      const target = targets[0]
      // Flak shells are unguided: lead the target and burst on proximity or at max range.
      const dist = Math.hypot(target.pos.x - pos.x, target.pos.y - pos.y)
      const lead = dist / cfg.projectileSpeed
      const aimX = target.pos.x + target.vel.x * lead
      const aimY = target.pos.y + target.vel.y * lead
      const dx = aimX - pos.x
      const dy = aimY - pos.y
      const inv = 1 / (Math.hypot(dx, dy) || 1)
      state.projectiles.push({
        id: state.nextId++,
        kind: 'shell',
        pos: { ...pos },
        vel: { x: dx * inv * cfg.projectileSpeed, y: dy * inv * cfg.projectileSpeed },
        speed: cfg.projectileSpeed,
        turnRate: 0,
        damage: cfg.damage,
        blastRadius: cfg.blastRadius,
        fuseRadius: cfg.fuseRadius,
        shrapnel: hasFlag(state, 'shrapnel'),
        targetId: -1,
        ttl: (cfg.range * 1.2) / cfg.projectileSpeed,
      })
    }
    sat.cooldown = cfg.reloadSec
  }

  const enemyById = new Map<number, Enemy>()
  for (const enemy of state.enemies) enemyById.set(enemy.id, enemy)
  const satById = new Map<number, Satellite>()
  for (const sat of state.satellites) satById.set(sat.id, sat)

  for (const p of state.projectiles) {
    p.ttl -= dt
    if (p.kind === 'missile') {
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
    } else if (p.kind === 'bomb') {
      const target = satById.get(p.targetId)
      if (target && target.hp > 0) {
        const targetPos = satPosition(target)
        const desired = Math.atan2(targetPos.y - p.pos.y, targetPos.x - p.pos.x)
        const current = Math.atan2(p.vel.y, p.vel.x)
        let d = desired - current
        while (d > Math.PI) d -= Math.PI * 2
        while (d < -Math.PI) d += Math.PI * 2
        const maxTurn = p.turnRate * dt
        const heading = current + Math.max(-maxTurn, Math.min(maxTurn, d))
        p.vel.x = Math.cos(heading) * p.speed
        p.vel.y = Math.sin(heading) * p.speed
      }
    }
    p.pos.x += p.vel.x * dt
    p.pos.y += p.vel.y * dt

    let boom = false
    if (p.kind === 'bomb') {
      const target = satById.get(p.targetId)
      if (target && target.hp > 0) {
        const targetPos = satPosition(target)
        const hitDist = 0.13 + p.fuseRadius
        if (dist2(targetPos, p.pos) <= hitDist * hitDist) {
          target.hp -= p.damage
          p.ttl = 0
          state.events.push({
            type: 'satellite-hit',
            x: targetPos.x,
            y: targetPos.y,
            damage: p.damage,
          })
          state.events.push({ type: 'explosion', x: p.pos.x, y: p.pos.y, size: 0.16 })
        }
      } else {
        p.ttl = 0
      }
    } else {
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue
        const hitDist = enemy.radius + (p.kind === 'missile' ? 0.05 : p.fuseRadius)
        if (dist2(enemy.pos, p.pos) <= hitDist * hitDist) {
          boom = true
          break
        }
      }
      if (!boom && p.kind === 'shell' && p.ttl <= 0) boom = true // air burst at max range
      if (boom) {
        detonate(state, p.pos.x, p.pos.y, p.damage, p.blastRadius, p.shrapnel)
        p.ttl = 0
      }
    }
  }
  state.projectiles = state.projectiles.filter((p) => p.ttl > 0)
  for (const sat of state.satellites) {
    if (sat.hp > 0) continue
    const pos = satPosition(sat)
    state.events.push({ type: 'satellite-destroyed', x: pos.x, y: pos.y })
    state.events.push({ type: 'explosion', x: pos.x, y: pos.y, size: 0.38 })
  }
  state.satellites = state.satellites.filter((sat) => sat.hp > 0)

  const salvage = salvageMult(state)
  for (const enemy of state.enemies) {
    if (enemy.hp > 0 || enemy.reward === 0) continue
    const reward = Math.round(enemy.reward * salvage)
    state.credits += reward
    state.creditsEarned += reward
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
