# Orbital Defense — Design Document

A web-based tower defense game where the "towers" are weapon satellites in orbit
around Earth. Enemies approach from deep space; satellites fire automatically.
Between attacks, the player spends credits on research or on launching new
satellites.

**Locked decisions** (2026-06-11):

- Satellites physically orbit (lower orbit = faster). Coverage rotates.
- Endless single run: escalating waves, research persists within the run, run
  ends when Earth falls.
- Three.js (3D scene) + TypeScript + Vite.
- Pixel-art sprites (billboards in 3D), assets generated via ComfyUI.
- Research completes instantly on purchase.

**Status** (2026-06-12): M0–M4 complete — full loop, all three weapons, the
research layer (44 nodes across five trees), M4 enemy depth, satellite HP,
targeting priorities, speed controls, code-drawn M4 sprites, and P0 procedural
audio are live and verified headlessly (see §14). M5 polish is partially live:
gravity-turn launch animation with booster separation, a more Earth-like
continent/city-light pass, Milky Way background, enemy health bars, and a
procedural synth soundtrack. Live tuning values in `src/data/config.ts` and
`src/data/research.ts` supersede any starting numbers quoted in this document.

---

## 1. Design pillars

1. **Orbits are the hook.** Towers move. Strategy is about altitude choice and
   *phasing* (spacing satellites around a ring), not guarding a single spot.
2. **One currency, real tension.** Every credit spent on research is a satellite
   not launched, and vice versa.
3. **Readable spectacle.** 3D Earth and rotating constellations look great, but
   the player must always be able to tell what's covered and what's about to hit.
4. **Data-driven everything.** Weapons, enemies, research, and waves live in
   config files so balancing is editing data, not code.

## 2. Core loop

```
DEFENSE PHASE                      BUILD PHASE
Wave spawns from random bearings → Wave cleared → earn clear bonus
Satellites auto-fire             → Spend credits:
Credits per kill                 →   • Launch new satellites (type, ring, angle)
Enemies that reach Earth         →   • Research (weapon trees, rocketry, global)
deal planet damage               → Start next wave (player presses the button)
```

Game over when Earth HP hits 0. Score = waves survived (+ kills, credits earned).

## 3. Playfield & camera (3D specifics)

- Earth is a sphere at the origin with a pixel-art equirectangular texture.
  Current placeholder art uses hand-drawn but geographically placed continents
  instead of random land blobs.
- **All gameplay happens in (or near) the equatorial plane in v1.** This is the
  crucial readability decision: it's effectively the 2D radial-TD design rendered
  in a 3D scene. Inclined/polar orbits are a Phase-2 feature (see §14).
- Camera: perspective, default ~35° above the orbital plane looking at Earth.
  Right-drag to orbit, scroll to zoom, key to snap back to default. Full rotation
  allowed for spectacle; the default angle is the "playing" angle.
- Satellites, enemies, projectiles, explosions: billboarded sprites
  (`THREE.Sprite` / camera-facing quads) with `NearestFilter` — no 3D models.
- **Pixelation pass:** render the scene to a low-res target (~480p) and upscale
  with nearest-neighbor so the whole frame reads as pixel art. Make it a
  graphics toggle.
- Orbit rings drawn as subtle glowing line loops; weapon range shown as a
  translucent disc/ring around each satellite (toggleable).
- **The sun (M2):** a visible sun sits far out in the scene and is the key
  light — Earth is lit by a single directional light from the sun's direction
  with ambient kept very low, so only the sun-facing hemisphere is illuminated
  (day/night terminator). A separate additive night-light shell shows city
  lights only on the dark side; its placement follows the NASA Black Marble /
  VIIRS night-lights reference:
  https://www.earthdata.nasa.gov/data/projects/black-marble. Sprites stay
  unlit/full-bright for readability. Sun direction is fixed in v1 (slow drift
  is a cosmetic knob). Purely cosmetic for now; possible Phase-2 hooks
  (solar-charged lasers, night-side stealth) are deliberately not designed yet.
