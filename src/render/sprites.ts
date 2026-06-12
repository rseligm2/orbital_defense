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
  const [canvas, ctx] = makeCanvas(128, 64)
  const w = canvas.width
  const h = canvas.height
  ctx.fillStyle = '#123d78'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#16498f'
  ctx.fillRect(0, 7, w, h - 14)

  drawGeoPoly(ctx, w, h, '#2e8f44', [
    [-168, 70],
    [-146, 60],
    [-125, 53],
    [-124, 35],
    [-113, 29],
    [-103, 18],
    [-84, 18],
    [-79, 25],
    [-72, 41],
    [-53, 52],
    [-63, 61],
    [-95, 70],
    [-130, 73],
  ])
  drawGeoPoly(ctx, w, h, '#3b9d52', [
    [-138, 60],
    [-126, 50],
    [-122, 39],
    [-110, 31],
    [-98, 24],
    [-91, 29],
    [-100, 42],
    [-117, 50],
  ])
  drawGeoPoly(ctx, w, h, '#2b7e41', [
    [-92, 18],
    [-84, 17],
    [-78, 9],
    [-73, 8],
    [-77, 17],
  ])
  drawGeoPoly(ctx, w, h, '#2f8f47', [
    [-82, 12],
    [-67, 8],
    [-50, -5],
    [-38, -20],
    [-52, -55],
    [-70, -53],
    [-79, -25],
  ])
  drawGeoPoly(ctx, w, h, '#3aa257', [
    [-74, 3],
    [-58, -4],
    [-47, -15],
    [-58, -28],
    [-69, -18],
  ])
  drawGeoPoly(ctx, w, h, '#e6f1f9', [
    [-58, 82],
    [-25, 76],
    [-20, 66],
    [-43, 59],
    [-62, 67],
  ])
  drawGeoPoly(ctx, w, h, '#378f4e', [
    [-11, 36],
    [3, 52],
    [30, 61],
    [46, 47],
    [35, 36],
    [12, 34],
  ])
  drawGeoPoly(ctx, w, h, '#b7a85c', [
    [-18, 34],
    [32, 34],
    [50, 10],
    [42, -34],
    [18, -35],
    [-10, -20],
    [-18, 8],
  ])
  drawGeoPoly(ctx, w, h, '#2f8f47', [
    [11, 8],
    [32, 7],
    [31, -25],
    [13, -31],
    [3, -8],
  ])
  drawGeoPoly(ctx, w, h, '#3a9b51', [
    [30, 60],
    [61, 70],
    [106, 66],
    [141, 55],
    [158, 43],
    [137, 25],
    [151, 7],
    [121, -8],
    [96, 8],
    [75, 5],
    [61, 25],
    [38, 25],
    [30, 45],
  ])
  drawGeoPoly(ctx, w, h, '#b7a85c', [
    [36, 33],
    [58, 31],
    [66, 15],
    [52, 12],
    [41, 20],
  ])
  drawGeoPoly(ctx, w, h, '#2f8f47', [
    [68, 25],
    [89, 22],
    [80, 6],
    [72, 8],
  ])
  drawGeoPoly(ctx, w, h, '#2f8f47', [
    [94, 24],
    [110, 20],
    [109, 6],
    [99, 6],
  ])
  drawGeoPoly(ctx, w, h, '#a79b56', [
    [112, -12],
    [154, -11],
    [150, -38],
    [118, -35],
    [110, -25],
  ])
  drawGeoPoly(ctx, w, h, '#2d8345', [
    [137, 37],
    [146, 39],
    [143, 31],
    [134, 32],
  ])
  drawGeoPoly(ctx, w, h, '#eaf4ff', [
    [-180, -76],
    [-90, -70],
    [0, -76],
    [90, -70],
    [180, -75],
    [180, -90],
    [-180, -90],
  ])

  ctx.fillStyle = '#eaf4ff'
  ctx.fillRect(0, 0, w, 3)
  ctx.fillRect(0, h - 3, w, 3)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
  ctx.fillRect(83, 11, 8, 1) // Himalaya snow trace
  ctx.fillRect(50, 43, 8, 1) // Andes trace
  ctx.fillStyle = '#eaf4ff'
  ctx.fillRect(45, 7, 1, 1)
  ctx.fillRect(98, 23, 1, 1)
  return texFromCanvas(canvas)
}

