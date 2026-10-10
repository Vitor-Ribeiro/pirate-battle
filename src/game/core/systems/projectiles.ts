import { distance } from '../math';
import type { World } from '../world';
import { damageEnemy, damagePlayer } from './combat';

export const PROJECTILE_RADIUS = 4;

export function updateProjectiles(w: World, dtMs: number): void {
  const { state, config } = w;
  const dt = dtMs / 1000;

  for (const pr of state.projectiles) {
    if (!pr.alive) continue;
    pr.pos.x += pr.vel.x * dt;
    pr.pos.y += pr.vel.y * dt;
    pr.ttlMs -= dtMs;

    const outside = pr.pos.x < 0 || pr.pos.y < 0 || pr.pos.x > config.arena.widthPx || pr.pos.y > config.arena.heightPx;
    if (pr.ttlMs <= 0 || outside) {
      pr.alive = false;
      continue;
    }
    if (state.islands.some((i) => distance(pr.pos, i) <= i.radius + PROJECTILE_RADIUS)) {
      pr.alive = false;
      continue;
    }

    if (pr.owner === 'player') {
      let target: (typeof state.enemies)[number] | null = null;
      let bestGap = Infinity;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const gap = distance(pr.pos, e.pos) - e.radius - PROJECTILE_RADIUS;
        if (gap <= 0 && gap < bestGap) {
          bestGap = gap;
          target = e;
        }
      }
      if (target) {
        pr.alive = false;
        if (damageEnemy(w, target, pr.damage)) {
          state.score += 1;
          state.kills += 1;
        }
      }
    } else {
      const p = state.player;
      if (p.alive && distance(pr.pos, p.pos) <= p.radius + PROJECTILE_RADIUS) {
        pr.alive = false;
        damagePlayer(w, pr.damage);
      }
    }
  }
}