- **Milky Way background (M5):** starfield now includes a dim procedural
  Milky Way patch behind the existing point stars, anchored to one region of
  the sky rather than wrapped around the whole backdrop. Composition follows
  the NASA / Don Pettit ISS reference where the galaxy reads as a local band:
  https://www.planetary.org/space-images/milky-way-from-iss-2. It is cosmetic
  only.

## 4. Orbital mechanics

- **Discrete rings**, not continuous altitude — easier to read, place, and balance.
- Angular speed follows Kepler-flavored scaling: period ∝ radius^1.5.

| Ring | Radius (× Earth) | Orbit period | Unlock |
|------|------------------|--------------|--------|
| 1 — LEO | 1.5 | ~20 s | start |
| 2 — MEO | 2.2 | ~35 s | Rocketry I |
| 3 — HEO | 3.0 | ~55 s | Rocketry II |
| 4 — GEO | 4.0 | ~80 s | Rocketry III |

- Trade-off to preserve in balance: **low rings** = fast-moving, cheap to reach,
  dense coverage of a small circumference, but engage enemies only on final
  approach. **High rings** = engage early and have long sightlines, but sparse
  coverage and expensive launches.
- All satellites orbit the same direction (prograde) in v1.
- Placement = pick ring + insertion angle. Ghost preview shows the range disc
  and a phase indicator (angular gaps to neighbors on that ring) so spacing
  satellites evenly is easy.
- Satellites in the same ring never drift relative to each other (same speed),
  so a well-phased ring stays well-phased — phasing is a real, durable decision.
- Phase-2 research: **station-keeping / geostationary pinning** — pin individual
  Ring-4 satellites in place (flavor-correct: real GEO). Pairs with ground radar
  (§8): park a pinned platform over a radar site for a permanent buff.

## 5. Weapons (v1: three types)

| | Missile Pod | Laser | Flak Cannon |
|---|---|---|---|
| Hardware cost | 100 | 150 | 80 |
| Satellite HP | 80 | 70 | 90 |
| Style | Homing, travel time | Hitscan beam | Proximity-fused AoE bursts |
| Strength | High single-target dmg, small AoE | Never misses; melts fast enemies | Swarms, asteroid fragments |
| Weakness | Slow reload, overkill on chaff | Overheats (duty cycle); low burst | Short range, weak vs big HP |
| Range | Long | Medium | Short |

Future weapons (post-v1): Railgun (sniper, pierces, leads targets), EMP
satellite (slow/disable support), Drone carrier (launches interceptors), Shield
satellite (projects a barrier arc), Salvage satellite (economy).

## 6. Research

Single currency (credits) shared with launches. **Research completes instantly
on purchase.** Trees are short and legible — 3–5 nodes per line, costs escalate.

**Per-weapon trees** (each weapon has its own):
- Missiles: Damage I-III · Reload I-III · MIRV (3 warheads) · Nuke (every 5th
  shot, big AoE)
- Laser: Power I-III · Heat capacity I-III · Cooling I-II · Beam splitter
  (hits 2nd target at 50%)
- Flak: Fire rate I-III · Blast radius I-III · Shrapnel (fragments damage on
  detonation) · Extended fuses (+range)

**Rocketry tree** (the "deeper orbit" line from the original concept):
- Rocketry I/II/III — unlock Rings 2/3/4
- Reusable boosters I-II — launch fee −30% / −60% (see §10 for the fee model)
- Heavy-lift rockets I-II — one rocket carries 2 / 3 satellites to the same
  ring in a single launch, paying one launch fee for the whole batch
- Rapid deployment — allowed to launch *during* a wave
- Orbital transfer — move an existing satellite to another ring/angle for a fee

**Global / Earth tree:**
- Planetary armor I-III — Earth max HP up
- Salvage I-III — +credits per kill
- Deep-space radar I-II — preview next wave's composition; then two waves ahead
- Repair drones I-II — satellites regen HP between waves; then during waves
- Targeting computer — unlock per-satellite priority modes (closest-to-Earth /
  strongest / weakest / fastest)

