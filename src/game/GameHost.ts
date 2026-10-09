import { Application } from 'pixi.js';
import { hudStore } from '../state/hudStore';
import { GameAudio } from './audio/GameAudio';
import type { GameplayConfig } from './config/gameConfig';
import { createSimulation } from './core/simulation';
import { NO_COMMANDS, type Commands, type MatchResult, type Simulation } from './core/types';
import { KeyboardInput } from './input/keyboard';
import { TouchInput } from './input/touch';
import { ArenaRenderer } from './render/ArenaRenderer';
import { loadAssets } from './render/assets';
import { PERF_KEY, PerfRecorder, perfEnabled } from './perf';
import { E2E_ENABLED, readTestConfig, type TestApi } from './testHooks';

interface HostCallbacks {
  onEnd: (result: MatchResult) => void;
  onLoadProgress?: (ratio: number) => void;
}

const END_DELAY_MS = 900; // lets the final explosion play before the result screen
const COMMAND_KEYS = Object.keys(NO_COMMANDS) as (keyof Commands)[];

/**
 * Glue between the pure simulation, PixiJS, audio and input.
 * Strict Mode safe: dispose() can run while start() is still awaiting.
 */
export class GameHost {
  private app: Application | null = null;
  private sim: Simulation | null = null;
  private renderer: ArenaRenderer | null = null;
  private disposed = false;
  private resizeTimer = 0;
  private endTimer: number | undefined;
  private endNotified = false;
  private lastHudMs = -Infinity;
  private readonly manualClock: boolean;
  private readonly perf = perfEnabled() ? new PerfRecorder() : null;
  private readonly seed: number;
  private readonly merged: Commands = { ...NO_COMMANDS };
  private readonly keyboard = new KeyboardInput();
  private readonly audio = new GameAudio();
  readonly touch = new TouchInput();

