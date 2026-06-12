// Research trees (DESIGN.md §6) — pure data. Node costs and effect magnitudes
// are balance levers like everything else in src/data/.
//
// Deferred to M4 (need satellite HP / satellite inspection first): repair
// drones, targeting computer, orbital transfer.

import type { WeaponId } from './config'

export type TreeId = WeaponId | 'rocketry' | 'global'

export type ResearchFlag = 'mirv' | 'nuke' | 'beamSplitter' | 'shrapnel' | 'rapidDeploy'

export type ResearchEffect =
  | { kind: 'stat'; weapon: WeaponId; stat: string; mult: number }
  | { kind: 'flag'; flag: ResearchFlag }
  | { kind: 'earthMaxHp'; amount: number }
  | { kind: 'unlockRing'; ring: number }
  | { kind: 'launchFeeDiscount'; discount: number } // additive: 0.3 + 0.3 = -60%
  | { kind: 'heavyLift'; capacity: number }
  | { kind: 'salvageBonus'; bonus: number } // additive: +0.15 credits per kill each
  | { kind: 'radar'; depth: number } // waves of preview

export interface ResearchNode {
  id: string
  tree: TreeId
  name: string
  desc: string
  cost: number
  requires?: string
  effect: ResearchEffect
}

const stat = (weapon: WeaponId, s: string, mult: number): ResearchEffect => ({
  kind: 'stat',
  weapon,
  stat: s,
  mult,
})

