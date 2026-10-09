import { Assets, Rectangle, Texture } from 'pixi.js';

const base = import.meta.env.BASE_URL;
const url = (path: string): string => `${base}assets/${path}`;

type ShipKind = 'player' | 'chaser' | 'shooter';
/** Ship art: 6 colors x 4 damage stages. Stage n of color c is ship_(c + 6n). */
const SHIP_COLOR: Record<ShipKind, number> = { player: 5, chaser: 3, shooter: 2 };
export const SHIP_STAGES = 4;

export const ASSET_URLS: Record<string, string> = {
  cannon_ball: url('png/default/ship_parts/cannon_ball.png'),
  explosion_1: url('png/default/effects/explosion_1.png'),
  explosion_2: url('png/default/effects/explosion_2.png'),
  explosion_3: url('png/default/effects/explosion_3.png'),
  fire_1: url('png/default/effects/fire_1.png'),
  fire_2: url('png/default/effects/fire_2.png'),
  water: url('png/retina/tiles/tile_73.png'),
  tiles_sheet: url('tilesheet/tiles_sheet_retina.png'),
  enemy_health_frame: url('png/default/ui/hud/enemy_health_frame.png'),
  enemy_health_fill_green: url('png/default/ui/hud/enemy_health_fill_green.png'),
  enemy_health_fill_red: url('png/default/ui/hud/enemy_health_fill_red.png'),
};
for (const kind of Object.keys(SHIP_COLOR) as ShipKind[]) {
  for (let stage = 0; stage < SHIP_STAGES; stage++) {
    ASSET_URLS[`ship_${kind}_${stage}`] = url(`png/default/ships/ship_${SHIP_COLOR[kind] + 6 * stage}.png`);
  }
}

const textures = new Map<string, Texture>();
const tileCache = new Map<string, Texture>();

/**
 * Loads every texture once and reuses it between matches (textures are never destroyed on exit).
 * Rejects with a readable error so the UI can show "Retry".
 */
export async function loadAssets(onProgress: (ratio: number) => void): Promise<void> {
  const entries = Object.entries(ASSET_URLS).filter(([key]) => !textures.has(key));
  let done = 0;
  const total = entries.length || 1;
  try {
    await Promise.all(
      entries.map(async ([key, src]) => {
        textures.set(key, await Assets.load<Texture>(src));
        done += 1;
        onProgress(done / total);
      }),
    );
  } catch (cause) {
    throw new Error('Could not load game assets. Check your connection and try again.', { cause });
  }
  const water = textures.get('water');
  if (water) water.source.style.addressMode = 'repeat';
  onProgress(1);
}

export function tex(key: string): Texture {
  const t = textures.get(key);
  if (!t) throw new Error(`Texture "${key}" was not loaded`);
  return t;
}

export function shipTexture(kind: ShipKind, stage: number): Texture {
  return tex(`ship_${kind}_${Math.min(Math.max(stage, 0), SHIP_STAGES - 1)}`);
}

/** One 128x128 tile of the retina sheet (a 64 px tile in world units) by column and row. */
export function tile(col: number, row: number): Texture {
  const key = `${col},${row}`;
  const cached = tileCache.get(key);
  if (cached) return cached;
  const t = new Texture({ source: tex('tiles_sheet').source, frame: new Rectangle(col * 128, row * 128, 128, 128) });
  tileCache.set(key, t);
  return t;
}
