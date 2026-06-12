import './style.css'
import { GameRenderer } from './render/renderer'
import { createState, startWave, step, tryPlaceSatellite } from './sim/sim'
import { Hud } from './ui/hud'

const sceneEl = document.getElementById('scene')!
const uiEl = document.getElementById('ui')!

let state = createState()
let armed = false

const renderer = new GameRenderer(sceneEl)

function disarm(): void {
  armed = false
  renderer.setGhost(null)
}

const hud = new Hud(uiEl, {
  onToggleArm: () => {
    if (armed) disarm()
    else if (state.phase === 'build') armed = true
  },
  onStartWave: () => {
    disarm()
    startWave(state)
  },
  onRestart: () => {
    state = createState()
    disarm()
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
  if (!armed) return
  const p = renderer.screenToPlane(e.clientX, e.clientY)
  renderer.setGhost(p ? Math.atan2(p.y, p.x) : null)
})

canvas.addEventListener('pointerup', (e) => {
  if (!armed) return
  // A real drag is camera movement, not a placement click.
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return
  const p = renderer.screenToPlane(e.clientX, e.clientY)
  if (!p) return
  if (!tryPlaceSatellite(state, 'missile', 0, Math.atan2(p.y, p.x))) {
    hud.toast('Not enough credits')
  }
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') disarm()
  if (e.key === 'p') renderer.togglePixelated()
})

const DT = 1 / 60
let last = performance.now()
let acc = 0

function frame(now: number): void {
  const dt = Math.min(now - last, 100) / 1000
  last = now
  acc += dt
  while (acc >= DT) {
    step(state, DT)
    acc -= DT
  }

  if (armed && state.phase !== 'build') disarm()

  for (const ev of state.events) {
    if (ev.type === 'wave-cleared') hud.toast(`Wave ${ev.wave} cleared — +${ev.bonus} cr bonus`)
  }

  renderer.sync(state, dt)
  state.events.length = 0
  renderer.render(dt)
  hud.update(state, armed)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
