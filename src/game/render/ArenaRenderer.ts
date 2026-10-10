import { Container, Graphics, Sprite, TilingSprite, type Application } from 'pixi.js';
import type { GameplayConfig } from '../config/gameConfig';
import type { GameEvent, MatchState, ShipKind, ShipState } from '../core/types';
import { shipTexture, tex, tile } from './assets';

const SHIP_SCALE = 0.75;
const SHIP_ART_FACES = Math.PI / 2;
const WORLD_TILE_PX = 64;
const BAR_SCALE = 0.42;
const BAR_FILL = { x: 24, y: 12, w: 112, h: 15 };

interface ShipView {
  container: Container;
  sprite: Sprite;
  fire: Sprite;
  bar: Container;
  fill: Sprite;
  mask: Graphics;
  stage: number;
  lastHealth: number;
  lastRatio: number;
  flashMs: number;
}
interface Effect { sprite: Sprite; ageMs: number; lifeMs: number; baseScale: number; explode: boolean }

const LANDSCAPE_PHONE = '(pointer: coarse) and (orientation: landscape) and (max-height: 520px)';
const HUD_STRIP_PX = 48;

export class ArenaRenderer {
  private readonly water: TilingSprite;
  private readonly root = new Container();
  private readonly islands = new Container();
  private readonly ships = new Container();
  private readonly shots = new Container();
  private readonly effects = new Container();
  private readonly bars = new Container();
  private readonly dim = new Graphics();

  private readonly shipViews = new Map<number, ShipView>();
  private readonly shotViews = new Map<number, Sprite>();
  private readonly freeShips: ShipView[] = [];
  private readonly freeShots: Sprite[] = [];
  private readonly freeEffects: Sprite[] = [];
  private activeEffects: Effect[] = [];
  private screenW = 0;
  private screenH = 0;
  private timeMs = 0;

  constructor(private readonly app: Application, private readonly config: GameplayConfig) {
    this.water = new TilingSprite({ texture: tex('water'), width: 1, height: 1 });
    app.stage.addChild(this.water, this.root, this.dim);
    this.root.addChild(this.islands, this.ships, this.shots, this.effects, this.bars);
    this.buildIslands();
    this.fit();
  }

  private fit(): void {
    const { width, height } = this.app.screen;
    this.screenW = width;
    this.screenH = height;
    const a = this.config.arena;
    const top = window.matchMedia?.(LANDSCAPE_PHONE).matches ? HUD_STRIP_PX : 0;
    const availH = height - top;
    const s = Math.min(width / a.widthPx, availH / a.heightPx);
    const arenaW = a.widthPx * s;
    const arenaH = a.heightPx * s;
    const ox = (width - arenaW) / 2;
    const oy = top + (availH - arenaH) / 2;
    this.root.scale.set(s);
    this.root.position.set(ox, oy);
    this.water.width = width;
    this.water.height = height;
    this.water.tileScale.set((s * WORLD_TILE_PX) / 128);
    this.dim.clear();
    this.dim.rect(0, 0, width, oy).rect(0, oy + arenaH, width, height - oy - arenaH).rect(0, oy, ox, arenaH).rect(width - ox, oy, ox, arenaH);
    this.dim.fill({ color: 0x021018, alpha: 0.55 });
  }

  private buildIslands(): void {
    for (const island of this.config.arena.islands) {
      const c = new Container();
      const grass = island.art !== 'sand';
      const cols = grass ? [5, 6, 7, 8] : [0, 1, 2];
      const rows = grass ? [0, 1, 2, 3] : [0, 1, 2];
      const size = cols.length * WORLD_TILE_PX;
      rows.forEach((row, r) =>
        cols.forEach((col, k) => {
          const s = new Sprite(tile(col, row));
          s.width = WORLD_TILE_PX + 0.5;
          s.height = WORLD_TILE_PX + 0.5;
          s.position.set(k * WORLD_TILE_PX, r * WORLD_TILE_PX);
          c.addChild(s);
        }),
      );
      c.position.set(island.x - size / 2, island.y - size / 2);
      this.islands.addChild(c);
    }
  }

  private makeShipView(): ShipView {
    const container = new Container();
    const sprite = new Sprite(shipTexture('player', 0));
    sprite.anchor.set(0.5);
    sprite.scale.set(SHIP_SCALE);
    const fire = new Sprite(tex('fire_1'));
    fire.anchor.set(0.5);
    fire.visible = false;
    container.addChild(sprite, fire);

    const bar = new Container();
    const frame = new Sprite(tex('enemy_health_frame'));
    const fill = new Sprite(tex('enemy_health_fill_green'));
    const mask = new Graphics();
    fill.mask = mask;
    bar.addChild(frame, fill, mask);
    bar.pivot.set(80, 20);
    bar.scale.set(BAR_SCALE);

    this.ships.addChild(container);
    this.bars.addChild(bar);
    return { container, sprite, fire, bar, fill, mask, stage: -1, lastHealth: -1, lastRatio: -1, flashMs: 0 };
  }

