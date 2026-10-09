import type { MatchRecord } from '../api/contracts';

const KEY = 'pirate-battle:mock-db:v1';

/** Confirmed matches survive a refresh (localStorage). */
export function loadConfirmed(): MatchRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as MatchRecord[];
  } catch {
    return [];
  }
}

export function saveConfirmed(records: MatchRecord[]): void {
  localStorage.setItem(KEY, JSON.stringify(records));
}
