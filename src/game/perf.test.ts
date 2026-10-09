import { describe, expect, it } from 'vitest';
import { PerfRecorder, percentile } from './perf';

describe('perf recorder', () => {
  it('computes percentiles on sorted data', () => {
    const data = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(data, 95)).toBe(95);
    expect(percentile(data, 50)).toBe(50);
    expect(percentile([], 95)).toBe(0);
  });

  it('summarizes fps, p95 and entities', () => {
    const rec = new PerfRecorder();
    for (let i = 0; i < 99; i++) rec.sample(16, 10 + i);
    rec.sample(100, 5);
    const s = rec.summary();
    expect(s.frames).toBe(100);
    expect(s.maxFrameMs).toBe(100);
    expect(s.p95FrameMs).toBe(16);
    expect(s.maxEntities).toBe(108);
    expect(Math.round(s.avgFps)).toBe(59);
  });

  it('ignores zero-length frames', () => {
    const rec = new PerfRecorder();
    rec.sample(0, 3);
    expect(rec.summary().frames).toBe(0);
  });
});