export function earthLightsTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 64)
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  const clusters: Array<[number, number, number]> = [
    [-122, 37, 1.0],
    [-118, 34, 0.85],
    [-96, 32, 0.75],
    [-87, 42, 1.0],
    [-74, 41, 1.2],
    [-99, 19, 1.0],
    [-46, -23, 1.1],
    [-58, -34, 0.9],
    [-70, -33, 0.7],
    [-3, 52, 1.1],
    [2, 49, 1.15],
    [7, 51, 1.0],
    [12, 42, 0.9],
    [30, 31, 1.2],
    [44, 33, 0.8],
    [55, 25, 0.9],
    [73, 19, 1.2],
    [78, 28, 1.25],
    [88, 23, 0.9],
    [116, 39, 1.2],
    [121, 31, 1.15],
    [114, 23, 1.0],
    [127, 37, 1.0],
    [139, 36, 1.1],
    [106, 10, 0.75],
    [100, 14, 0.7],
    [151, -33, 0.8],
    [145, -38, 0.7],
    [28, -26, 0.85],
    [3, 6, 0.8],
  ]
  for (const [lon, lat, strength] of clusters) drawLightCluster(ctx, w, h, lon, lat, strength)
  drawLightCorridor(ctx, w, h, [
    [-84, 33],
    [-78, 36],
    [-74, 40],
    [-71, 42],
  ])
  drawLightCorridor(ctx, w, h, [
    [-1, 51],
    [4, 50],
    [8, 49],
    [12, 45],
    [16, 41],
  ])
  drawLightCorridor(ctx, w, h, [
    [31, 31],
    [31, 27],
    [30, 24],
    [31, 20],
  ])
  drawLightCorridor(ctx, w, h, [
    [72, 22],
    [77, 24],
    [82, 25],
    [88, 22],
  ])
  drawLightCorridor(ctx, w, h, [
    [113, 23],
    [118, 28],
    [121, 31],
    [116, 39],
  ])
  return texFromCanvas(canvas)
}

export function milkyWayTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(320, 180)
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'

  for (let x = 0; x < w; x += 2) {
    const nx = x / w
    const center = h * (0.68 - nx * 0.54) + Math.sin(x * 0.018) * 10
    const bulge = Math.exp(-Math.pow((nx - 0.38) / 0.18, 2))
    const width = 10 + bulge * 24 + Math.sin(x * 0.031 + 1.1) * 3
    for (let y = Math.floor(center - width * 2.5); y <= center + width * 2.5; y += 2) {
      const d = Math.abs(y - center) / width
      if (d > 2.5) continue
      const grain = rand01(x * 1.7 + y * 9.1)
      const core = Math.max(0, 1 - d / 2.5)
      const a = core * (0.18 + grain * 0.34 + bulge * 0.32)
      ctx.fillStyle = `rgba(118, 146, 210, ${a})`
      ctx.fillRect(x, y, 2, 2)
      if (grain > 0.82) {
        ctx.fillStyle = `rgba(236, 226, 196, ${a * 0.95})`
        ctx.fillRect(x, y, 1, 1)
      }
      if (grain < 0.16 && d < 1.0) {
        ctx.fillStyle = `rgba(2, 4, 11, ${0.22 * (1 - d)})`
        ctx.fillRect(x, y, 3, 2)
      }
    }
  }

  for (let i = 0; i < 420; i++) {
    const x = Math.floor(rand01(i * 13.7) * w)
    const y = Math.floor(rand01(i * 7.9 + 3) * h)
    const bandY = h * (0.68 - (x / w) * 0.54) + Math.sin(x * 0.018) * 10
    const nearBand = Math.abs(y - bandY) < 46
    const a = nearBand ? 0.35 + rand01(i * 5.1) * 0.6 : 0.08 + rand01(i * 5.1) * 0.2
    ctx.fillStyle = `rgba(190, 205, 238, ${a})`
    ctx.fillRect(x, y, 1, 1)
  }
  return texFromCanvas(canvas)
}