### Deep-tech megaprojects (Phase 2)

Endgame capstones, deep in the tree: each is a big one-time build that visibly
appears in the world and changes how you play. Candidates:

- **Orbital gantry (shipyard):** satellites are assembled in orbit — zero launch
  fees, and you can build during waves. Upgrade: carrier ops — maintains a wing
  of autonomous fighters that intercept leakers, replenished between waves.
- **Space elevator:** rocketry capstone alternative to the gantry — ground
  launches become near-free and instant. (Consider making gantry vs. elevator a
  pick-one capstone so endgame builds have identity: in-orbit industry vs. cheap
  mass launch.)
- **Lunar foundry:** a Moon base that fabricates a free satellite every N waves,
  deliverable to any ring (it's already up there). The Moon itself can sit on a
  slow outermost orbit for flavor.
- **Wreckage recycler station:** converts a share of destroyed-enemy mass into
  bonus credits; overkill damage is no longer wasted.
- **Defense uplink network:** satellites within X° of a neighbor on any ring
  link up for a small stacking fire-rate bonus — rewards deliberate phasing.
- **Orbital mirror array:** global laser buff (+damage, +heat capacity); beams
  visually relay off mirrors as a cosmetic flourish.
- **Lunar mass driver:** player-activated bombardment on a long cooldown — the
  game's first *active* ability (design note: decide whether active abilities
  belong in the game at all before building this).
- **Orbital ring:** the ultimate money sink — a continuous structure around one
  ring with turret hardpoints at discounted hardware cost; enemies crossing the
  ring take damage. For deep endless runs.

## 7. Enemies

Default target priority for satellites: enemy closest to Earth within range.

**v1 roster:**

| Enemy | Behavior | Counters it |
|---|---|---|
| Asteroid | Slow, high HP, straight-line impact threat | Missiles to crack; flak for grouped rocks |
| Fighter | Fast, low HP, weaves | Laser |
| Bomber | Medium speed; stops and fires at satellites | Anything — but you must kill it before it kills your investment |
| Carrier (boss, every 5th wave) | Huge HP, spawns fighters continuously | Sustained focus fire |

Bombers introduce **satellite HP** (~wave 8). Destroyed satellites are gone —
that's the real threat economy. Repair drones research softens it. Satellite
HP is weapon-specific (missile 80, laser 70, flak 90) and shown in the sidebar
inspector. Bomber bombs are enemy projectiles that damage satellites only; they
do not damage Earth directly unless the bomber itself reaches Earth.

**Later roster ideas:** shielded cruiser (regenerating shield; lasers strip it),
stealth raider (invisible without radar), kamikaze swarm, artillery platform
(parks beyond Ring 4 range and shells satellites — forces high-ring coverage),
orbital bomber (dives past satellites to strike ground buildings, once §8 exists).

## 8. Ground layer — surface buildings (Phase 2)

A second placement system: buildings at fixed bearings on the planet's surface,
in the orbital plane. A limited number of **surface slots** (e.g., 6, more
unlockable) keeps placement a real decision. Each building affects an **arc of
sky** above it (e.g., ±25°).

**Support buildings:**
- **Ground radar:** satellites passing through its arc get +range; geostationary
  platforms (§4) parked overhead get the buff permanently. Later: reveals
  stealth enemies in its arc.
- **Launch complex:** launch-fee discount for insertions near its bearing.
- **Planetary shield projector:** absorbs the first N impact damage in its arc
  each wave; recharges between waves.

**Ground weapons:**
- **SAM battery:** heavy damage, long reload, engages targets on final approach
  in its arc — a last line of defense under coverage gaps.
- **Ground laser:** cheaper than the orbital laser but weaker (atmospheric
  attenuation) and limited to its arc.

**Open design notes:**
- Earth's visible rotation is cosmetic; building bearings stay fixed in the
  orbital plane, so the geostationary-over-radar pairing actually holds.
