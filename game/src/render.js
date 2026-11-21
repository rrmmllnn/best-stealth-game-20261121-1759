// Nightshade: The Gilded Gallery — everything on screen. Top-down canvas: a marble floor
// whose lit and shadow tiles read at a glance, gold display cases and hedges for cover,
// guards with bright vision cones, warm lamp pools, and a HUD that shows the detection
// meter, the relics, lives and pebbles. The same draw paints live play and the staged
// screenshot scenes, so a screenshot is always a real frame of the game.

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLORS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_VIEW_RANGE,
  HUD_HEIGHT,
  LEVEL_TIME_BONUS_RATE,
  TILE,
} from './config.js';
import { GUARD_ALERT, GUARD_PATROL, GUARD_SEARCH, GUARD_SUSPICIOUS } from './world.js';
import { conePolygon } from './vision.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL_CLEAR = 'level-clear';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export function createRenderer(canvas) {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  function drawFloor(state) {
    for (let row = 0; row < state.tiles.length; row += 1) {
      for (let col = 0; col < state.tiles[row].length; col += 1) {
        const tile = state.tiles[row][col];
        const x = col * TILE;
        const y = row * TILE;
        const checker = (col + row) % 2 === 0;
        if (tile === '#') {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(x, y, TILE, 4);
          ctx.fillRect(x, y, 4, TILE);
        } else if (tile === ',') {
          ctx.fillStyle = checker ? COLORS.floorShadow : COLORS.floorShadowDark;
          ctx.fillRect(x, y, TILE, TILE);
        } else {
          ctx.fillStyle = checker ? COLORS.floorLight : COLORS.floorDark;
          ctx.fillRect(x, y, TILE, TILE);
        }
        if (tile === 'C') {
          ctx.fillStyle = COLORS.caseGold;
          ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          ctx.fillStyle = COLORS.caseGlass;
          ctx.fillRect(x + 7, y + 7, TILE - 14, TILE - 14);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(x + 7, y + 7, TILE - 14, 4);
        } else if (tile === 'p') {
          ctx.fillStyle = COLORS.plantDark;
          ctx.beginPath();
          ctx.arc(x + 11, y + 12, 9, 0, Math.PI * 2);
          ctx.arc(x + 21, y + 11, 9, 0, Math.PI * 2);
          ctx.arc(x + 16, y + 21, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = COLORS.plant;
          ctx.beginPath();
          ctx.arc(x + 11, y + 11, 7, 0, Math.PI * 2);
          ctx.arc(x + 21, y + 10, 7, 0, Math.PI * 2);
          ctx.arc(x + 16, y + 20, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // Warm pools under every lamp, so the player reads at a glance where it is dangerous.
    for (const lamp of state.lamps) {
      const cx = lamp.col * TILE + TILE / 2;
      const cy = lamp.row * TILE + TILE / 2;
      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 78);
      glow.addColorStop(0, 'rgba(255, 217, 138, 0.30)');
      glow.addColorStop(1, 'rgba(255, 217, 138, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 78, cy - 78, 156, 156);
      ctx.fillStyle = COLORS.lampGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6d2b';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
    }
  }

  function drawExit(state) {
    const exit = state.exit;
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 3);
    ctx.save();
    ctx.translate(exit.x, exit.y);
    ctx.fillStyle = exit.active ? COLORS.exit : COLORS.exitDim;
    ctx.globalAlpha = exit.active ? 0.55 + 0.45 * pulse : 0.5;
    roundedRect(ctx, -15, -15, 30, 30, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = exit.active ? '#d8ffe8' : '#9db8a5';
    ctx.lineWidth = 2;
    roundedRect(ctx, -15, -15, 30, 30, 6);
    ctx.stroke();
    ctx.fillStyle = '#0c2416';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', 0, 1);
    ctx.restore();
    if (exit.active) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * pulse;
      ctx.fillStyle = COLORS.exit;
      ctx.beginPath();
      ctx.moveTo(exit.x, exit.y - 26);
      ctx.lineTo(exit.x - 7, exit.y - 38);
      ctx.lineTo(exit.x + 7, exit.y - 38);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawRelics(state) {
    for (const relic of state.relics) {
      if (relic.taken) continue;
      const bob = Math.sin(relic.sparkle) * 2;
      ctx.fillStyle = '#6b6f80';
      roundedRect(ctx, relic.x - 11, relic.y + 4, 22, 8, 2);
      ctx.fill();
      ctx.fillStyle = '#9aa0b5';
      ctx.fillRect(relic.x - 11, relic.y + 4, 22, 2);
      ctx.save();
      ctx.translate(relic.x, relic.y - 4 + bob);
      ctx.rotate(Math.sin(relic.sparkle * 0.7) * 0.25);
      ctx.fillStyle = COLORS.relic;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(7, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(3, 0);
      ctx.lineTo(0, 2);
      ctx.lineTo(-3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCone(state, guard) {
    const polygon = conePolygon(state.tiles, guard.x, guard.y, guard.angle, GUARD_VIEW_HALF_ANGLE, GUARD_VIEW_RANGE);
    let fill = COLORS.coneCalm;
    if (guard.state === GUARD_SUSPICIOUS) fill = COLORS.coneSuspicious;
    if (guard.state === GUARD_ALERT) fill = COLORS.coneAlert;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i += 1) ctx.lineTo(polygon[i].x, polygon[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = fill.replace(/[\d.]+\)$/, '0.55)');
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawGuard(state, guard) {
    drawCone(state, guard);
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guard;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guardCap;
    ctx.beginPath();
    ctx.arc(0, -2, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-10, -3, 20, 3);
    // Facing wedge: the direction the guard looks.
    ctx.rotate(guard.angle);
    ctx.fillStyle = '#dfe6ff';
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(5, -5);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // State mark above the head: ? when suspicious, ! when alert, … when searching.
    let mark = '';
    let markColor = '#ffffff';
    if (guard.state === GUARD_SUSPICIOUS) {
      mark = '?';
      markColor = '#ffb03a';
    } else if (guard.state === GUARD_ALERT) {
      mark = '!';
      markColor = '#ff5148';
    } else if (guard.state === GUARD_SEARCH) {
      mark = '…';
      markColor = '#ffd65a';
    }
    if (mark !== '') {
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = markColor;
      ctx.fillText(mark, guard.x, guard.y - 24);
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    const blink = state.invulnerable > 0 && Math.floor(state.time * 8) % 2 === 0;
    ctx.save();
    ctx.translate(player.x, player.y);
    if (blink) ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hooded cloak: a circle with a pointed hood toward the facing direction.
    ctx.rotate(player.angle);
    ctx.fillStyle = COLORS.playerCloak;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(2, -8);
    ctx.lineTo(2, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(4, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20222e';
    ctx.beginPath();
    ctx.arc(6, -2.5, 1.4, 0, Math.PI * 2);
    ctx.arc(6, 2.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Sneak ring: a faint circle while sneaking, so the player sees the quiet mode.
    if (player.sneak) {
      ctx.strokeStyle = 'rgba(232, 228, 216, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 17, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPebbles(state) {
    for (const pebble of state.pebbles) {
      ctx.strokeStyle = 'rgba(255, 217, 138, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pebble.x, pebble.y, 12 + (1.2 - pebble.ttl) * 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#c8ccd8';
      ctx.beginPath();
      ctx.arc(pebble.x, pebble.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.thrownPebble !== null) {
      const pebble = state.thrownPebble;
      const x = pebble.fromX + (pebble.toX - pebble.fromX) * pebble.t;
      const y = pebble.fromY + (pebble.toY - pebble.fromY) * pebble.t - Math.sin(pebble.t * Math.PI) * 26;
      ctx.fillStyle = '#e8eaf2';
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHud(state, best) {
    ctx.fillStyle = COLORS.hud;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
    ctx.fillStyle = '#232634';
    ctx.fillRect(0, HUD_HEIGHT - 2, CANVAS_WIDTH, 2);
    ctx.textBaseline = 'middle';
    // Level name and relics.
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${state.levelIndex + 1} — ${state.level.name}`, 14, 20);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = COLORS.hudDim;
    const taken = state.relics.filter((r) => r.taken).length;
    ctx.fillText(`Relics ${taken}/${state.relics.length}`, 14, 44);
    for (let i = 0; i < state.relics.length; i += 1) {
      const x = 108 + i * 20;
      const y = 44;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = i < taken ? COLORS.relic : '#3a3f52';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
    // Lives, then pebbles as a small stone and a count.
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    let hearts = '';
    for (let i = 0; i < state.lives; i += 1) hearts += '♥ ';
    ctx.fillStyle = '#ff6b81';
    ctx.fillText(hearts, 200, 44);
    const pebbleX = 200 + ctx.measureText(hearts).width + 12;
    ctx.fillStyle = '#c8ccd8';
    ctx.beginPath();
    ctx.arc(pebbleX + 5, 44, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`× ${state.pebblesLeft}`, pebbleX + 14, 44);
    // Detection meter.
    const meterX = 470;
    const meterY = 14;
    const meterWidth = 220;
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.alarm ? 'SPOTTED!' : 'Detection', meterX, meterY + 6);
    ctx.fillStyle = '#232634';
    roundedRect(ctx, meterX, meterY + 16, meterWidth, 12, 6);
    ctx.fill();
    const fill = state.detection;
    ctx.fillStyle = state.alarm ? COLORS.alarm : fill > 0.45 ? '#ffb03a' : '#ffd65a';
    if (fill > 0.01) {
      roundedRect(ctx, meterX, meterY + 16, Math.max(12, meterWidth * fill), 12, 6);
      ctx.fill();
    }
    ctx.strokeStyle = '#4a4f63';
    ctx.lineWidth = 1;
    roundedRect(ctx, meterX, meterY + 16, meterWidth, 12, 6);
    ctx.stroke();
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(state.alarm ? 'Break line of sight!' : 'Stay in the shadows', meterX, meterY + 40);
    // Score and time, right aligned.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 17px system-ui, sans-serif';
    const minutes = Math.floor(state.time / 60);
    const seconds = Math.floor(state.time % 60).toString().padStart(2, '0');
    ctx.fillText(`Score ${state.score}`, CANVAS_WIDTH - 14, 20);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`${minutes}:${seconds}   Best ${Math.max(best, state.score)}`, CANVAS_WIDTH - 14, 44);
    // Toast message over the field.
    if (state.messageTimer > 0 && state.message !== '') {
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px system-ui, sans-serif';
      const width = ctx.measureText(state.message).width + 28;
      ctx.fillStyle = 'rgba(16, 18, 28, 0.85)';
      roundedRect(ctx, (CANVAS_WIDTH - width) / 2, HUD_HEIGHT + FIELD_HEIGHT - 44, width, 30, 8);
      ctx.fill();
      ctx.fillStyle = COLORS.hudText;
      ctx.fillText(state.message, CANVAS_WIDTH / 2, HUD_HEIGHT + FIELD_HEIGHT - 28);
    }
  }

  function drawOverlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 10, 18, 0.78)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 96);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '17px system-ui, sans-serif';
    lines.forEach((line, index) => {
      ctx.fillText(line, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 44 + index * 26);
    });
  }

  function draw(screen, state, best) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();
    ctx.translate(0, HUD_HEIGHT);
    drawFloor(state);
    drawExit(state);
    drawRelics(state);
    for (const guard of state.guards) drawGuard(state, guard);
    drawPebbles(state);
    drawPlayer(state);
    ctx.restore();
    drawHud(state, best);

    if (screen === SCREEN_TITLE) {
      drawOverlay('NIGHTSHADE', [
        'The Gilded Gallery — a stealth heist in three floors',
        'Steal every relic, then reach the EXIT unseen.',
        'WASD / arrows move · Shift run · C sneak · E take a relic',
        'Q or click throws a pebble to distract a guard · P pause · M mute',
        'Shadows hide you. Lamplight betrays you. Running is loud.',
        '',
        'Press Enter or click to begin',
      ], '#ffd65a');
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay('PAUSED', ['Press P or Enter to keep sneaking.'], COLORS.hudText);
    } else if (screen === SCREEN_LEVEL_CLEAR) {
      const timeBonus = Math.max(0, Math.round((300 - state.levelTime) * LEVEL_TIME_BONUS_RATE));
      drawOverlay(state.victory ? 'THE HEIST IS DONE' : 'FLOOR CLEARED', [
        state.victory
          ? `Every relic, every floor — Wren vanishes into the night.`
          : `All relics taken. The next floor waits below.`,
        `Score ${state.score}   ·   Time bonus ${timeBonus}${state.ghost ? '   ·   Ghost bonus 1000' : ''}`,
        '',
        state.victory ? 'Press Enter to play again' : 'Press Enter for the next floor',
      ], COLORS.exit);
    } else if (screen === SCREEN_OVER) {
      drawOverlay('CAUGHT', [
        'The guards found Wren, and the gallery keeps its gold.',
        `Score ${state.score}   ·   Best ${Math.max(best, state.score)}`,
        '',
        'Press Enter to try the heist again',
      ], COLORS.alarm);
    } else if (screen === SCREEN_VICTORY) {
      drawOverlay('THE HEIST IS DONE', [
        'Every relic, every floor — Wren vanishes into the night.',
        `Final score ${state.score}   ·   Best ${Math.max(best, state.score)}`,
        '',
        'Press Enter to play again',
      ], COLORS.exit);
    }
  }

  return { draw };
}