export function rocketTexture(ring: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(16, 24)
  const accent = ['#66ccff', '#8fe36f', '#ffd23f', '#ff7b2a'][ring] ?? '#66ccff'
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(6, 1, 4, 2)
  ctx.fillRect(5, 3, 6, 15)
  ctx.fillRect(3, 14, 10, 6)
  ctx.fillRect(4, 20, 8, 2)
  if (ring >= 2) {
    ctx.fillRect(1, 11, 4, 9)
    ctx.fillRect(11, 11, 4, 9)
  }
  ctx.fillStyle = '#e9edf2'
  ctx.fillRect(6, 3, 4, 14)
  ctx.fillStyle = '#9aa3b0'
  ctx.fillRect(5, 14, 6, 4)
  ctx.fillStyle = accent
  ctx.fillRect(7, 5 + Math.min(ring, 2) * 2, 2, 2)
  ctx.fillRect(6, 12, 4, 1)
  if (ring >= 1) ctx.fillRect(6, 15, 4, 1)
  if (ring >= 2) {
    ctx.fillStyle = '#d9dee6'
    ctx.fillRect(2, 12, 2, 7)
    ctx.fillRect(12, 12, 2, 7)
  }
  ctx.fillStyle = '#ffd23f'
  ctx.fillRect(6, 21, 4, 1)
  ctx.fillStyle = '#ff7b2a'
  ctx.fillRect(5, 22, 6, 2)
  return texFromCanvas(canvas)
}

export function boosterTexture(ring: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(10, 16)
  const accent = ['#66ccff', '#8fe36f', '#ffd23f', '#ff7b2a'][ring] ?? '#66ccff'
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(3, 1, 4, 13)
  ctx.fillRect(2, 12, 6, 3)
  ctx.fillStyle = '#c9d0d8'
  ctx.fillRect(4, 2, 2, 10)
  ctx.fillStyle = accent
  ctx.fillRect(4, 6, 2, 1)
  ctx.fillRect(4, 9, 2, 1)
  ctx.fillStyle = '#ff7b2a'
  ctx.fillRect(3, 14, 4, 2)
  return texFromCanvas(canvas)
}

function drawGeoPoly(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fill: string,
  points: Array<[number, number]>,
): void {
  ctx.fillStyle = fill
  ctx.beginPath()
  points.forEach(([lon, lat], i) => {
    const p = lonLatToPx(w, h, lon, lat)
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  })
  ctx.closePath()
  ctx.fill()
}

function drawLightCluster(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lon: number,
  lat: number,
  strength: number,
): void {
  const p = lonLatToPx(w, h, lon, lat)
  const alpha = Math.min(0.95, 0.45 + strength * 0.25)
  ctx.fillStyle = `rgba(255, 214, 130, ${alpha})`
  ctx.fillRect(p.x, p.y, 1, 1)
  if (strength > 0.8) {
    ctx.fillStyle = `rgba(255, 178, 76, ${alpha * 0.45})`
    ctx.fillRect(p.x - 1, p.y, 3, 1)
    ctx.fillRect(p.x, p.y - 1, 1, 3)
  }
  if (strength > 1.0) {
    ctx.fillStyle = `rgba(255, 238, 170, ${alpha * 0.5})`
    ctx.fillRect(p.x + 1, p.y + 1, 1, 1)
    ctx.fillRect(p.x - 1, p.y - 1, 1, 1)
  }
}