  constructor(
    private readonly parent: HTMLElement,
    private readonly config: GameplayConfig,
    private readonly callbacks: HostCallbacks,
    seed?: number,
  ) {
    const test = readTestConfig();
    this.manualClock = test.manualClock === true;
    this.seed = seed ?? test.seed ?? (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  async start(): Promise<void> {
    const app = new Application();
    await app.init({
      resizeTo: this.parent,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      background: 0x1d7fa8,
    });
    if (this.disposed) {
      app.destroy(true, { children: true }); // unmounted while initializing (Strict Mode)
      return;
    }
    this.app = app;
    try {
      await loadAssets((r) => this.callbacks.onLoadProgress?.(r));
    } catch (error) {
      this.destroyApp();
      throw error;
    }
    if (this.disposed) {
      this.destroyApp();
      return;
    }

    this.parent.appendChild(app.canvas);
    this.renderer = new ArenaRenderer(app, this.config);
    this.sim = createSimulation(this.config, this.seed);
    this.keyboard.attach();
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('orientationchange', this.onViewport);
    window.visualViewport?.addEventListener('resize', this.onViewport);
    void this.audio.load();
    if (E2E_ENABLED) window.__pb = this.createTestApi();
    app.ticker.add(this.tick);
  }

  private mergeInput(): Commands {
    const kb = this.keyboard.getCommands();
    const touch = this.touch.getCommands();
    for (const key of COMMAND_KEYS) this.merged[key] = kb[key] || touch[key];
    return this.merged;
  }

  private publishHud(force = false): void {
    if (!this.sim) return;
    const s = this.sim.getState();
    if (!force && s.elapsedMs - this.lastHudMs < 100 && s.status !== 'ended') return;
    this.lastHudMs = s.elapsedMs; // ~10 Hz, never every frame
    hudStore.publish({
      score: s.score,
      timeLeftSec: Math.max(0, Math.ceil(this.config.session.durationSec - s.elapsedMs / 1000)),
      health: s.player.health,
      maxHealth: s.player.maxHealth,
      status: s.status,
    });
  }

  private readonly tick = (): void => {
    if (!this.app || !this.sim || !this.renderer) return;
    const dt = this.manualClock ? 0 : this.app.ticker.deltaMS; // with a manual clock the test advances time
    this.sim.step(dt, this.mergeInput());
    const s = this.sim.getState();
    if (s.status === 'running') this.perf?.sample(this.app.ticker.deltaMS, s.enemies.length + s.projectiles.length + 1);
    this.renderer.sync(s, dt);
    this.audio.handle(s.events);
    this.publishHud();

    if (s.status === 'ended' && s.endReason && !this.endNotified) {
      this.endNotified = true;
      this.audio.playEnd(s.endReason);
      this.savePerf();
      const result: MatchResult = {
        matchId: crypto.randomUUID(),
        score: s.score,
        durationMs: Math.round(s.elapsedMs),
        endReason: s.endReason,
        sessionSec: this.config.session.durationSec,
        spawnIntervalSec: this.config.spawn.intervalSec,
      };
      this.endTimer = window.setTimeout(() => this.callbacks.onEnd(result), END_DELAY_MS);
    }
  };

  /** Test instrumentation (E2E builds only). It observes state and drives the clock; it does not change the rules. */
  private createTestApi(): TestApi {
    const sim = (): Simulation => {
      if (!this.sim) throw new Error('No match is running');
      return this.sim;
    };
    return {
      advance: (ms) => {
        const step = 16;
        let pendingDt = 0;
        for (let t = 0, i = 0; t < ms; t += step, i++) {
          const dt = Math.min(step, ms - t);
          sim().step(dt, this.mergeInput());
          pendingDt += dt;
          const s = sim().getState();
          // Drawing every 16 ms step is slow under software WebGL; draw about every 160 ms and at the end.
          if (i % 10 === 9 || t + step >= ms || s.status !== 'running') {
            this.renderer?.sync(s, pendingDt);
            this.audio.handle(s.events);
            pendingDt = 0;
          }
          if (s.status !== 'running') break;
        }
        this.publishHud(true);
      },
      getState: () => JSON.parse(JSON.stringify(sim().getState())) as ReturnType<TestApi['getState']>,
      setPlayer: (patch) => {
        const p = sim().getState().player;
        if (patch.x !== undefined) p.pos.x = patch.x;
        if (patch.y !== undefined) p.pos.y = patch.y;
        if (patch.heading !== undefined) p.heading = patch.heading;
        if (patch.health !== undefined) p.health = patch.health;
        if (patch.maxHealth !== undefined) p.maxHealth = patch.maxHealth;
      },
      addEnemy: (kind, x, y, heading = 0) => {
        const st = sim().getState();
        const cfg = kind === 'chaser' ? this.config.chaser : this.config.shooter;
        const id = 100000 + st.enemies.length + Math.floor(st.elapsedMs);
        st.enemies.push({ id, kind, pos: { x, y }, heading, health: cfg.maxHealth, maxHealth: cfg.maxHealth, radius: cfg.radiusPx, alive: true, cooldownsMs: { front: 0, left: 0, right: 0 } });
        return id;
      },
      getCommands: () => ({ ...this.mergeInput() }),
    };
  }

  private savePerf(): void {
    if (!this.perf) return;
    const summary = this.perf.summary();
    localStorage.setItem(PERF_KEY, JSON.stringify(summary));
    console.info('Pirate Battle performance', summary);
  }

  private readonly onVisibility = (): void => {
    if (document.hidden) this.pause();
  };
  private readonly onBlur = (): void => this.pause();

  /** Phones report the new size late after a rotation or when the browser bars move, so re-measure a few times. */
  private readonly onViewport = (): void => {
    window.clearTimeout(this.resizeTimer);
    const measure = (): void => this.app?.resize();
    measure();
    window.requestAnimationFrame(measure);
    this.resizeTimer = window.setTimeout(() => {
      measure();
      this.resizeTimer = window.setTimeout(measure, 400);
    }, 200);
  };

  pause(): void {
    if (this.sim?.getState().status !== 'running') return;
    this.sim.pause();
    this.audio.playPause(true);
    this.publishHud(true);
  }

  /** Needs a player action. Nothing pressed or fired during the pause is carried over. */
  resume(): void {
    if (this.sim?.getState().status !== 'paused') return;
    this.keyboard.clear();
    this.touch.clear();
    this.sim.resume();
    this.audio.playPause(false);
    this.publishHud(true);
  }

  togglePause(): void {
    if (this.sim?.getState().status === 'paused') this.resume();
    else this.pause();
  }

  private destroyApp(): void {
    if (!this.app) return;
    this.app.ticker.remove(this.tick);
    this.app.destroy(true, { children: true, texture: false });
    this.app = null;
  }

  dispose(): void {
    this.disposed = true;
    window.clearTimeout(this.endTimer);
    this.keyboard.detach();
    this.touch.clear();
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('orientationchange', this.onViewport);
    window.visualViewport?.removeEventListener('resize', this.onViewport);
    window.clearTimeout(this.resizeTimer);
    this.audio.dispose();
    this.renderer?.dispose();
    this.renderer = null;
    this.sim = null;
    this.destroyApp();
    if (E2E_ENABLED) delete window.__pb;
    hudStore.reset();
  }
}
