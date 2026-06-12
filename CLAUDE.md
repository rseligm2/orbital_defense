# Orbital Defense

Web tower defense: weapon satellites orbit a 3D pixel-art Earth and auto-fire
at enemies inbound from deep space. **DESIGN.md is the authoritative design
document** — check the relevant section before adding mechanics, and update it
when a design decision changes. Build progress lives in DESIGN.md §14
(currently: M3 research done; M4 depth — fighters, bombers, satellite HP,
carrier boss — is next).

## Commands

- `npm run dev` — Vite dev server at http://localhost:5173
- `npm run build` — `tsc --noEmit` typecheck + production bundle

## Architecture rules

- `src/sim/` is pure TypeScript — **no Three.js or DOM imports, ever**. It
  advances on a fixed 60 Hz timestep (`step(state, dt)`) and reports one-shot
  happenings (explosions, impacts, wave-cleared) via `state.events`, which
  `main.ts` drains each frame after the render and UI layers consume them.
- Gameplay is 2D in the equatorial plane. Sim coords `(x, y)` map to world
  `(x, 0, y)` in the render layer. Earth radius = 1 is the distance unit.
- `src/render/` (`GameRenderer`) is the only place Three.js appears. Entities
  are billboarded sprites keyed by sim entity id; placeholder pixel art is
  drawn in code in `sprites.ts` (design specs in `docs/SPRITES.md`; real
  ComfyUI sprite sheets are an M5 task). Sound design for the M5 audio task
  is in `docs/AUDIO.md` — audio must consume `state.events` like the
  renderer does, never from inside `src/sim/`.
- All menus/HUD are DOM overlay in `src/ui/` — never drawn inside the canvas.
- Every tunable gameplay number lives in `src/data/config.ts`. Balance changes
  are config edits, not code edits.

## Verifying changes

Typechecking is not verification — run the game and watch it. This machine has
no browser and no passwordless sudo; the working headless recipe:

1. Playwright lives in a throwaway dir `/tmp/pw-driver` (`npm i playwright`,
   `npx playwright install chromium`) — keep the game's package.json clean.
2. Chromium fails on missing `libnspr4.so`/`libnss3.so`. Fix without root:
   `apt-get download libnspr4 libnss3`, `dpkg-deb -x` each into
   `/tmp/pw-libs/extracted/`, then run node with
   `LD_LIBRARY_PATH=/tmp/pw-libs/extracted/usr/lib/x86_64-linux-gnu`.
3. WebGL renders fine in the headless shell; screenshots capture the canvas.
   Look at the screenshots — don't trust HUD text alone.
4. The HUD is DOM: `#hud-startwave`, `#hud-credits`, `#hud-wave`,
   `#hud-hptext`, plus the sidebar's weapon cards `#weapon-missile|laser|flak`
   and ring buttons `#ring-0`–`#ring-3`. Place satellites by clicking a weapon
   card, then `page.mouse.move(x, y)` + `down()`/`up()` at the same point —
   moving >6 px between down and up is treated as a camera drag, not a
   placement click.
5. Dev builds expose `window.__od` with `state` (live sim state),
   `addCredits(n)`, `buy(researchNodeId)`, and `planeToScreen(x, y)` (sim
   coords → client px) for aiming placement clicks and asserting on sim
   internals. The research screen opens via `#open-research` (build phase
   only); node buttons are `#rs-<node-id>` (ids in `src/data/research.ts`).
