// Maps sim state onto a Three.js scene. Gameplay plane (x, y) renders as world (x, 0, y).

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EARTH_RADIUS, RINGS } from '../data/config'
import type { EnemyId, WeaponId } from '../data/config'
import { satPosition } from '../sim/sim'
import type { SimState } from '../sim/types'
import {
  asteroidTexture,
  bomberBombTexture,
  bomberTexture,
  carrierTexture,
  boosterTexture,
  earthLightsTexture,
  earthTexture,
  explosionTexture,
  fighterTexture,
  flakCannonTexture,
  flakShellTexture,
  laserSatTexture,
  milkyWayTexture,
  missilePodTexture,
  missileTexture,
  rocketTexture,
  sunTexture,
} from './sprites'

const PIXEL_SCALE = 3
const RING_COLOR = 0x3f6f9f
const ARC_SEGMENTS = 32
// Fixed sun direction (DESIGN.md §3): the key light; ambient stays low so only
// the sun-facing hemisphere is lit. Sprites are unlit/full-bright by design.
const SUN_DIR = new THREE.Vector3(-0.8, 0.25, -0.55).normalize()

export interface GhostInfo {
  weapon: WeaponId
  ring: number
  angle: number
  range: number // effective (post-research) weapon range
  gaps: { plus: number; minus: number } | null
}

interface Explosion {
  sprite: THREE.Sprite
  age: number
  maxAge: number
  size: number
}

interface LaunchFx {
  satId: number
  ring: number
  age: number
  duration: number
  startAngle: number
  turnAngle: number
  targetRadius: number
  rocket: THREE.Sprite
  booster: THREE.Sprite
  trail: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
  separation: { pos: THREE.Vector3; angle: number; radius: number } | null
}

interface HealthBar {
  sprite: THREE.Sprite
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  texture: THREE.CanvasTexture
  lastFrac: number
}

