import type { SimState } from '../sim/types'

export interface HudCallbacks {
  onStartWave: () => void
  onRestart: () => void
  onSpeedChange: (speed: number) => void
}

export class Hud {
  private creditsEl: HTMLElement
  private hpFillEl: HTMLElement
  private hpTextEl: HTMLElement
  private waveEl: HTMLElement
  private statusEl: HTMLElement
  private toastEl: HTMLElement
  private radarEl: HTMLElement
  private waveBtn: HTMLButtonElement
  private speedBtns: HTMLButtonElement[] = []
  private overlayEl: HTMLElement
  private overlayStatsEl: HTMLElement
  private toastTimer = 0

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
      <div class="radar" id="hud-radar"></div>
      <div class="status" id="hud-status"></div>
      <div class="bottombar">
        <div class="speedbar" id="hud-speedbar">
          <button data-speed="0">⏸</button>
          <button data-speed="1">1×</button>
          <button data-speed="2">2×</button>
          <button data-speed="4">4×</button>
        </div>
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
    this.radarEl = root.querySelector('#hud-radar')!
    this.waveBtn = root.querySelector('#hud-startwave')!
    this.speedBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('#hud-speedbar button'))
    this.overlayEl = root.querySelector('#overlay')!
    this.overlayStatsEl = root.querySelector('#overlay-stats')!

    this.waveBtn.addEventListener('click', cb.onStartWave)
    for (const btn of this.speedBtns) {
      btn.addEventListener('click', () => cb.onSpeedChange(Number(btn.dataset.speed)))
    }
    root.querySelector('#hud-restart')!.addEventListener('click', cb.onRestart)
  }

  toast(msg: string): void {
    this.toastEl.textContent = msg
    this.toastEl.classList.add('show')
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 2500)
  }

  update(state: SimState, armedText: string | null, radarText: string | null, speed: number): void {
    this.radarEl.textContent = radarText ?? ''
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

    this.waveBtn.disabled = state.phase !== 'build'
    for (const btn of this.speedBtns) {
      btn.classList.toggle('selected', Number(btn.dataset.speed) === speed)
    }

    if (armedText) {
      this.statusEl.textContent = armedText
    } else if (state.phase === 'build') {
      this.statusEl.textContent =
        'Build phase: pick a weapon in the sidebar, then start the wave. Drag to rotate, scroll to zoom.'
    } else if (speed === 0) {
      this.statusEl.textContent = 'Paused'
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
