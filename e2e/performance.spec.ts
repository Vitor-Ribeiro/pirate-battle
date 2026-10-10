import { writeFileSync, mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test.skip(!process.env.PERF, 'set PERF=1 to run the performance measurement');
test.setTimeout(15 * 60_000);

test('three-minute match: frame rate, p95 frame time and entities', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pirate-battle:options:v1', JSON.stringify({ sessionSec: 180, spawnIntervalSec: 0.5 }));
    window.addEventListener('keydown', () => undefined);
  });
  await page.goto('/?perf=1');
  await page.getByRole('button', { name: 'Play' }).click();
  await page.keyboard.down('Space');
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await expect(page.getByRole('heading', { name: 'Result' })).toBeVisible({ timeout: 200_000 });
  const summary = await page.evaluate(() => JSON.parse(localStorage.getItem('pirate-battle:perf:v1') ?? 'null'));
  mkdirSync('docs', { recursive: true });
  writeFileSync('docs/perf-result.json', JSON.stringify(summary, null, 2));
  expect(summary.frames).toBeGreaterThan(1000);
});

test('memory after five start / play / exit cycles', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Performance.enable');
  const heap: number[] = [];
  await page.goto('/');
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByTestId('score')).toBeVisible();
    await page.keyboard.down('Space');
    await page.waitForTimeout(15_000);
    await page.keyboard.up('Space');
    await page.getByRole('button', { name: 'Pause' }).click();
    await page.getByRole('button', { name: 'Main Menu' }).click();
    await client.send('HeapProfiler.collectGarbage');
    const { metrics } = await client.send('Performance.getMetrics');
    heap.push((metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? 0) / 1e6);
  }
  mkdirSync('docs', { recursive: true });
  writeFileSync('docs/perf-memory.json', JSON.stringify({ heapMBAfterEachCycle: heap }, null, 2));
  expect(heap).toHaveLength(5);
});