export const RESEARCH: ResearchNode[] = [
  // --- Missile Pod ---
  { id: 'missile-dmg-1', tree: 'missile', name: 'Damage I', desc: '+25% missile damage', cost: 80, effect: stat('missile', 'damage', 1.25) },
  { id: 'missile-dmg-2', tree: 'missile', name: 'Damage II', desc: '+25% missile damage', cost: 140, requires: 'missile-dmg-1', effect: stat('missile', 'damage', 1.25) },
  { id: 'missile-dmg-3', tree: 'missile', name: 'Damage III', desc: '+25% missile damage', cost: 220, requires: 'missile-dmg-2', effect: stat('missile', 'damage', 1.25) },
  { id: 'missile-reload-1', tree: 'missile', name: 'Reload I', desc: '-15% reload time', cost: 70, effect: stat('missile', 'reloadSec', 0.85) },
  { id: 'missile-reload-2', tree: 'missile', name: 'Reload II', desc: '-15% reload time', cost: 120, requires: 'missile-reload-1', effect: stat('missile', 'reloadSec', 0.85) },
  { id: 'missile-reload-3', tree: 'missile', name: 'Reload III', desc: '-15% reload time', cost: 200, requires: 'missile-reload-2', effect: stat('missile', 'reloadSec', 0.85) },
  { id: 'missile-mirv', tree: 'missile', name: 'MIRV', desc: '3 warheads per launch at 60% damage, up to 3 targets', cost: 300, requires: 'missile-reload-2', effect: { kind: 'flag', flag: 'mirv' } },
  { id: 'missile-nuke', tree: 'missile', name: 'Nuke', desc: 'Every 5th launch: 3x damage, huge blast', cost: 380, requires: 'missile-dmg-3', effect: { kind: 'flag', flag: 'nuke' } },

  // --- Laser ---
  { id: 'laser-power-1', tree: 'laser', name: 'Power I', desc: '+25% beam damage/sec', cost: 80, effect: stat('laser', 'dps', 1.25) },
  { id: 'laser-power-2', tree: 'laser', name: 'Power II', desc: '+25% beam damage/sec', cost: 140, requires: 'laser-power-1', effect: stat('laser', 'dps', 1.25) },
  { id: 'laser-power-3', tree: 'laser', name: 'Power III', desc: '+25% beam damage/sec', cost: 220, requires: 'laser-power-2', effect: stat('laser', 'dps', 1.25) },
  { id: 'laser-heat-1', tree: 'laser', name: 'Heat Capacity I', desc: '+35% firing time before overheat', cost: 70, effect: stat('laser', 'heatCapacity', 1.35) },
  { id: 'laser-heat-2', tree: 'laser', name: 'Heat Capacity II', desc: '+35% firing time before overheat', cost: 120, requires: 'laser-heat-1', effect: stat('laser', 'heatCapacity', 1.35) },
  { id: 'laser-heat-3', tree: 'laser', name: 'Heat Capacity III', desc: '+35% firing time before overheat', cost: 200, requires: 'laser-heat-2', effect: stat('laser', 'heatCapacity', 1.35) },
  { id: 'laser-cool-1', tree: 'laser', name: 'Cooling I', desc: '+40% heat shed per second', cost: 90, effect: stat('laser', 'coolPerSec', 1.4) },
  { id: 'laser-cool-2', tree: 'laser', name: 'Cooling II', desc: '+40% heat shed per second', cost: 160, requires: 'laser-cool-1', effect: stat('laser', 'coolPerSec', 1.4) },
  { id: 'laser-split', tree: 'laser', name: 'Beam Splitter', desc: 'Second beam hits another target at 50% power', cost: 320, requires: 'laser-power-2', effect: { kind: 'flag', flag: 'beamSplitter' } },

  // --- Flak Cannon ---
  { id: 'flak-rate-1', tree: 'flak', name: 'Fire Rate I', desc: '-15% reload time', cost: 80, effect: stat('flak', 'reloadSec', 0.85) },
  { id: 'flak-rate-2', tree: 'flak', name: 'Fire Rate II', desc: '-15% reload time', cost: 140, requires: 'flak-rate-1', effect: stat('flak', 'reloadSec', 0.85) },
  { id: 'flak-rate-3', tree: 'flak', name: 'Fire Rate III', desc: '-15% reload time', cost: 220, requires: 'flak-rate-2', effect: stat('flak', 'reloadSec', 0.85) },
  { id: 'flak-blast-1', tree: 'flak', name: 'Blast Radius I', desc: '+20% blast radius', cost: 70, effect: stat('flak', 'blastRadius', 1.2) },
  { id: 'flak-blast-2', tree: 'flak', name: 'Blast Radius II', desc: '+20% blast radius', cost: 120, requires: 'flak-blast-1', effect: stat('flak', 'blastRadius', 1.2) },
  { id: 'flak-blast-3', tree: 'flak', name: 'Blast Radius III', desc: '+20% blast radius', cost: 200, requires: 'flak-blast-2', effect: stat('flak', 'blastRadius', 1.2) },
  { id: 'flak-shrapnel', tree: 'flak', name: 'Shrapnel', desc: 'Bursts deal 50% damage in a wider fragment ring', cost: 280, requires: 'flak-blast-2', effect: { kind: 'flag', flag: 'shrapnel' } },
  { id: 'flak-fuse', tree: 'flak', name: 'Extended Fuses', desc: '+25% range', cost: 240, requires: 'flak-rate-2', effect: stat('flak', 'range', 1.25) },

  // --- Rocketry ---
  { id: 'rocketry-1', tree: 'rocketry', name: 'Rocketry I', desc: 'Unlocks the MEO ring', cost: 150, effect: { kind: 'unlockRing', ring: 1 } },
  { id: 'rocketry-2', tree: 'rocketry', name: 'Rocketry II', desc: 'Unlocks the HEO ring', cost: 300, requires: 'rocketry-1', effect: { kind: 'unlockRing', ring: 2 } },
  { id: 'rocketry-3', tree: 'rocketry', name: 'Rocketry III', desc: 'Unlocks the GEO ring', cost: 500, requires: 'rocketry-2', effect: { kind: 'unlockRing', ring: 3 } },
  { id: 'boosters-1', tree: 'rocketry', name: 'Reusable Boosters I', desc: 'Launch fees -30%', cost: 120, effect: { kind: 'launchFeeDiscount', discount: 0.3 } },
  { id: 'boosters-2', tree: 'rocketry', name: 'Reusable Boosters II', desc: 'Launch fees -60% total', cost: 240, requires: 'boosters-1', effect: { kind: 'launchFeeDiscount', discount: 0.3 } },
  { id: 'heavylift-1', tree: 'rocketry', name: 'Heavy-Lift Rockets I', desc: 'After a launch, the next satellite to the same ring pays no fee', cost: 180, requires: 'rocketry-1', effect: { kind: 'heavyLift', capacity: 2 } },
  { id: 'heavylift-2', tree: 'rocketry', name: 'Heavy-Lift Rockets II', desc: 'Two fee-free follow-up satellites per launch', cost: 320, requires: 'heavylift-1', effect: { kind: 'heavyLift', capacity: 3 } },
  { id: 'rapid-deploy', tree: 'rocketry', name: 'Rapid Deployment', desc: 'Launch satellites during a wave', cost: 220, effect: { kind: 'flag', flag: 'rapidDeploy' } },

  // --- Global / Earth ---
  { id: 'armor-1', tree: 'global', name: 'Planetary Armor I', desc: '+25 Earth max HP', cost: 100, effect: { kind: 'earthMaxHp', amount: 25 } },
  { id: 'armor-2', tree: 'global', name: 'Planetary Armor II', desc: '+25 Earth max HP', cost: 180, requires: 'armor-1', effect: { kind: 'earthMaxHp', amount: 25 } },
  { id: 'armor-3', tree: 'global', name: 'Planetary Armor III', desc: '+25 Earth max HP', cost: 280, requires: 'armor-2', effect: { kind: 'earthMaxHp', amount: 25 } },
  { id: 'salvage-1', tree: 'global', name: 'Salvage I', desc: '+15% credits per kill', cost: 90, effect: { kind: 'salvageBonus', bonus: 0.15 } },
  { id: 'salvage-2', tree: 'global', name: 'Salvage II', desc: '+15% credits per kill', cost: 160, requires: 'salvage-1', effect: { kind: 'salvageBonus', bonus: 0.15 } },
  { id: 'salvage-3', tree: 'global', name: 'Salvage III', desc: '+15% credits per kill', cost: 260, requires: 'salvage-2', effect: { kind: 'salvageBonus', bonus: 0.15 } },
  { id: 'radar-1', tree: 'global', name: 'Deep-Space Radar I', desc: 'Preview the next wave’s composition', cost: 120, effect: { kind: 'radar', depth: 1 } },
  { id: 'radar-2', tree: 'global', name: 'Deep-Space Radar II', desc: 'Preview two waves ahead', cost: 200, requires: 'radar-1', effect: { kind: 'radar', depth: 2 } },
]

export const RESEARCH_BY_ID: Record<string, ResearchNode> = Object.fromEntries(
  RESEARCH.map((n) => [n.id, n]),
)

export const TREES: { id: TreeId; name: string }[] = [
  { id: 'missile', name: 'Missiles' },
  { id: 'laser', name: 'Laser' },
  { id: 'flak', name: 'Flak' },
  { id: 'rocketry', name: 'Rocketry' },
  { id: 'global', name: 'Global' },
]

// Locked ring i is bought as RING_RESEARCH_IDS[i] (sidebar shortcut to the tree).
export const RING_RESEARCH_IDS: (string | null)[] = [null, 'rocketry-1', 'rocketry-2', 'rocketry-3']
