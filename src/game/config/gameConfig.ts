// All balance parameters live here. Systems read the config; they never hard-code numbers.

export interface WeaponConfig {
  readonly damage: number;
  readonly speedPxPerSec: number;
  readonly lifetimeMs: number;
  readonly cooldownMs: number;
}
export interface SideWeaponConfig extends WeaponConfig {
  readonly projectilesPerSide: number;
  readonly lateralSpacingPx: number;
}
export interface ShipConfig {
  readonly maxHealth: number;
  readonly moveSpeedPxPerSec: number;
  readonly turnSpeedRadPerSec: number;
  readonly radiusPx: number;
}
export interface IslandConfig {
  readonly x: number;
  readonly y: number;
  readonly radiusPx: number;
  /** Which island sprite the renderer draws over the collision circle. */
  readonly art?: 'grass' | 'sand';
}
export interface GameplayConfig {
  readonly session: { readonly durationSec: number };
  readonly arena: { readonly widthPx: number; readonly heightPx: number; readonly islands: readonly IslandConfig[] };
  readonly spawn: {
    readonly intervalSec: number;
    readonly minDistanceFromPlayerPx: number;
    readonly maxAlive: number;
    readonly weights: { readonly chaser: number; readonly shooter: number };
  };
  readonly player: ShipConfig & { readonly frontWeapon: WeaponConfig; readonly sideWeapon: SideWeaponConfig };
  readonly chaser: ShipConfig & { readonly contactDamage: number };
  readonly shooter: ShipConfig & { readonly attackRangePx: number; readonly weapon: WeaponConfig };
}

/** Options exposed in the Options screen. */
export interface UserOptions {
  sessionSec: number;
  spawnIntervalSec: number;
}

/** Documented limits (also shown in the Options screen and README). */
export const OPTION_LIMITS = {
  sessionSec: { min: 60, max: 180 },
  spawnIntervalSec: { min: 0.5, max: 10 },
} as const;

export const DEFAULT_OPTIONS: UserOptions = { sessionSec: 120, spawnIntervalSec: 2 };

// Balance values are initial choices; decisions are recorded in ARCHITECTURE.md (section 8).
export const BASE_GAMEPLAY: GameplayConfig = {
  session: { durationSec: DEFAULT_OPTIONS.sessionSec },
  arena: {
    widthPx: 1600,
    heightPx: 900,
    // Islands are circles for collisions (ships and projectiles). The renderer draws island sprites over them.
    islands: [
      { x: 480, y: 300, radiusPx: 112, art: 'grass' },
      { x: 1150, y: 620, radiusPx: 84, art: 'sand' },
    ],
  },
  spawn: {
    intervalSec: DEFAULT_OPTIONS.spawnIntervalSec,
    minDistanceFromPlayerPx: 350,
    maxAlive: 12,
    weights: { chaser: 1, shooter: 1 },
  },
  player: {
    maxHealth: 100,
    moveSpeedPxPerSec: 180,
    turnSpeedRadPerSec: 2.4,
    radiusPx: 22,
    frontWeapon: { damage: 10, speedPxPerSec: 520, lifetimeMs: 1200, cooldownMs: 350 },
    sideWeapon: { damage: 8, speedPxPerSec: 460, lifetimeMs: 1000, cooldownMs: 1400, projectilesPerSide: 3, lateralSpacingPx: 14 },
  },
  chaser: { maxHealth: 30, moveSpeedPxPerSec: 130, turnSpeedRadPerSec: 2.0, radiusPx: 20, contactDamage: 20 },
  shooter: {
    maxHealth: 40,
    moveSpeedPxPerSec: 100,
    turnSpeedRadPerSec: 1.6,
    radiusPx: 22,
    attackRangePx: 380,
    weapon: { damage: 8, speedPxPerSec: 380, lifetimeMs: 1400, cooldownMs: 1600 },
  },
};

export type OptionErrors = Partial<Record<keyof UserOptions, string>>;

export function validateOptions(o: UserOptions): OptionErrors {
  const errors: OptionErrors = {};
  const s = OPTION_LIMITS.sessionSec;
  const p = OPTION_LIMITS.spawnIntervalSec;
  if (!Number.isFinite(o.sessionSec) || o.sessionSec < s.min || o.sessionSec > s.max) {
    errors.sessionSec = `Enter a value between ${s.min} and ${s.max} seconds.`;
  }
  if (!Number.isFinite(o.spawnIntervalSec) || o.spawnIntervalSec < p.min || o.spawnIntervalSec > p.max) {
    errors.spawnIntervalSec = `Enter a value between ${p.min} and ${p.max} seconds.`;
  }
  return errors;
}

/** Snapshot used by one match. Later changes in Options only affect new matches. */
export function createSessionConfig(o: UserOptions): GameplayConfig {
  return structuredClone({
    ...BASE_GAMEPLAY,
    session: { durationSec: o.sessionSec },
    spawn: { ...BASE_GAMEPLAY.spawn, intervalSec: o.spawnIntervalSec },
  });
}

/** Key used to compare matches with the same configuration in the ranking. */
export function configKey(o: UserOptions): string {
  return `${o.sessionSec}-${o.spawnIntervalSec}`;
}
