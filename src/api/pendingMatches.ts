import type { MatchRecord } from './contracts';

const KEY = 'pirate-battle:pending:v1';
const listeners = new Set<() => void>();
let cache: MatchRecord[] | null = null;

function read(): MatchRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as MatchRecord[]) : [];
  } catch {
    return [];
  }
}

function write(records: MatchRecord[]): void {
  cache = records;
  localStorage.setItem(KEY, JSON.stringify(records));
  listeners.forEach((l) => l());
}

export function listPending(): MatchRecord[] {
  cache ??= read();
  return cache;
}

export const pendingStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: listPending,
};

export function enqueue(record: MatchRecord): void {
  write([...listPending().filter((r) => r.id !== record.id), record]);
}

export function remove(id: string): void {
  write(listPending().filter((r) => r.id !== id));
}
