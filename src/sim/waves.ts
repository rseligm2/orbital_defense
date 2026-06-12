import {
  ENEMIES,
  ENEMY_HP_GROWTH,
  SPAWN_DIST,
  WAVE_BASE_BUDGET,
  WAVE_BUDGET_GROWTH,
} from '../data/config'
import type { EnemyId } from '../data/config'
import type { SpawnItem } from './types'

// Deterministic per wave number, so deep-space radar can preview future waves
// without pre-rolling their (random) bearings and timings.
export function waveComposition(wave: number): { type: EnemyId; count: number }[] {
  const budget = WAVE_BASE_BUDGET * Math.pow(WAVE_BUDGET_GROWTH, wave - 1)
  const count = Math.max(3, Math.round(budget / ENEMIES.asteroid.budgetCost))
  return [{ type: 'asteroid', count }]
}

export function generateWave(wave: number): SpawnItem[] {
  const clusters = Math.min(1 + Math.floor((wave - 1) / 3), 4)
  const hpMult = 1 + ENEMY_HP_GROWTH * (wave - 1)

  const bearings = Array.from({ length: clusters }, () => Math.random() * Math.PI * 2)
  const items: SpawnItem[] = []
  let i = 0
  for (const group of waveComposition(wave)) {
    for (let k = 0; k < group.count; k++, i++) {
      const c = i % clusters
      const j = Math.floor(i / clusters)
      items.push({
        time: c * 3 + j * 1.4 + Math.random() * 0.8,
        type: group.type,
        bearing: bearings[c] + (Math.random() - 0.5) * 0.5,
        dist: SPAWN_DIST + Math.random() * 0.6,
        hpMult,
        speedMult: 0.9 + Math.random() * 0.2,
      })
    }
  }
  items.sort((a, b) => a.time - b.time)
  return items
}
