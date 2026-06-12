import { placementCost } from '../data/config'
import type { SimState } from '../sim/types'

export interface HudCallbacks {
  onToggleArm: () => void
  onStartWave: () => void
  onRestart: () => void
}

export class Hud {
  private creditsEl: HTMLElement
  private hpFillEl: HTMLElement
  private hpTextEl: HTMLElement
  private waveEl: HTMLElement
  private statusEl: HTMLElement
  private toastEl: HTMLElement
  private launchBtn: HTMLButtonElement
  private waveBtn: HTMLButtonElement
  private overlayEl: HTMLElement
  private overlayStatsEl: HTMLElement
  private toastTimer = 0
  private launchCost = placementCost('missile', 0)

  constructor(root: HTMLElement, cb: HudCallbacks) {
    root.innerHTML = `
      <div class="topbar">
        <div class="readout" id="hud-credits"></div>
        <div class="hpwrap">
          <div class="hpbar"><div class="hpfill" id="hud-hpfill"></div></div>
          <div class="hplabel" id="hud-hptext"></div>
        </div>
        <div class="readout" id="hud-wave"></div>
      </div>
      <div class="toast" id="hud-toast"></div>
      <div class="status" id="hud-status"></div>
      <div class="bottombar">
        <button id="hud-launch">🚀 Missile Pod — ${this.launchCost} cr</button>
        <button id="hud-startwave">▶ Start Wave</button>
      </div>
      <div id="overlay" class="hidden">
        <h1>EARTH HAS FALLEN</h1>
        <div id="overlay-stats"></div>
        <button id="hud-restart">New Game</button>
      </div>
    `
    this.creditsEl = root.querySelector('#hud-credits')!
    this.hpFillEl = root.querySelector('#hud-hpfill')!
    this.hpTextEl = root.querySelector('#hud-hptext')!
    this.waveEl = root.querySelector('#hud-wave')!
    this.statusEl = root.querySelector('#hud-status')!
    this.toastEl = root.querySelector('#hud-toast')!
    this.launchBtn = root.querySelector('#hud-launch')!
    this.waveBtn = root.querySelector('#hud-startwave')!
    this.overlayEl = root.querySelector('#overlay')!
    this.overlayStatsEl = root.querySelector('#overlay-stats')!

    this.launchBtn.addEventListener('click', cb.onToggleArm)
    this.waveBtn.addEventListener('click', cb.onStartWave)
    root.querySelector('#hud-restart')!.addEventListener('click', cb.onRestart)
  }

  toast(msg: string): void {
    this.toastEl.textContent = msg
    this.toastEl.classList.add('show')
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 2500)
  }

  update(state: SimState, armed: boolean): void {
    this.creditsEl.textContent = `⬡ ${state.credits} cr`
    const pct = (state.earthHp / state.earthMaxHp) * 100
    this.hpFillEl.style.width = `${pct}%`
    this.hpFillEl.classList.toggle('low', pct <= 30)
    this.hpTextEl.textContent = `EARTH ${state.earthHp}/${state.earthMaxHp}`

    if (state.phase === 'wave') {
      const remaining = state.enemies.length + state.spawnQueue.length
      this.waveEl.textContent = `WAVE ${state.waveNumber} — ${remaining} hostile${remaining === 1 ? '' : 's'}`
    } else {
      this.waveEl.textContent = `WAVE ${state.waveNumber}`
    }

    this.launchBtn.disabled = state.phase !== 'build' || (!armed && state.credits < this.launchCost)
    this.launchBtn.classList.toggle('armed', armed)
    this.waveBtn.disabled = state.phase !== 'build'

    if (armed) {
      this.statusEl.textContent = 'Click the orbit ring to launch — Esc to cancel'
    } else if (state.phase === 'build') {
      this.statusEl.textContent = 'Build phase: deploy satellites, then start the wave. Drag to rotate, scroll to zoom.'
    } else {
      this.statusEl.textContent = ''
    }

    const over = state.phase === 'gameover'
    this.overlayEl.classList.toggle('hidden', !over)
    if (over) {
      this.overlayStatsEl.textContent =
        `Waves survived: ${state.waveNumber - 1}  ·  Kills: ${state.kills}  ·  Credits earned: ${state.creditsEarned}`
    }
  }
}
