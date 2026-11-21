// Line of sight and vision cones. Walls, display cases and plant hedges block sight;
// a guard sees the player only when the player is inside the cone AND the straight line
// between them crosses no solid tile. Cones are drawn from the same rays, so what a guard
// sees is exactly what the player sees drawn.

import { TILE } from './config.js';
import { isSolidTile } from './levels.js';

/** Is the tile at (col, row) solid? Out of bounds counts as solid. */
export function tileIsSolid(tiles, col, row) {
  if (row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) return true;
  return isSolidTile(tiles[row][col]);
}

/** Does the point (x, y) in pixels sit inside a solid tile? */
export function pointIsSolid(tiles, x, y) {
  return tileIsSolid(tiles, Math.floor(x / TILE), Math.floor(y / TILE));
}

/**
 * Is there a clear straight line from (x0, y0) to (x1, y1)? Walks the segment in small
 * steps and stops at the first solid tile. The endpoint itself is allowed to be solid
 * (a guard standing against a wall still sees along it).
 */
export function hasLineOfSight(tiles, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 4));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (pointIsSolid(tiles, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

/** Distance from (x, y) along `angle` until a solid tile or `maxDistance`, in pixels. */
export function castRay(tiles, x, y, angle, maxDistance) {
  const step = 4;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let travelled = 0;
  while (travelled < maxDistance) {
    travelled += step;
    if (pointIsSolid(tiles, x + dx * (travelled / step), y + dy * (travelled / step))) {
      return travelled;
    }
  }
  return maxDistance;
}

/**
 * The visible polygon of a cone from (x, y), facing `angle`, half-angle `halfAngle` and
 * range `range`: one ray every few degrees, each clipped by the walls it hits.
 */
export function conePolygon(tiles, x, y, angle, halfAngle, range) {
  const points = [{ x, y }];
  const rayCount = 26;
  for (let i = 0; i <= rayCount; i += 1) {
    const rayAngle = angle - halfAngle + (2 * halfAngle * i) / rayCount;
    const distance = castRay(tiles, x, y, rayAngle, range);
    points.push({ x: x + Math.cos(rayAngle) * distance, y: y + Math.sin(rayAngle) * distance });
  }
  return points;
}

/** Is the point (x, y) inside the cone from (gx, gy) facing `angle`? Angle only, no walls. */
export function pointInCone(gx, gy, angle, halfAngle, range, x, y) {
  const dx = x - gx;
  const dy = y - gy;
  const distance = Math.hypot(dx, dy);
  if (distance > range || distance < 1) return distance < 1;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= halfAngle;
}

/** Can the guard at (gx, gy) facing `angle` see the player at (x, y)? Cone plus sight line. */
export function guardSeesPlayer(tiles, gx, gy, angle, halfAngle, range, x, y) {
  return pointInCone(gx, gy, angle, halfAngle, range, x, y) && hasLineOfSight(tiles, gx, gy, x, y);
}

/** What kind of floor is under the point (x, y): 'shadow', 'lamp' or 'lit'? */
export function floorAt(tiles, lamps, x, y) {
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  if (row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) return 'lit';
  if (tiles[row][col] === ',') return 'shadow';
  for (let i = 0; i < lamps.length; i += 1) {
    const lamp = lamps[i];
    const dx = x - (lamp.col * TILE + TILE / 2);
    const dy = y - (lamp.row * TILE + TILE / 2);
    if (dx * dx + dy * dy < 70 * 70) return 'lamp';
  }
  return 'lit';
}
