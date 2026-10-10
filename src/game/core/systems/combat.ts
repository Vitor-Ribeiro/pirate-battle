import type { WeaponConfig } from '../../config/gameConfig';
import type { ShipState, Vec2 } from '../types';
import type { World } from '../world';

export function spawnProjectile(w: World, owner: 'player' | 'enemy', pos: Vec2, heading: number, weapon: WeaponConfig): void {
  w.state.projectiles.push({
    id: w.nextId++,
    owner,
    pos: { x: pos.x, y: pos.y },
    vel: { x: Math.cos(heading) * weapon.speedPxPerSec, y: Math.sin(heading) * weapon.speedPxPerSec },
    damage: weapon.damage,
    ttlMs: weapon.lifetimeMs,
    alive: true,
  });
  w.state.events.push({ type: 'shot', owner, pos: { x: pos.x, y: pos.y }, heading });
}

export function damagePlayer(w: World, amount: number): void {
  const p = w.state.player;
  if (!p.alive) return;
  p.health = Math.max(0, p.health - amount);
  w.state.events.push({ type: 'hit', target: 'player', pos: { ...p.pos } });
  if (p.health <= 0) {
    p.alive = false;
    w.state.events.push({ type: 'explosion', pos: { ...p.pos }, radius: p.radius * 2 });
  }
}

export function damageEnemy(w: World, enemy: ShipState, amount: number): boolean {
  if (!enemy.alive) return false;
  enemy.health = Math.max(0, enemy.health - amount);
  w.state.events.push({ type: 'hit', target: 'enemy', pos: { ...enemy.pos } });
  if (enemy.health > 0) return false;
  enemy.alive = false;
  w.state.events.push({ type: 'explosion', pos: { ...enemy.pos }, radius: enemy.radius * 2 });
  return true;
}