- Are buildings attackable? Suggest yes eventually (orbital bomber enemy), but
  indestructible in the feature's first cut.
- Sequencing: slated for Phase 2 because it's a second placement system and its
  best synergy (radar + geostationary) depends on Phase-2 research — but it's
  the first thing to pull forward if v1 lands quickly. Support buildings first,
  ground weapons second.

## 9. Earth & failure

- Earth HP 100 (researchable up). Each enemy that impacts deals its damage value
  and is removed.
- Cosmetic damage states on the planet texture as HP drops.
- Game over at 0 → score screen (waves, kills, credits earned) → restart.

## 10. Economy

- **Deployment cost = hardware + launch fee.** Hardware is the weapon's price
  (§5). The launch fee is per *rocket* and scales with ring — starting values
  20 / 40 / 70 / 110 for Rings 1–4. This is the axis the rocketry tree plays
  on: reusable boosters shrink the fee, heavy-lift rockets amortize one fee
  across a batch, launch complexes discount it locally, and the orbital gantry
  / space elevator eliminate it.
- Credits per kill, proportional to the enemy's wave-budget cost.
- Wave clear bonus (flat + small scaling).
- No second currency. No interest mechanic in v1 (revisit if economy feels flat).
- Deorbit (sell) a satellite for 50% of its *hardware* cost — launch fees are
  sunk. Fixes placement mistakes without making relocation free (that's what
  orbital-transfer research is for).

## 11. Wave generation

- Each wave has a point budget: `B(n) = 50 × 1.18^n` (starting values; tune).
- Budget is spent on enemy types from an unlock schedule (asteroids from wave 1,
  fighters ~4, bombers ~8, mixed clusters after).
- Enemies spawn in clusters from random bearings in the equatorial plane,
  outside Ring 4, and fly toward Earth.
- Boss carrier every 5th wave (own budget multiplier).
- Endless scaling: after ~wave 30, layer on HP/speed multipliers.

## 12. UX

- **Left sidebar (M2), the main command surface:** persistent DOM panel on the
  left edge with sections for Weapons (select a type to arm placement; costs
  shown) and Research (stubbed/locked in M2, filled in by M3).
- **Build phase:** select weapon in the sidebar → pick ring → click insertion
  angle on the ring; ghost shows range + phase gaps. **Right-click or Esc
  cancels placement** (M2 fix — v0.1 only had Esc, which nobody discovers, so
  arming Missile Pod felt like a trap). Launch animation: a ring-specific
  rocket leaves the surface on a gravity-turn path, sheds a booster that falls
  back toward Earth, and inserts visually at the selected orbit; the satellite
  still exists in the sim immediately. With heavy-lift researched (M3),
  follow-up satellites to the same ring launch fee-free on the open rocket —
  the batch closes on disarm, ring switch, or wave start.
  (A queue-and-confirm launch UI is possible M5 polish; the fee-free
  follow-up model ships the economics with the existing click flow.)
- **Defense phase:** speed controls 1×/2×/4× + pause. Incoming-wave banner.
  Radar panel (if researched) shows next wave composition.
- Range-circle and orbit-trail toggles. Click a satellite to inspect (stats, HP,
  sell button, priority mode if researched). Selling is build-phase only and
  refunds 50% of hardware cost; launch fees are sunk.
- HUD: credits, Earth HP, wave number, enemy count remaining. Enemy health
  bars are billboarded render sprites over each enemy, not DOM HUD.
- All menus/HUD are HTML/DOM overlay — never build UI inside the 3D canvas.

## 13. Tech architecture

- **Stack:** Vite + TypeScript + Three.js. No backend; saves in `localStorage`
  (versioned schema).
- **Sim/render split (the most important rule):** the simulation is pure TS with
  zero Three.js imports, advanced on a fixed timestep (60 Hz) decoupled from
  render. Render layer reads sim state and updates the scene. This keeps the
  game testable/balance-able headlessly and makes the speed controls trivial.
- **State machine:** `BuildPhase ↔ WavePhase → GameOver`.

