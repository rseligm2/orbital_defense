# Sprite Direction — Weapon Satellites

Art direction and implementable specs for the three weapon satellites (Missile
Pod, Laser, Flak Cannon), replacing the current single-shape, palette-swapped
placeholder in `src/render/sprites.ts`. Also covers projectile/beam/explosion
cohesion and the M5 ComfyUI generation plan (DESIGN.md §13, §14).

Scope: this document specifies art only. The code blocks in §3 are paste-ready
for `src/render/sprites.ts` but nothing under `src/` is modified by this doc.

---

## 1. Design language

### 1.1 The pixel budget (why everything below is shaped the way it is)

Render facts that govern satellite sprites:

- Satellites are `THREE.Sprite` billboards at **scale 0.3 world units**
  (Earth radius = 1), in `renderer.ts` (`obj.scale.set(0.3, 0.3, 1)` for both
  live satellites and the ghost).
- The whole frame renders at **⅓ resolution** (`PIXEL_SCALE = 3`) and is
  nearest-upscaled.
- At the default camera (position `(0, 4.2, 6)` → distance ≈ 7.3, FOV 48°),
  the visible vertical span is ≈ 6.5 world units. On the low-res target a
  0.3-unit sprite is therefore **~14 px tall**. A 16×16 texture lands at
  ≈ 0.85 screen pixels per texel — right at the edge where NearestFilter
  starts dropping texels.

Rules that follow directly:

1. **16×16 is the canvas ceiling at scale 0.3.** A 24×24 canvas at the same
   scale puts texels well below one screen pixel; rows of the sprite will
   flicker in and out as satellites orbit. (If a bigger canvas is ever wanted,
   the sprite scale must rise proportionally — 24×24 wants scale 0.45 — which
   changes the perceived gameplay size. Not recommended; all specs below are
   16×16.)
2. **No load-bearing 1×1 features.** Minimum feature size 2 px in at least one
   axis. Single pixels are allowed only as highlights inside a larger block of
   the same hue family (they degrade gracefully if dropped).
3. **No 1-px diagonals.** Diagonal forms are built from 2×2 blocks so they
   survive sub-pixel sampling.
4. **Silhouette first.** At 14 px the player reads outline shape and value
   mass, not detail. Each weapon gets a different *silhouette axis* (see 1.4).

### 1.2 Shared palette anchors

One hull family + one outline + one accent hue per weapon. The accent hues
keep the color identities the M2 placeholders already taught the player
(missile = blue, laser = red, flak = amber) and each accent is sampled from
the weapon's existing projectile/beam art, so cohesion with effects is free.

| Role | Hex | Notes |
|---|---|---|
| Outline | `#0d1018` | Near-black navy. Darker than space bg `#05070d` is impossible to read against space, but the outline's job is the *day side* (see 1.3); against space the light hull carries the edge. |
| Hull light | `#d9dee6` | Kept from current placeholder bus. |
| Hull mid | `#9aa3b0` | Kept from current placeholder. |
| Hull dark | `#5c6470` | New step; also the suggested flak-shell casing color (§4). |
| Inset dark | `#3a404c` | Tube faces / recesses only, always surrounded by hull. |
| Solar panel | `#1c3f7a` + `#2f6fd6` cell line | Deliberately darker than Earth's ocean `#16498f` and always outlined, so panels never melt into the day-side ocean. |
| Missile accent | `#2f6fd6` blue + warhead `#ff7b2a`/`#ffd23f` | Blue = ID color; warm tips match `missileTexture()`'s nose/exhaust. |
| Laser accent | `#ff5a5a` bright / `#8f2c2c` dark / `#ffd9d9` white-hot | `#ff5a5a` is byte-exact the beam color `0xff5a5a` in `renderer.ts`. |
| Flak accent | `#e8b13d` bright / `#9c6d1a` dark | `#e8b13d` is byte-exact the shell tracer in `flakShellTexture()`. |

### 1.3 Reading against starfield, day side, night side

Satellites overlap three backgrounds: near-black space with dim
`0xaab4cc` star points, the bright day-side Earth (ocean `#16498f`, land
`#2e8f44`, ice `#eaf4ff`), and the near-black night side (ambient 0.2).
Sprites are unlit/full-bright by design (DESIGN §3), so the texture alone must
solve contrast:

