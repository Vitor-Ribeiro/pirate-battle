import { clampToArena, pushOutOfCircle } from '../math';
import type { ShipState } from '../types';
import type { World } from '../world';

export function resolveShipTerrain(w: World, ship: ShipState): void {
  clampToArena(ship.pos, ship.radius, w.config.arena);
  for (let pass = 0; pass < 2; pass++) {
    for (const island of w.state.islands) pushOutOfCircle(ship.pos, ship.radius, island);
  }
  clampToArena(ship.pos, ship.radius, w.config.arena);
}
