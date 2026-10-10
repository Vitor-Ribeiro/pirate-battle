export interface PerfSummary {
  frames: number;
  durationSec: number;
  avgFps: number;
  p95FrameMs: number;
  maxFrameMs: number;
  maxEntities: number;
}

export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)] ?? 0;
}

export class PerfRecorder {
  private readonly frames: number[] = [];
  private maxEntities = 0;

  sample(frameMs: number, entities: number): void {
    if (frameMs <= 0) return;
    this.frames.push(frameMs);
    if (entities > this.maxEntities) this.maxEntities = entities;
  }

  summary(): PerfSummary {
    const sorted = [...this.frames].sort((a, b) => a - b);
    const total = sorted.reduce((a, b) => a + b, 0);
    return {
      frames: sorted.length,
      durationSec: total / 1000,
      avgFps: total > 0 ? (sorted.length / total) * 1000 : 0,
      p95FrameMs: percentile(sorted, 95),
      maxFrameMs: sorted[sorted.length - 1] ?? 0,
      maxEntities: this.maxEntities,
    };
  }
}

export const PERF_KEY = 'pirate-battle:perf:v1';
export const perfEnabled = (): boolean => new URLSearchParams(window.location.search).has('perf');
