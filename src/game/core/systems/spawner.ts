import { angleTo, distance } from '../math';
import type { ShipKind, ShipState } from '../types';
import type { World } from '../world';

const SPAWN_ATTEMPTS = 40;
const EDGE_MARGIN_PX = 10;
const ISLAND_CLEARANCE_PX = 20;

function aliveEnemies(w: World): number {
  return w.state.enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
}

function pickKind(w: World): 'chaser' | 'shooter' {
  const weights = w.config.spawn.weights;
  const need = (count: number, weight: number): number => (weight > 0 ? count / weight : Infinity);
  return need(w.spawned.chaser, weights.chaser) <= need(w.spawned.shooter, weights.shooter) ? 'chaser' : 'shooter';
}

function createEnemy(w: World, kind: Exclude<ShipKind, 'player'>, x: number, y: number): ShipState {
  const cfg = kind === 'chaser' ? w.config.chaser : w.config.shooter;
  const pos = { x, y };
  return {
    id: w.nextId++,
    kind,
    pos,
    heading: angleTo(pos, w.state.player.pos),
    health: cfg.maxHealth,
    maxHealth: cfg.maxHealth,
    radius: cfg.radiusPx,
    alive: true,
    cooldownsMs: { front: 0, left: 0, right: 0 },
  };
}

function findSpawnPoint(w: World, radius: number): { x: number; y: number } | null {
  const { arena, spawn } = w.config;
  const margin = radius + EDGE_MARGIN_PX;
  for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
    const pos = { x: margin + w.rng() * (arena.widthPx - 2 * margin), y: margin + w.rng() * (arena.heightPx - 2 * margin) };
    if (distance(pos, w.state.player.pos) < spawn.minDistanceFromPlayerPx) continue;
    if (w.state.islands.some((isl) => distance(pos, isl) < isl.radius + radius + ISLAND_CLEARANCE_PX)) continue;
    return pos;
  }
  return null;
}

export function updateSpawner(w: World, dtMs: number): void {
  const intervalMs = w.config.spawn.intervalSec * 1000;
  w.spawnTimerMs += dtMs;
  while (w.spawnTimerMs >= intervalMs) {
    w.spawnTimerMs -= intervalMs;
    if (aliveEnemies(w) >= w.config.spawn.maxAlive) continue;
    const kind = pickKind(w);
    const radius = (kind === 'chaser' ? w.config.chaser : w.config.shooter).radiusPx;
    const point = findSpawnPoint(w, radius);
    if (!point) continue;
    w.state.enemies.push(createEnemy(w, kind, point.x, point.y));
    w.spawned[kind] += 1;
  }
}