```
src/
  sim/        entities, movement, targeting, combat, waves, economy, research
  render/     scene setup, sprite management, fx, camera, pixelation pass
  ui/         hud, build menu, research tree, wave banner (DOM)
  data/       weapons.ts, enemies.ts, research.ts, waves.ts  (pure data)
  save.ts
  main.ts
```

- **Asset pipeline:** ComfyUI-generated pixel sprite sheets. Suggested sizes:
  32×32 enemies, 48×48 satellites, 16×16 projectiles, 64×64 explosion sheets,
  512-wide equirect Earth texture. Nearest filtering everywhere.
  Sprite direction (distinct weapon-satellite silhouettes, generation prompts,
  sheet specs) lives in **docs/SPRITES.md** — the recommended placeholder set
  is implemented in `sprites.ts` (incl. laser overheat, fighter, bomber,
  carrier, and bomber-bomb variants). Sound design + music direction live in
  **docs/AUDIO.md**; `src/audio/` is a presentation-layer sibling of the
  renderer, consuming `state.events` and derived sim diffs with zero sim
  imports in `src/sim/`.

## 14. Milestones

- **M0 — Scaffold** ✅ *(2026-06-11)*: Vite + TS + Three.js; Earth sphere
  (code-drawn pixel texture), starfield, orbit camera; fixed-timestep sim loop
  wired to render. The M5 pixelation pass landed early — render at ⅓ resolution
  with nearest-neighbor upscale, toggled with P.
- **M1 — Playable core (placeholder art)** ✅ *(2026-06-11)*: Ring 1, missile
  pod placement with ghost preview + range disc, orbital motion, asteroid waves
  in clusters from random bearings, homing projectiles + collision, credits,
  Earth HP, wave-clear bonus, game over + restart. Verified headless in
  Chromium: a well-phased 3-satellite ring fully clears wave 1 with zero Earth
  damage; 2 badly placed satellites leak 4 of 5 asteroids — phasing matters, as
  intended. First balance pass applied in `src/data/config.ts`: asteroid speed
  0.16→0.13, missile range 1.5→1.7, reload 1.8→1.4 s, starting credits
  350→400 (three satellites affordable up front).
  *The "is this fun?" checkpoint — playtest before building M2 on top.*
- **M2 — Full loop** ✅ *(2026-06-11)*: left-sidebar command menu (weapon
  cards with hardware + fee cost breakdown, ring selector, research section
  stubbed for M3); ghost preview scales to the armed weapon's range and shows
  the §4 phase indicator (arcs to ring neighbors + gap degrees in the status
  bar); right-click/Esc both cancel placement; all 3 weapons live (laser =
  hitscan beam with heat/overheat duty cycle, flak = unguided lead-aimed
  shells with proximity-fused AoE bursts, missiles gained a small AoE);
  launch-fee economy surfaced in the UI; visible pixel sun, low ambient +
  directional sunlight gives the day/night terminator. *Interim design
  decision:* Rings 2–4 unlock by buying Rocketry I–III directly from the ring
  list (sequential, 150/300/500 cr in `config.ts`); the M3 research screen
  absorbs these as the rocketry tree's first nodes. Satellites are color-coded
  by weapon until real sprites land (M5). Verified headless: wave cleared by a
  mixed missile/laser/flak ring with zero Earth damage; laser hit heat cap and
  recovered; MEO unlock + placement priced correctly (190 cr laser = 150 hw +
  40 fee); GEO unpurchasable before HEO.
