// Research purchases and the derived (post-research) stats the rest of the sim
// reads. Pure TS — no Three.js, no DOM (DESIGN.md §13).

import { REPAIR_BETWEEN_WAVES, REPAIR_DURING_WAVES, RINGS, WEAPONS } from '../data/config'
import type { WeaponConfig, WeaponId } from '../data/config'
import { RESEARCH, RESEARCH_BY_ID } from '../data/research'
import type { ResearchFlag } from '../data/research'
import type { SimState } from './types'

export function tryResearch(state: SimState, id: string): boolean {
  const node = RESEARCH_BY_ID[id]
  if (!node || state.phase !== 'build' || state.research[id]) return false
  if (node.requires && !state.research[node.requires]) return false
  if (state.credits < node.cost) return false
  state.credits -= node.cost
  state.research[id] = true

  // One-shot effects apply immediately; everything else is derived on read.
  const e = node.effect
  if (e.kind === 'unlockRing') {
    state.unlockedRings = Math.max(state.unlockedRings, e.ring + 1)
  } else if (e.kind === 'earthMaxHp') {
    state.earthMaxHp += e.amount
    state.earthHp += e.amount
  }
  return true
}

export function hasFlag(state: SimState, flag: ResearchFlag): boolean {
  for (const node of RESEARCH) {
    if (node.effect.kind === 'flag' && node.effect.flag === flag && state.research[node.id]) {
      return true
    }
  }
  return false
}

export function effectiveWeapon(state: SimState, id: WeaponId): WeaponConfig {
  const cfg = { ...WEAPONS[id] }
  const stats = cfg as unknown as Record<string, number>
  for (const node of RESEARCH) {
    if (!state.research[node.id]) continue
    const e = node.effect
    if (e.kind === 'stat' && e.weapon === id) stats[e.stat] *= e.mult
  }
  return cfg
}

export function launchFee(state: SimState, ring: number): number {
  let discount = 0
  for (const node of RESEARCH) {
    if (node.effect.kind === 'launchFeeDiscount' && state.research[node.id]) {
      discount += node.effect.discount
    }
  }
  return Math.round(RINGS[ring].launchFee * Math.max(0, 1 - discount))
}

// Satellites one rocket can carry to the same ring (1 = no heavy-lift research).
export function heavyLiftCapacity(state: SimState): number {
  let cap = 1
  for (const node of RESEARCH) {
    if (node.effect.kind === 'heavyLift' && state.research[node.id]) {
      cap = Math.max(cap, node.effect.capacity)
    }
  }
  return cap
}

export function salvageMult(state: SimState): number {
  let bonus = 0
  for (const node of RESEARCH) {
    if (node.effect.kind === 'salvageBonus' && state.research[node.id]) {
      bonus += node.effect.bonus
    }
  }
  return 1 + bonus
}

export function radarDepth(state: SimState): number {
  let depth = 0
  for (const node of RESEARCH) {
    if (node.effect.kind === 'radar' && state.research[node.id]) {
      depth = Math.max(depth, node.effect.depth)
    }
  }
  return depth
}

export function satelliteRepairRate(state: SimState): number {
  let betweenWaves = false
  let duringWaves = false
  for (const node of RESEARCH) {
    if (node.effect.kind !== 'repairDrones' || !state.research[node.id]) continue
    betweenWaves = true
    if (node.effect.duringWave) duringWaves = true
  }
  if (!betweenWaves) return 0
  if (state.phase === 'wave') return duringWaves ? REPAIR_DURING_WAVES : 0
  return REPAIR_BETWEEN_WAVES
}
