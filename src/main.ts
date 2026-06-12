import './style.css'
import { AudioDirector } from './audio'
import { RINGS, WEAPONS } from './data/config'
import type { WeaponId } from './data/config'
import { RESEARCH_BY_ID, RING_RESEARCH_IDS } from './data/research'
import { GameRenderer } from './render/renderer'
import {
  closeLaunchBatch,
  createState,
  deployCost,
  satPosition,
  sellSatellite,
  setSatellitePriority,
  startWave,
  step,
  tryPlaceSatellite,
} from './sim/sim'
import { effectiveWeapon, hasFlag, radarDepth, tryResearch } from './sim/research'
import { waveComposition } from './sim/waves'
import type { SimState } from './sim/types'
import { Hud } from './ui/hud'
import { ResearchScreen } from './ui/research'
import { Sidebar } from './ui/sidebar'

const sceneEl = document.getElementById('scene')!
const uiEl = document.getElementById('ui')!

let state = createState()
let armed: WeaponId | null = null
let selectedRing = 0
let selectedSatelliteId: number | null = null
let ghostGaps: { plus: number; minus: number } | null = null
let lastPointer: { x: number; y: number } | null = null
let simSpeed = 1

const renderer = new GameRenderer(sceneEl)
const audio = new AudioDirector({ weaponStats: effectiveWeapon })

function canDeployNow(): boolean {
  return state.phase === 'build' || (state.phase === 'wave' && hasFlag(state, 'rapidDeploy'))
}

function disarm(): void {
  armed = null
  ghostGaps = null
  closeLaunchBatch(state)
  renderer.setGhost(null)
}

function selectSatelliteAt(x: number, y: number): void {
  let bestId: number | null = null
  let bestD2 = 0.3 * 0.3
  for (const sat of state.satellites) {
    const pos = satPosition(sat)
    const dx = pos.x - x
    const dy = pos.y - y
    const d2 = dx * dx + dy * dy
    if (d2 <= bestD2) {
      bestId = sat.id
      bestD2 = d2
    }
  }
  selectedSatelliteId = bestId
}

// Angular distance to the nearest neighbor each way around the ring — the phase
// indicator that makes even spacing legible (DESIGN.md §4).
function ringGaps(ring: number, angle: number): { plus: number; minus: number } | null {
  const TAU = Math.PI * 2
  let plus = Infinity
  let minus = Infinity
  for (const sat of state.satellites) {
    if (sat.ring !== ring) continue
    let d = (sat.angle - angle) % TAU
    if (d < 0) d += TAU
    if (d < plus) plus = d
    if (TAU - d < minus) minus = TAU - d
  }
  return Number.isFinite(plus) ? { plus, minus } : null
}

function refreshGhost(): void {
  if (!armed || !lastPointer) return
  const p = renderer.screenToPlane(lastPointer.x, lastPointer.y)
  if (!p) {
    ghostGaps = null
    renderer.setGhost(null)
    return
  }
  const angle = Math.atan2(p.y, p.x)
  ghostGaps = ringGaps(selectedRing, angle)
  renderer.setGhost({
    weapon: armed,
    ring: selectedRing,
    angle,
    range: effectiveWeapon(state, armed).range,
    gaps: ghostGaps,
  })
}

const hud = new Hud(uiEl, {
  onStartWave: () => {
    disarm()
    research.close()
    startWave(state)
  },
  onRestart: () => {
    state = createState()
    selectedRing = 0
    selectedSatelliteId = null
    simSpeed = 1
    audio.reset()
    audio.setPaused(false)
    research.close()
    disarm()
  },
  onSpeedChange: (speed) => {
    simSpeed = speed
    audio.setPaused(speed === 0)
  },
})

const research = new ResearchScreen(uiEl, {
  onBuy: (id) => {
    const node = RESEARCH_BY_ID[id]
    if (tryResearch(state, id)) {
      hud.toast(`${node.name} researched`)
      refreshGhost() // range research moves the ghost's disc
    } else {
      hud.toast(state.credits < node.cost ? `Need ${node.cost} cr` : 'Requirements not met')
    }
  },
})

const sidebar = new Sidebar(uiEl, {
  onWeaponClick: (weapon) => {
    if (!canDeployNow()) return
    if (armed === weapon) {
      disarm()
      return
    }
    armed = weapon
    refreshGhost()
  },
  onRingClick: (ring) => {
    if (ring < state.unlockedRings) {
      if (selectedRing !== ring) {
        selectedRing = ring
        closeLaunchBatch(state)
        refreshGhost()
      }
      return
    }
    const node = RESEARCH_BY_ID[RING_RESEARCH_IDS[ring]!]
    if (tryResearch(state, node.id)) {
      selectedRing = ring
      refreshGhost()
      hud.toast(`${node.name} complete — ${RINGS[ring].name} ring unlocked`)
    } else {
      hud.toast(`Need ${node.cost} cr to research ${node.name}`)
    }
  },
  onResearchClick: () => {
    if (state.phase === 'build') research.toggle()
  },
  onPriorityClick: (priority) => {
    if (selectedSatelliteId !== null && setSatellitePriority(state, selectedSatelliteId, priority)) {
      hud.toast(`Priority set to ${priority}`)
    }
  },
  onSellClick: () => {
    if (selectedSatelliteId !== null && sellSatellite(state, selectedSatelliteId)) {
      selectedSatelliteId = null
      hud.toast('Satellite sold')
      refreshGhost()
    }
  },
})

