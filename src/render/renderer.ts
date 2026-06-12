// Maps sim state onto a Three.js scene. Gameplay plane (x, y) renders as world (x, 0, y).

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EARTH_RADIUS, RINGS, WEAPONS } from '../data/config'
import { satPosition } from '../sim/sim'
import type { SimState } from '../sim/types'
import {
  asteroidTexture,
  earthTexture,
  explosionTexture,
  missileTexture,
  satelliteTexture,
} from './sprites'

const PIXEL_SCALE = 3
const RING_COLOR = 0x3f6f9f

interface Explosion {
  sprite: THREE.Sprite
  age: number
  maxAge: number
  size: number
}

export class GameRenderer {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private earth: THREE.Mesh
  private ghost = new THREE.Group()
  private satObjects = new Map<number, THREE.Sprite>()
  private enemyObjects = new Map<number, THREE.Sprite>()
  private projObjects = new Map<number, THREE.Mesh>()
  private explosions: Explosion[] = []
  private satTex = satelliteTexture()
  private asteroidTex = asteroidTexture()
  private explosionTex = explosionTexture()
  private missileGeo: THREE.BufferGeometry
  private missileMat: THREE.MeshBasicMaterial
  private raycaster = new THREE.Raycaster()
  private gamePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private planeHit = new THREE.Vector3()
  private pixelated = true

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false })
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    container.appendChild(this.renderer.domElement)

    this.scene.background = new THREE.Color(0x05070d)
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120)
    this.camera.position.set(0, 4.2, 6)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.enablePan = false
    this.controls.minDistance = 2.5
    this.controls.maxDistance = 14

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(4, 6, 2)
    this.scene.add(sun)

    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, 32, 16),
      new THREE.MeshLambertMaterial({ map: earthTexture() }),
    )
    this.scene.add(this.earth)
    this.scene.add(this.makeStarfield())

    for (let i = 0; i < RINGS.length; i++) {
      if (RINGS[i].unlocked) this.scene.add(this.makeRingLine(i))
    }

    this.buildGhost()
    this.scene.add(this.ghost)

    this.missileGeo = new THREE.PlaneGeometry(0.16, 0.06).rotateX(-Math.PI / 2)
    this.missileMat = new THREE.MeshBasicMaterial({
      map: missileTexture(),
      transparent: true,
      side: THREE.DoubleSide,
    })

    window.addEventListener('resize', () => this.resize())
    this.resize()
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement
  }

  togglePixelated(): void {
    this.pixelated = !this.pixelated
    this.resize()
  }

  private resize(): void {
    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    const scale = this.pixelated ? PIXEL_SCALE : 1
    this.renderer.setSize(Math.ceil(w / scale), Math.ceil(h / scale), false)
    this.renderer.domElement.style.imageRendering = this.pixelated ? 'pixelated' : 'auto'
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private makeStarfield(): THREE.Points {
    const count = 900
    const positions = new Float32Array(count * 3)
    const v = new THREE.Vector3()
    for (let i = 0; i < count; i++) {
      v.randomDirection().multiplyScalar(40 + Math.random() * 20)
      positions[i * 3] = v.x
      positions[i * 3 + 1] = v.y
      positions[i * 3 + 2] = v.z
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xaab4cc, size: 1.5, sizeAttenuation: false }),
    )
  }

  private makeRingLine(ring: number): THREE.LineLoop {
    const r = RINGS[ring].radius
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < 128; i++) {
      const a = (i / 128) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))
    }
    return new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: RING_COLOR, transparent: true, opacity: 0.5 }),
    )
  }

  private buildGhost(): void {
    const sat = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.satTex, transparent: true, opacity: 0.65, depthWrite: false }),
    )
    sat.scale.set(0.3, 0.3, 1)
    this.ghost.add(sat)

    const range = WEAPONS.missile.range
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(range, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    disc.position.y = 0.01
    this.ghost.add(disc)

    const pts: THREE.Vector3[] = []
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * range, 0.01, Math.sin(a) * range))
    }
    this.ghost.add(
      new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.4 }),
      ),
    )
    this.ghost.visible = false
  }

  setGhost(angle: number | null, ring = 0): void {
    if (angle === null) {
      this.ghost.visible = false
      return
    }
    const r = RINGS[ring].radius
    this.ghost.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r)
    this.ghost.visible = true
  }

  screenToPlane(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(ndc, this.camera)
    const hit = this.raycaster.ray.intersectPlane(this.gamePlane, this.planeHit)
    return hit ? { x: hit.x, y: hit.z } : null
  }

  sync(state: SimState, dt: number): void {
    const satIds = new Set<number>()
    for (const sat of state.satellites) {
      satIds.add(sat.id)
      let obj = this.satObjects.get(sat.id)
      if (!obj) {
        obj = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.satTex, transparent: true }))
        obj.scale.set(0.3, 0.3, 1)
        this.satObjects.set(sat.id, obj)
        this.scene.add(obj)
      }
      const pos = satPosition(sat)
      obj.position.set(pos.x, 0, pos.y)
    }
    this.removeStale(this.satObjects, satIds, true)

    const enemyIds = new Set<number>()
    for (const enemy of state.enemies) {
      enemyIds.add(enemy.id)
      let obj = this.enemyObjects.get(enemy.id)
      if (!obj) {
        obj = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: this.asteroidTex,
            transparent: true,
            rotation: Math.random() * Math.PI * 2,
          }),
        )
        const s = Math.max(0.22, enemy.radius * 2.8)
        obj.scale.set(s, s, 1)
        obj.userData.spin = enemy.spin
        this.enemyObjects.set(enemy.id, obj)
        this.scene.add(obj)
      }
      obj.position.set(enemy.pos.x, 0, enemy.pos.y)
      obj.material.rotation += (obj.userData.spin as number) * dt
    }
    this.removeStale(this.enemyObjects, enemyIds, true)

    const projIds = new Set<number>()
    for (const p of state.projectiles) {
      projIds.add(p.id)
      let obj = this.projObjects.get(p.id)
      if (!obj) {
        obj = new THREE.Mesh(this.missileGeo, this.missileMat)
        this.projObjects.set(p.id, obj)
        this.scene.add(obj)
      }
      obj.position.set(p.pos.x, 0, p.pos.y)
      obj.rotation.y = -Math.atan2(p.vel.y, p.vel.x)
    }
    this.removeStale(this.projObjects, projIds, false)

    for (const ev of state.events) {
      if (ev.type === 'explosion') this.spawnExplosion(ev.x, ev.y, ev.size, 0xffb347)
      else if (ev.type === 'earth-hit') this.spawnExplosion(ev.x, ev.y, 0.4, 0xff5040)
      else if (ev.type === 'launch') this.spawnExplosion(ev.x, ev.y, 0.18, 0xbfe3ff)
    }
  }

  private removeStale(map: Map<number, THREE.Object3D>, live: Set<number>, ownsMaterial: boolean): void {
    for (const [id, obj] of map) {
      if (live.has(id)) continue
      this.scene.remove(obj)
      if (ownsMaterial) (obj as THREE.Sprite).material.dispose()
      map.delete(id)
    }
  }

  private spawnExplosion(x: number, y: number, size: number, color: number): void {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.explosionTex,
        transparent: true,
        color,
        depthWrite: false,
        rotation: Math.random() * Math.PI * 2,
      }),
    )
    sprite.position.set(x, 0.02, y)
    sprite.scale.set(size, size, 1)
    this.scene.add(sprite)
    this.explosions.push({ sprite, age: 0, maxAge: 0.45, size })
  }

  render(dt: number): void {
    this.controls.update()
    this.earth.rotation.y += dt * 0.04 // cosmetic only (DESIGN.md §8)

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i]
      ex.age += dt
      const t = ex.age / ex.maxAge
      if (t >= 1) {
        this.scene.remove(ex.sprite)
        ex.sprite.material.dispose()
        this.explosions.splice(i, 1)
        continue
      }
      const s = ex.size * (1 + t * 1.8)
      ex.sprite.scale.set(s, s, 1)
      ex.sprite.material.opacity = 1 - t
    }

    this.renderer.render(this.scene, this.camera)
  }
}
