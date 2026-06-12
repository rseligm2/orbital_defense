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

export function satelliteTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(16, 16)
  ctx.fillStyle = '#2f6fd6'
  ctx.fillRect(0, 6, 5, 5)
  ctx.fillRect(11, 6, 5, 5)
  ctx.fillStyle = '#1c4a99'
  ctx.fillRect(1, 6, 1, 5)
  ctx.fillRect(3, 6, 1, 5)
  ctx.fillRect(12, 6, 1, 5)
  ctx.fillRect(14, 6, 1, 5)
  ctx.fillStyle = '#d9dee6'
  ctx.fillRect(6, 5, 4, 7)
  ctx.fillStyle = '#9aa3b0'
  ctx.fillRect(6, 10, 4, 2)
  ctx.fillStyle = '#ff9b30'
  ctx.fillRect(7, 3, 2, 2)
  return texFromCanvas(canvas)
}

// Drawn pointing along +x; the renderer rotates the quad to the missile's heading.
export function missileTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(8, 8)
  ctx.fillStyle = '#ffd23f'
  ctx.fillRect(0, 3, 2, 2)
  ctx.fillStyle = '#e9edf2'
  ctx.fillRect(2, 3, 4, 2)
  ctx.fillStyle = '#ff7b2a'
  ctx.fillRect(6, 3, 2, 2)
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
