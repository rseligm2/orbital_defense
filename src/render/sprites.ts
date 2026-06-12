// Placeholder pixel art drawn in code — swapped for ComfyUI sprite sheets in M5.

import * as THREE from 'three'

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return [canvas, canvas.getContext('2d')!]
}

function texFromCanvas(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function earthTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(64, 32)
  ctx.fillStyle = '#16498f'
  ctx.fillRect(0, 0, 64, 32)
  ctx.fillStyle = '#2e8f44'
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * 60)
    const y = 3 + Math.floor(Math.random() * 25)
    ctx.fillRect(x, y, 2 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 4))
  }
  ctx.fillStyle = '#eaf4ff'
  ctx.fillRect(0, 0, 64, 2)
  ctx.fillRect(0, 30, 64, 2)
  return texFromCanvas(canvas)
}

export function asteroidTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(16, 16)
  ctx.fillStyle = '#8a7f70'
  ctx.fillRect(4, 2, 8, 12)
  ctx.fillRect(2, 4, 12, 8)
  ctx.fillStyle = '#a59a8a'
  ctx.fillRect(4, 3, 5, 4)
  ctx.fillStyle = '#5e554a'
  ctx.fillRect(9, 8, 3, 3)
  ctx.fillRect(5, 9, 2, 2)
  ctx.fillRect(10, 4, 2, 2)
  return texFromCanvas(canvas)
}

// Weapon satellites — distinct silhouettes per docs/SPRITES.md §3:
// tall column / diagonal X / wide squat drum, one per weapon.

// Missile Pod — "Quiver": vertical VLS rack. Tall silhouette; staggered
// loaded/empty cells read as a magazine mid-reload (slow-reload flavor),
// blue seeker dome on top (homing), low stub solar panels.
export function missilePodTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(16, 16)
  // seeker dome (weapon ID blue)
  ctx.fillStyle = '#2f6fd6'
  ctx.fillRect(7, 0, 2, 1)
  // body outline
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(4, 1, 8, 14)
  // hull
  ctx.fillStyle = '#d9dee6'
  ctx.fillRect(5, 2, 6, 12)
  // base bay
  ctx.fillStyle = '#9aa3b0'
  ctx.fillRect(5, 12, 6, 2)
  // recessed tube face
  ctx.fillStyle = '#3a404c'
  ctx.fillRect(6, 3, 4, 8)
  // loaded cells, staggered; the dark cells between them are spent tubes
  ctx.fillStyle = '#ff7b2a'
  ctx.fillRect(6, 3, 2, 2)
  ctx.fillRect(8, 6, 2, 2)
  ctx.fillRect(6, 9, 2, 2)
  ctx.fillStyle = '#ffd23f'
  ctx.fillRect(6, 3, 1, 1)
  ctx.fillRect(8, 6, 1, 1)
  ctx.fillRect(6, 9, 1, 1)
  // low-set stub solar panels
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(1, 8, 4, 6)
  ctx.fillRect(11, 8, 4, 6)
  ctx.fillStyle = '#1c3f7a'
  ctx.fillRect(2, 9, 2, 4)
  ctx.fillRect(12, 9, 2, 4)
  ctx.fillStyle = '#2f6fd6'
  ctx.fillRect(2, 10, 2, 1)
  ctx.fillRect(12, 10, 2, 1)
  // blue keel stripe (weapon ID color)
  ctx.fillRect(5, 13, 6, 1)
  return texFromCanvas(canvas)
}

// Laser — "Helios Eye": diamond lens body with four diagonal radiator fins.
// The aperture is the exact beam color (0xff5a5a in renderer.ts); the fins
// wear the overheat mechanic. hot=true is the flushed-radiator variant the
// renderer swaps in while the satellite is overheated.
export function laserSatTexture(hot = false): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(16, 16)
  // diagonal support arms (2×2 blocks — 1px diagonals shimmer; see SPRITES.md §1.1)
  ctx.fillStyle = '#9aa3b0'
  ctx.fillRect(4, 4, 2, 2)
  ctx.fillRect(10, 4, 2, 2)
  ctx.fillRect(4, 10, 2, 2)
  ctx.fillRect(10, 10, 2, 2)
  // radiator fins
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(0, 0, 4, 4)
  ctx.fillRect(12, 0, 4, 4)
  ctx.fillRect(0, 12, 4, 4)
  ctx.fillRect(12, 12, 4, 4)
  ctx.fillStyle = hot ? '#ff5a5a' : '#8f2c2c'
  ctx.fillRect(1, 1, 2, 2)
  ctx.fillRect(13, 1, 2, 2)
  ctx.fillRect(1, 13, 2, 2)
  ctx.fillRect(13, 13, 2, 2)
  // hottest pixel at each fin's inner corner, nearest the core
  ctx.fillStyle = hot ? '#ffd9d9' : '#ff5a5a'
  ctx.fillRect(2, 2, 1, 1)
  ctx.fillRect(13, 2, 1, 1)
  ctx.fillRect(2, 13, 1, 1)
  ctx.fillRect(13, 13, 1, 1)
  // diamond body outline
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(7, 4, 2, 1)
  ctx.fillRect(6, 5, 4, 1)
  ctx.fillRect(5, 6, 6, 1)
  ctx.fillRect(4, 7, 8, 2)
  ctx.fillRect(5, 9, 6, 1)
  ctx.fillRect(6, 10, 4, 1)
  ctx.fillRect(7, 11, 2, 1)
  // diamond hull
  ctx.fillStyle = '#d9dee6'
  ctx.fillRect(7, 5, 2, 1)
  ctx.fillRect(6, 6, 4, 1)
  ctx.fillRect(5, 7, 6, 2)
  ctx.fillRect(6, 9, 4, 1)
  ctx.fillRect(7, 10, 2, 1)
  // lens barrel
  ctx.fillStyle = '#5c6470'
  ctx.fillRect(7, 6, 2, 1)
  ctx.fillRect(7, 9, 2, 1)
  ctx.fillRect(6, 7, 1, 2)
  ctx.fillRect(9, 7, 1, 2)
  // aperture
  ctx.fillStyle = '#ff5a5a'
  ctx.fillRect(7, 7, 2, 2)
  ctx.fillStyle = '#ffd9d9'
  if (hot) ctx.fillRect(7, 7, 2, 2)
  else ctx.fillRect(7, 7, 1, 1)
  return texFromCanvas(canvas)
}

