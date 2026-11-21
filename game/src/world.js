// Nightshade: The Gilded Gallery — the world. One fixed step advances the player, the
// guards, the detection meter and the heist itself. Nothing here touches the screen or the
// keyboard: input arrives as a plain object, so the same step drives real play and the
// screenshot autopilot, and a seeded run is exactly reproducible.

import {
  ALARM_COOLDOWN_SECONDS,
  CATCH_RADIUS,
  COLS,
  DETECT_BASE_RATE,
  DETECT_DECAY_RATE,
  DETECT_LAMP_MULT,
  DETECT_RUN_MULT,
  DETECT_SHADOW_MULT,
  DETECT_SNEAK_MULT,
  EXIT_HOLD_SECONDS,
  GHOST_BONUS,
  GUARD_CHASE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_RADIUS,
  GUARD_SEARCH_SPEED,
  GUARD_SUSPICIOUS_SPEED,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_VIEW_RANGE,
  LEVEL_TIME_BONUS_RATE,
  NOISE_PEBBLE_RADIUS,
  NOISE_RUN_RADIUS,
  NOISE_SNEAK_RADIUS,
  NOISE_WALK_RADIUS,
  PICKUP_RADIUS,
  PLAYER_RADIUS,
  PLAYER_RUN_SPEED,
  PLAYER_SNEAK_SPEED,
  PLAYER_WALK_SPEED,
  RELIC_SCORE,
  ROWS,
  SEARCH_SECONDS,
  START_LIVES,
  START_PEBBLES,
  STEP,
  TILE,
} from './config.js';
import { LEVELS, isSolidTile, parseLevel } from './levels.js';
import { floorAt, guardSeesPlayer, pointIsSolid } from './vision.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_ALARM = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_LEVEL_CLEAR = 8;
export const EVENT_GAME_OVER = 16;
export const EVENT_VICTORY = 32;
export const EVENT_PEBBLE = 64;

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_ALERT = 'alert';
export const GUARD_SEARCH = 'search';