function drawLightCorridor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  points: Array<[number, number]>,
): void {
  ctx.strokeStyle = 'rgba(255, 201, 103, 0.45)'
  ctx.lineWidth = 1
  ctx.beginPath()
  points.forEach(([lon, lat], i) => {
    const p = lonLatToPx(w, h, lon, lat)
    if (i === 0) ctx.moveTo(p.x + 0.5, p.y + 0.5)
    else ctx.lineTo(p.x + 0.5, p.y + 0.5)
  })
  ctx.stroke()
}

function lonLatToPx(w: number, h: number, lon: number, lat: number): { x: number; y: number } {
  return {
    x: Math.round(((lon + 180) / 360) * (w - 1)),
    y: Math.round(((90 - lat) / 180) * (h - 1)),
  }
}

function rand01(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
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

// M4 enemy sidecar textures. These are additive until the M4 renderer wiring
// chooses maps by enemy type; asteroidTexture() remains the current default.

// Fighter: fast, low-HP dart. Drawn nose-up so the renderer can rotate it to
// heading later; swept wings and a bright core keep it readable at small scale.
export function fighterTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(16, 16)
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(7, 1, 2, 1)
  ctx.fillRect(6, 2, 4, 2)
  ctx.fillRect(5, 4, 6, 1)
  ctx.fillRect(3, 5, 10, 2)
  ctx.fillRect(1, 7, 14, 2)
  ctx.fillRect(3, 9, 10, 1)
  ctx.fillRect(5, 10, 6, 3)
  ctx.fillRect(6, 13, 4, 2)

  ctx.fillStyle = '#5a2638'
  ctx.fillRect(4, 6, 8, 1)
  ctx.fillRect(2, 7, 12, 1)
  ctx.fillRect(3, 8, 10, 1)

  ctx.fillStyle = '#d9dee6'
  ctx.fillRect(7, 2, 2, 2)
  ctx.fillRect(6, 4, 4, 2)
  ctx.fillRect(6, 6, 4, 4)
  ctx.fillRect(7, 10, 2, 3)

  ctx.fillStyle = '#9aa3b0'
  ctx.fillRect(5, 10, 2, 1)
  ctx.fillRect(9, 10, 2, 1)
  ctx.fillRect(6, 11, 4, 1)

  ctx.fillStyle = '#ff5a5a'
  ctx.fillRect(7, 5, 2, 2)
  ctx.fillStyle = '#ffd23f'
  ctx.fillRect(7, 13, 2, 1)
  ctx.fillStyle = '#ff7b2a'
  ctx.fillRect(7, 14, 2, 1)
  return texFromCanvas(canvas)
}

// Bomber: broad, heavy wedge with twin engine pods and a visible bomb bay.
// It reads wider and slower than the fighter without sharing the flak turret's
// round, friendly silhouette.
export function bomberTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(16, 16)
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(6, 1, 4, 1)
  ctx.fillRect(5, 2, 6, 2)
  ctx.fillRect(3, 4, 10, 2)
  ctx.fillRect(1, 6, 14, 4)
  ctx.fillRect(2, 10, 12, 2)
  ctx.fillRect(4, 12, 8, 2)
  ctx.fillRect(3, 14, 3, 1)
  ctx.fillRect(10, 14, 3, 1)

  ctx.fillStyle = '#5a2638'
  ctx.fillRect(4, 5, 8, 1)
  ctx.fillRect(2, 6, 12, 3)
  ctx.fillRect(3, 10, 10, 1)

  ctx.fillStyle = '#d9dee6'
  ctx.fillRect(6, 2, 4, 2)
  ctx.fillRect(5, 4, 6, 2)
  ctx.fillRect(4, 6, 8, 2)
  ctx.fillRect(5, 8, 6, 2)

  ctx.fillStyle = '#9aa3b0'
  ctx.fillRect(4, 10, 8, 2)
  ctx.fillRect(5, 12, 6, 1)

  ctx.fillStyle = '#3a1d2c'
  ctx.fillRect(6, 8, 4, 3)
  ctx.fillStyle = '#ff5a5a'
  ctx.fillRect(7, 4, 2, 2)
  ctx.fillStyle = '#ff7b2a'
  ctx.fillRect(6, 9, 1, 1)
  ctx.fillRect(9, 9, 1, 1)
  ctx.fillStyle = '#ffd23f'
  ctx.fillRect(4, 13, 2, 1)
  ctx.fillRect(10, 13, 2, 1)
  return texFromCanvas(canvas)
}

