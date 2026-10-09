import type { GameplayConfig } from '../config/gameConfig';
import type { MatchState } from './types';

/** Internal simulation data shared by the systems. Not exposed to the UI. */
export interface World {
  state: MatchState;
  config: GameplayConfig;
  rng: () => number;
  nextId: number;
  spawnTimerMs: number;
  spawned: { chaser: number; shooter: number };
}

/** Removes items in place (keeps array identity, so nothing holds stale references). */
export function compact<T>(items: T[], keep: (item: T) => boolean): void {
  let j = 0;
  for (const item of items) {
    if (keep(item)) items[j++] = item;
  }
  items.length = j;
}
