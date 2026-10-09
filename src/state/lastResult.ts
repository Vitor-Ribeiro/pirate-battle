import type { MatchResult } from '../game/core/types';

const KEY = 'pirate-battle:last-result:v1';

export function saveLastResult(result: MatchResult): void {
  localStorage.setItem(KEY, JSON.stringify(result));
}

export function loadLastResult(): MatchResult | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null') as MatchResult | null;
    return parsed && typeof parsed.matchId === 'string' ? parsed : null;
  } catch {
    return null;
  }
}