// Carrier boss: oversized command hull with side launch bays and a central
// hangar mouth. The 32px canvas gives the boss room for readable structure
// while retaining the same hard-outline, light-core language.
export function carrierTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(32, 32)
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(13, 1, 6, 2)
  ctx.fillRect(11, 3, 10, 2)
  ctx.fillRect(8, 5, 16, 3)
  ctx.fillRect(5, 8, 22, 3)
  ctx.fillRect(3, 11, 26, 10)
  ctx.fillRect(5, 21, 22, 3)
  ctx.fillRect(8, 24, 16, 3)
  ctx.fillRect(11, 27, 10, 2)
  ctx.fillRect(13, 29, 6, 2)

  ctx.fillStyle = '#5a2638'
  ctx.fillRect(9, 6, 14, 2)
  ctx.fillRect(6, 9, 20, 3)
  ctx.fillRect(4, 12, 24, 8)
  ctx.fillRect(6, 20, 20, 2)
  ctx.fillRect(9, 22, 14, 3)

  ctx.fillStyle = '#9aa3b0'
  ctx.fillRect(13, 3, 6, 2)
  ctx.fillRect(11, 5, 10, 3)
  ctx.fillRect(9, 8, 14, 4)
  ctx.fillRect(8, 12, 16, 10)
  ctx.fillRect(11, 22, 10, 4)

  ctx.fillStyle = '#d9dee6'
  ctx.fillRect(14, 4, 4, 2)
  ctx.fillRect(12, 7, 8, 4)
  ctx.fillRect(10, 12, 12, 2)
  ctx.fillRect(10, 19, 12, 3)

  ctx.fillStyle = '#3a1d2c'
  ctx.fillRect(8, 14, 16, 5)
  ctx.fillRect(5, 13, 4, 6)
  ctx.fillRect(23, 13, 4, 6)

  ctx.fillStyle = '#ff5a5a'
  ctx.fillRect(14, 14, 4, 2)
  ctx.fillRect(14, 17, 4, 2)
  ctx.fillRect(6, 14, 2, 2)
  ctx.fillRect(24, 14, 2, 2)
  ctx.fillStyle = '#ff7b2a'
  ctx.fillRect(10, 15, 3, 1)
  ctx.fillRect(19, 15, 3, 1)
  ctx.fillRect(10, 18, 3, 1)
  ctx.fillRect(19, 18, 3, 1)

  ctx.fillStyle = '#ffd23f'
  ctx.fillRect(13, 27, 2, 2)
  ctx.fillRect(17, 27, 2, 2)
  ctx.fillStyle = '#ff7b2a'
  ctx.fillRect(13, 29, 2, 1)
  ctx.fillRect(17, 29, 2, 1)
  return texFromCanvas(canvas)
}

// Bomber projectile/bomb sidecar for M4 satellite-attack visuals.
export function bomberBombTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(8, 8)
  ctx.fillStyle = '#0d1018'
  ctx.fillRect(3, 1, 2, 1)
  ctx.fillRect(2, 2, 4, 4)
  ctx.fillRect(3, 6, 2, 1)
  ctx.fillStyle = '#5c6470'
  ctx.fillRect(3, 2, 2, 3)
  ctx.fillStyle = '#ff5a5a'
  ctx.fillRect(3, 3, 2, 2)
  ctx.fillStyle = '#ffd23f'
  ctx.fillRect(3, 6, 2, 1)
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
