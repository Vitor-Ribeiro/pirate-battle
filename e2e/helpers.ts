import type { Page } from '@playwright/test';
import { expect } from './fixtures';
import type { MatchState } from '../src/game/core/types';
import type {} from '../src/game/testHooks'; // types only: never execute src code in the Node test runner

export interface Setup {
  sessionSec?: number;
  spawnIntervalSec?: number;
  scenario?: string;
  seed?: number;
  /** true: the test owns the simulation clock through window.__pb.advance(ms). */
  manualClock?: boolean;
}

/** Seeds localStorage (only when empty, so reloads keep what the app saved) and the test config. */
export async function prepare(page: Page, setup: Setup = {}): Promise<void> {
  await page.addInitScript((s: Setup) => {
    const setOnce = (key: string, value: string) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    };
    setOnce('pirate-battle:options:v1', JSON.stringify({ sessionSec: s.sessionSec ?? 60, spawnIntervalSec: s.spawnIntervalSec ?? 10 }));
    if (s.scenario) setOnce('pirate-battle:scenario:v1', s.scenario);
    window.__PB_TEST__ = { seed: s.seed ?? 1, manualClock: s.manualClock ?? false };
  }, setup);
}

export async function startMatch(page: Page, setup: Setup = {}): Promise<void> {
  await prepare(page, { manualClock: true, ...setup });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByTestId('score')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => window.__pb !== undefined);
}

export const advance = (page: Page, ms: number): Promise<void> => page.evaluate((t) => window.__pb?.advance(t), ms);
export const getState = (page: Page): Promise<MatchState> => page.evaluate(() => window.__pb!.getState());
export const setPlayer = (page: Page, patch: Parameters<NonNullable<Window['__pb']>['setPlayer']>[0]): Promise<void> =>
  page.evaluate((p) => window.__pb?.setPlayer(p), patch);
export const addEnemy = (page: Page, kind: 'chaser' | 'shooter', x: number, y: number, heading = 0): Promise<number> =>
  page.evaluate(([k, a, b, h]) => window.__pb!.addEnemy(k as 'chaser' | 'shooter', a as number, b as number, h as number), [kind, x, y, heading] as const);

/** Plays a whole match instantly: the player cannot die, then the clock runs to the end. */
export async function finishMatchByTime(page: Page, sessionSec = 60): Promise<void> {
  await setPlayer(page, { health: 1e9, maxHealth: 1e9 });
  await advance(page, sessionSec * 1000 + 500);
}

export async function showTab(page: Page, name: 'Ranking' | 'Match History'): Promise<void> {
  await page.getByRole('tab', { name }).click();
}

/** The scenario selector lives in a collapsed <details>: open it first. */
export async function chooseScenario(page: Page, name: string): Promise<void> {
  await page.getByText('Network scenarios (mock API)').click();
  await page.getByLabel('Scenario').selectOption(name);
}

/** Changes the scenario WITHOUT refreshing the lists (so "Try again" can be tested). */
export async function setScenarioQuietly(page: Page, name: string): Promise<void> {
  await page.evaluate((n) => localStorage.setItem('pirate-battle:scenario:v1', n), name);
}

/** Advances and reads the state in ONE evaluate: after the match ends the app leaves the match screen and removes window.__pb. */
export const advanceAndGet = (page: Page, ms: number): Promise<MatchState> =>
  page.evaluate((t) => {
    window.__pb!.advance(t);
    return JSON.parse(JSON.stringify(window.__pb!.getState()));
  }, ms);
