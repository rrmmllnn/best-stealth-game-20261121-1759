// Nightshade: The Gilded Gallery — tuning constants. One place holds every number the
// world, the guards and the renderer agree on, so a balance change is a one-line edit here.

export const STEP = 1 / 60;
export const TILE = 32;
export const COLS = 32;
export const ROWS = 20;
export const FIELD_WIDTH = COLS * TILE;
export const FIELD_HEIGHT = ROWS * TILE;
export const HUD_HEIGHT = 64;
export const CANVAS_WIDTH = FIELD_WIDTH;
export const CANVAS_HEIGHT = FIELD_HEIGHT + HUD_HEIGHT;

// Movement, in pixels per second.
export const PLAYER_WALK_SPEED = 150;
export const PLAYER_RUN_SPEED = 238;
export const PLAYER_SNEAK_SPEED = 86;
export const PLAYER_RADIUS = 12;
export const GUARD_PATROL_SPEED = 56;
export const GUARD_SUSPICIOUS_SPEED = 78;
export const GUARD_CHASE_SPEED = 152;
export const GUARD_SEARCH_SPEED = 62;
export const GUARD_RADIUS = 13;

// Vision: how far a guard sees and how wide the cone is (half-angle, radians).
export const GUARD_VIEW_RANGE = 195;
export const GUARD_VIEW_HALF_ANGLE = 0.56;
// Detection fills 0..1. Rates are per second at point-blank range and scale with distance.
export const DETECT_BASE_RATE = 1.15;
export const DETECT_RUN_MULT = 1.6;
export const DETECT_SNEAK_MULT = 0.55;
export const DETECT_SHADOW_MULT = 0.5;
export const DETECT_LAMP_MULT = 1.5;
export const DETECT_DECAY_RATE = 0.38;
// Once the meter is full the alarm sounds; it cools only after this long unseen.
export const ALARM_COOLDOWN_SECONDS = 4;
export const SEARCH_SECONDS = 6;

// Noise: a guard inside the radius of a sound turns to investigate it.
export const NOISE_WALK_RADIUS = 46;
export const NOISE_RUN_RADIUS = 122;
export const NOISE_SNEAK_RADIUS = 14;
export const NOISE_PEBBLE_RADIUS = 175;

// A guard that gets this close to the player while alerted catches them.
export const CATCH_RADIUS = 20;
export const PICKUP_RADIUS = 28;
export const EXIT_HOLD_SECONDS = 0.8;

export const START_LIVES = 3;
export const START_PEBBLES = 5;
export const RELIC_SCORE = 500;
export const GHOST_BONUS = 1000;
export const LEVEL_TIME_BONUS_RATE = 10;

export const BEST_KEY = 'nightshade-best-score';

// Palette: a night gallery — cold marble, warm lamplight, deep shadow.
export const COLORS = {
  floorLight: '#3a3f52',
  floorDark: '#333748',
  floorShadow: '#262a3a',
  floorShadowDark: '#222636',
  wall: '#191c28',
  wallTop: '#2c3040',
  caseGold: '#c9a227',
  caseGlass: '#7fb3c8',
  plant: '#2f6b3c',
  plantDark: '#245430',
  lampGlow: '#ffd98a',
  relic: '#ffd94d',
  exit: '#58d68d',
  exitDim: '#2e7d4f',
  player: '#e8e4d8',
  playerCloak: '#5b4a8a',
  guard: '#3f5a8a',
  guardCap: '#22345c',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneSuspicious: 'rgba(255, 150, 60, 0.28)',
  coneAlert: 'rgba(255, 70, 60, 0.32)',
  darkness: 'rgba(6, 8, 18, 0.62)',
  hud: '#10121c',
  hudText: '#e8e4d8',
  hudDim: '#9aa0b5',
  alarm: '#ff5148',
};
