import { describe, expect, it } from 'vitest';
import { createSessionConfig, type GameplayConfig } from '../config/gameConfig';
import { createSimulation } from './simulation';
import { NO_COMMANDS, type Commands, type MatchState, type ShipState } from './types';

const options = { sessionSec: 60, spawnIntervalSec: 2 };

function makeConfig(patch?: (c: GameplayConfig) => GameplayConfig): GameplayConfig {
  const base = createSessionConfig(options);
  return patch ? patch(structuredClone(base)) : base;
}
const cmd = (patch: Partial<Commands>): Commands => ({ ...NO_COMMANDS, ...patch });

function run(sim: ReturnType<typeof createSimulation>, ms: number, commands: Commands, frameMs = 10): void {
  for (let t = 0; t < ms; t += frameMs) sim.step(frameMs, commands);
}
function mutable(sim: ReturnType<typeof createSimulation>): MatchState {
  return sim.getState() as MatchState;
}
function enemyAt(id: number, kind: 'chaser' | 'shooter', x: number, y: number, health: number): ShipState {
  return {
    id, kind, pos: { x, y }, heading: 0, health, maxHealth: health, radius: 20, alive: true,
    cooldownsMs: { front: 0, left: 0, right: 0 },
  };
}
const tough = (c: GameplayConfig): GameplayConfig => ({ ...c, player: { ...c.player, maxHealth: 1e9 } });

describe('match rules', () => {
  it('ends by time exactly at the configured duration and then stops', () => {
    const sim = createSimulation(makeConfig(tough), 1);
    run(sim, 61_000, NO_COMMANDS);
    expect(sim.getState().status).toBe('ended');
    expect(sim.getState().endReason).toBe('time_up');
    expect(sim.getState().elapsedMs).toBe(60_000);
    const score = sim.getState().score;
    run(sim, 2_000, cmd({ forward: true, fireFront: true }));
    expect(sim.getState().elapsedMs).toBe(60_000);
    expect(sim.getState().score).toBe(score);
  });

  it('does not advance while paused and does not replay the paused time', () => {
    const sim = createSimulation(makeConfig(), 1);
    run(sim, 500, NO_COMMANDS);
    sim.pause();
    run(sim, 5_000, cmd({ forward: true }));
    expect(sim.getState().elapsedMs).toBe(500);
    sim.resume();
    sim.step(10, NO_COMMANDS);
    expect(sim.getState().elapsedMs).toBe(510);
  });

  it('ends when the player is destroyed and stops everything', () => {
    const sim = createSimulation(makeConfig(), 1);
    const s = mutable(sim);
    s.player.health = 1;
    s.enemies.push(enemyAt(900, 'chaser', s.player.pos.x + 5, s.player.pos.y, 30));
    run(sim, 100, NO_COMMANDS);
    expect(s.status).toBe('ended');
    expect(s.endReason).toBe('player_destroyed');
    expect(s.score).toBe(0); // chaser self-destruction does not score
    const t = s.elapsedMs;
    run(sim, 1_000, cmd({ fireFront: true }));
    expect(s.elapsedMs).toBe(t);
  });

  it('is deterministic for the same seed and inputs', () => {
    const a = createSimulation(makeConfig(tough), 7);
    const b = createSimulation(makeConfig(tough), 7);
    const c = cmd({ forward: true, turnRight: true, fireFront: true });
    run(a, 20_000, c);
    run(b, 20_000, c);
    expect(JSON.stringify(a.getState())).toBe(JSON.stringify(b.getState()));
  });

  it('does not depend on the frame rate', () => {
    const a = createSimulation(makeConfig(tough), 3);
    const b = createSimulation(makeConfig(tough), 3);
    const c = cmd({ forward: true });
    run(a, 3_000, c, 16);
    run(b, 3_000, c, 33);
    expect(Math.abs(a.getState().player.pos.x - b.getState().player.pos.x)).toBeLessThan(3);
    expect(Math.abs(a.getState().player.pos.y - b.getState().player.pos.y)).toBeLessThan(3);
  });
});

