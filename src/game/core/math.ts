import type { Vec2 } from './types';

export const TAU = Math.PI * 2;

export function normalizeAngle(a: number): number {
  let x = (a + Math.PI) % TAU;
  if (x < 0) x += TAU;
  return x - Math.PI;
}

export function angleTo(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Rotates `current` toward `target` by at most `maxDelta` radians (shortest way). */
export function turnToward(current: number, target: number, maxDelta: number): number {
  const d = normalizeAngle(target - current);
  if (Math.abs(d) <= maxDelta) return normalizeAngle(target);
  return normalizeAngle(current + Math.sign(d) * maxDelta);
}

export interface Circle { x: number; y: number; radius: number }

/** Moves `pos` out of the circle if a body of `radius` overlaps it. Returns true when it moved. */
export function pushOutOfCircle(pos: Vec2, radius: number, c: Circle): boolean {
  const dx = pos.x - c.x;
  const dy = pos.y - c.y;
  const d = Math.hypot(dx, dy);
  const min = c.radius + radius;
  if (d >= min) return false;
  if (d === 0) {
    pos.x = c.x + min;
    return true;
  }
  pos.x = c.x + (dx / d) * min;
  pos.y = c.y + (dy / d) * min;
  return true;
}

export function clampToArena(pos: Vec2, radius: number, arena: { widthPx: number; heightPx: number }): void {
  pos.x = Math.min(Math.max(pos.x, radius), arena.widthPx - radius);
  pos.y = Math.min(Math.max(pos.y, radius), arena.heightPx - radius);
}
