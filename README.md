[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/rrmmllnn/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/rrmmllnn/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

# Nightshade: The Gilded Gallery

A complete top-down stealth game built for the [make.fun best stealth game bounty](https://make.fun/c/best-stealth-game-20261121-1759). You are Wren, a cat burglar slipping through a night gallery in three floors: steal every relic, then reach the exit unseen.

## How it plays

- **Guards with vision cones** — patrol routes you can learn, cones clipped by walls and cover by real raycasting. A guard that glimpses you turns suspicious (`?`); fill the detection meter and the alarm sounds (`!`) and every guard gives chase.
- **Cover you can read at a glance** — gold display cases and plant hedges block sight and movement; shadow floor hides you, lamplight betrays you.
- **A detection system that gives you a chance to recover** — break line of sight and the alarm cools; get caught and you lose a life and restart the floor with your relics kept.
- **Noise and distraction** — walking is quiet, running is loud, sneaking is slowest and quietest. Throw a pebble (Q or click) and guards go investigate the clink.
- **Feel** — footsteps that tell you where a guard is, a guard's surprised bark, the alarm sting, and a chime for every relic — all synthesised live with Web Audio, no audio files.
- **Three floors** — The Gilded Gallery, The Vault of Echoes, and The Crown Vault — with a score, a ghost bonus for never being spotted, and a best score saved locally.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Run (fast, loud, easy to spot) |
| C / Ctrl | Sneak (slow, quiet, hard to spot) |
| E / Space | Take a relic |
| Q / click | Throw a pebble toward the cursor |
| P / Esc | Pause |
| M | Mute |
| Enter | Confirm on menus |

## Run it

No build step, no network: serve `game/` with any static server and open `game/index.html` in desktop Chrome.

```sh
node serve.ts
# open http://localhost:8080
```

`main.ts` (Node 22) hands the entry in: it copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots in `screenshots/` are real frames of the game's own code, staged by `game/src/shots.js` (`?shot=start|play|alarm|win&seed=7`), which plays the real rules forward with an autopilot.
