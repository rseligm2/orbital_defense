# Orbital Defense

Web-based tower defense where the towers are weapon satellites in orbit around
Earth. See [DESIGN.md](DESIGN.md) for the full design document.

## Status

**M1 — playable core.** Ring 1 (LEO), missile pod satellites, asteroid waves,
credits, Earth HP, game over. Placeholder pixel art drawn in code.

## Run

```sh
npm install
npm run dev     # http://localhost:5173
```

`npm run build` typechecks and bundles to `dist/`.

## Controls

- **Drag** — rotate camera · **Scroll** — zoom
- **Missile Pod button**, then click the orbit ring — launch a satellite (Esc cancels)
- **Start Wave** — begin the next attack
- **P** — toggle the pixelation render pass
