export interface HudSnapshot {
  score: number;
  timeLeftSec: number;
  health: number;
  maxHealth: number;
  status: 'idle' | 'running' | 'paused' | 'ended';
}

const INITIAL: HudSnapshot = { score: 0, timeLeftSec: 0, health: 0, maxHealth: 0, status: 'idle' };
let snapshot: HudSnapshot = INITIAL;
const listeners = new Set<() => void>();

export const hudStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: (): HudSnapshot => snapshot,
  publish(next: HudSnapshot): void {
    const same = (Object.keys(next) as (keyof HudSnapshot)[]).every((k) => next[k] === snapshot[k]);
    if (same) return;
    snapshot = next;
    listeners.forEach((l) => l());
  },
  reset(): void {
    snapshot = INITIAL;
    listeners.forEach((l) => l());
  },
};