  private syncShip(ship: ShipState, seen: Set<number>): void {
    seen.add(ship.id);
    let view = this.shipViews.get(ship.id);
    if (!view) {
      view = this.freeShips.pop() ?? this.makeShipView();
      view.container.visible = true;
      view.bar.visible = true;
      view.stage = -1;
      view.lastHealth = ship.health;
      view.lastRatio = -1;
      view.flashMs = 0;
      this.shipViews.set(ship.id, view);
    }
    const ratio = ship.health / ship.maxHealth;
    const stage = ratio > 0.75 ? 0 : ratio > 0.5 ? 1 : ratio > 0.25 ? 2 : 3;
    if (stage !== view.stage) {
      view.stage = stage;
      view.sprite.texture = shipTexture(ship.kind as ShipKind, stage);
    }
    if (ship.health < view.lastHealth) view.flashMs = 90;
    view.lastHealth = ship.health;
    view.sprite.tint = view.flashMs > 0 ? 0xff8f8f : 0xffffff;

    view.container.position.set(ship.pos.x, ship.pos.y);
    view.sprite.rotation = ship.heading - SHIP_ART_FACES;
    const burning = stage >= 2;
    view.fire.visible = burning;
    if (burning) {
      view.fire.texture = tex(Math.floor(this.timeMs / 120) % 2 === 0 ? 'fire_1' : 'fire_2');
      view.fire.position.set(Math.cos(ship.heading) * -8, Math.sin(ship.heading) * -8);
    }

    view.bar.position.set(ship.pos.x, ship.pos.y - ship.radius - 26);
    if (ratio !== view.lastRatio) {
      view.lastRatio = ratio;
      view.fill.texture = tex(ratio > 0.4 ? 'enemy_health_fill_green' : 'enemy_health_fill_red');
      view.mask.clear().rect(BAR_FILL.x, BAR_FILL.y, BAR_FILL.w * Math.max(0, ratio), BAR_FILL.h).fill(0xffffff);
    }
  }

  private recycleShip(view: ShipView): void {
    view.container.visible = false;
    view.bar.visible = false;
    this.freeShips.push(view);
  }

  private spawnEffect(tint: number, x: number, y: number, scale: number, lifeMs: number, explode: boolean): void {
    const sprite = this.freeEffects.pop() ?? new Sprite(tex('explosion_3'));
    if (!sprite.parent) this.effects.addChild(sprite);
    sprite.anchor.set(0.5);
    sprite.texture = tex('explosion_3');
    sprite.tint = tint;
    sprite.visible = true;
    sprite.alpha = 1;
    sprite.position.set(x, y);
    this.activeEffects.push({ sprite, ageMs: 0, lifeMs, baseScale: scale, explode });
  }

  private handleEvent(e: GameEvent): void {
    if (e.type === 'shot') this.spawnEffect(0xffe9a8, e.pos.x + Math.cos(e.heading) * 8, e.pos.y + Math.sin(e.heading) * 8, 0.45, 150, false);
    else if (e.type === 'hit') this.spawnEffect(0xffb347, e.pos.x, e.pos.y, 0.6, 220, false);
    else this.spawnEffect(0xffffff, e.pos.x, e.pos.y, Math.max(0.9, e.radius / 24), 520, true);
  }

  private updateEffects(dtMs: number): void {
    const alive: Effect[] = [];
    for (const fx of this.activeEffects) {
      fx.ageMs += dtMs;
      const t = fx.ageMs / fx.lifeMs;
      if (t >= 1) {
        fx.sprite.visible = false;
        this.freeEffects.push(fx.sprite);
        continue;
      }
      if (fx.explode) fx.sprite.texture = tex(`explosion_${Math.min(3, 1 + Math.floor(t * 3))}`);
      fx.sprite.scale.set(fx.baseScale * (0.7 + 0.7 * t));
      fx.sprite.alpha = 1 - t * t;
      alive.push(fx);
    }
    this.activeEffects = alive;
  }

  sync(state: Readonly<MatchState>, dtMs: number): void {
    if (this.app.screen.width !== this.screenW || this.app.screen.height !== this.screenH) this.fit();
    if (state.status === 'running') {
      this.timeMs += dtMs;
      for (const view of this.shipViews.values()) view.flashMs = Math.max(0, view.flashMs - dtMs);
    }
    this.water.tilePosition.set(this.timeMs * 0.01, this.timeMs * 0.006);

    const seen = new Set<number>();
    if (state.player.alive) this.syncShip(state.player, seen);
    for (const e of state.enemies) if (e.alive) this.syncShip(e, seen);
    for (const [id, view] of this.shipViews) {
      if (!seen.has(id)) {
        this.recycleShip(view);
        this.shipViews.delete(id);
      }
    }

    const seenShots = new Set<number>();
    for (const p of state.projectiles) {
      seenShots.add(p.id);
      let s = this.shotViews.get(p.id);
      if (!s) {
        s = this.freeShots.pop() ?? new Sprite(tex('cannon_ball'));
        if (!s.parent) this.shots.addChild(s);
        s.anchor.set(0.5);
        s.scale.set(0.9);
        s.visible = true;
        this.shotViews.set(p.id, s);
      }
      s.position.set(p.pos.x, p.pos.y);
    }
    for (const [id, s] of this.shotViews) {
      if (!seenShots.has(id)) {
        s.visible = false;
        this.freeShots.push(s);
        this.shotViews.delete(id);
      }
    }

    for (const e of state.events) this.handleEvent(e);
    if (state.status === 'running') this.updateEffects(dtMs);
  }

  dispose(): void {
    this.root.destroy({ children: true });
    this.water.destroy();
    this.dim.destroy();
    this.shipViews.clear();
    this.shotViews.clear();
    this.freeShips.length = 0;
    this.freeShots.length = 0;
    this.freeEffects.length = 0;
    this.activeEffects = [];
  }
}
