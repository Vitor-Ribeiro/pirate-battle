import { createRng } from '../game/core/rng';
import type { MatchRecord } from '../api/contracts';

const NAMES = ['Blackbeard', 'Anne Bonny', 'Calico Jack', 'Mary Read', 'Captain Kidd', 'Bartholomew', 'Grace', 'Redhand'];

/** Deterministic fixtures for other players. */
export function buildFixtures(count: number, config: { sessionSec: number; spawnIntervalSec: number }): MatchRecord[] {
  const rng = createRng(42);
  return Array.from({ length: count }, (_, i) => ({
    id: `fixture-${config.sessionSec}-${config.spawnIntervalSec}-${i}`,
    playerId: `fixture-player-${i % NAMES.length}`,
    playerName: NAMES[i % NAMES.length] ?? 'Pirate',
    playedAt: new Date(Date.UTC(2026, 0, 1) + i * 3_600_000).toISOString(),
    score: Math.floor(rng() * 40),
    durationMs: config.sessionSec * 1000,
    endReason: 'time_up' as const,
    config,
  }));
}
