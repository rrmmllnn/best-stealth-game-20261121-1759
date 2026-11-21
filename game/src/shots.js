// The screenshot scenes behind ?shot=start|play|alarm|win. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot:
// breadth-first paths to the nearest relic, waiting in the shadows when a guard's cone
// covers the next step, so the frame is what a short game really looks like and the same
// seed always gives the same frame. The alarm scene runs straight at a relic instead, so
// it is spotted, as a hurried player is.

import { STEP, TILE } from './config.js';
import { EVENT_ALARM, EVENT_LEVEL_CLEAR, findPath, tileCentre } from './world.js';
import { SCREEN_LEVEL_CLEAR, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { anyGuardSees } from './world.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const ALARM_LIMIT_SECONDS = 40;
const WIN_LIMIT_SECONDS = 180;

function tileOf(entity) {
  return { col: Math.floor(entity.x / TILE), row: Math.floor(entity.y / TILE) };
}

/** The autopilot's current goal: the nearest untaken relic, or the exit once all are taken. */
function currentGoal(state) {
  for (const relic of state.relics) {
    if (!relic.taken) return { col: relic.col, row: relic.row, relic };
  }
  return { col: state.exit.col, row: state.exit.row, relic: null };
}

/**
 * One step of the autopilot. `patient` waits in the shadows when a guard can see the
 * player or the next step; a reckless pilot runs straight at the goal instead.
 */
function nearestGuardDistance(state) {
  let best = Infinity;
  for (const guard of state.guards) {
    const d = Math.hypot(guard.x - state.player.x, guard.y - state.player.y);
    if (d < best) best = d;
  }
  return best;
}

function waitInput() {
  return { moveX: 0, moveY: 0, run: false, sneak: true, interact: false, throwAt: null };
}

/**
 * One step of the autopilot. `patient` waits in the shadows when a guard can see the
 * player, walks when the coast is clear and sneaks only near a guard; a reckless pilot
 * runs straight at the goal instead. While the alarm sounds the pilot flees to the start
 * and outruns the chase until the alarm cools.
 */
function autopilot(state, path, patient) {
  const player = state.player;
  const playerTile = tileOf(player);
  const goal = currentGoal(state);

  const nearRelic =
    goal.relic !== null &&
    Math.hypot(goal.relic.x - player.x, goal.relic.y - player.y) < 26;
  if (nearRelic) return { moveX: 0, moveY: 0, run: false, sneak: false, interact: true, throwAt: null };

  // Flee while the alarm sounds: run for the start, where the guards lose the trail.
  const fleeing = patient && state.alarm;
  const targetCol = fleeing ? Math.floor(state.start.x / TILE) : goal.col;
  const targetRow = fleeing ? Math.floor(state.start.y / TILE) : goal.row;
  if (fleeing && playerTile.col === targetCol && playerTile.row === targetRow) {
    return waitInput();
  }

  if (patient && !fleeing) {
    const seenNow = anyGuardSees(state, player.x, player.y);
    if (seenNow || state.detection > 0.15) return waitInput();
  }

  let steps = path.steps;
  if (
    steps === null ||
    path.goalCol !== targetCol ||
    path.goalRow !== targetRow ||
    path.index >= steps.length
  ) {
    steps = findPath(state.tiles, playerTile.col, playerTile.row, targetCol, targetRow);
    path.steps = steps;
    path.goalCol = targetCol;
    path.goalRow = targetRow;
    path.index = 0;
  }
  if (steps === null || steps.length === 0) return waitInput();
  const next = steps[path.index];
  const centre = tileCentre(next.col, next.row);
  const dx = centre.x - player.x;
  const dy = centre.y - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 7) {
    path.index += 1;
    return waitInput();
  }
  const guardNear = nearestGuardDistance(state);
  if (patient && !fleeing && guardNear < 300) {
    // Do not step into a tile a nearby guard is watching right now.
    const stepSeen = anyGuardSees(state, centre.x, centre.y);
    if (stepSeen) return waitInput();
  }
  return {
    moveX: dx / distance,
    moveY: dy / distance,
    run: !patient || fleeing,
    sneak: patient && !fleeing && guardNear < 220,
    interact: false,
    throwAt: null,
  };
}

/**
 * Set `world` to the named scene (start, play, alarm or win; any other name is start) and
 * return the screen to draw over it.
 */
export function stageShot(name, world) {
  const state = world.state;
  const idle = { moveX: 0, moveY: 0, run: false, sneak: false, interact: false, throwAt: null };
  world.reset();
  if (name !== 'play' && name !== 'alarm' && name !== 'win') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, idle);
    return { screen: SCREEN_TITLE };
  }
  const path = { steps: null, goalCol: -1, goalRow: -1, index: 0 };
  if (name === 'play') {
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilot(state, path, true));
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'alarm') {
    for (let index = 0; index < ALARM_LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, autopilot(state, path, false));
      if (events & EVENT_ALARM) break;
    }
    return { screen: SCREEN_PLAY };
  }
  for (let index = 0; index < WIN_LIMIT_SECONDS / STEP; index += 1) {
    const events = world.step(STEP, autopilot(state, path, true));
    if (events & EVENT_LEVEL_CLEAR) break;
  }
  return { screen: state.levelClear ? SCREEN_LEVEL_CLEAR : SCREEN_PLAY };
}
