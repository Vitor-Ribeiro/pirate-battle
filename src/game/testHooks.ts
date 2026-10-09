import type { Commands, MatchState, ShipKind, ShipState } from './core/types';

/** Set by Playwright (addInitScript) before the page loads. Only honored in builds made with VITE_E2E=true. */
export interface TestConfig {
  seed?: number;
  /** The simulation only advances through window.__pb.advance(ms): the test owns the clock. */
  manualClock?: boolean;
}

declare global {
  interface Window {
    __PB_TEST__?: TestConfig;
    __pb?: TestApi;
  }
}

export interface TestApi {
  /** Real rules, real input, real rendering: only the clock is driven by the test. */
  advance(ms: number): void;
  getState(): MatchState;
  setPlayer(patch: Partial<Pick<ShipState, 'health' | 'maxHealth'>> & { x?: number; y?: number; heading?: number }): void;
  addEnemy(kind: Exclude<ShipKind, 'player'>, x: number, y: number, heading?: number): number;
  getCommands(): Commands;
}

export const E2E_ENABLED = import.meta.env.VITE_E2E === 'true';

export function readTestConfig(): TestConfig {
  return E2E_ENABLED ? (window.__PB_TEST__ ?? {}) : {};
}