- **M3 — Research** ✅ *(2026-06-11)*: research screen (DOM overlay, R key or
  sidebar button, build phase only) with all five trees — 41 nodes in
  `src/data/research.ts` (typed effects folded into derived weapon stats by
  `src/sim/research.ts`). Per-weapon trees incl. MIRV (3 warheads @60%, up to
  3 targets), Nuke (every 5th launch, 3× damage, 4× blast), Beam Splitter
  (second beam @50%), Shrapnel (50% damage in a 1.6× fragment ring), Extended
  Fuses. Rocketry: ring unlocks moved into the tree (sidebar ring buttons
  remain a shortcut), reusable boosters (−30%/−60% fees), heavy-lift
  (fee-free follow-ups, see §12), rapid deployment (launch mid-wave). Global:
  planetary armor, salvage, deep-space radar (HUD preview of the next 1–2
  waves' composition — `waveComposition()` is deterministic per wave number,
  so the preview needs no pre-rolling). Verified headless: prereq gating,
  exact fee/batch/salvage math, MIRV volleys at 15 damage (20 × 1.25 × 0.6),
  mid-wave placement with rapid deployment. *Deferred to M4* (need satellite
  HP + click-to-inspect first): repair drones, targeting computer, orbital
  transfer.
- **M4 — Depth** ✅ *(2026-06-11)*: enemy roster now uses `EnemyId =
  asteroid | fighter | bomber | carrier` with deterministic radar preview:
  fighters unlock around wave 4, bombers around wave 8, and every 5th wave
  includes a carrier boss plus escorts. Fighters weave with lateral motion;
  bombers park in attack range and fire homing bombs at satellites; carriers
  drift inward and continuously spawn fighters. Satellites have HP, can be
  clicked for a sidebar inspector, can be sold during build phase, and support
  per-satellite priorities (`closest`, `strongest`, `weakest`, `fastest`) after
  Targeting Computer. Repair Drones I/II now repair between waves / during
  waves. Speed controls (pause, 1×, 2×, 4×) drive the fixed-timestep
  accumulator. The requested sidecars also landed: code-drawn fighter, bomber,
  carrier, and bomb sprites; `src/audio/` with P0 procedural WebAudio sounds
  and laser beam loops consuming events/diffs. Verified headless: priority
  setting mutates sim state, bomber bombs reduce satellite HP, boss wave spawns
  carrier/fighters, 4× advances sim time faster, pause freezes it, and the
  rendered scene/screenshots are nonblank.
- **M5 — Polish** ◐ *(started 2026-06-12)*: gravity-turn launch animation with
  ring-specific rocket sprites, booster separation/fall-back, Earth continent
  pass with dark night side + city lights, procedural Milky Way, enemy health
  bars, and procedural synth soundtrack are live. Remaining: final ComfyUI
  sprite sheets, real audio assets/stems on top of the procedural runtime,
  screen shake, save/load, difficulty curve tuning, and broader balance passes.
- **Phase 2 (post-v1):** ground layer (§8), geostationary pinning, deep-tech
  megaprojects (§6) starting with the orbital gantry, inclined/polar orbital
  planes with out-of-plane attacks, more weapons (§5), more enemies (§7),
  campaign or roguelike meta layer.

## 15. Design risks & mitigations

- **Rotating coverage feels random** (a gap happens to align with a big
  cluster). Mitigate: phase indicator at placement, range/coverage visualization,
  approach speeds slow enough that several sectors engage each cluster.
- **3D camera vs. precise placement.** Mitigate: placement clicks snap to the
  selected ring; placement happens in the calm build phase.
- **Pixel sprites at varying zoom look inconsistent.** Mitigate: the low-res
  pixelation pass unifies everything; clamp zoom range.
- **Endless balance drift.** Mitigate: data-driven configs + headless sim means
  you can script "auto-play N waves with strategy X" balance tests later.
- **Launch-fee model double-taxes early game.** If the first few launches feel
  punishing, fold Ring 1's fee to zero and start fees at Ring 2.

## 16. Starting balance levers (all in `src/data/`)

Per weapon: hardware cost, range, damage, fire rate/heat, projectile speed.
Per ring: radius, period, unlock cost, launch fee.
Per enemy: HP, speed, damage, budget cost, credit reward, unlock wave.
Waves: base budget, growth rate, cluster size, boss cadence.
Economy: clear bonus, salvage rate, sell refund %, fee discounts.
Ground (Phase 2): slot count, arc width, building costs/effects.
