import { normalizeAngle } from '../math';
import type { Commands } from '../types';
import type { World } from '../world';
import { spawnProjectile } from './combat';
import { resolveShipTerrain } from './terrain';

export function updatePlayer(w: World, cmd: Commands, dtMs: number): void {
  const p = w.state.player;
  if (!p.alive) return;
  const cfg = w.config.player;
  const dt = dtMs / 1000;

  if (cmd.turnLeft) p.heading = normalizeAngle(p.heading - cfg.turnSpeedRadPerSec * dt);
  if (cmd.turnRight) p.heading = normalizeAngle(p.heading + cfg.turnSpeedRadPerSec * dt);
  if (cmd.forward) {
    p.pos.x += Math.cos(p.heading) * cfg.moveSpeedPxPerSec * dt;
    p.pos.y += Math.sin(p.heading) * cfg.moveSpeedPxPerSec * dt;
  }
  resolveShipTerrain(w, p);

  p.cooldownsMs.front = Math.max(0, p.cooldownsMs.front - dtMs);
  p.cooldownsMs.left = Math.max(0, p.cooldownsMs.left - dtMs);
  p.cooldownsMs.right = Math.max(0, p.cooldownsMs.right - dtMs);

  if (cmd.fireFront && p.cooldownsMs.front <= 0) {
    const bow = { x: p.pos.x + Math.cos(p.heading) * p.radius, y: p.pos.y + Math.sin(p.heading) * p.radius };
    spawnProjectile(w, 'player', bow, p.heading, cfg.frontWeapon);
    p.cooldownsMs.front = cfg.frontWeapon.cooldownMs;
  }
  if (cmd.fireLeft && p.cooldownsMs.left <= 0) {
    fireBroadside(w, -1);
    p.cooldownsMs.left = cfg.sideWeapon.cooldownMs;
  }
  if (cmd.fireRight && p.cooldownsMs.right <= 0) {
    fireBroadside(w, 1);
    p.cooldownsMs.right = cfg.sideWeapon.cooldownMs;
  }
}

function fireBroadside(w: World, side: -1 | 1): void {
  const p = w.state.player;
  const weapon = w.config.player.sideWeapon;
  const dir = p.heading + side * (Math.PI / 2);
  const n = weapon.projectilesPerSide;
  for (let i = 0; i < n; i++) {
    const along = (i - (n - 1) / 2) * weapon.lateralSpacingPx;
    const origin = {
      x: p.pos.x + Math.cos(dir) * p.radius + Math.cos(p.heading) * along,
      y: p.pos.y + Math.sin(dir) * p.radius + Math.sin(p.heading) * along,
    };
    spawnProjectile(w, 'player', origin, dir, weapon);
  }
}