export class GameRenderer {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private earth: THREE.Mesh
  private earthLights: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  private ghost = new THREE.Group()
  private ghostSprite!: THREE.Sprite
  private ghostDisc!: THREE.Mesh
  private ghostLoop!: THREE.LineLoop
  private ghostArcs: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>[] = []
  private ringLines: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>[] = []
  private satObjects = new Map<number, THREE.Sprite>()
  private enemyObjects = new Map<number, THREE.Sprite>()
  private enemyBars = new Map<number, HealthBar>()
  private projObjects = new Map<number, THREE.Object3D>()
  private beamPool: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>[] = []
  private explosions: Explosion[] = []
  private launches: LaunchFx[] = []
  private launchHiddenSats = new Set<number>()
  private satTex: Record<WeaponId, THREE.CanvasTexture> = {
    missile: missilePodTexture(),
    laser: laserSatTexture(),
    flak: flakCannonTexture(),
  }
  private rocketTex = RINGS.map((_, ring) => rocketTexture(ring))
  private boosterTex = RINGS.map((_, ring) => boosterTexture(ring))
  private laserHotTex = laserSatTexture(true)
  private enemyTex: Record<EnemyId, THREE.CanvasTexture> = {
    asteroid: asteroidTexture(),
    fighter: fighterTexture(),
    bomber: bomberTexture(),
    carrier: carrierTexture(),
  }
  private explosionTex = explosionTexture()
  private missileGeo: THREE.BufferGeometry
  private missileMat: THREE.MeshBasicMaterial
  private shellMat: THREE.SpriteMaterial
  private bombMat: THREE.SpriteMaterial
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
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200)
    this.camera.position.set(0, 4.2, 6)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.enablePan = false
    this.controls.minDistance = 2.5
    this.controls.maxDistance = 14

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.055))
    const sunLight = new THREE.DirectionalLight(0xfff2d8, 2.75)
    sunLight.position.copy(SUN_DIR).multiplyScalar(10)
    this.scene.add(sunLight)
    const sunSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: sunTexture(), transparent: true, depthWrite: false }),
    )
    sunSprite.position.copy(SUN_DIR).multiplyScalar(70)
    sunSprite.scale.set(9, 9, 1)
    this.scene.add(sunSprite)

    this.scene.add(this.makeMilkyWay())
    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, 48, 24),
      new THREE.MeshLambertMaterial({ map: earthTexture() }),
    )
    this.scene.add(this.earth)
    this.earthLights = this.makeEarthLights()
    this.scene.add(this.earthLights)
    this.scene.add(this.makeStarfield())

    for (let i = 0; i < RINGS.length; i++) {
      const line = this.makeRingLine(i)
      this.ringLines.push(line)
      this.scene.add(line)
    }

    this.buildGhost()
    this.scene.add(this.ghost)

    this.missileGeo = new THREE.PlaneGeometry(0.16, 0.06).rotateX(-Math.PI / 2)
    this.missileMat = new THREE.MeshBasicMaterial({
      map: missileTexture(),
      transparent: true,
      side: THREE.DoubleSide,
    })
    this.shellMat = new THREE.SpriteMaterial({ map: flakShellTexture(), transparent: true })
    this.bombMat = new THREE.SpriteMaterial({ map: bomberBombTexture(), transparent: true })

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

  private makeMilkyWay(): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: milkyWayTexture(),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    )
    sky.position.set(-1.6, 2.9, -5.6)
    sky.scale.set(10, 5.6, 1)
    sky.frustumCulled = false
    sky.renderOrder = -1000
    return sky
  }

  private makeEarthLights(): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        lights: { value: earthLightsTexture() },
        sunDir: { value: SUN_DIR.clone() },
        intensity: { value: 1.25 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;

        void main() {
          vUv = uv;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D lights;
        uniform vec3 sunDir;
        uniform float intensity;
        varying vec2 vUv;
        varying vec3 vWorldNormal;

        void main() {
          float sun = dot(normalize(vWorldNormal), normalize(sunDir));
          float night = smoothstep(0.12, -0.14, sun);
          vec4 lightTex = texture2D(lights, vUv);
          float alpha = lightTex.a * night * intensity;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(lightTex.rgb * (0.8 + night * 0.55), alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.006, 48, 24), material)
  }

  private makeRingLine(ring: number): THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial> {
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
    this.ghostSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.satTex.missile,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    )
    this.ghostSprite.scale.set(0.3, 0.3, 1)
    this.ghost.add(this.ghostSprite)

    // Unit-radius disc and outline, scaled to the armed weapon's range in setGhost.
    this.ghostDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    this.ghostDisc.position.y = 0.01
    this.ghost.add(this.ghostDisc)

    const pts: THREE.Vector3[] = []
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a), 0.01, Math.sin(a)))
    }
    this.ghostLoop = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.4 }),
    )
    this.ghost.add(this.ghostLoop)
    this.ghost.visible = false

    // Phase-indicator arcs: angular gap to the nearest neighbor each way around the ring.
    for (let k = 0; k < 2; k++) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array((ARC_SEGMENTS + 1) * 3), 3),
      )
      const arc = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.45 }),
      )
      arc.frustumCulled = false
      arc.visible = false
      this.ghostArcs.push(arc)
      this.scene.add(arc)
    }
  }

  private setArc(index: number, ringRadius: number, fromAngle: number, gap: number, dir: 1 | -1): void {
    const arc = this.ghostArcs[index]
    if (!Number.isFinite(gap) || gap <= 0.01) {
      arc.visible = false
      return
    }
    const pos = arc.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const a = fromAngle + dir * gap * (i / ARC_SEGMENTS)
      pos.setXYZ(i, Math.cos(a) * ringRadius, 0.02, Math.sin(a) * ringRadius)
    }
    pos.needsUpdate = true
    arc.visible = true
  }

  setGhost(info: GhostInfo | null): void {
    if (!info) {
      this.ghost.visible = false
      for (const arc of this.ghostArcs) arc.visible = false
      return
    }
    const r = RINGS[info.ring].radius
    this.ghost.position.set(Math.cos(info.angle) * r, 0, Math.sin(info.angle) * r)
    this.ghostSprite.material.map = this.satTex[info.weapon]
    this.ghostDisc.scale.set(info.range, 1, info.range)
    this.ghostLoop.scale.set(info.range, 1, info.range)
    this.ghost.visible = true
    this.setArc(0, r, info.angle, info.gaps?.plus ?? Infinity, 1)
    this.setArc(1, r, info.angle, info.gaps?.minus ?? Infinity, -1)
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

  // Inverse of screenToPlane; used by the dev/test harness to aim placement clicks.
  planeToScreen(x: number, y: number): { x: number; y: number } {
    const v = new THREE.Vector3(x, 0, y).project(this.camera)
    const rect = this.renderer.domElement.getBoundingClientRect()
    return {
      x: rect.left + ((v.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - v.y) / 2) * rect.height,
    }
  }

  sync(state: SimState, dt: number): void {
    for (let i = 0; i < this.ringLines.length; i++) {
      this.ringLines[i].material.opacity = i < state.unlockedRings ? 0.5 : 0.1
    }

    const satIds = new Set<number>()
    for (const sat of state.satellites) {
      satIds.add(sat.id)
      let obj = this.satObjects.get(sat.id)
      if (!obj) {
        obj = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: this.satTex[sat.weapon], transparent: true }),
        )
        obj.scale.set(0.3, 0.3, 1)
        this.satObjects.set(sat.id, obj)
        this.scene.add(obj)
      }
      const pos = satPosition(sat)
      obj.position.set(pos.x, 0, pos.y)
      obj.visible = !this.launchHiddenSats.has(sat.id)
      if (sat.weapon === 'laser') {
        // Flushed-radiator variant while overheated (docs/SPRITES.md §4).
        const tex = sat.overheated ? this.laserHotTex : this.satTex.laser
        if (obj.material.map !== tex) obj.material.map = tex
      }
    }
    this.removeStale(this.satObjects, satIds, true)

    const enemyIds = new Set<number>()
    for (const enemy of state.enemies) {
      enemyIds.add(enemy.id)
      let obj = this.enemyObjects.get(enemy.id)
      const enemyScale = enemy.type === 'carrier' ? 0.78 : Math.max(0.22, enemy.radius * 3.0)
      if (!obj) {
        obj = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: this.enemyTex[enemy.type],
            transparent: true,
            rotation: Math.random() * Math.PI * 2,
          }),
        )
        obj.scale.set(enemyScale, enemyScale, 1)
        obj.userData.spin = enemy.spin
        this.enemyObjects.set(enemy.id, obj)
        this.scene.add(obj)
      }
      obj.position.set(enemy.pos.x, 0, enemy.pos.y)
      if (enemy.type === 'asteroid') obj.material.rotation += (obj.userData.spin as number) * dt
      else obj.material.rotation = Math.atan2(enemy.vel.y, enemy.vel.x) - Math.PI / 2
      this.syncEnemyHealthBar(enemy.id, enemy.pos.x, enemy.pos.y, enemy.hp / enemy.maxHp, enemyScale)
    }
    this.removeStale(this.enemyObjects, enemyIds, true)
    this.removeStaleHealthBars(enemyIds)

    const projIds = new Set<number>()
    for (const p of state.projectiles) {
      projIds.add(p.id)
      let obj = this.projObjects.get(p.id)
      if (!obj) {
        if (p.kind === 'missile') {
          obj = new THREE.Mesh(this.missileGeo, this.missileMat)
        } else if (p.kind === 'shell') {
          obj = new THREE.Sprite(this.shellMat)
          obj.scale.set(0.07, 0.07, 1)
        } else {
          obj = new THREE.Sprite(this.bombMat)
          obj.scale.set(0.09, 0.09, 1)
        }
        this.projObjects.set(p.id, obj)
        this.scene.add(obj)
      }
      obj.position.set(p.pos.x, 0, p.pos.y)
      if (p.kind === 'missile') obj.rotation.y = -Math.atan2(p.vel.y, p.vel.x)
    }
    this.removeStale(this.projObjects, projIds, false)

    // Beams are pooled by index — a splitter laser contributes two beams per step.
    for (let i = 0; i < state.beams.length; i++) {
      let line = this.beamPool[i]
      if (!line) {
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
        line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.85 }),
        )
        line.frustumCulled = false
        this.beamPool.push(line)
        this.scene.add(line)
      }
      const b = state.beams[i]
      const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute
      pos.setXYZ(0, b.sx, 0, b.sy)
      pos.setXYZ(1, b.tx, 0, b.ty)
      pos.needsUpdate = true
      line.visible = true
    }
    for (let i = state.beams.length; i < this.beamPool.length; i++) {
      this.beamPool[i].visible = false
    }

    for (const ev of state.events) {
      if (ev.type === 'explosion') this.spawnExplosion(ev.x, ev.y, ev.size, 0xffb347)
      else if (ev.type === 'earth-hit') this.spawnExplosion(ev.x, ev.y, 0.4, 0xff5040)
      else if (ev.type === 'satellite-hit') this.spawnExplosion(ev.x, ev.y, 0.16, 0xff5a5a)
      else if (ev.type === 'satellite-destroyed') this.spawnExplosion(ev.x, ev.y, 0.45, 0xffd23f)
      else if (ev.type === 'launch') {
        this.spawnExplosion(ev.x, ev.y, 0.18, 0xbfe3ff)
        this.spawnLaunch(ev.satId, ev.ring, ev.angle)
      }
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

  private removeStaleHealthBars(live: Set<number>): void {
    for (const [id, bar] of this.enemyBars) {
      if (live.has(id)) continue
      this.scene.remove(bar.sprite)
      bar.sprite.material.dispose()
      bar.texture.dispose()
      this.enemyBars.delete(id)
    }
  }

  private syncEnemyHealthBar(id: number, x: number, y: number, hpFrac: number, spriteScale: number): void {
    let bar = this.enemyBars.get(id)
    if (!bar) {
      const canvas = document.createElement('canvas')
      canvas.width = 36
      canvas.height = 6
      const ctx = canvas.getContext('2d')!
      const texture = new THREE.CanvasTexture(canvas)
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      texture.generateMipmaps = false
      texture.colorSpace = THREE.SRGBColorSpace
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
      )
      bar = { sprite, canvas, ctx, texture, lastFrac: -1 }
      this.enemyBars.set(id, bar)
      this.scene.add(sprite)
    }
    const frac = Math.max(0, Math.min(1, hpFrac))
    if (Math.abs(frac - bar.lastFrac) > 0.01) {
      this.drawHealthBar(bar, frac)
      bar.lastFrac = frac
    }
    const width = Math.max(0.24, spriteScale * 0.9)
    bar.sprite.scale.set(width, 0.055, 1)
    bar.sprite.position.set(x, 0.18 + spriteScale * 0.32, y)
  }

  private drawHealthBar(bar: HealthBar, frac: number): void {
    const { ctx, canvas } = bar
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(8, 10, 16, 0.88)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#441b25'
    ctx.fillRect(1, 1, canvas.width - 2, canvas.height - 2)
    const fillW = Math.max(0, Math.round((canvas.width - 2) * frac))
    ctx.fillStyle = frac > 0.55 ? '#7cff7a' : frac > 0.28 ? '#ffd23f' : '#ff5a5a'
    ctx.fillRect(1, 1, fillW, canvas.height - 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.fillRect(1, 1, fillW, 1)
    bar.texture.needsUpdate = true
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

  private spawnLaunch(satId: number, ring: number, angle: number): void {
    const turnAngle = 0.58 + ring * 0.22
    const duration = 1.25 + ring * 0.42
    const rocket = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.rocketTex[ring] ?? this.rocketTex[0],
        transparent: true,
        depthWrite: false,
      }),
    )
    const booster = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.boosterTex[ring] ?? this.boosterTex[0],
        transparent: true,
        depthWrite: false,
      }),
    )
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 3), 3))
    const trail = new THREE.Line(
      trailGeo,
      new THREE.LineBasicMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.55 }),
    )
    rocket.scale.set(0.16 + ring * 0.02, 0.24 + ring * 0.03, 1)
    booster.scale.set(0.1 + ring * 0.015, 0.16 + ring * 0.02, 1)
    this.scene.add(trail)
    this.scene.add(booster)
    this.scene.add(rocket)
    this.launchHiddenSats.add(satId)
    this.launches.push({
      satId,
      ring,
      age: 0,
      duration,
      startAngle: angle - turnAngle,
      turnAngle,
      targetRadius: RINGS[ring].radius,
      rocket,
      booster,
      trail,
      separation: null,
    })
  }

  private launchPosition(fx: LaunchFx, t: number): THREE.Vector3 {
    const gravityTurn = smooth01(t)
    const angle = fx.startAngle + fx.turnAngle * gravityTurn
    const climb = easeOutCubic(t)
    const radius = EARTH_RADIUS * 1.02 + (fx.targetRadius - EARTH_RADIUS * 1.02) * climb
    const y = Math.sin(Math.PI * t) * (0.16 + fx.ring * 0.035)
    return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
  }

  private updateLaunches(dt: number): void {
    for (let i = this.launches.length - 1; i >= 0; i--) {
      const fx = this.launches[i]
      fx.age += dt
      const t = Math.min(1, fx.age / fx.duration)
      const pos = this.launchPosition(fx, t)
      const ahead = this.launchPosition(fx, Math.min(1, t + 0.02))
      fx.rocket.position.copy(pos)
      fx.rocket.material.rotation = -Math.atan2(ahead.z - pos.z, ahead.x - pos.x) + Math.PI / 2

      const trailPos = fx.trail.geometry.getAttribute('position') as THREE.BufferAttribute
      const tailStart = Math.max(0, t - 0.28)
      for (let j = 0; j < 12; j++) {
        const tj = tailStart + (t - tailStart) * (j / 11)
        const p = this.launchPosition(fx, tj)
        trailPos.setXYZ(j, p.x, p.y, p.z)
      }
      trailPos.needsUpdate = true
      fx.trail.material.opacity = 0.52 * (1 - Math.max(0, t - 0.82) / 0.18)

      const separationT = 0.34
      if (t < separationT) {
        const back = this.launchPosition(fx, Math.max(0, t - 0.035))
        fx.booster.position.copy(back)
        fx.booster.material.rotation = fx.rocket.material.rotation
      } else {
        if (!fx.separation) {
          const sep = this.launchPosition(fx, separationT)
          fx.separation = {
            pos: sep,
            angle: Math.atan2(sep.z, sep.x),
            radius: Math.hypot(sep.x, sep.z),
          }
        }
        const bt = Math.min(1, (t - separationT) / (1 - separationT))
        const fallAngle = fx.separation.angle - 0.28 * smooth01(bt)
        const fallRadius = fx.separation.radius + (EARTH_RADIUS * 0.94 - fx.separation.radius) * easeInQuad(bt)
        const fallY = fx.separation.pos.y * (1 - bt) - Math.sin(bt * Math.PI) * 0.18
        fx.booster.position.set(Math.cos(fallAngle) * fallRadius, fallY, Math.sin(fallAngle) * fallRadius)
        fx.booster.material.rotation += dt * 5
        fx.booster.material.opacity = Math.max(0, 1 - bt * 1.15)
      }

      if (t >= 1) {
        this.scene.remove(fx.rocket, fx.booster, fx.trail)
        fx.rocket.material.dispose()
        fx.booster.material.dispose()
        fx.trail.geometry.dispose()
        fx.trail.material.dispose()
        this.launchHiddenSats.delete(fx.satId)
        this.launches.splice(i, 1)
      }
    }
  }

  render(dt: number): void {
    this.controls.update()
    this.earth.rotation.y += dt * 0.04 // cosmetic only (DESIGN.md §8)
    this.earthLights.rotation.copy(this.earth.rotation)
    this.updateLaunches(dt)

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

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function easeInQuad(t: number): number {
  return t * t
}

function smooth01(t: number): number {
  return t * t * (3 - 2 * t)
}
