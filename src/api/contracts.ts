import type { EndReason } from '../game/core/types';

export interface MatchRecord {
  id: string;
  playerId: string;
  playerName: string;
  playedAt: string;
  score: number;
  durationMs: number;
  endReason: EndReason;
  config: { sessionSec: number; spawnIntervalSec: number };
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RankingEntry extends MatchRecord { rank: number }

export interface RankingParams { page: number; pageSize: number; configKey: string }
export interface HistoryParams { page: number; pageSize: number; playerId: string }

export function compareRanking(a: MatchRecord, b: MatchRecord): number {
  return b.score - a.score || a.playedAt.localeCompare(b.playedAt) || a.id.localeCompare(b.id);
}
