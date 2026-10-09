# Architecture

## 1. React and PixiJS integration
- React owns menus, forms and dialogs. PixiJS owns the arena, ships, projectiles, effects and health bars.
- `GameHost` is the only bridge. It creates the Pixi `Application`, the simulation and the input, and disposes them.
- Strict Mode: `start()` is async; `dispose()` may run before `init` finishes, so a `disposed` flag destroys the app that was just created.
- HUD: the game publishes a snapshot at ~10 Hz to `hudStore`; React reads it with `useSyncExternalStore` (no React render per frame).

## 2. Simulation loop
- Pure TypeScript in `src/game/core`, driven by `step(dtMs, commands)`. No PixiJS and no React.
- Fixed timestep (`FIXED_STEP_MS = 10`) with an accumulator. Each frame adds its `dt` (clamped to 100 ms) and the world advances in whole 10 ms steps. Movement, damage, cooldowns and spawns therefore depend on time, not on the frame rate, and the same seed and inputs give the same match.
- Order of each fixed step: player (rotate, move, terrain, cooldowns, fire) -> spawner -> enemies (AI, contact, fire) -> projectiles (move, hits) -> remove dead entities -> advance clock -> check end.
- End of match: `player_destroyed` has priority over `time_up`. After the end (or while paused) `step` returns immediately: nothing moves, shoots, damages, spawns or scores.
- Pause: `resume()` clears the accumulator, so time spent paused is never replayed. The host also clears keyboard input on resume.
- Spawns: seeded RNG; the type is chosen by the largest deficit against its weight, so both Chaser and Shooter appear in a normal match. A point must be inside the arena, at least `minDistanceFromPlayerPx` from the player and clear of islands (up to 40 attempts, otherwise the spawn is skipped).
- `state.events` (shots, hits, explosions) is cleared at the start of every `step` and is meant for effects and sounds in the renderer.

## 3. Collisions
- Ships, projectiles and islands are circles. Islands block ships (push-out resolution, two passes) and projectiles (removed on contact). Ships are also clamped to the arena.
- A projectile is removed on its first hit, on expiry (`ttlMs`), on an island, or when it leaves the arena, so it applies damage exactly once.
- Player projectiles only test against enemies, and enemy projectiles only against the player.
- Chaser: damages the player on contact and explodes (no score). Destroyed enemies are skipped by every system.
- At 520 px/s a projectile moves 5.2 px per 10 ms step, which is smaller than the smallest target radius plus projectile radius, so fast projectiles do not tunnel through ships.
- Limitation: ships do not collide with each other; islands are circles, not the exact sprite outline.

## 4. Resource management
- Textures are loaded once (with progress and a readable error) and cached across matches.
- Ships, projectiles and effects are pooled and hidden instead of destroyed during a match.
- `GameHost.dispose()` stops the ticker, removes listeners, closes audio and destroys the Pixi app; it is safe under React Strict Mode (disposed flag).
- HUD updates go through an external store at about 10 Hz, so React does not render per frame.

## 5. Local persistence
- Options (`pirate-battle:options:v1`), last result, pending matches queue, player identity, mock database. All versioned and validated when read.

## 6. Ranking and history
- Contracts in `src/api/contracts.ts`. Match id is generated on the client and used in `PUT /api/matches/:id`, which makes retries idempotent.
- The match is written to the pending queue BEFORE the request and removed after success.
- Query keys per page; `keepPreviousData` for pagination; both lists are invalidated after a confirmed match.
- Ranking order: score desc, then earlier `playedAt`, then `id`. Only matches with the same configuration are compared.
- Late responses: query keys include page and configuration, and the Axios call receives the abort signal, so a response for an old page never overwrites the current one.

## 7. Mocks
- MSW handlers share contracts and fixtures with tests. Scenarios are described in the README.

## 8. Known limitations and balancing decisions
- Only the simulation core and the performance recorder were executed in tests during development; React, Pixi, MSW and Playwright code needs a local run.
- Pixi may cache a rejected asset load, so the "retry" after an asset failure might need a page reload (to be confirmed in the browser).
- Ships do not collide with each other; islands are circles.
- Balance numbers (damage, cooldowns, hp, spawn rules) are initial values chosen for a playable match, easy to tune in `gameConfig.ts`.
- Asset license must be confirmed against the challenge terms.
