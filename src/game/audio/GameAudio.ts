import type { EndReason, GameEvent } from '../core/types';

const base = import.meta.env.BASE_URL;
const NAMES = [
  'cannon_broadside', 'cannon_fire_1', 'cannon_fire_2', 'cannon_fire_3', 'ship_wood_hit_1', 'ship_wood_hit_2',
  'ship_explosion_1', 'ship_explosion_2', 'ship_sinking', 'game_start', 'game_over', 'game_complete',
  'game_pause', 'game_resume', 'ocean_ambience_loop',
] as const;
type SoundName = (typeof NAMES)[number];

export class GameAudio {
  private ctx: AudioContext | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  private ambience: AudioBufferSourceNode | null = null;
  private disposed = false;
  muted = false;

  async load(): Promise<void> {
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;
      await Promise.all(
        NAMES.map(async (name) => {
          const res = await fetch(`${base}assets/sounds/${name}.wav`);
          if (!res.ok) return;
          this.buffers.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
        }),
      );
      if (this.disposed) return;
      void ctx.resume();
      this.play('game_start', 0.5);
      this.ambience?.stop();
      this.ambience = this.play('ocean_ambience_loop', 0.2, true);
    } catch {
    }
  }

  private play(name: SoundName, volume = 0.5, loop = false): AudioBufferSourceNode | null {
    const ctx = this.ctx;
    const buffer = this.buffers.get(name);
    if (!ctx || !buffer || this.muted || this.disposed) return null;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = loop;
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start();
    return source;
  }

  handle(events: readonly GameEvent[]): void {
    const playerShots = events.filter((e) => e.type === 'shot' && e.owner === 'player').length;
    if (playerShots >= 3) this.play('cannon_broadside', 0.6);
    else if (playerShots > 0) this.play(`cannon_fire_${1 + Math.floor(Math.random() * 3)}` as SoundName, 0.5);
    if (events.some((e) => e.type === 'shot' && e.owner === 'enemy')) this.play('cannon_fire_2', 0.25);
    if (events.some((e) => e.type === 'hit')) this.play(`ship_wood_hit_${1 + Math.floor(Math.random() * 2)}` as SoundName, 0.45);
    if (events.some((e) => e.type === 'explosion')) this.play(`ship_explosion_${1 + Math.floor(Math.random() * 2)}` as SoundName, 0.55);
  }

  playEnd(reason: EndReason): void {
    this.ambience?.stop();
    this.play(reason === 'time_up' ? 'game_complete' : 'game_over', 0.6);
    if (reason === 'player_destroyed') this.play('ship_sinking', 0.5);
  }
  playPause(paused: boolean): void {
    this.play(paused ? 'game_pause' : 'game_resume', 0.4);
  }

  dispose(): void {
    this.disposed = true;
    this.ambience?.stop();
    this.ambience = null;
    void this.ctx?.close();
    this.ctx = null;
    this.buffers.clear();
  }
}
