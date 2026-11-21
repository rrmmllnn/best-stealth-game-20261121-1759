// Nightshade: The Gilded Gallery — boot and the one loop. Input is read every frame, the
// world advances in fixed 1/60 s steps (several in a slow frame, none in a fast one), and
// the renderer paints what is there. The game moves between six screens: title, play,
// paused, level clear, game over and victory.
//
// ?seed=N fixes the patrol pauses and sparkles. ?shot=start|play|alarm|win (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE } from './input.js';
import {
  EVENT_CAUGHT,
  EVENT_GAME_OVER,
  EVENT_LEVEL_CLEAR,
  EVENT_VICTORY,
  createWorld,
} from './world.js';
import {
  SCREEN_LEVEL_CLEAR,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_VICTORY,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const world = createWorld(createRandom(seed), audio);
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(scene.screen, world.state, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, audio);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing ${world.state.level.name}. Steal every relic, then reach the exit.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Caught. Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.setMuted(!audio.isMuted());
      announce(audio.isMuted() ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_VICTORY)) {
      startGame();
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_LEVEL_CLEAR) {
      if (world.state.victory) startGame();
      else if (world.nextLevel()) screen = SCREEN_PLAY;
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      const idle = { moveX: 0, moveY: 0, run: false, sneak: false, interact: false, throwAt: null };
      world.step(STEP, idle);
      return;
    }
    const events = world.step(STEP, input.read());
    if (events & EVENT_GAME_OVER) endGame();
    else if (events & EVENT_VICTORY) {
      screen = SCREEN_VICTORY;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce(`The heist is done! Final score ${world.state.score}.`);
    } else if (events & EVENT_LEVEL_CLEAR) {
      screen = SCREEN_LEVEL_CLEAR;
      announce('Floor cleared.');
    } else if (events & EVENT_CAUGHT) {
      announce(`Caught! ${world.state.lives} ${world.state.lives === 1 ? 'life' : 'lives'} left.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(screen, world.state, best);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Nightshade: The Gilded Gallery. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
