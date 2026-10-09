import { angleTo, distance, normalizeAngle, turnToward } from '../math';
import type { World } from '../world';
import { damagePlayer, spawnProjectile } from './combat';
import { resolveShipTerrain } from './terrain';

const AIM_TOLERANCE_RAD = 0.2;
const SHOOTER_HOLD_RATIO = 0.7; // the Shooter stops approaching at 70% of its range

const AVOID_MARGIN_PX = 24;

/** Heading toward the player, bent around an island that blocks the straight path (prevents ships getting stuck behind it). */
function steerHeading(w: World, from: { x: number; y: number }, bodyRadius: number, to: { x: number; y: number }): number {
  const direct = angleTo(from, to);
  const total = distance(from, to);
  let best = direct;
  let bestDist = Infinity;
  for (const isl of w.state.islands) {
    const d = distance(from, isl);
    const clear = isl.radius + bodyRadius + AVOID_MARGIN_PX;
    if (d >= total || d < 1) continue; // island is not between us and the target
    const toIsl = angleTo(from, isl);
    const off = normalizeAngle(direct - toIsl);
    const lateral = Math.abs(Math.sin(off)) * d;
    if (Math.abs(off) > Math.PI / 2 || lateral >= clear || d >= bestDist) continue;
    const spread = d > clear ? Math.asin(clear / d) : Math.PI / 2;
    best = normalizeAngle(toIsl + (off >= 0 ? 1 : -1) * spread);
    bestDist = d;
  }
  return best;
}

/** Soft separation: overlapping enemies are pushed apart so they never stack on one spot. */
function separateEnemies(w: World): void {
  const list = w.state.enemies;
  for (let i = 0; i < list.length; i++) {
    const a = list[i]!;
    if (!a.alive) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]!;
      if (!b.alive) continue;
      let dx = b.pos.x - a.pos.x;
      let dy = b.pos.y - a.pos.y;
      let d = Math.hypot(dx, dy);
      const min = (a.radius + b.radius) * 0.9;
      if (d >= min) continue;
      if (d < 0.001) { // exactly on top of each other: pick a stable direction
        dx = Math.cos(a.id);
        dy = Math.sin(a.id);
        d = 1;
      }
      const push = (min - d) / 2;
      a.pos.x -= (dx / d) * push;
      a.pos.y -= (dy / d) * push;
      b.pos.x += (dx / d) * push;
      b.pos.y += (dy / d) * push;
    }
  }
  for (const e of list) if (e.alive) resolveShipTerrain(w, e);
}

export function updateEnemies(w: World, dtMs: number): void {
  const player = w.state.player;
  const dt = dtMs / 1000;

  for (const e of w.state.enemies) {
    if (!e.alive) continue; // destroyed enemies never move, shoot or collide again
    e.cooldownsMs.front = Math.max(0, e.cooldownsMs.front - dtMs);
    const target = angleTo(e.pos, player.pos); // used for aiming
    const steer = steerHeading(w, e.pos, e.radius, player.pos);

    if (e.kind === 'chaser') {
      const cfg = w.config.chaser;
      e.heading = turnToward(e.heading, steer, cfg.turnSpeedRadPerSec * dt);
      e.pos.x += Math.cos(e.heading) * cfg.moveSpeedPxPerSec * dt;
      e.pos.y += Math.sin(e.heading) * cfg.moveSpeedPxPerSec * dt;
      resolveShipTerrain(w, e);
      if (player.alive && distance(e.pos, player.pos) <= e.radius + player.radius) {
        damagePlayer(w, cfg.contactDamage);
        e.alive = false; // explodes on impact: no score for the player
        e.health = 0;
        w.state.events.push({ type: 'explosion', pos: { ...e.pos }, radius: e.radius * 2 });
      }
    } else if (e.kind === 'shooter') {
      const cfg = w.config.shooter;
      e.heading = turnToward(e.heading, steer, cfg.turnSpeedRadPerSec * dt);
      const dist = distance(e.pos, player.pos);
      if (dist > cfg.attackRangePx * SHOOTER_HOLD_RATIO) {
        e.pos.x += Math.cos(e.heading) * cfg.moveSpeedPxPerSec * dt;
        e.pos.y += Math.sin(e.heading) * cfg.moveSpeedPxPerSec * dt;
      }
      resolveShipTerrain(w, e);
      const aimed = Math.abs(normalizeAngle(target - e.heading)) <= AIM_TOLERANCE_RAD;
      if (player.alive && dist <= cfg.attackRangePx && aimed && e.cooldownsMs.front <= 0) {
        const bow = { x: e.pos.x + Math.cos(e.heading) * e.radius, y: e.pos.y + Math.sin(e.heading) * e.radius };
        spawnProjectile(w, 'enemy', bow, e.heading, cfg.weapon);
        e.cooldownsMs.front = cfg.weapon.cooldownMs;
      }
    }
  }
  separateEnemies(w);
}