const canvas = renderer.domElement
let downX = 0
let downY = 0

canvas.addEventListener('pointerdown', (e) => {
  downX = e.clientX
  downY = e.clientY
})

canvas.addEventListener('pointermove', (e) => {
  lastPointer = { x: e.clientX, y: e.clientY }
  if (armed) refreshGhost()
})

canvas.addEventListener('pointerup', (e) => {
  if (!armed || e.button !== 0) return
  // A real drag is camera movement, not a placement click.
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return
  const p = renderer.screenToPlane(e.clientX, e.clientY)
  if (!p) return
  if (tryPlaceSatellite(state, armed, selectedRing, Math.atan2(p.y, p.x))) {
    refreshGhost() // neighbor gaps changed
  } else {
    hud.toast(
      `Not enough credits — ${WEAPONS[armed].name} on ${RINGS[selectedRing].name} costs ${deployCost(state, armed, selectedRing)} cr`,
    )
  }
})

canvas.addEventListener('click', (e) => {
  if (armed || e.button !== 0) return
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return
  const p = renderer.screenToPlane(e.clientX, e.clientY)
  if (!p) return
  selectSatelliteAt(p.x, p.y)
})

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  disarm()
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (research.isOpen) research.close()
    else disarm()
  }
  if (e.key === 'r' && state.phase === 'build') research.toggle()
  if (e.key === 'p') renderer.togglePixelated()
})

function armedStatusText(): string | null {
  if (!armed) return null
  const cost = deployCost(state, armed, selectedRing)
  let text = `${WEAPONS[armed].name} → ${RINGS[selectedRing].name} · ${cost} cr — click the ring to place · right-click to cancel`
  if (state.launchBatch && state.launchBatch.ring === selectedRing) {
    text += ` · heavy-lift: ${state.launchBatch.remaining} more fee-free`
  }
  if (ghostGaps) {
    const deg = (rad: number) => Math.round((rad * 180) / Math.PI)
    text += ` · neighbor gaps ${deg(ghostGaps.plus)}° / ${deg(ghostGaps.minus)}°`
  }
  return text
}

function radarText(): string | null {
  if (state.phase !== 'build') return null
  const depth = radarDepth(state)
  if (depth === 0) return null
  const parts: string[] = []
  for (let i = 0; i < depth; i++) {
    const wave = state.waveNumber + i
    const comp = waveComposition(wave)
      .map((g) => `${g.count} ${g.type}${g.count === 1 ? '' : 's'}`)
      .join(', ')
    parts.push(`Wave ${wave}: ${comp}`)
  }
  return `📡 ${parts.join('  ·  ')}`
}

// Dev/test hooks for the headless verification harness (CLAUDE.md).
declare global {
  interface Window {
    __od?: {
      readonly state: SimState
      addCredits(n: number): void
      buy(id: string): boolean
      planeToScreen(x: number, y: number): { x: number; y: number }
      setSpeed(speed: number): void
    }
  }
}
if (import.meta.env.DEV) {
  window.__od = {
    get state() {
      return state
    },
    addCredits(n: number) {
      state.credits += n
    },
    buy: (id) => tryResearch(state, id),
    planeToScreen: (x, y) => renderer.planeToScreen(x, y),
    setSpeed(speed) {
      simSpeed = speed
    },
  }
}

const DT = 1 / 60
let last = performance.now()
let acc = 0

function frame(now: number): void {
  const dt = Math.min(now - last, 100) / 1000
  last = now
  acc += dt * simSpeed
  while (acc >= DT) {
    step(state, DT)
    acc -= DT
  }

  if (armed && !canDeployNow()) disarm()
  if (research.isOpen && state.phase !== 'build') research.close()
  if (
    selectedSatelliteId !== null &&
    !state.satellites.some((sat) => sat.id === selectedSatelliteId)
  ) {
    selectedSatelliteId = null
  }

  for (const ev of state.events) {
    if (ev.type === 'wave-cleared') hud.toast(`Wave ${ev.wave} cleared — +${ev.bonus} cr bonus`)
  }

  audio.sync(state, state.events, dt)
  renderer.sync(state, dt)
  state.events.length = 0
  renderer.render(dt)
  hud.update(state, armedStatusText(), radarText(), simSpeed)
  sidebar.update(state, armed, selectedRing, selectedSatelliteId)
  research.update(state)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
