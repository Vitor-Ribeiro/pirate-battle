export const SCENARIOS = [
  'success',
  'empty',
  'many-pages',
  'slow',
  'variable-latency',
  'timeout',
  'server-error',
  'client-error',
  'network-error',
  'ranking-error',
  'history-error',
  'submit-timeout-after-commit',
  'submit-unavailable',
] as const;
export type ScenarioName = (typeof SCENARIOS)[number];

const KEY = 'pirate-battle:scenario:v1';

export function getScenario(): ScenarioName {
  const fromUrl = new URLSearchParams(window.location.search).get('scenario');
  const value = fromUrl ?? localStorage.getItem(KEY) ?? 'success';
  return (SCENARIOS as readonly string[]).includes(value) ? (value as ScenarioName) : 'success';
}

export function setScenario(name: ScenarioName): void {
  localStorage.setItem(KEY, name);
}

export function resetMocks(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem('pirate-battle:mock-db:v1');
}