/** Centre of a tile, in pixels. */
export function tileCentre(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angleTowards(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

/** Turn `angle` toward `target` by at most `rate * dt`, taking the short way round. */
function turnTowards(angle, target, rate, dt) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const step = clamp(diff, -rate * dt, rate * dt);
  return angle + step;
}

/** Move a circle (x, y, radius) by (dx, dy), sliding along solid tiles, axis by axis. */
function moveCircle(tiles, entity, dx, dy, radius) {
  const nextX = entity.x + dx;
  if (!circleHitsSolid(tiles, nextX, entity.y, radius)) entity.x = nextX;
  const nextY = entity.y + dy;
  if (!circleHitsSolid(tiles, entity.x, nextY, radius)) entity.y = nextY;
}

function circleHitsSolid(tiles, x, y, radius) {
  const left = Math.floor((x - radius) / TILE);
  const right = Math.floor((x + radius) / TILE);
  const top = Math.floor((y - radius) / TILE);
  const bottom = Math.floor((y + radius) / TILE);
  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) {
      if (row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) return true;
      if (!isSolidTile(tiles[row][col])) continue;
      const nearestX = clamp(x, col * TILE, col * TILE + TILE);
      const nearestY = clamp(y, row * TILE, row * TILE + TILE);
      const dx = x - nearestX;
      const dy = y - nearestY;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

/** Breadth-first path over walkable tiles, from one tile to another. Returns tile steps. */
export function findPath(tiles, fromCol, fromRow, toCol, toRow) {
  const key = (c, r) => `${c},${r}`;
  const previous = new Map();
  const queue = [[fromCol, fromRow]];
  previous.set(key(fromCol, fromRow), null);
  while (queue.length > 0) {
    const [col, row] = queue.shift();
    if (col === toCol && row === toRow) {
      const path = [];
      let cursor = key(col, row);
      while (cursor !== null) {
        const [c, r] = cursor.split(',').map(Number);
        path.unshift({ col: c, row: r });
        cursor = previous.get(cursor);
      }
      return path;
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= tiles[0].length || nr >= tiles.length) continue;
      if (isSolidTile(tiles[nr][nc])) continue;
      const k = key(nc, nr);
      if (previous.has(k)) continue;
      previous.set(k, key(col, row));
      queue.push([nc, nr]);
    }
  }
  return null;
}

/** Does any guard currently see the point (x, y)? Used by the screenshot autopilot. */
export function anyGuardSees(state, x, y) {
  for (const guard of state.guards) {
    if (
      guardSeesPlayer(state.tiles, guard.x, guard.y, guard.angle, GUARD_VIEW_HALF_ANGLE, GUARD_VIEW_RANGE, x, y)
    ) {
      return true;
    }
  }
  return false;
}

export function createWorld(random, audio) {
  const state = {
    levelIndex: 0,
    level: null,
    tiles: [],
    lamps: [],
    player: { x: 0, y: 0, angle: -Math.PI / 2, moving: false, sneak: false, run: false },
    guards: [],
    relics: [],
    exit: { x: 0, y: 0, active: false },
    pebbles: [],
    thrownPebble: null,
    detection: 0,
    alarm: false,
    alarmUnseen: 0,
    lives: START_LIVES,
    pebblesLeft: START_PEBBLES,
    score: 0,
    best: 0,
    time: 0,
    levelTime: 0,
    ghost: true,
    exitHold: 0,
    invulnerable: 0,
    message: '',
    messageTimer: 0,
    levelClear: false,
    gameOver: false,
    victory: false,
    stepTimer: 0,
  };

  function say(text, seconds = 2.5) {
    state.message = text;
    state.messageTimer = seconds;
  }

  function loadLevel(index) {
    const level = LEVELS[index];
    const parsed = parseLevel(level, COLS, ROWS);
    state.levelIndex = index;
    state.level = level;
    state.tiles = parsed.tiles;
    state.lamps = parsed.lamps;
    const start = tileCentre(parsed.start.col, parsed.start.row);
    state.start = start;
    state.player.x = start.x;
    state.player.y = start.y;
    state.player.angle = -Math.PI / 2;
    state.player.moving = false;
    state.relics = parsed.relics.map((relic) => {
      const centre = tileCentre(relic.col, relic.row);
      return { ...centre, col: relic.col, row: relic.row, name: relic.name, taken: false, sparkle: random.next() * Math.PI * 2 };
    });
    const exitCentre = tileCentre(parsed.exit.col, parsed.exit.row);
    state.exit = { ...exitCentre, col: parsed.exit.col, row: parsed.exit.row, active: false };
    state.guards = level.guards.map((def) => {
      const first = tileCentre(def.waypoints[0][0], def.waypoints[0][1]);
      const second = tileCentre(def.waypoints[1][0], def.waypoints[1][1]);
      return {
        x: first.x,
        y: first.y,
        angle: angleTowards(first.x, first.y, second.x, second.y),
        state: GUARD_PATROL,
        waypoints: def.waypoints,
        waypointIndex: 1,
        pause: def.pause,
        pauseTimer: 0,
        target: null,
        lastSeen: null,
        lastSeenTimer: 0,
        searchTimer: 0,
        scanAngle: 0,
        scanTimer: 0,
        stepTimer: random.next() * 0.5,
        suspiciousBlip: false,
      };
    });
    state.pebbles = [];
    state.thrownPebble = null;
    state.detection = 0;
    state.alarm = false;
    state.alarmUnseen = 0;
    state.pebblesLeft = START_PEBBLES;
    state.levelTime = 0;
    state.ghost = true;
    state.exitHold = 0;
    state.invulnerable = 0;
    state.levelClear = false;
    state.gameOver = false;
    say(`${level.name} — ${level.brief}`, 4);
  }

  function reset() {
    state.score = 0;
    state.time = 0;
    state.lives = START_LIVES;
    state.victory = false;
    loadLevel(0);
  }

  function nearestGuardDistance() {
    let best = Infinity;
    for (const guard of state.guards) {
      const d = Math.hypot(guard.x - state.player.x, guard.y - state.player.y);
      if (d < best) best = d;
    }
    return best;
  }

  /** A guard heard a noise at (x, y): turn suspicious and go look. */
  function hearNoise(guard, x, y) {
    if (guard.state === GUARD_ALERT) return;
    guard.state = GUARD_SUSPICIOUS;
    guard.target = { x, y };
    guard.scanTimer = 0;
    guard.suspiciousBlip = false;
  }

  function updateGuard(guard, dt, playerVisible, events) {
    const player = state.player;
    if (guard.state === GUARD_PATROL) {
      const waypoint = guard.waypoints[guard.waypointIndex];
      const target = tileCentre(waypoint[0], waypoint[1]);
      const dx = target.x - guard.x;
      const dy = target.y - guard.y;
      const distance = Math.hypot(dx, dy);
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        guard.angle = turnTowards(guard.angle, guard.scanAngle, 1.2, dt);
        if (guard.pauseTimer <= 0) guard.scanAngle = guard.angle + random.range(-1.2, 1.2);
      } else if (distance < 6) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = guard.pause;
        guard.scanAngle = guard.angle;
      } else {
        const speed = GUARD_PATROL_SPEED;
        const step = Math.min(distance, speed * dt);
        moveCircle(state.tiles, guard, (dx / distance) * step, (dy / distance) * step, GUARD_RADIUS);
        guard.angle = turnTowards(guard.angle, Math.atan2(dy, dx), 6, dt);
      }
    } else if (guard.state === GUARD_SUSPICIOUS) {
      if (!guard.suspiciousBlip) {
        guard.suspiciousBlip = true;
        if (audio) audio.suspicious();
      }
      const target = guard.target ?? guard.lastSeen ?? { x: guard.x, y: guard.y };
      const dx = target.x - guard.x;
      const dy = target.y - guard.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 10) {
        const speed = GUARD_SUSPICIOUS_SPEED;
        const step = Math.min(distance, speed * dt);
        moveCircle(state.tiles, guard, (dx / distance) * step, (dy / distance) * step, GUARD_RADIUS);
        guard.angle = turnTowards(guard.angle, Math.atan2(dy, dx), 6, dt);
      } else {
        guard.scanTimer += dt;
        guard.angle += Math.sin(guard.scanTimer * 1.4) * 1.8 * dt;
        if (guard.scanTimer > 3.5) {
          guard.state = GUARD_PATROL;
          guard.target = null;
          guard.suspiciousBlip = false;
          guard.waypointIndex = nearestWaypoint(guard);
        }
      }
    } else if (guard.state === GUARD_ALERT) {
      const target = playerVisible ? { x: player.x, y: player.y } : guard.lastSeen;
      if (target !== null) {
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 8) {
          const step = Math.min(distance, GUARD_CHASE_SPEED * dt);
          moveCircle(state.tiles, guard, (dx / distance) * step, (dy / distance) * step, GUARD_RADIUS);
          guard.angle = turnTowards(guard.angle, Math.atan2(dy, dx), 8, dt);
        }
      }
      if (!playerVisible) {
        guard.lastSeenTimer += dt;
        if (guard.lastSeenTimer > 2.5) {
          guard.state = GUARD_SEARCH;
          guard.searchTimer = SEARCH_SECONDS;
          guard.target = guard.lastSeen;
          guard.lastSeenTimer = 0;
        }
      } else {
        guard.lastSeenTimer = 0;
        guard.lastSeen = { x: player.x, y: player.y };
      }
    } else if (guard.state === GUARD_SEARCH) {
      const target = guard.target ?? { x: guard.x, y: guard.y };
      const dx = target.x - guard.x;
      const dy = target.y - guard.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 12) {
        const step = Math.min(distance, GUARD_SEARCH_SPEED * dt);
        moveCircle(state.tiles, guard, (dx / distance) * step, (dy / distance) * step, GUARD_RADIUS);
        guard.angle = turnTowards(guard.angle, Math.atan2(dy, dx), 6, dt);
      } else {
        guard.searchTimer -= dt;
        guard.angle += 1.6 * dt;
        if (guard.searchTimer <= 0) {
          guard.state = GUARD_PATROL;
          guard.target = null;
          guard.suspiciousBlip = false;
          guard.waypointIndex = nearestWaypoint(guard);
        }
      }
    }

    // Footsteps: the nearer a guard, the louder its boots.
    guard.stepTimer -= dt;
    if (guard.stepTimer <= 0) {
      guard.stepTimer = 0.55;
      if (audio) {
        const distance = Math.hypot(guard.x - player.x, guard.y - player.y);
        audio.guardStep(clamp(1 - distance / 320, 0, 1));
      }
    }
    return events;
  }

  function nearestWaypoint(guard) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    guard.waypoints.forEach((waypoint, index) => {
      const centre = tileCentre(waypoint[0], waypoint[1]);
      const d = Math.hypot(centre.x - guard.x, centre.y - guard.y);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function step(dt, input) {
    let events = EVENT_NONE;
    if (state.levelClear || state.gameOver || state.victory) return events;
    state.time += dt;
    state.levelTime += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.invulnerable > 0) state.invulnerable -= dt;

    const player = state.player;

    // --- Player movement -------------------------------------------------
    const moveLength = Math.hypot(input.moveX, input.moveY);
    const moving = moveLength > 0.01;
    player.moving = moving;
    player.run = moving && input.run && !input.sneak;
    player.sneak = moving && input.sneak;
    if (moving) {
      const speed = player.run ? PLAYER_RUN_SPEED : player.sneak ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
      const nx = input.moveX / moveLength;
      const ny = input.moveY / moveLength;
      moveCircle(state.tiles, player, nx * speed * dt, ny * speed * dt, PLAYER_RADIUS);
      player.angle = Math.atan2(ny, nx);
      state.stepTimer -= dt;
      if (state.stepTimer <= 0) {
        state.stepTimer = player.run ? 0.28 : player.sneak ? 0.55 : 0.38;
        if (audio) audio.footstep(player.run, player.sneak);
        const radius = player.run ? NOISE_RUN_RADIUS : player.sneak ? NOISE_SNEAK_RADIUS : NOISE_WALK_RADIUS;
        for (const guard of state.guards) {
          const d = Math.hypot(guard.x - player.x, guard.y - player.y);
          if (d < radius && guard.state !== GUARD_ALERT) hearNoise(guard, player.x, player.y);
        }
      }
    }

    // --- Pebble throw ----------------------------------------------------
    if (input.throwAt && state.pebblesLeft > 0 && state.thrownPebble === null) {
      state.pebblesLeft -= 1;
      state.thrownPebble = {
        fromX: player.x,
        fromY: player.y,
        toX: clamp(input.throwAt.x, TILE, COLS * TILE - TILE),
        toY: clamp(input.throwAt.y, TILE, ROWS * TILE - TILE),
        t: 0,
      };
      events |= EVENT_PEBBLE;
    }
    if (state.thrownPebble !== null) {
      const pebble = state.thrownPebble;
      pebble.t += dt / 0.35;
      if (pebble.t >= 1) {
        state.thrownPebble = null;
        state.pebbles.push({ x: pebble.toX, y: pebble.toY, ttl: 1.2 });
        if (audio) audio.pebbleClink();
        for (const guard of state.guards) {
          const d = Math.hypot(guard.x - pebble.toX, guard.y - pebble.toY);
          if (d < NOISE_PEBBLE_RADIUS) hearNoise(guard, pebble.toX, pebble.toY);
        }
      }
    }
    for (let i = state.pebbles.length - 1; i >= 0; i -= 1) {
      state.pebbles[i].ttl -= dt;
      if (state.pebbles[i].ttl <= 0) state.pebbles.splice(i, 1);
    }

    // --- Detection --------------------------------------------------------
    let seenBy = null;
    let fillRate = 0;
    for (const guard of state.guards) {
      if (
        guardSeesPlayer(state.tiles, guard.x, guard.y, guard.angle, GUARD_VIEW_HALF_ANGLE, GUARD_VIEW_RANGE, player.x, player.y)
      ) {
        seenBy = guard;
        const distance = Math.hypot(guard.x - player.x, guard.y - player.y);
        let rate = DETECT_BASE_RATE * (1 - (distance / GUARD_VIEW_RANGE) * 0.6);
        if (player.run) rate *= DETECT_RUN_MULT;
        if (player.sneak) rate *= DETECT_SNEAK_MULT;
        const floor = floorAt(state.tiles, state.lamps, player.x, player.y);
        if (floor === 'shadow') rate *= DETECT_SHADOW_MULT;
        if (floor === 'lamp') rate *= DETECT_LAMP_MULT;
        fillRate += rate;
      }
    }
    if (state.invulnerable <= 0) {
      if (seenBy !== null) {
        state.detection = clamp(state.detection + fillRate * dt, 0, 1);
        if (state.detection > 0.45 && seenBy.state === GUARD_PATROL) {
          seenBy.state = GUARD_SUSPICIOUS;
          seenBy.target = { x: player.x, y: player.y };
          seenBy.lastSeen = { x: player.x, y: player.y };
        }
        if (state.detection >= 1 && !state.alarm) {
          state.alarm = true;
          state.alarmUnseen = 0;
          state.ghost = false;
          events |= EVENT_ALARM;
          if (audio) audio.alarm();
          say('SPOTTED! Break line of sight!', 3);
          for (const guard of state.guards) {
            guard.state = GUARD_ALERT;
            guard.lastSeen = { x: player.x, y: player.y };
            guard.lastSeenTimer = 0;
          }
        }
      } else {
        state.detection = clamp(state.detection - DETECT_DECAY_RATE * dt, 0, 1);
      }
    }
    if (state.alarm) {
      if (seenBy === null) {
        state.alarmUnseen += dt;
        if (state.alarmUnseen >= ALARM_COOLDOWN_SECONDS) {
          state.alarm = false;
          state.detection = 0.5;
          say('You slipped away… for now.', 2.5);
        }
      } else {
        state.alarmUnseen = 0;
      }
    }

    // --- Guards ------------------------------------------------------------
    for (const guard of state.guards) {
      updateGuard(guard, dt, seenBy !== null, events);
    }

    // --- Caught? ------------------------------------------------------------
    if (state.invulnerable <= 0) {
      for (const guard of state.guards) {
        const d = Math.hypot(guard.x - player.x, guard.y - player.y);
        if (d < CATCH_RADIUS) {
          state.lives -= 1;
          state.ghost = false;
          events |= EVENT_CAUGHT;
          if (audio) audio.caught();
          if (state.lives <= 0) {
            state.gameOver = true;
            events |= EVENT_GAME_OVER;
          } else {
            say(`Caught! ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left.`, 3);
            player.x = state.start.x;
            player.y = state.start.y;
            state.detection = 0;
            state.alarm = false;
            state.alarmUnseen = 0;
            state.invulnerable = 2;
            state.exitHold = 0;
            loadLevelGuards();
          }
          break;
        }
      }
    }

    // --- Relic pickup --------------------------------------------------------
    if (input.interact) {
      for (const relic of state.relics) {
        if (relic.taken) continue;
        const d = Math.hypot(relic.x - player.x, relic.y - player.y);
        if (d < PICKUP_RADIUS) {
          relic.taken = true;
          state.score += RELIC_SCORE;
          events |= EVENT_PICKUP;
          if (audio) audio.pickup();
          const taken = state.relics.filter((r) => r.taken).length;
          say(`Took the ${relic.name} (${taken}/${state.relics.length})`, 2.5);
          if (taken === state.relics.length) {
            state.exit.active = true;
            if (audio) audio.exitOpen();
            say('All relics taken — the exit is open!', 3);
          }
          break;
        }
      }
    }

    // --- Exit -----------------------------------------------------------------
    const exitDistance = Math.hypot(state.exit.x - player.x, state.exit.y - player.y);
    if (state.exit.active && exitDistance < TILE * 0.75) {
      state.exitHold += dt;
      if (state.exitHold >= EXIT_HOLD_SECONDS) {
        const timeBonus = Math.max(0, Math.round((300 - state.levelTime) * LEVEL_TIME_BONUS_RATE));
        state.score += timeBonus;
        if (state.ghost) state.score += GHOST_BONUS;
        state.levelClear = true;
        events |= EVENT_LEVEL_CLEAR;
        if (audio) audio.levelClear();
        if (state.levelIndex + 1 >= LEVELS.length) {
          state.victory = true;
          events |= EVENT_VICTORY;
          if (audio) audio.victory();
        }
      }
    } else {
      state.exitHold = 0;
    }

    // Relic sparkle phase, for the renderer.
    for (const relic of state.relics) relic.sparkle += dt * 2;
    return events;
  }

  function loadLevelGuards() {
    const level = state.level;
    state.guards = level.guards.map((def) => {
      const first = tileCentre(def.waypoints[0][0], def.waypoints[0][1]);
      const second = tileCentre(def.waypoints[1][0], def.waypoints[1][1]);
      return {
        x: first.x,
        y: first.y,
        angle: angleTowards(first.x, first.y, second.x, second.y),
        state: GUARD_PATROL,
        waypoints: def.waypoints,
        waypointIndex: 1,
        pause: def.pause,
        pauseTimer: 0,
        target: null,
        lastSeen: null,
        lastSeenTimer: 0,
        searchTimer: 0,
        scanAngle: 0,
        scanTimer: 0,
        stepTimer: random.next() * 0.5,
        suspiciousBlip: false,
      };
    });
  }

  function nextLevel() {
    if (state.levelIndex + 1 < LEVELS.length) {
      loadLevel(state.levelIndex + 1);
      return true;
    }
    return false;
  }

  reset();

  return {
    state,
    reset,
    step,
    loadLevel,
    nextLevel,
    tileCentre,
    findPath,
    anyGuardSees,
  };
}
