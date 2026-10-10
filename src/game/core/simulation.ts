import type { GameplayConfig } from '../config/gameConfig';
import { createRng } from './rng';
import { updateEnemies } from './systems/enemies';
import { updatePlayer } from './systems/player';
import { updateProjectiles } from './systems/projectiles';
import { updateSpawner } from './systems/spawner';
import type { Commands, MatchState, ShipState, Simulation } from './types';
import { compact, type World } from './world';

export const FIXED_STEP_MS = 10;
const MAX_FRAME_MS = 100;

function createPlayer(config: GameplayConfig): ShipState {
  return {
    id: 1,
    kind: 'player',
    pos: { x: config.arena.widthPx / 2, y: config.arena.heightPx / 2 },
    heading: -Math.PI / 2,
    health: config.player.maxHealth,
    maxHealth: config.player.maxHealth,
    radius: config.player.radiusPx,
    alive: true,
    cooldownsMs: { front: 0, left: 0, right: 0 },
  };
}

export function createSimulation(config: GameplayConfig, seed: number): Simulation {
  const state: MatchState = {
    status: 'running',
    elapsedMs: 0,
    score: 0,
    kills: 0,
    player: createPlayer(config),
    enemies: [],
    projectiles: [],
    islands: config.arena.islands.map((i) => ({ x: i.x, y: i.y, radius: i.radiusPx })),
    events: [],
    endReason: null,
  };
  const world: World = { state, config, rng: createRng(seed), nextId: 2, spawnTimerMs: 0, spawned: { chaser: 0, shooter: 0 } };
  let accumulatorMs = 0;

  function substep(commands: Commands): void {
    updatePlayer(world, commands, FIXED_STEP_MS);
    updateSpawner(world, FIXED_STEP_MS);
    updateEnemies(world, FIXED_STEP_MS);
    updateProjectiles(world, FIXED_STEP_MS);
    compact(state.enemies, (e) => e.alive);
    compact(state.projectiles, (p) => p.alive);
    state.elapsedMs += FIXED_STEP_MS;

    if (state.player.health <= 0) {
      state.status = 'ended';
      state.endReason = 'player_destroyed';
    } else if (state.elapsedMs >= config.session.durationSec * 1000) {
      state.status = 'ended';
      state.endReason = 'time_up';
    }
  }

  return {
    step(dtMs: number, commands: Commands): void {
      state.events.length = 0;
      if (state.status !== 'running') return;
      accumulatorMs += Math.min(Math.max(dtMs, 0), MAX_FRAME_MS);
      while (accumulatorMs >= FIXED_STEP_MS && state.status === 'running') {
        accumulatorMs -= FIXED_STEP_MS;
        substep(commands);
      }
    },
    getState: () => state,
    pause(): void {
      if (state.status === 'running') state.status = 'paused';
    },
    resume(): void {
      if (state.status === 'paused') {
        accumulatorMs = 0;
        state.status = 'running';
      }
    },
  };
}
