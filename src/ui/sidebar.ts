// Left sidebar command surface (DESIGN.md §12): weapon selection, ring
// selection/unlocks (shortcut into the rocketry tree), and the research button.

import { RINGS, WEAPONS } from '../data/config'
import type { WeaponId } from '../data/config'
import { RESEARCH, RESEARCH_BY_ID, RING_RESEARCH_IDS } from '../data/research'
import { deployCost } from '../sim/sim'
import { hasFlag, launchFee } from '../sim/research'
import type { SimState } from '../sim/types'

const WEAPON_IDS: WeaponId[] = ['missile', 'laser', 'flak']
const WEAPON_ICONS: Record<WeaponId, string> = { missile: '🚀', laser: '🔆', flak: '💥' }

export interface SidebarCallbacks {
  onWeaponClick: (weapon: WeaponId) => void
  onRingClick: (ring: number) => void
  onResearchClick: () => void
}

export class Sidebar {
  private weaponBtns = new Map<WeaponId, HTMLButtonElement>()
  private weaponCostEls = new Map<WeaponId, HTMLElement>()
  private ringBtns: HTMLButtonElement[] = []
  private researchBtn: HTMLButtonElement
  private researchCountEl: HTMLElement

  constructor(root: HTMLElement, cb: SidebarCallbacks) {
    const el = document.createElement('div')
    el.id = 'sidebar'
    el.innerHTML = `
      <h2>ORBITAL COMMAND</h2>
      <div class="section">
        <h3>Weapons</h3>
        ${WEAPON_IDS.map((id) => {
          const w = WEAPONS[id]
          return `
            <button class="card" id="weapon-${id}">
              <b>${WEAPON_ICONS[id]} ${w.name}</b>
              <span class="cost" data-cost></span>
              <span>${w.tagline}</span>
            </button>`
        }).join('')}
      </div>
      <div class="section">
        <h3>Orbit rings</h3>
        ${RINGS.map((_, i) => `<button class="ringbtn" id="ring-${i}"></button>`).join('')}
      </div>
      <div class="section">
        <h3>Research</h3>
        <button class="card" id="open-research">
          <b>🔬 Research Lab</b>
          <span id="research-count"></span>
          <span>Open with R</span>
        </button>
      </div>
    `
    root.appendChild(el)

    for (const id of WEAPON_IDS) {
      const btn = el.querySelector<HTMLButtonElement>(`#weapon-${id}`)!
      btn.addEventListener('click', () => cb.onWeaponClick(id))
      this.weaponBtns.set(id, btn)
      this.weaponCostEls.set(id, btn.querySelector<HTMLElement>('[data-cost]')!)
    }
    RINGS.forEach((_, i) => {
      const btn = el.querySelector<HTMLButtonElement>(`#ring-${i}`)!
      btn.addEventListener('click', () => cb.onRingClick(i))
      this.ringBtns.push(btn)
    })
    this.researchBtn = el.querySelector<HTMLButtonElement>('#open-research')!
    this.researchBtn.addEventListener('click', cb.onResearchClick)
    this.researchCountEl = el.querySelector<HTMLElement>('#research-count')!
  }

  update(state: SimState, armed: WeaponId | null, selectedRing: number): void {
    const build = state.phase === 'build'
    const canDeploy = build || (state.phase === 'wave' && hasFlag(state, 'rapidDeploy'))

    for (const id of WEAPON_IDS) {
      const btn = this.weaponBtns.get(id)!
      const cost = deployCost(state, id, selectedRing)
      const fee = cost - WEAPONS[id].hardwareCost
      btn.disabled = !canDeploy
      btn.classList.toggle('selected', armed === id)
      const costEl = this.weaponCostEls.get(id)!
      costEl.textContent = `${cost} cr (${WEAPONS[id].hardwareCost} hw + ${fee} fee)`
      costEl.classList.toggle('short', state.credits < cost)
    }

    this.ringBtns.forEach((btn, i) => {
      const ring = RINGS[i]
      const unlocked = i < state.unlockedRings
      btn.classList.toggle('selected', unlocked && selectedRing === i)
      btn.classList.toggle('locked', !unlocked)
      if (unlocked) {
        btn.disabled = false
        btn.textContent = `${ring.name} · fee ${launchFee(state, i)} cr`
      } else {
        const node = RESEARCH_BY_ID[RING_RESEARCH_IDS[i]!]
        btn.disabled = !build || i !== state.unlockedRings
        btn.textContent = `🔒 ${ring.name} · ${node.name} — ${node.cost} cr`
      }
    })

    this.researchBtn.disabled = !build
    const owned = Object.keys(state.research).length
    this.researchCountEl.textContent = `${owned}/${RESEARCH.length} projects`
  }
}