- **1-px dark outline on every sprite.** This is what saves the sprite when it
  crosses the bright day-side disc — light-grey hull on white polar ice is
  unreadable without it. Against space/night side the outline vanishes (it's
  nearly the bg color) and the light interior does the work. Classic two-sided
  contrast: dark rim + light core covers both extremes.
- **Interiors are majority light/mid grey.** Never let `#3a404c`-or-darker
  exceed ~25% of the opaque area, or the sprite gets eaten by the night side.
- **No large mid-blue fields.** The single biggest readability bug available
  here is a big blue solar panel disappearing into the day-side ocean. Panels
  in this set are small, darker than the ocean, and outlined.
- **Saturated accents are small and warm/red.** Nothing in the background
  (blue/green/white/grey) competes with orange, red, or amber, so even 2-px
  accent features survive.
- The **ghost preview** renders the same texture at opacity 0.65; the outline
  also keeps the ghost legible over the day side during placement.

### 1.4 Billboard constraint and the silhouette axes

Sprites always face the camera and never rotate toward their target, so:

- **Designs must read from a single "icon" view** and must not imply a firing
  direction. A satellite with one big gun barrel pointing right looks broken
  the moment it shoots a target to its left. Every recommended design is
  either radially symmetric (laser, flak) or vertically composed with
  omnidirectional flavor (missile cells eject, then home).
- Each weapon owns one silhouette axis, so the trio is distinguishable as pure
  black shapes at 14 px:

| Weapon | Silhouette axis | One-glance read |
|---|---|---|
| Missile Pod | **Tall vertical column** (low side fins) | A standing rocket rack |
| Laser | **Diagonal X with diamond core** | An eye with radiator wings |
| Flak Cannon | **Wide squat octagon with orthogonal stubs** | A fat turret drum / naval mine |

Tall vs. diagonal vs. wide-squat, plus light-mass distribution (light column /
dark X with red eye / big light drum with amber band), plus the blue/red/amber
accents — three independent channels of differentiation. Any one failing
(small zoom, colorblindness, motion) still leaves two.

---

## 2. Per-weapon concepts

### 2.1 Missile Pod (homing · slow reload · long range)

**A. "Quiver" — vertical VLS rack — ★ RECOMMENDED**
A tall launch-cell column: light hull, dark tube face showing a staggered
pattern of loaded (orange warhead tip) and empty (dark) cells, a small blue
seeker dome on top, two stubby low-set solar panels. Mechanics expressed: the
visible *magazine* says slow, deliberate, high-value shots — the empty cells
literally are the reload downtime; the seeker dome says homing; cells facing
the viewer (out of plane) are fine because missiles eject and then home, so no
firing direction is implied. Silhouette: the only tall-vertical shape in the
set.

**B. "Broadside Pod" — horizontal hex canister**
A lying hexagonal canister with an angled 6-tube cluster and one large panel
wing. Rejected: a horizontal bar with side panels is exactly the generic
"satellite" silhouette of the current placeholder, and a wide mass collides
with the flak drum's axis. The big panel also fights the day-side ocean.

**C. "Archer Cross" — four tube clusters on a cross truss**
Omnidirectional flavor is nice, but a plus/cross silhouette collides head-on
with the flak design's orthogonal stub barrels, and four 3-px clusters fall
below the feature floor at this resolution.

### 2.2 Laser (continuous hitscan beam · overheats)

**A. "Helios Eye" — diamond lens core + four diagonal radiator fins — ★ RECOMMENDED**
A grey diamond body with a recessed lens barrel and a glowing red aperture
(byte-exact the beam color), four outlined radiator fins on the diagonals in
dark heat-red with a bright pixel at the inner corner nearest the core.
Mechanics expressed: the eye *is* the always-on beam source — hitscan, never
misses; the radiators wear the overheat mechanic on the outside, and the spec
includes a one-flag `hot` variant where the fins flush bright red (a free
future hook for showing duty-cycle state). Radially symmetric → billboard
safe. Silhouette: the only diagonal/X shape in the set.

