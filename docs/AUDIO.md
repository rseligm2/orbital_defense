# Orbital Defense — Audio Design & Music Direction

Status: P0 procedural runtime implemented during M4 in `src/audio/`, and the
M5 procedural soundtrack is now live in `MusicDirector`: it synthesizes pad,
arp, bass, drum, and lead stems, crossfades build/wave phases, rotates three
sets, and raises intensity from sim threat. `AudioDirector` consumes sim
events/diffs from `main.ts`, `src/data/audio.ts` owns tuning, and `src/sim/`
remains audio-free. Real music stems and final audio assets (§5) are still the
asset-pass deliverable.

Ground rules inherited from CLAUDE.md / DESIGN.md §13, restated because they
bind everything below:

- `src/sim/` stays pure. The audio layer **never** requires sim changes. It
  consumes `state.events` and diffs `SimState` exactly the way `GameRenderer`
  does (new projectile ids → new sprites there, → fire sounds here).
- All tunable audio numbers (bus levels, voice budgets, duck depth) belong in
  one place, mirroring the `src/data/config.ts` convention.
- Audio settings UI is DOM overlay, never in-canvas.

---

## 1. Audio direction

### The pick: **hybrid retro-space** — chunky chip SFX over atmospheric synth music

The game itself is already a hybrid: pixel-art billboards inside a real 3D
scene with a day/night terminator and a visible sun. The audio should make the
same move:

- **SFX = 8/16-bit chip vocabulary.** Square/triangle/noise sources, fast
  envelopes, pitch slides — the jsfxr lineage. Reasons: (a) it visually
  matches chunky pixel sprites — a photoreal explosion sample under a 16×16
  orange blob sprite reads as wrong; (b) chip one-shots are short and
  spectrally narrow, so dozens per second stay legible instead of becoming
  mud; (c) they are trivially synthesizable in WebAudio today, so placeholders
  and final assets share a sonic family and swapping is low-risk.
- **Music = space-synth, not chiptune.** Wide, dark, slow-moving analog-style
  pads and arps with chip textures used as *accents* (a square-wave lead, a
  bit-crushed arp), not as the whole palette. Reasons: (a) a 40-minute endless
  run of pure NES-style melody is exhausting — pads and slow harmonic motion
  tolerate repetition far better; (b) the 3D orbital spectacle (sun, Earth,
  rotating constellations) deserves scale and air; (c) keeping music spectrally
  *below and around* the bright SFX band means the two layers never fight.

**Frequency contract:** SFX own roughly 800 Hz–6 kHz (transients, blips,
alarms) plus a sub-thump lane below 100 Hz; music lives mainly 60–800 Hz
(bass, pads) with sparse highs. Mix decisions follow from this, not taste.

**One key family:** everything — all music sets, the wave-cleared jingle, the
game-over stinger, even tuned UI blips — sits in **A minor / A dorian**.
Stingers can then fire over any track at any moment without clashing, which is
what makes the simple crossfade strategy in §3 safe.

### Reference points

1. **FTL: Faster Than Light (Ben Prunty)** — the canonical model for this
   game's core need: every track exists as paired *explore* and *battle*
   arrangements sharing tempo/key/grid, crossfaded when combat starts. Our
   build phase ↔ wave phase is exactly FTL's explore ↔ battle.
2. **Hyper Light Drifter / Fez (Disasterpeace)** — texture reference: how
   chip-adjacent timbres become ambient, melancholy, and long-session
   listenable. The build phase should feel like this — quiet wonder, Earth
   turning below.
3. **Stellaris (Andreas Waldetoft)** — scale reference only (no orchestra):
   the sense of orbital majesty and slow cosmic drift the pads should evoke
   when the camera pulls back.

Tone words: *cold, vast, patient* (build) → *driving, urgent, mechanical*
(wave) → *alarms, dread* (boss) → *hollow, falling* (game over).

---

## 2. Complete SFX inventory

Tiers: **P0** = ship-first (the game feels broken without it), **P1** = first
follow-up pass, **P2** = polish. Every trigger below is concrete and already
exists in the codebase (or is marked with the milestone that creates it).

### 2a. Sim-event sounds (`state.events`, drained in `main.ts` frame loop)

The sim's `explosion` event carries a `size` that already disambiguates its
three emitters (see `src/sim/sim.ts`): beam impact sparks are `0.07` (paced at
0.12 s per satellite by `sparkTimer`), `detonate()` pushes
`max(0.12, blastRadius * 0.85)` (missile ≈ 0.12, flak ≈ 0.26), and enemy
deaths push `0.3`. The audio layer branches on size thresholds — no sim
change needed:

| Sound | Trigger (concrete) | Tier | Sonic description |
|---|---|---|---|
| **Explosion** | `explosion` event, `size >= 0.1`; size scales pitch/length (0.12 missile pop → 0.3 kill boom) | **P0** | Pitch-dropping sine thump + low-passed noise crack; bigger = lower and longer; ±6% random detune per instance |
| **Laser impact spark** | `explosion` event, `size < 0.1` (the 0.07 beam sparks) | P1 | 40 ms high-passed noise tick, quiet, granular — texture, not an event |
| **Earth impact** | `earth-hit` event | **P0** | The most important negative feedback in the game: deep sub thud (70→24 Hz), long rumble tail, plus one short alarm pip at G4 so it cuts through any battle |
| **Rocket launch** | `launch` event (fires on successful satellite placement) | **P0** | Rising band-passed noise whoosh (~0.5 s) + small triangle chirp up; doubles as the placement-confirm sound |
| **Wave cleared** | `wave-cleared` event | **P0** | Bright chip fanfare: A-minor pentatonic rise (A4-C5-E5-A5), square + triangle octave, ~0.7 s; music ducks underneath |
| **Game over** | `game-over` event | **P0** | Music cuts (250 ms fade) → descending detuned-saw stinger (A3-E3-C3-A2, ~2.5 s) + final sub boom; then near-silence under the score screen |

