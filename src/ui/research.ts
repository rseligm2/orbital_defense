// Research screen (DESIGN.md §6, §12) — DOM overlay with the five trees.
// Opens during the build phase from the sidebar (or the R key).

import { RESEARCH, TREES } from '../data/research'
import type { SimState } from '../sim/types'

export interface ResearchCallbacks {
  onBuy: (id: string) => void
}

export class ResearchScreen {
  private el: HTMLElement
  private nodeBtns = new Map<string, HTMLButtonElement>()

  constructor(root: HTMLElement, cb: ResearchCallbacks) {
    this.el = document.createElement('div')
    this.el.id = 'research'
    this.el.className = 'hidden'
    this.el.innerHTML = `
      <div class="research-panel">
        <div class="research-head">
          <h1>RESEARCH</h1>
          <button id="research-close">✕ Close</button>
        </div>
        <div class="research-grid">
          ${TREES.map(
            (tree) => `
            <div class="tree">
              <h3>${tree.name}</h3>
              ${RESEARCH.filter((n) => n.tree === tree.id)
                .map(
                  (n) => `
                <button class="rnode" id="rs-${n.id}">
                  <b>${n.name}</b>
                  <span class="rcost" data-cost></span>
                  <span>${n.desc}</span>
                </button>`,
                )
                .join('')}
            </div>`,
          ).join('')}
        </div>
      </div>
    `
    root.appendChild(this.el)

    for (const node of RESEARCH) {
      const btn = this.el.querySelector<HTMLButtonElement>(`#rs-${node.id}`)!
      btn.addEventListener('click', () => cb.onBuy(node.id))
      this.nodeBtns.set(node.id, btn)
    }
    this.el.querySelector('#research-close')!.addEventListener('click', () => this.close())
  }

  get isOpen(): boolean {
    return !this.el.classList.contains('hidden')
  }

  open(): void {
    this.el.classList.remove('hidden')
  }

  close(): void {
    this.el.classList.add('hidden')
  }

  toggle(): void {
    this.el.classList.toggle('hidden')
  }

  update(state: SimState): void {
    if (!this.isOpen) return
    for (const node of RESEARCH) {
      const btn = this.nodeBtns.get(node.id)!
      const owned = !!state.research[node.id]
      const locked = !!node.requires && !state.research[node.requires]
      btn.classList.toggle('owned', owned)
      btn.classList.toggle('locked', locked)
      btn.disabled = owned || locked
      const costEl = btn.querySelector<HTMLElement>('[data-cost]')!
      costEl.textContent = owned ? '✓ researched' : locked ? '🔒 requires previous' : `${node.cost} cr`
      costEl.classList.toggle('short', !owned && !locked && state.credits < node.cost)
    }
  }
}