**B. "Spinal Lance" — long emitter boom with V radiators**
A thin spine with a glowing emitter tip. Rejected: tall-thin collides with the
missile rack's axis, and a directional lance is the worst billboard offender —
the boom would visibly point nowhere near the beam.

**C. "Mirror Furnace" — solar-pumped, single big wing + focusing cone**
Flavorful (sun-powered laser, pairs with DESIGN §3 future hooks) but the
asymmetric L-shape reads as "utility/solar satellite", the weapon is
illegible, and the dominant blue panel is the §1.3 anti-pattern. Park the
flavor for a Phase-2 support satellite instead.

### 2.3 Flak Cannon (rapid proximity-fused AoE bursts · short range)

**A. "Hedgehog Drum" — squat octagon, four stub barrels, ammo carousel — ★ RECOMMENDED**
A wide, fat octagonal drum (light top, dark base) with four stubby outlined
barrels at N/S/E/W and a band of three amber ammo-carousel lights matching the
shell tracer. Mechanics expressed: stub barrels in every direction = rapid
fire at anything that wanders close, omnidirectional and billboard-safe; the
fat drum = magazine-fed volume of fire; short barrels = short range; amber
lights tie to the proximity-fuse shells. Silhouette: the only wide-squat
shape, and its orthogonal plus-stubs are clearly distinct from the laser's
diagonal X at a glance.

**B. "Twin-88" — twin AA barrels on a compact bus**
Classic flak imagery, but twin parallel barrels imply an aim direction
(billboard problem) and the compact-bus-with-panels silhouette is generic.