### 2b. Derived sounds (state diffs — the sim emits no fire/overheat events, and must not)

The sim has no "weapon fired" or "overheated" events; the renderer already
derives "new entity" from unseen ids, and the audio layer does the same:

| Sound | Trigger (derivation, exact) | Tier | Sonic description |
|---|---|---|---|
| **Laser beam loop** | `state.beams` entry appears for a `satId` not currently voiced; stops when the satId is absent ~120 ms (linger prevents flutter on 1-step target swaps) | **P0** | Two detuned saws (~92 Hz) through a low-pass — a tense electric hum; start/stop with 30–40 ms gain ramps; the laser is otherwise totally silent, hence P0 |
| **Laser heat tell** | While voiced: `sat.heat / heatCapacity` (config `heatCapacity: 3`) mapped onto the loop each frame | P1 | Loop pitch climbs up to +7 semitones and the filter opens as heat rises — players *hear* the overheat coming before it happens |
| **Overheat vent** | Rising edge of `satellite.overheated` (false→true) | P1 | Steam-vent noise hiss (band-passed, falling) + low warning blip; the beam loop's stop is part of the effect |
| **Laser ready** | Falling edge of `satellite.overheated` (heat fell below `refireHeat`) | P2 | Single soft ready blip (E5 triangle, 60 ms) |
| **Missile fire** | New projectile id with `kind === 'missile'` | P1 | Short "fwoosh" — noise burst through a rising band-pass, 0.25 s; quieter than its later detonation |
| **Flak fire** | New projectile id with `kind === 'shell'` | P1 | Dry percussive thump (low square pop, 80 ms); at 0.45 s reload across many cannons this is the battle's rhythm section — must be short and heavily throttled |
| **Cluster inbound ping** | `state.enemies` grows while `phase === 'wave'` (throttled to ≥ 2 s gaps) | P2 | Sonar-style ping with a touch of delay; sells the deep-space radar fantasy |
| **Low Earth HP alarm** | `earthHp / earthMaxHp <= 0.3` (same threshold as the HUD's red bar), loops softly until back above or game over | P2 | Slow two-note klaxon, very quiet, low-passed — dread, not annoyance |

### 2c. UI sounds (DOM hooks in `main.ts` / `Hud` / `Sidebar`)

| Sound | Trigger (concrete hook) | Tier | Sonic description |
|---|---|---|---|
| **Wave start** | Phase edge `build → wave` (covers the `#hud-startwave` button and any future trigger) | **P0** | Two-tone klaxon (A4/D#5 tritone squares, 6 pips, low-passed) — "incoming" alert; music transition rides on its tail |
| **Arm weapon** | `Sidebar.onWeaponClick` arming a weapon | P1 | Single square blip, A5, 50 ms |
| **Cancel / disarm** | `disarm()` (right-click, Esc, toggle-off) | P1 | Reverse blip, E5→A4 slide down, 80 ms |
| **Insufficient credits / locked** | The toast paths: placement-fail toast in `pointerup`, ring-unlock-fail toast in `onRingClick` | P1 | Flat error buzz: 110 Hz square, 120 ms, slight downward bend — unmistakably "no" |
| **Ring unlock** | `tryUnlockRing` returns true (the Rocketry toast path) | P1 | Ascending unlock arpeggio (A3-E4-A4-C#5 — major third on top: a *reward*), 0.5 s |
| **Research purchase** | M3 research screen confirm (hook lands with M3) | P1 | Two-note confirm chime (E5→A5 triangle) — distinct from ring unlock |
| **Restart click** | `#hud-restart` | P2 | Standard arm-blip reused |
| **Toast appear** | `Hud.toast()` for non-error toasts | P2 | Soft 30 ms tick; skip if it fights other UI sounds |

**Deliberately silent:** camera drag/zoom, pointer hover, pixelation toggle,
satellite orbital motion (continuous whooshes for 12 satellites would be
sludge — the laser loop is the only continuous combat source, and it is
informative). Per-enemy idle sounds: none in v1; the carrier boss (M4) should
get a low engine drone as its own derived loop when it exists.

### P0 ship-first list (7 sounds)

1. Explosion (size-parameterized — covers missile, flak, kills)
2. Earth impact
3. Rocket launch / placement confirm
4. Laser beam loop (start/stop)
5. Wave-start klaxon
6. Wave-cleared fanfare
7. Game-over stinger

With just these, every phase transition, every credit spent, every point of
damage dealt or taken has a voice. Everything else is flavor on top.

---

## 3. Music design

### Structure: paired arrangements on a shared grid (the FTL model)

A **song set** = one piece of music delivered as 5 loop-aligned stems, all the
same length, same tempo, same key (A minor/dorian):

| Stem | Build phase | Wave phase |
|---|---|---|
| `pad` | on | on |
| `arp` | on (sparse, filtered) | on (opened up) |
| `bass` | off | on |
| `drums` | off | on |
| `lead` | off | on at high intensity only |

All stems for the active set start **simultaneously** and loop forever; phase
and intensity changes are *gain moves on stems*, never track restarts. This is
what makes transitions trivially safe: build ↔ wave is a crossfade of stem
gains over ~1 bar, on the same musical grid, in the same harmony. No
bar-quantization is needed for *correctness* — but quantize anyway (below)
because it sounds more intentional.

- **Tempo:** ~92 BPM, 4/4. Slow enough to feel orbital in build phase, and
  16th-note arps at 92 still drive a battle.
- **Loop length:** 16 bars per stem (≈ 41.7 s at 92 BPM). Build-phase
  listening tolerates this fine because only pad+arp play; wave phase rarely
  hears more than 2–3 consecutive loops.
- **Transition strategy:** stem-gain crossfades quantized to the next **2-bar
  boundary** for *escalation* moves (adding layers), and a **fast 1-beat
  fade** for *de-escalation* and emergencies (wave cleared, game over —
  dramatic events shouldn't wait two bars). The wave-start klaxon (§2c) is
  ~1.5 s long and covers the gap until the boundary, which is why the music
  itself doesn't need to slam in instantly.

### Intensity within a wave

Drive a scalar `intensity ∈ [0, 1]` from sim state, then map it to stem gains
(quantized as above):

```
threat   = enemies.length + spawnQueue.length          // hostiles remaining
progress = 1 - threat / threatAtWaveStart              // captured on build→wave edge
danger   = 1 - earthHp / earthMaxHp                    // permanent scar of the run
floor    = min(0.25 + waveNumber * 0.03, 0.55)         // later waves start hotter
intensity = clamp01(max(floor, danger) + 0.35 * progressSpike)
```

where `progressSpike` rises when enemies get close to Earth (any enemy within
1.5× Earth radius bumps it) — proximity, not body count, is what feels
dangerous in this game. Mapping: `bass` on above 0.2, `drums` above 0.4,
`lead` above 0.75. The full five-stem mix should be *rare* — that's what keeps
it special and keeps long runs from saturating.

Wave cleared: duck music hard, play the fanfare, then fall back to the build
arrangement over 2 s. The fanfare is in-key, so it lands as a cadence.

### Across waves: rotation against fatigue

A 40-minute endless run is the fatigue problem to design for. Four defenses:

1. **A pool of 3 song sets** at launch (Set A "First Orbit", Set B "Deep
   Field", Set C "Perimeter"). Rotate to the next set at the *build phase*
   following every 3rd wave — build phase is the natural seam, and the swap
   happens at a loop boundary with a 3 s pad crossfade.
2. **Breathing room:** every 4th build phase, drop music to near-silence —
   starfield room tone only (a single filtered pad at -30 dB). Silence resets
   the listener's ears; the next wave hits harder for free.
3. **Vertical scarcity:** the intensity floor caps at 0.55, so even deep runs
   spend most of their time at 3 of 5 stems.
4. **Deep-run variant:** past wave 20 (where DESIGN.md §11 layers endless
   multipliers), bias rotation toward the darkest set and detune its pad by a
   few cents — the run should *feel* like it has gone somewhere it shouldn't.

### Boss waves (every 5th — carrier, lands in M4)

The boss check is `waveNumber % 5 === 0`, so the music rule can ship before
the carrier itself does:

- Dedicated **boss set**: half-time drums (feels heavier at the same BPM),
  ostinato bass on A, an alarm motif on a detuned square. Same key/tempo
  family as everything else.
- Entry: hard cut at the first bar boundary after the wave-start klaxon —
  bosses earn a cut, not a crossfade.
- Boss kill should eventually get a longer fanfare variant (P2; needs an M4
  "carrier died" derivation — the kill is just a big `explosion` event, so
  derive it from the carrier's enemy id disappearing).

### Stingers

- **Wave cleared:** §2a fanfare, ~0.7 s, over ducked music.
- **Game over:** music gain to 0 in 250 ms (no boundary wait — the world just
  ended), stinger plays (descending, ~2.5 s), then an almost-silent defeat pad
  loops under the "EARTH HAS FALLEN" overlay. Restart cuts the pad and
  re-enters Set A's build arrangement.

---

## 4. Implementation plan (WebAudio-first)

### 4.1 Architecture and integration point

```
src/audio/
  engine.ts     AudioContext lifecycle, mixer buses, limiter, voice budgets
  sfx.ts        procedural one-shot patches + LaserVoice (placeholder synthesis)
  music.ts      MusicDirector: stem scheduler, intensity mapping, stingers
  director.ts   AudioDirector: consumes SimState/events; the only entry point
src/data/audio.ts
  all tunable audio numbers (bus levels, budgets, duck depth)
```

The audio layer is a sibling of the render layer with the identical contract.
In `src/main.ts`'s `frame()`, audio and render both consume the current
`state.events` burst before main clears it:

```ts
// main.ts frame()
audio.sync(state, state.events, dt)
renderer.sync(state, dt)
state.events.length = 0
```

Notes that fall out of the existing loop:

- Multiple fixed steps can run per frame (catch-up, and 4× speed in M4), so
  events arrive in bursts — the voice budgets in §4.4 are the pressure valve,
  and they are **wall-clock** based (`performance.now()`), so 4× game speed
  does not mean 4× audio density.
- UI sounds listed in §2c are still P1. The M4 runtime covers P0 event and
  derived-state sounds first.
- `onRestart` must call `audio.reset()` — `createState()` restarts entity ids
  from 1, so the director's seen-id sets must be cleared.
- Pause (M4): when main stops stepping the sim, `state.beams` freezes
  non-empty and the laser loop would drone forever. Main should call
  `audio.setPaused(true)`, which ramps the SFX bus to 0 and (optionally)
  low-passes the music — the classic pause-menu muffle.

### 4.2 Mixer

```
sfxBus ───────────────────┐
                          ├─→ master gain ─→ limiter (DynamicsCompressor) ─→ destination
musicBus ─→ duck gain ────┘
```

- **Limiter** is the reason 12 simultaneous explosions get loud instead of
  crackly: `threshold -9 dB, knee 6, ratio 16, attack 2 ms, release 250 ms`.
- **Ducking** is trigger-weighted, not sidechain-analyzed (simpler, fully
  deterministic): heavy SFX call `duckMusic(weight)`, which dips the duck gain
  fast (15 ms time constant) and recovers slow (400 ms). Explosions duck
  proportional to size; the wave-cleared fanfare and earth impacts duck hard.
- Default levels (in `src/data/audio.ts`): master 1.0, sfx 0.9, music 0.5.
  Music is mixed to sit well below SFX — informative, not foreground.

### 4.3 Engine + autoplay handling (sketch)

```ts
// src/audio/engine.ts — AudioContext lifecycle, mixer, voice budgets.
// Presentation layer only: may import src/data/config.ts, never sim internals.

export interface VoiceBudget {
  minGapMs: number      // refuse retriggers closer together than this
  maxConcurrent: number // refuse when this many instances still sound
}

export class AudioEngine {
  readonly ctx: AudioContext
  readonly master: GainNode
  readonly sfxBus: GainNode
  readonly musicBus: GainNode
  private readonly duck: GainNode
  private readonly lastAt = new Map<string, number>()
  private readonly liveCount = new Map<string, number>()

  constructor() {
    this.ctx = new AudioContext()

    const limiter = this.ctx.createDynamicsCompressor()
    limiter.threshold.value = -9
    limiter.knee.value = 6
    limiter.ratio.value = 16
    limiter.attack.value = 0.002
    limiter.release.value = 0.25

    this.master = this.ctx.createGain()
    this.sfxBus = this.ctx.createGain()
    this.musicBus = this.ctx.createGain()
    this.duck = this.ctx.createGain()
    this.sfxBus.gain.value = 0.9
    this.musicBus.gain.value = 0.5

    this.sfxBus.connect(this.master)
    this.musicBus.connect(this.duck).connect(this.master)
    this.master.connect(limiter).connect(this.ctx.destination)

    // Browser autoplay policy: the context is born 'suspended' and may only
    // start from a user gesture. The first pointerdown/keydown resumes it —
    // and the game's first interaction is always a click (weapon card,
    // Start Wave), so audio is awake before anything needs to sound.
    const unlock = () => {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      if (this.ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock, true)
        window.removeEventListener('keydown', unlock, true)
      }
    }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
  }

  get ready(): boolean {
    return this.ctx.state === 'running'
  }

  // Voice gate. Returns a gain scale (stacked voices each get quieter), or
  // null meaning "skip this trigger entirely". Wall clock on purpose: 4x sim
  // speed must not quadruple audio density.
  allocVoice(name: string, budget: VoiceBudget): number | null {
    if (!this.ready) return null
    const now = performance.now()
    if (now - (this.lastAt.get(name) ?? -1e9) < budget.minGapMs) return null
    const live = this.liveCount.get(name) ?? 0
    if (live >= budget.maxConcurrent) return null
    this.lastAt.set(name, now)
    this.liveCount.set(name, live + 1)
    return 1 / Math.sqrt(live + 1)
  }

  releaseVoice(name: string): void {
    this.liveCount.set(name, Math.max(0, (this.liveCount.get(name) ?? 1) - 1))
  }

  // Fast dip, slow recovery; safe to retrigger every frame.
  duckMusic(weight: number): void {
    const t = this.ctx.currentTime
    const floor = 1 - 0.45 * Math.min(1, weight)
    this.duck.gain.cancelScheduledValues(t)
    this.duck.gain.setTargetAtTime(floor, t, 0.015)
    this.duck.gain.setTargetAtTime(1, t + 0.12, 0.4)
  }
}
```

### 4.4 Voice budgets (in `src/data/audio.ts`)

| Voice | minGapMs | maxConcurrent | Why |
|---|---|---|---|
| `boom` | 35 | 6 | `detonate()` + kills can emit many per frame; 6 stacked, each at 1/√n gain, reads as "lots of explosions" without mud |
| `earth-hit` | 90 | 3 | Multiple impacts in one frame should still land as discrete gut-punches |
| `spark` | 90 | 4 | Sim already paces sparks at 0.12 s/satellite; this is the *global* cap |
| `missile-fire` | 60 | 4 | 1.4 s reload per pod keeps this naturally sparse |
| `flak-fire` | 45 | 5 | 0.45 s reload × many cannons ≈ 18/s worst case; cap makes it a rhythm, not a roar |
| `laser-voice` | — | 6 | Continuous voices; satellites beyond the cap stay silent until a slot frees |
| `ui` | 30 | 2 | Click spam protection |

Plus the per-instance ±6% pitch jitter in every patch — identical waveforms
triggered milliseconds apart phase-cancel; jitter turns stacks into texture.

### 4.5 Procedural placeholder recipes — the P0 set (paste-ready sketches)

```ts
// src/audio/sfx.ts — procedural chip-flavored one-shots. These are the
// placeholder patches; M5 swaps the insides for AudioBuffer samples while the
// function signatures (the game-facing API) stay identical.

import type { AudioEngine } from './engine'

// Shared 1 s white-noise buffer per context.
const NOISE = new WeakMap<BaseAudioContext, AudioBuffer>()
function noise(ctx: BaseAudioContext): AudioBuffer {
  let buf = NOISE.get(ctx)
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    NOISE.set(ctx, buf)
  }
  return buf
}

// One-shot scaffold: per-voice gain -> panner -> sfx bus, frees its budget
// slot when done. pan in [-1, 1].
function voice(e: AudioEngine, name: string, seconds: number, gain: number, pan = 0): GainNode {
  const g = e.ctx.createGain()
  g.gain.value = gain
  const p = e.ctx.createStereoPanner()
  p.pan.value = pan
  g.connect(p).connect(e.sfxBus)
  window.setTimeout(() => {
    e.releaseVoice(name)
    g.disconnect()
  }, seconds * 1000 + 100)
  return g
}

// ——— P0: explosion ———————————————————————————————————————————————
// size comes straight from the sim event: ~0.12 missile, ~0.26 flak, 0.3 kill.
export function boom(e: AudioEngine, size: number, pan = 0): void {
  const scale = e.allocVoice('boom', { minGapMs: 35, maxConcurrent: 6 })
  if (scale === null) return
  const { ctx } = e
  const t = ctx.currentTime
  const dur = 0.25 + size * 1.2                 // ~0.4 s small, ~0.6 s big
  const jitter = 0.94 + Math.random() * 0.12    // ±6% so stacks don't phase
  const out = voice(e, 'boom', dur, 0.55 * scale, pan)

  // Layer 1 — body: pitch-dropping sine thump (bigger size = lower start).
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime((150 - size * 180) * jitter, t)
  osc.frequency.exponentialRampToValueAtTime(38, t + dur * 0.8)
  const og = ctx.createGain()
  og.gain.setValueAtTime(1, t)
  og.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(og).connect(out)
  osc.start(t)
  osc.stop(t + dur)

  // Layer 2 — debris: noise through a closing low-pass.
  const n = ctx.createBufferSource()
  n.buffer = noise(ctx)
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(2600 * jitter, t)
  f.frequency.exponentialRampToValueAtTime(120, t + dur)
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.8, t)
  ng.gain.exponentialRampToValueAtTime(0.001, t + dur)
  n.connect(f).connect(ng).connect(out)
  n.start(t)
  n.stop(t + dur)

  e.duckMusic(0.3 + size)
}

// ——— P0: earth impact ————————————————————————————————————————————
export function earthHit(e: AudioEngine, pan = 0): void {
  const scale = e.allocVoice('earth-hit', { minGapMs: 90, maxConcurrent: 3 })
  if (scale === null) return
  const { ctx } = e
  const t = ctx.currentTime
  const out = voice(e, 'earth-hit', 1.2, 0.8 * scale, pan * 0.4)

  // Sub thud: 70 -> 24 Hz over 0.9 s. The "you lost HP" gut-punch.
  const sub = ctx.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(70, t)
  sub.frequency.exponentialRampToValueAtTime(24, t + 0.9)
  const sg = ctx.createGain()
  sg.gain.setValueAtTime(1, t)
  sg.gain.exponentialRampToValueAtTime(0.001, t + 1.1)
  sub.connect(sg).connect(out)
  sub.start(t)
  sub.stop(t + 1.1)

  // Rumble: low-passed noise, slow decay.
  const n = ctx.createBufferSource()
  n.buffer = noise(ctx)
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 160
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.6, t)
  ng.gain.exponentialRampToValueAtTime(0.001, t + 1.0)
  n.connect(f).connect(ng).connect(out)
  n.start(t)
  n.stop(t + 1.0)

  // Alarm pip: one short G4 square so the hit registers over any battle.
  const pip = ctx.createOscillator()
  pip.type = 'square'
  pip.frequency.value = 392
  const pg = ctx.createGain()
  pg.gain.setValueAtTime(0.12, t + 0.05)
  pg.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
  pip.connect(pg).connect(out)
  pip.start(t + 0.05)
  pip.stop(t + 0.25)

  e.duckMusic(1)
}

// ——— P0: rocket launch / placement confirm ———————————————————————
export function launch(e: AudioEngine): void {
  const scale = e.allocVoice('launch', { minGapMs: 80, maxConcurrent: 3 })
  if (scale === null) return
  const { ctx } = e
  const t = ctx.currentTime
  const out = voice(e, 'launch', 0.6, 0.5 * scale)

  // Whoosh: noise through a rising band-pass.
  const n = ctx.createBufferSource()
  n.buffer = noise(ctx)
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 1.2
  f.frequency.setValueAtTime(180, t)
  f.frequency.exponentialRampToValueAtTime(1400, t + 0.45)
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.0001, t)
  ng.gain.exponentialRampToValueAtTime(0.7, t + 0.12)
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
  n.connect(f).connect(ng).connect(out)
  n.start(t)
  n.stop(t + 0.6)

  // Chirp: little triangle rising a fifth — the "confirm" part.
  const c = ctx.createOscillator()
  c.type = 'triangle'
  c.frequency.setValueAtTime(330, t)
  c.frequency.exponentialRampToValueAtTime(660, t + 0.25)
  const cg = ctx.createGain()
  cg.gain.setValueAtTime(0.15, t)
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
  c.connect(cg).connect(out)
  c.start(t)
  c.stop(t + 0.3)
}

// ——— P0: wave-start klaxon ———————————————————————————————————————
export function waveAlert(e: AudioEngine): void {
  if (e.allocVoice('wave-alert', { minGapMs: 1000, maxConcurrent: 1 }) === null) return
  const { ctx } = e
  const t = ctx.currentTime
  const out = voice(e, 'wave-alert', 1.6, 0.35)
  const lp = ctx.createBiquadFilter() // take the square-wave edge off
  lp.type = 'lowpass'
  lp.frequency.value = 2200
  lp.connect(out)

  const tones = [440, 311] // A4 / D#5-down-the-octave: tritone = alarm
  for (let i = 0; i < 6; i++) {
    const o = ctx.createOscillator()
    o.type = 'square'
    o.frequency.value = tones[i % 2]
    const g = ctx.createGain()
    const t0 = t + i * 0.22
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(1, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16)
    o.connect(g).connect(lp)
    o.start(t0)
    o.stop(t0 + 0.2)
  }
  e.duckMusic(0.8)
}

// ——— P0: wave-cleared fanfare (A minor pentatonic, always consonant) ——
export function waveCleared(e: AudioEngine): void {
  if (e.allocVoice('fanfare', { minGapMs: 1000, maxConcurrent: 1 }) === null) return
  const { ctx } = e
  const t = ctx.currentTime
  const out = voice(e, 'fanfare', 1.2, 0.3)
  const notes = [440, 523.25, 659.25, 880] // A4 C5 E5 A5
  notes.forEach((freq, i) => {
    const t0 = t + i * 0.09
    const hold = i === notes.length - 1 ? 0.5 : 0.12
    for (const [type, mul, amp] of [['square', 1, 1], ['triangle', 0.5, 0.7]] as const) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = freq * mul
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(amp, t0 + 0.015)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + hold)
      o.connect(g).connect(out)
      o.start(t0)
      o.stop(t0 + hold + 0.05)
    }
  })
  e.duckMusic(1)
}

// ——— P0: game-over stinger ———————————————————————————————————————
export function gameOverStinger(e: AudioEngine): void {
  if (e.allocVoice('gameover', { minGapMs: 2000, maxConcurrent: 1 }) === null) return
  const { ctx } = e
  const t = ctx.currentTime
  const out = voice(e, 'gameover', 3.2, 0.4)
  const steps: Array<[number, number]> = [
    [220, 0.0],   // A3
    [164.81, 0.6], // E3
    [130.81, 1.2], // C3
    [110, 1.8],   // A2 — held
  ]
  for (const [freq, at] of steps) {
    for (const det of [-7, 7]) { // detuned saw pair: cold and hollow
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = freq
      o.detune.value = det
      const g = ctx.createGain()
      const t0 = t + at
      const hold = at >= 1.8 ? 1.3 : 0.7
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.04)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + hold)
      o.connect(g).connect(out)
      o.start(t0)
      o.stop(t0 + hold + 0.1)
    }
  }
  // Final sub hit under the last note.
  const sub = ctx.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(55, t + 1.8)
  sub.frequency.exponentialRampToValueAtTime(28, t + 3.0)
  const sg = ctx.createGain()
  sg.gain.setValueAtTime(0.8, t + 1.8)
  sg.gain.exponentialRampToValueAtTime(0.001, t + 3.1)
  sub.connect(sg).connect(out)
  sub.start(t + 1.8)
  sub.stop(t + 3.1)
}

// ——— P0: laser beam loop (continuous voice, one per beaming satellite) ——
// heat in [0, 1]: pitch climbs up to +7 semitones and the filter opens as the
// duty cycle burns down — the audible overheat tell.
export class LaserVoice {
  private readonly oscA: OscillatorNode
  private readonly oscB: OscillatorNode
  private readonly filter: BiquadFilterNode
  private readonly gain: GainNode

  constructor(private readonly e: AudioEngine, pan = 0) {
    const { ctx } = e
    this.oscA = ctx.createOscillator()
    this.oscA.type = 'sawtooth'
    this.oscA.frequency.value = 92
    this.oscB = ctx.createOscillator()
    this.oscB.type = 'sawtooth'
    this.oscB.frequency.value = 92
    this.oscB.detune.value = 9 // slow beat between the pair = electric shimmer
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = 500
    this.filter.Q.value = 2
    this.gain = ctx.createGain()
    this.gain.gain.value = 0
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    this.oscA.connect(this.filter)
    this.oscB.connect(this.filter)
    this.filter.connect(this.gain).connect(p).connect(e.sfxBus)
    this.oscA.start()
    this.oscB.start()
    this.gain.gain.setTargetAtTime(0.1, ctx.currentTime, 0.035)
  }

  setHeat(heat: number): void {
    const t = this.e.ctx.currentTime
    const cents = heat * 700 // up to +7 semitones at full heat
    this.oscA.detune.setTargetAtTime(cents, t, 0.1)
    this.oscB.detune.setTargetAtTime(9 + cents, t, 0.1)
    this.filter.frequency.setTargetAtTime(500 + heat * 2600, t, 0.1)
  }

  stop(): void {
    const t = this.e.ctx.currentTime
    this.gain.gain.cancelScheduledValues(t)
    this.gain.gain.setTargetAtTime(0, t, 0.04)
    this.oscA.stop(t + 0.3)
    this.oscB.stop(t + 0.3)
    window.setTimeout(() => this.gain.disconnect(), 400)
  }
}
```

### 4.6 The AudioDirector — events + state diffs (sketch)

```ts
// src/audio/director.ts — the audio layer's renderer.sync() equivalent.
import { WEAPONS } from '../data/config'
import type { Phase, SimState } from '../sim/types'
import { AudioEngine } from './engine'
import { MusicDirector } from './music'
import * as sfx from './sfx'

// Cheap stereo placement from sim x (spawn dist ~5.2). The camera can rotate,
// so this is an approximation; P2 can swap in true screen-space panning via a
// projector callback (renderer.planeToScreen) if it ever bothers anyone.
const pan = (x: number) => Math.max(-1, Math.min(1, x / 4)) * 0.5

const BEAM_LINGER_MS = 120 // beams are rebuilt every sim step; absorb 1-step gaps
const BEAM_VOICE_CAP = 6

export class AudioDirector {
  private readonly engine = new AudioEngine()
  private readonly music = new MusicDirector(this.engine)
  private knownProjectiles = new Set<number>()
  private readonly beamVoices = new Map<number, { voice: sfx.LaserVoice; linger: number }>()
  private readonly overheated = new Set<number>()
  private prevPhase: Phase = 'build'

  // Once per frame, after renderer.sync(state) and BEFORE main clears state.events.
  sync(state: SimState, dtSeconds: number): void {
    const dtMs = dtSeconds * 1000

    // —— 1. One-shot sim events (same contract as GameRenderer.sync) ——
    for (const ev of state.events) {
      switch (ev.type) {
        case 'explosion':
          if (ev.size >= 0.1) sfx.boom(this.engine, ev.size, pan(ev.x))
          // else: size 0.07 beam spark -> sfx.spark(...) lands in the P1 pass
          break
        case 'earth-hit':
          sfx.earthHit(this.engine, pan(ev.x))
          break
        case 'launch':
          sfx.launch(this.engine)
          break
        case 'wave-cleared':
          sfx.waveCleared(this.engine)
          break
        case 'game-over':
          sfx.gameOverStinger(this.engine)
          this.music.gameOver()
          break
      }
    }

    // —— 2. Phase edges (covers Start Wave button and anything future) ——
    if (state.phase !== this.prevPhase) {
      if (state.phase === 'wave') sfx.waveAlert(this.engine)
      this.music.setPhase(state.phase, state.waveNumber)
      this.prevPhase = state.phase
    }

    // —— 3. Derived: weapon fire = projectile id not seen before (P1) ——
    const live = new Set<number>()
    for (const p of state.projectiles) {
      live.add(p.id)
      if (!this.knownProjectiles.has(p.id)) {
        // P1 pass: p.kind === 'missile' ? sfx.missileFire(...) : sfx.flakFire(...)
      }
    }
    this.knownProjectiles = live

    // —— 4. Derived: laser loops keyed by beam satIds, with linger ——
    const beaming = new Set<number>()
    for (const b of state.beams) beaming.add(b.satId)
    for (const sat of state.satellites) {
      if (!beaming.has(sat.id)) continue
      const cfg = WEAPONS[sat.weapon]
      if (cfg.kind !== 'beam') continue
      let entry = this.beamVoices.get(sat.id)
      if (!entry && this.beamVoices.size < BEAM_VOICE_CAP) {
        entry = { voice: new sfx.LaserVoice(this.engine), linger: BEAM_LINGER_MS }
        this.beamVoices.set(sat.id, entry)
      }
      if (entry) {
        entry.linger = BEAM_LINGER_MS
        entry.voice.setHeat(sat.heat / cfg.heatCapacity)
      }
    }
    for (const [id, entry] of this.beamVoices) {
      if (beaming.has(id)) continue
      entry.linger -= dtMs
      if (entry.linger <= 0) {
        entry.voice.stop()
        this.beamVoices.delete(id)
      }
    }

    // —— 5. Derived: overheat edges (P1: vent hiss on the rising edge) ——
    for (const sat of state.satellites) {
      if (sat.overheated && !this.overheated.has(sat.id)) {
        this.overheated.add(sat.id) // P1: sfx.overheatVent(this.engine)
      } else if (!sat.overheated && this.overheated.has(sat.id)) {
        this.overheated.delete(sat.id) // P2: ready blip
      }
    }

    // —— 6. Music intensity follows the sim every frame ——
    this.music.update(state)
  }

  // Hooked to Hud.onRestart: createState() resets ids from 1.
  reset(): void {
    this.knownProjectiles.clear()
    for (const [, entry] of this.beamVoices) entry.voice.stop()
    this.beamVoices.clear()
    this.overheated.clear()
    this.prevPhase = 'build'
    this.music.reset()
  }
}
```

### 4.7 Music scheduler (architecture sketch)

```ts
// src/audio/music.ts — stem player on a fixed musical grid.
const BPM = 92
const BAR = (60 / BPM) * 4        // seconds per 4/4 bar
const LOOP_BARS = 16

type StemName = 'pad' | 'arp' | 'bass' | 'drums' | 'lead'

class MusicDirector {
  // All stems of the active set start at the same ctx time and loop=true;
  // loopStart anchors the bar grid for quantized gain moves.
  private loopStart = 0
  private stems = new Map<StemName, { gain: GainNode; src: AudioBufferSourceNode }>()

  setPhase(phase: Phase, wave: number): void { /* retarget stem gains */ }
  update(state: SimState): void { /* intensity formula from §3 -> stem targets */ }
  gameOver(): void { /* musicBus to 0 over 0.25 s, then defeat pad */ }
  reset(): void { /* back to Set A build arrangement */ }

  // Escalations land on the next 2-bar boundary; de-escalations may go now.
  private nextBoundary(bars = 2): number {
    const t = this.engine.ctx.currentTime
    const period = BAR * bars
    const n = Math.ceil((t - this.loopStart) / period)
    return this.loopStart + n * period
  }

  private setStem(name: StemName, level: number, atTime: number, fadeBars = 1): void {
    const g = this.stems.get(name)?.gain.gain
    if (!g) return
    g.setValueAtTime(g.value, atTime)
    g.linearRampToValueAtTime(level, atTime + BAR * fadeBars)
  }
}
```

The current M5 implementation uses this contract procedurally instead of
loading files: `MusicDirector` creates continuous pad/bass oscillators and
schedules chip-style arp, drum, and lead one-shots on the 92 BPM grid. Build
phase keeps pad + sparse arp; wave phase fades in bass/drums/lead according to
derived threat, proximity, Earth damage, wave floor, and boss-wave pressure.
This remains the zero-asset fallback after real stem files land.

### 4.8 Mute / volume UI (fits the existing DOM HUD)

- **Topbar:** one mute toggle button appended to the existing `.topbar` next
  to `#hud-wave` — `<button id="hud-mute" title="Mute (M)">🔊</button>`,
  flipping to a muted icon. Keyboard `m` joins the existing `keydown` handler
  beside Esc and P. Mute ramps `master` to 0 over 50 ms (no hard click).
- **Sidebar:** a small "Audio" section (peer of Weapons/Orbit rings/Research)
  with two range inputs — Music and SFX — wired to `musicBus.gain` /
  `sfxBus.gain`. This keeps the topbar minimal and puts fiddly controls where
  the other fiddly controls live.
- **Persistence:** `localStorage` key `od.audio.v1` storing
  `{ muted, master, music, sfx }`, restored on boot — consistent with the
  DESIGN.md §13 versioned-localStorage plan before full save/load exists.
- Audio defaults and the storage key live in `src/data/audio.ts`.

### 4.9 Headless verification note

This machine can't hear. To verify with the CLAUDE.md Playwright recipe,
expose a dev-only counter on the existing `window.__od` hook (e.g.
`__od.audioLog`: last N `{ name, t }` triggers pushed by `allocVoice`), and
assert "wave with lasers firing produced `boom`, `laser-voice`, `wave-cleared`
in order" — plus `ctx.state === 'running'` after a synthetic click. That tests
every trigger and budget without ears.

---

## 5. M5 asset plan

### SFX production

| Tool | Use | Notes |
|---|---|---|
| **jsfxr** (sfxr.me) | First pass on every one-shot | Browser-based, exports WAV; the "pickup/explosion/laser" presets map 1:1 onto this inventory |
| **ChipTone** (SFB Games) | Richer one-shots (earth impact, fanfares) | Free, browser-based; multi-layer with pitch/duty envelopes |
| **Bfxr** | Mutation passes for variant sets | Generate 3–4 variants per sound (explosion-a/b/c) to rotate and avoid retrigger fatigue |
| **Audacity / Reaper** | Layering and finishing | Stack a jsfxr crack over a synthesized sub; normalize to consistent peaks (~-6 dBFS) |

Migration path: each function in `sfx.ts` keeps its signature and swaps its
body from oscillator graphs to `AudioBufferSourceNode` playback (with the same
±6% `playbackRate` jitter). Replace in impact order: explosion → earth-hit →
laser loop (a real loop with a baked heat-layer crossfade) → the rest. The
procedural patches stay in the codebase as the zero-asset fallback.

### Music production

- **Recommended: DAW route.** Reaper (cheap, cross-platform) with free synths
  — Vital, Surge XT, Dexed — fits the hybrid space-synth direction. Deliver
  each song set as 5 loop-aligned stems (§3), rendered to exactly
  `LOOP_BARS × BAR` seconds so `loop = true` is sample-accurate.
- **Tracker route** (if the music drifts more chip): Furnace or OpenMPT for
  authoring; FamiStudio if a strict NES palette is ever wanted. Still render
  to per-channel-group stems — the game consumes stems, not modules.
- **Generative AI (Suno/Udio etc.): reference/temp only, do not ship.**
  Copyright status of the output is unsettled, commercial terms vary by plan
  and change, and training-data provenance is an open legal question. Fine
  for scratch tracks while tuning the intensity system.
- **Commissioning** one composer for all 3–4 sets (itch.io community, chiptune
  scene) keeps the sets musically related — which the rotation system depends
  on (shared key/tempo). Get a written license covering web distribution.

### Formats and loading

- **SFX:** WAV 16-bit/44.1 kHz mono (they're tiny — the whole inventory fits
  in well under 1 MB) or OGG if anything runs long. Decode with
  `fetch` + `decodeAudioData` into cached `AudioBuffer`s.
- **Music stems: OGG Vorbis q5 (~112 kbps) primary, AAC (.m4a) fallback** —
  Safari's Vorbis support is historically unreliable; probe once with
  `document.createElement('audio').canPlayType(...)` and pick the set. AAC
  adds encoder priming samples that break seamless loops, so the loader must
  trim known offsets (or store loop-point metadata per file) — and loop
  playback must be `AudioBufferSourceNode.loop`, never an `<audio>` element
  (no sample-accurate looping, no per-stem gain on the same clock).
- **Budget:** 3 sets × 5 stems × ~42 s ≈ 8–10 MB at q5. Load lazily: Set A
  during the first build phase (after the autoplay unlock gesture), remaining
  sets in the background. Procedural pad covers the gap before first decode.
- **Vite:** import asset URLs (`import url from './assets/boom.ogg?url'`) so
  files are hashed into the bundle; avoids stale-cache audio after balance
  patches.

### Licensing checklist

- A web game's assets are **publicly downloadable in the bundle** — every
  license must permit redistribution in unencrypted form. Most game-asset
  licenses do; many music "streaming licenses" do not. Check this first.
- Tool output (jsfxr/Bfxr/ChipTone) is original work — yours. (Verify
  ChipTone's terms page once at adoption time.)
- Freesound layers: filter to **CC0** by default. Anything CC-BY requires
  visible attribution — if used, add a credits block to the game-over/score
  screen and maintain `docs/CREDITS.md` from the first imported asset, not
  retroactively.
- Commissioned music: written agreement covering web distribution, trailer
  use, and whether the composer retains soundtrack-release rights (usually
  fine to allow).
- No AI-generated audio in shipped builds until the legal picture settles
  (see above).

---

## Appendix: recommended integration order

Each step is independently shippable and verifiable with the §4.9 harness:

1. **Engine + mixer + autoplay unlock** (`engine.ts`, `src/data/audio.ts`) ✅
2. **AudioDirector in the frame loop** + the three P0 event one-shots:
   explosion, earth-hit, launch ✅
3. **Phase-edge sounds:** wave-start klaxon, wave-cleared fanfare, game-over
   stinger + `audio.reset()` on restart ✅
4. **Laser beam voices** with linger + heat tell — the last P0 item, and the
   first derived-state machinery ✅
5. **Procedural MusicDirector:** pad/arp/bass/drum/lead synthesis, three set
   rotation, build/wave crossfades, and threat-derived intensity ✅
6. **UI hooks + mute/volume HUD + persistence** (`hud.ts`/`sidebar.ts`
   touchpoints, `m` key).
7. **P1 pass:** missile/flak fire, sparks, overheat vent, error buzz, ring
   unlock, arm/cancel; tune duck depths and voice budgets while watching a
   late wave.
8. **Real music stems:** swap procedural stem generation for loaded stem
   buffers while keeping the current phase/intensity API.