describe('movement and terrain', () => {
  it('rotates and moves forward', () => {
    const sim = createSimulation(makeConfig(), 1);
    const start = { ...sim.getState().player.pos };
    run(sim, 1_000, cmd({ forward: true }));
    expect(sim.getState().player.pos.y).toBeLessThan(start.y); // initial heading is up
    const h = sim.getState().player.heading;
    run(sim, 500, cmd({ turnRight: true }));
    expect(sim.getState().player.heading).toBeGreaterThan(h);
  });

  it('never leaves the arena', () => {
    const sim = createSimulation(makeConfig(), 1);
    run(sim, 20_000, cmd({ forward: true }));
    const p = sim.getState().player;
    expect(p.pos.y).toBeGreaterThanOrEqual(p.radius);
  });

  it('cannot cross an island', () => {
    const config = makeConfig((c) => ({
      ...c,
      arena: { ...c.arena, islands: [{ x: 800, y: 300, radiusPx: 80 }] },
    }));
    const sim = createSimulation(config, 1);
    run(sim, 10_000, cmd({ forward: true }));
    const p = sim.getState().player;
    expect(Math.hypot(p.pos.x - 800, p.pos.y - 300)).toBeGreaterThanOrEqual(80 + p.radius - 0.01);
  });
});

describe('weapons', () => {
  it('respects the front weapon cooldown', () => {
    const sim = createSimulation(makeConfig(), 1);
    let shots = 0;
    for (let t = 0; t < 1_000; t += 10) {
      sim.step(10, cmd({ fireFront: true }));
      shots += sim.getState().events.filter((e) => e.type === 'shot').length;
    }
    expect(shots).toBe(3); // 350 ms cooldown: shots at 0, 350 and 700 ms
  });

  it('fires three parallel projectiles per side with the same direction', () => {
    const sim = createSimulation(makeConfig(), 1);
    sim.step(10, cmd({ fireLeft: true }));
    const shots = sim.getState().projectiles;
    expect(shots.length).toBe(3);
    const [first, ...rest] = shots;
    for (const s of rest) {
      expect(s.vel.x).toBeCloseTo(first?.vel.x ?? 0, 6);
      expect(s.vel.y).toBeCloseTo(first?.vel.y ?? 0, 6);
    }
  });

  it('player projectiles damage once, score once and are removed', () => {
    const sim = createSimulation(makeConfig(tough), 1);
    const s = mutable(sim);
    // heading is up: put a weak enemy straight ahead
    s.enemies.push(enemyAt(901, 'shooter', s.player.pos.x, s.player.pos.y - 150, 10));
    sim.step(10, cmd({ fireFront: true }));
    run(sim, 600, NO_COMMANDS);
    expect(s.score).toBe(1);
    expect(s.kills).toBe(1);
    expect(s.enemies.some((e) => e.id === 901)).toBe(false);
    expect(s.projectiles.length).toBe(0);
  });

  it('islands block projectiles', () => {
    const config = makeConfig((c) => tough({
      ...c,
      arena: { ...c.arena, islands: [{ x: 800, y: 330, radiusPx: 40 }] },
    }));
    const sim = createSimulation(config, 1);
    const s = mutable(sim);
    s.enemies.push(enemyAt(902, 'shooter', 800, 200, 10)); // behind the island, in the line of fire
    sim.step(10, cmd({ fireFront: true }));
    run(sim, 800, NO_COMMANDS);
    expect(s.score).toBe(0);
    expect(s.enemies.find((e) => e.id === 902)?.health).toBe(10);
  });

  it('enemy projectiles damage the player once', () => {
    const sim = createSimulation(makeConfig(), 1);
    const s = mutable(sim);
    const shooter = enemyAt(903, 'shooter', s.player.pos.x + 200, s.player.pos.y, 40);
    shooter.heading = Math.PI; // already facing the player (the Shooter only fires when aimed)
    s.enemies.push(shooter);
    const before = s.player.health;
    run(sim, 900, NO_COMMANDS);
    const dealt = before - s.player.health;
    expect(dealt).toBeGreaterThan(0);
    expect(dealt % 8).toBe(0); // damage comes in whole projectiles of 8
  });
});