// Flak Cannon — "Hedgehog Drum": squat octagonal drum with four stub barrels
// (rapid fire in every direction, short reach) and an amber ammo-carousel
// band matching the shell tracer in flakShellTexture().
export function flakCannonTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(16, 16)
  // octagonal drum outline
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(4, 3, 8, 1)
  ctx.fillRect(3, 4, 10, 1)
  ctx.fillRect(2, 5, 12, 1)
  ctx.fillRect(1, 6, 14, 4)
  ctx.fillRect(2, 10, 12, 1)
  ctx.fillRect(3, 11, 10, 1)
  ctx.fillRect(4, 12, 8, 1)
  // hull, lit top to dark base
  ctx.fillStyle = '#d9dee6'
  ctx.fillRect(4, 4, 8, 1)
  ctx.fillRect(3, 5, 10, 1)
  ctx.fillRect(2, 6, 12, 1)
  ctx.fillStyle = '#9aa3b0'
  ctx.fillRect(2, 7, 12, 3)
  ctx.fillStyle = '#5c6470'
  ctx.fillRect(3, 10, 10, 1)
  ctx.fillRect(4, 11, 8, 1)
  // ammo carousel lights (flak ID amber, same hue as the shell tracer)
  ctx.fillStyle = '#e8b13d'
  ctx.fillRect(4, 7, 2, 1)
  ctx.fillRect(7, 7, 2, 1)
  ctx.fillRect(10, 7, 2, 1)
  ctx.fillStyle = '#9c6d1a'
  ctx.fillRect(4, 8, 2, 1)
  ctx.fillRect(7, 8, 2, 1)
  ctx.fillRect(10, 8, 2, 1)
  // four stub barrels, drawn last so they overlap the drum edge
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(6, 0, 4, 3)
  ctx.fillRect(6, 13, 4, 3)
  ctx.fillRect(0, 6, 3, 4)
  ctx.fillRect(13, 6, 3, 4)
  ctx.fillStyle = '#d9dee6'
  ctx.fillRect(7, 0, 2, 3)
  ctx.fillRect(7, 13, 2, 3)
  ctx.fillRect(0, 7, 3, 2)
  ctx.fillRect(13, 7, 3, 2)
  return texFromCanvas(canvas)
}

// Drawn pointing along +x; the renderer rotates the quad to the missile's heading.
// Orange nose matches the Quiver's loaded cells; blue tail fins are the pod's
// ID color (docs/SPRITES.md §4).
export function missileTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(8, 8)
  ctx.fillStyle = '#ffd23f'
  ctx.fillRect(0, 3, 2, 2)
  ctx.fillStyle = '#e9edf2'
  ctx.fillRect(2, 3, 4, 2)
  ctx.fillStyle = '#ff7b2a'
  ctx.fillRect(6, 3, 2, 2)
  ctx.fillStyle = '#2f6fd6'
  ctx.fillRect(2, 2, 1, 1)
  ctx.fillRect(2, 5, 1, 1)
  return texFromCanvas(canvas)
}

export function flakShellTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(8, 8)
  ctx.fillStyle = '#5c6470'
  ctx.fillRect(2, 2, 4, 4)
  ctx.fillStyle = '#e8b13d'
  ctx.fillRect(3, 3, 2, 2)
  return texFromCanvas(canvas)
}

export function sunTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(32, 32)
  ctx.fillStyle = '#ff8c2a'
  ctx.beginPath()
  ctx.arc(16, 16, 15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffd23f'
  ctx.beginPath()
  ctx.arc(16, 16, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff7e0'
  ctx.beginPath()
  ctx.arc(16, 16, 8, 0, Math.PI * 2)
  ctx.fill()
  return texFromCanvas(canvas)
}

export function explosionTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(16, 16)
  ctx.fillStyle = '#ff8c2a'
  ctx.fillRect(3, 5, 10, 6)
  ctx.fillRect(5, 3, 6, 10)
  ctx.fillStyle = '#ffe066'
  ctx.fillRect(5, 5, 6, 6)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(7, 7, 2, 2)
  ctx.fillStyle = '#ff8c2a'
  ctx.fillRect(1, 7, 2, 2)
  ctx.fillRect(13, 7, 2, 2)
  ctx.fillRect(7, 1, 2, 2)
  ctx.fillRect(7, 13, 2, 2)
  return texFromCanvas(canvas)
}