**C. "Cluster Mine" — sphere with eight radial spikes**
Rejected: a spiked ball is enemy-coded (naval mine, and dangerously close to
the asteroid sprite's blob), and eight 1-px spikes shimmer at this size.

### 2.4 Why the recommended trio can't be confused

As 14-px silhouettes: a **tall column** (Quiver) vs. a **diagonal X** (Helios
Eye) vs. a **wide drum with a plus of stubs** (Hedgehog). The two cross-like
shapes differ by 45° *and* by mass — the laser is hollow-centered around a
red eye with dark wings, the flak is one solid light mass. Value distribution
differs (light column / dark X / light drum), and the established blue / red /
amber accents are retained as a third channel. No two designs share an axis,
a mass pattern, or an accent hue.

---

## 3. Implementable specs (recommended set)

Drop-in replacements for `satelliteTexture()` in `src/render/sprites.ts`.
Same style as the existing file: `fillRect` only, using the existing
`makeCanvas` / `texFromCanvas` helpers. All three are 16×16 and work at the
current sprite scale 0.3 — no renderer scale changes needed.

Wiring (for the integrator; not part of this doc's changes): in
`renderer.ts`, replace the `satTex` initializer

```ts
private satTex: Record<WeaponId, THREE.CanvasTexture> = {
  missile: missilePodTexture(),
  laser: laserSatTexture(),
  flak: flakCannonTexture(),
}
```

and update the import from `./sprites`. The ghost preview picks these up
automatically (`setGhost` reads `this.satTex[info.weapon]`). The old
two-argument `satelliteTexture(panel, stripe)` can be deleted.

### 3.1 Missile Pod — "Quiver"

```ts
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
```

### 3.2 Laser — "Helios Eye"

```ts
// Laser — "Helios Eye": diamond lens body with four diagonal radiator fins.
// The aperture is the exact beam color (0xff5a5a in renderer.ts); the fins
// wear the overheat mechanic. Pass hot=true for a flushed-radiator variant
// (future hook: swap texture while the sat is overheated).
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
```

### 3.3 Flak Cannon — "Hedgehog Drum"

```ts
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
```

### 3.4 Verification notes

Per CLAUDE.md, run the game headless (Playwright recipe) and screenshot, don't
trust typecheck. Things to actually look at:

- Place one of each weapon on Ring 1 and let them orbit a full period: each
  sprite must be identifiable while crossing space, the day-side disc, and the
  night-side disc.
- Check the ghost preview (0.65 opacity) for all three over the day side.
- Watch for texel shimmer on the laser's fins/arms during orbit at default
  zoom and at `minDistance` zoom. Some sparkle on 1-px highlights is expected
  and acceptable; whole fins flickering is not (would mean the scale/canvas
  budget in §1.1 was violated).

---

## 4. Cohesion notes — projectiles, beam, explosions

The accent palette was chosen so most of this is already true; the rest are
1–2 line tweaks.

- **Missile projectile (`missileTexture`, 8×8 oriented quad):** the orange
  nose `#ff7b2a` already matches the Quiver's loaded-cell warheads exactly —
  the missile visibly *is* one of the cells. Optional tweak to strengthen the
  link: blue tail fins in the pod's ID color — add after the body fill:
  `ctx.fillStyle = '#2f6fd6'; ctx.fillRect(2, 2, 1, 1); ctx.fillRect(2, 5, 1, 1)`.
- **Flak shell (`flakShellTexture`, 8×8):** the amber core `#e8b13d` already
  matches the drum's carousel lights exactly. Optional tweak: swap the casing
  grey `#8a93a3` → hull-dark `#5c6470` so the shell uses the shared hull
  family.
- **Laser beam:** `renderer.ts` draws beams in `0xff5a5a` — byte-identical to
  the Helios aperture. No change needed; the beam reads as the eye firing. If
  beam thickness ever gets revisited, keep the core `#ff5a5a` and add a 1-px
  `#ffd9d9` flash at the satellite end, mirroring the aperture's white-hot
  pixel.
- **Overheat state (free hook):** `laserSatTexture(true)` is the flushed
  variant. When the sim exposes per-satellite heat to the renderer, swapping
  `material.map` between the two textures shows the duty cycle with zero new
  art. Until then, only the `false` variant ships.
- **Explosions:** `spawnExplosion` tints one shared texture per event
  (`0xffb347` kills, `0xff5040` earth hits, `0xbfe3ff` launches). When the
  sim's explosion event someday carries its cause, tint flak detonations
  `0xe8b13d` and missile blasts `0xffb347` so AoE bursts inherit their
  weapon's accent. That needs a small sim event change (`src/sim` is the
  authority on events), so it is flagged here, not specced.
- **Asteroid / Earth / sun:** untouched; the warm-grey asteroid sits far from
  all three accents, which keeps friend/foe color separation clean.

---

## 5. M5 ComfyUI plan

DESIGN §13 sizes: **48×48 satellites, 32×32 enemies, 16×16 projectiles, 64×64
explosion sheets**, NearestFilter everywhere. The §3 placeholders are designed
to be the *composition keys* for generation: a 16×16 sprite nearest-upscaled
8× (128×128) is an excellent img2img / ControlNet input that locks the
silhouette while the model adds material detail.

### 5.1 Sprite-sheet specs

Horizontal strips, one row per sheet, frame 0 = idle A. PNG with transparent
background, loaded with `THREE.TextureLoader` + the same
NearestFilter/no-mipmaps/SRGB settings `texFromCanvas` uses today.

| Sheet | Frame | Frames (left→right) | Strip size |
|---|---|---|---|
| `sat_missile.png` | 48×48 | idle A, idle B (dome blink), fire A (cell flash + smoke), fire B, damaged | 240×48 |
| `sat_laser.png` | 48×48 | idle A, idle B (aperture pulse), fire A (aperture flare), fire B, overheat A (fins flushed), overheat B, damaged | 336×48 |
| `sat_flak.png` | 48×48 | idle A, idle B (carousel cycle), fire A (N/S muzzle flash), fire B (E/W muzzle flash), damaged | 240×48 |
| `proj_missile.png` | 16×16 | flight A, flight B (exhaust flicker) | 32×16 |
| `proj_flak.png` | 16×16 | single frame | 16×16 |
| `fx_explosion.png` | 64×64 | 6-frame generic blast (stays tintable white/orange) | 384×64 |
| `fx_flakburst.png` | 64×64 | 4-frame amber proximity burst | 256×64 |

At 48×48 the satellites have 3× the texel density of the placeholders, but the
on-screen size budget (§1.1) is unchanged — so generated frames must keep the
same big shapes and only add texture *within* them. Sprite scale stays 0.3;
the extra resolution pays off at close zoom (`minDistance` 2.5).

### 5.2 Generation workflow

1. **Model:** SDXL (or current local equivalent) + a pixel-art LoRA/checkpoint;
   generate at 512×512, downscale to 48×48 with nearest-neighbor, then
   palette-quantize to the §1.2 anchors (plus at most 2–3 extra ramp steps per
   hue). Quantizing to the anchor palette is what makes generated frames sit
   next to code-drawn effects without a seam.
2. **Composition lock:** img2img from the 8×-upscaled placeholder at low-ish
   denoise (~0.45–0.6), or ControlNet (lineart/tile) from the same input. This
   guarantees the shipped silhouettes — already playtested for mutual
   distinctness — survive generation. Generate all three satellites in one
   session with a shared style prompt and seed family for set cohesion.
3. **Background:** flat `#ff00ff` background in the prompt, chroma-key to
   transparency, then a manual cleanup pass to restore the 1-px `#0d1018`
   outline (models love anti-aliasing it away; the outline is load-bearing per
   §1.3).
4. **Frame variants:** generate idle first, approve it, then img2img the
   approved idle at very low denoise with the variant prompt (muzzle flash,
   flushed fins, damage scorch) so frames stay aligned within the strip.

### 5.3 Prompts

Shared suffix for all sprites:
`pixel art game sprite, single object centered, icon view, flat shading, hard
1px dark outline, limited palette, crisp pixels, no anti-aliasing, flat
magenta background` — plus negative: `blurry, gradient, glow, 3d render,
photorealistic, text, watermark`.

- **Missile Pod (Quiver):** `military satellite, tall vertical missile launch
  rack, recessed grid of launch tubes, three tubes loaded with orange warhead
  tips, some tubes empty and dark, small blue seeker radar dome on top, two
  small dark-blue solar panels mounted low on the sides, light grey armored
  hull` (+fire variant: `top launch cell open and firing, bright exhaust
  flash, small smoke puff`)
- **Laser (Helios Eye):** `orbital laser weapon platform, diamond shaped grey
  hull, large glowing red lens aperture in the center like an eye, dark red
  radiator fins on all four diagonal corners, grey support struts`
  (+fire: `aperture flared bright red-white`; +overheat: `all four radiator
  fins glowing bright hot red, white-hot inner corners`)
- **Flak Cannon (Hedgehog):** `squat octagonal flak turret satellite, wide
  flat armored drum, light grey top and dark grey base, four short stubby
  cannon barrels pointing up down left right, row of three amber ammunition
  lights across the middle` (+fire A/B: `muzzle flash on the
  vertical / horizontal pair of barrels`)
- **Projectiles:** missile `tiny pixel art missile side view facing right,
  white body, orange nose cone, blue tail fins, yellow exhaust flame`; flak
  shell `tiny pixel art shell, dark grey casing, glowing amber tracer core`.
- **Explosions:** `pixel art explosion animation frame N of 6, expanding
  orange and yellow blast, white hot core` / flak burst `expanding amber
  shrapnel burst, ring of fragments` per frame.

### 5.4 Mapping code-drawn placeholders → generated frames

| Placeholder (this doc / sprites.ts) | Sheet frame | Trigger already in code? |
|---|---|---|
| `missilePodTexture()` | `sat_missile` idle A | yes — `satTex.missile` |
| `laserSatTexture(false)` | `sat_laser` idle A | yes — `satTex.laser` |
| `laserSatTexture(true)` | `sat_laser` overheat A | needs heat exposed to renderer (small sim→render addition) |
| `flakCannonTexture()` | `sat_flak` idle A | yes — `satTex.flak` |
| `missileTexture()` | `proj_missile` flight A | yes — missile quad material |
| `flakShellTexture()` | `proj_flak` | yes — shell sprite material |
| `explosionTexture()` | `fx_explosion` | yes — tinted per event |
| — | fire frames | laser: derivable from `state.beams` presence per satId; missile/flak: cleanest as a sim "fired" event or per-sat reload timestamp surfaced to the renderer — flag for the M5 integrator |

Satellite animation is a new (small) renderer capability — today each
satellite is one static `THREE.Sprite` material. Recommended approach: one
`CanvasTexture`/`Texture` per frame and swap `material.map` (cheapest, matches
current architecture), rather than UV-scrolling a sheet. Frame timing can live
entirely in the render layer off existing sim state; nothing in `src/sim/`
needs to know about animation.