describe('spawns', () => {
  it('spawns both types, far from the player and clear of islands', () => {
    const sim = createSimulation(makeConfig(tough), 5);
    const config = makeConfig();
    const seen = new Map<number, ShipState['kind']>();
    for (let t = 0; t < 60_000; t += 10) {
      sim.step(10, NO_COMMANDS);
      for (const e of sim.getState().enemies) {
        if (seen.has(e.id)) continue;
        seen.set(e.id, e.kind);
        const d = Math.hypot(e.pos.x - sim.getState().player.pos.x, e.pos.y - sim.getState().player.pos.y);
        expect(d).toBeGreaterThanOrEqual(config.spawn.minDistanceFromPlayerPx - 5);
        for (const isl of sim.getState().islands) {
          expect(Math.hypot(e.pos.x - isl.x, e.pos.y - isl.y)).toBeGreaterThan(isl.radius + e.radius);
        }
      }
    }
    const kinds = new Set(seen.values());
    expect(kinds.has('chaser')).toBe(true);
    expect(kinds.has('shooter')).toBe(true);
  });

  it('respects the spawn interval', () => {
    const sim = createSimulation(makeConfig((c) => tough({ ...c, spawn: { ...c.spawn, intervalSec: 10 } })), 5);
    run(sim, 9_990, NO_COMMANDS);
    expect(sim.getState().enemies.length).toBe(0);
    run(sim, 20, NO_COMMANDS);
    expect(sim.getState().enemies.length).toBe(1);
  });
});

describe('enemy navigation', () => {
  it('a chaser behind an island goes around it and reaches the player', () => {
    const sim = createSimulation(makeConfig(), 1);
    const st = mutable(sim);
    st.enemies.length = 0;
    const isl = st.islands[0]!;
    st.player.pos = { x: isl.x - isl.radius - 150, y: isl.y };
    st.player.heading = 0;
    st.enemies.push(enemyAt(900, 'chaser', isl.x + isl.radius + 150, isl.y, 30));
    run(sim, 8_000, NO_COMMANDS);
    expect(st.enemies.find((e) => e.id === 900)?.alive ?? false).toBe(false); // it hit the player (explodes)
    expect(st.player.health).toBeLessThan(st.player.maxHealth);
  });
});

describe('overlapping enemies', () => {
  it('a projectile damages the closest overlapping enemy, not the first in the list', () => {
    const sim = createSimulation(makeConfig(tough), 1);
    const st = mutable(sim);
    st.enemies.length = 0;
    st.player.pos = { x: 1500, y: 800 };
    const far = enemyAt(901, 'shooter', 800, 300, 40); // first in the list
    const near = enemyAt(902, 'shooter', 800, 320, 40); // the circles overlap
    far.radius = 40;
    near.radius = 40;
    st.enemies.push(far, near);
    // A still projectile inside both circles, closer to `near`.
    st.projectiles.push({ id: 950, owner: 'player', pos: { x: 800, y: 316 }, vel: { x: 0, y: 0 }, damage: 10, ttlMs: 1000, alive: true });
    run(sim, 10, NO_COMMANDS);
    expect(near.health).toBe(30);
    expect(far.health).toBe(40);
  });

  it('enemies pushed onto the same spot separate', () => {
    const sim = createSimulation(makeConfig(tough), 1);
    const st = mutable(sim);
    st.enemies.length = 0;
    st.player.pos = { x: 1500, y: 800 };
    const a = enemyAt(911, 'shooter', 800, 450, 40);
    const b = enemyAt(912, 'shooter', 800, 450, 40); // exactly on top of each other
    st.enemies.push(a, b);
    run(sim, 200, NO_COMMANDS);
    const gap = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
    expect(gap).toBeGreaterThanOrEqual((a.radius + b.radius) * 0.85);
  });
});
