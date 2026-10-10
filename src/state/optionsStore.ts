import { DEFAULT_OPTIONS, validateOptions, type UserOptions } from '../game/config/gameConfig';

const KEY = 'pirate-battle:options:v1';

export function loadOptions(): UserOptions {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_OPTIONS };
    const parsed = JSON.parse(raw) as Partial<UserOptions>;
    const candidate: UserOptions = {
      sessionSec: Number(parsed.sessionSec),
      spawnIntervalSec: Number(parsed.spawnIntervalSec),
    };
    return Object.keys(validateOptions(candidate)).length === 0 ? candidate : { ...DEFAULT_OPTIONS };
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

export function saveOptions(options: UserOptions): void {
  localStorage.setItem(KEY, JSON.stringify(options));
}
