export interface Vec2 { x: number; y: number }

export type EndReason = 'time_up' | 'player_destroyed';

export interface Commands {
  forward: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  fireFront: boolean;
  fireLeft: boolean;
  fireRight: boolean;
}
export const NO_COMMANDS: Commands = {
  forward: false, turnLeft: false, turnRight: false, fireFront: false, fireLeft: false, fireRight: false,
};

export type ShipKind = 'player' | 'chaser' | 'shooter';

export interface ShipState {
  id: number;
  kind: ShipKind;
  pos: Vec2;
  heading: number;
  health: number;
  maxHealth: number;
  radius: number;
  alive: boolean;
  cooldownsMs: ShipCooldowns;
}

export interface ShipCooldowns { front: number; left: number; right: number }

export interface Island { x: number; y: number; radius: number }

export type GameEvent =
  | { type: 'shot'; owner: 'player' | 'enemy'; pos: Vec2; heading: number }
  | { type: 'hit'; target: 'player' | 'enemy'; pos: Vec2 }
  | { type: 'explosion'; pos: Vec2; radius: number };

export interface ProjectileState {
  id: number;
  owner: 'player' | 'enemy';
  pos: Vec2;
  vel: Vec2;
  damage: number;
  ttlMs: number;
  alive: boolean;
}

export type MatchStatus = 'running' | 'paused' | 'ended';

export interface MatchState {
  status: MatchStatus;
  elapsedMs: number;
  score: number;
  kills: number;
  player: ShipState;
  enemies: ShipState[];
  projectiles: ProjectileState[];
  islands: Island[];
  events: GameEvent[];
  endReason: EndReason | null;
}

export interface MatchResult {
  matchId: string;
  score: number;
  durationMs: number;
  endReason: EndReason;
  sessionSec: number;
  spawnIntervalSec: number;
}

export interface Simulation {
  step(dtMs: number, commands: Commands): void;
  getState(): Readonly<MatchState>;
  pause(): void;
  resume(): void;
}
