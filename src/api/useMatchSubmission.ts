import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { MatchResult } from '../game/core/types';
import { getPlayer } from '../state/player';
import type { MatchRecord } from './contracts';
import { enqueue, pendingStore } from './pendingMatches';
import { useSubmitMatch } from './queries';

export type SubmitStatus = 'saving' | 'saved' | 'pending';

export function toRecord(result: MatchResult): MatchRecord {
  const player = getPlayer();
  return {
    id: result.matchId,
    playerId: player.id,
    playerName: player.name,
    playedAt: new Date().toISOString(),
    score: result.score,
    durationMs: result.durationMs,
    endReason: result.endReason,
    config: { sessionSec: result.sessionSec, spawnIntervalSec: result.spawnIntervalSec },
  };
}

export function useMatchSubmission(result: MatchResult) {
  const mutation = useSubmitMatch();
  const pending = useSyncExternalStore(pendingStore.subscribe, pendingStore.getSnapshot);
  const startedFor = useRef<string | null>(null);
  const { mutate } = mutation;

  const record = useRef<MatchRecord | null>(null);
  useEffect(() => {
    if (startedFor.current === result.matchId) return;
    startedFor.current = result.matchId;
    const existing = pending.find((r) => r.id === result.matchId);
    record.current = existing ?? toRecord(result);
    enqueue(record.current);
    mutate(record.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.matchId]);

  const retry = useCallback(() => {
    if (record.current && !mutation.isPending) mutation.mutate(record.current);
  }, [mutation]);

  const status: SubmitStatus = mutation.isPending ? 'saving' : mutation.isSuccess ? 'saved' : mutation.isError ? 'pending' : 'saving';
  return { status, retry };
}

export function useFlushPending() {
  const mutation = useSubmitMatch();
  const pending = useSyncExternalStore(pendingStore.subscribe, pendingStore.getSnapshot);
  const { mutate } = mutation;
  const flush = useCallback(() => {
    for (const r of pendingStore.getSnapshot()) mutate(r);
  }, [mutate]);
  return { pendingCount: pending.length, flush, isFlushing: mutation.isPending };
}
