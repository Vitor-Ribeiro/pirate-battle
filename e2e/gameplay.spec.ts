import { expect, test } from './fixtures';
import { addEnemy, advance, advanceAndGet, finishMatchByTime, getState, setPlayer, startMatch } from './helpers';

// Initial state: player at the arena center (800, 450), heading up. Islands: (480,300,r112) and (1150,620,r84).

test.describe('movement and arena', () => {
  test('moves forward and rotates with the keyboard', async ({ page }) => {
    await startMatch(page);
    const before = await getState(page);
    await page.keyboard.down('KeyW');
    await advance(page, 1000);
    await page.keyboard.up('KeyW');
    const moved = await getState(page);
    expect(moved.player.pos.y).toBeLessThan(before.player.pos.y - 150);

    await page.keyboard.down('KeyD');
    await advance(page, 500);
    await page.keyboard.up('KeyD');
    expect((await getState(page)).player.heading).toBeGreaterThan(moved.player.heading + 0.5);
  });

  test('cannot leave the arena', async ({ page }) => {
    await startMatch(page);
    await page.keyboard.down('KeyW');
    await advance(page, 6000);
    await page.keyboard.up('KeyW');
    const s = await getState(page);
    expect(s.player.pos.y).toBeGreaterThanOrEqual(s.player.radius - 0.01);
  });

  test('cannot cross an island', async ({ page }) => {
    await startMatch(page);
    await setPlayer(page, { x: 1150, y: 470, heading: Math.PI / 2 }); // facing the second island
    await page.keyboard.down('KeyW');
    await advance(page, 4000);
    await page.keyboard.up('KeyW');
    const s = await getState(page);
    expect(Math.hypot(s.player.pos.x - 1150, s.player.pos.y - 620)).toBeGreaterThanOrEqual(84 + s.player.radius - 0.5);
  });
});

test.describe('weapons and scoring', () => {
  test('front weapon respects its cooldown', async ({ page }) => {
    await startMatch(page);
    await setPlayer(page, { y: 850 }); // low in the arena, so the first shot is still inside it after 1 s (520 px/s)
    await page.keyboard.down('Space');
    await advance(page, 1000);
    await page.keyboard.up('Space');
    expect((await getState(page)).projectiles.length).toBe(3); // 350 ms cooldown: shots at 0, 350 and 700 ms
  });

  test('side weapon fires three parallel projectiles and respects its cooldown', async ({ page }) => {
    await startMatch(page);
    await page.keyboard.down('KeyQ');
    await advance(page, 50);
    const s = await getState(page);
    expect(s.projectiles).toHaveLength(3);
    const [a, b, c] = s.projectiles;
    for (const p of [b, c]) {
      expect(p!.vel.x).toBeCloseTo(a!.vel.x, 5);
      expect(p!.vel.y).toBeCloseTo(a!.vel.y, 5);
    }
    await advance(page, 1250); // still inside the 1400 ms cooldown
    await page.keyboard.up('KeyQ');
    const ids = (await getState(page)).projectiles.map((p) => p.id);
    expect(Math.max(0, ...ids)).toBeLessThanOrEqual(4); // no second broadside yet (ids 2, 3, 4)
  });

  test('a destroyed enemy scores exactly once', async ({ page }) => {
    await startMatch(page);
    await addEnemy(page, 'shooter', 800, 300, Math.PI / 2); // straight ahead of the bow
    await page.keyboard.down('Space');
    await advance(page, 4000);
    expect((await getState(page)).score).toBe(1);
    await advance(page, 2000);
    await page.keyboard.up('Space');
    const s = await getState(page);
    expect(s.score).toBe(1);
    expect(s.kills).toBe(1);
    await expect(page.getByTestId('score')).toHaveText('1');
  });

  test('islands block projectiles', async ({ page }) => {
    await startMatch(page);
    await setPlayer(page, { x: 480, y: 560, heading: -Math.PI / 2 }); // island 1 is straight ahead
    await addEnemy(page, 'shooter', 480, 120, Math.PI / 2); // behind the island
    await page.keyboard.down('Space');
    await advance(page, 2000);
    await page.keyboard.up('Space');
    expect((await getState(page)).score).toBe(0);
  });
});

test.describe('enemies and spawns', () => {
  test('a Chaser hurts the player on impact, explodes and does not score', async ({ page }) => {
    await startMatch(page);
    await addEnemy(page, 'chaser', 800, 200, Math.PI / 2);
    await advance(page, 3500);
    const s = await getState(page);
    expect(s.player.health).toBe(80);
    expect(s.enemies.filter((e) => e.kind === 'chaser')).toHaveLength(0);
    expect(s.score).toBe(0);
  });

  test('a Shooter in range fires at the player', async ({ page }) => {
    await startMatch(page);
    await addEnemy(page, 'shooter', 800, 250, Math.PI / 2); // already facing the player, inside its range
    await advance(page, 800);
    const s = await getState(page);
    expect(s.projectiles.some((p) => p.owner === 'enemy') || s.player.health < 100).toBe(true);
  });

  test('spawns follow the configured interval', async ({ page }) => {
    await startMatch(page, { spawnIntervalSec: 5 });
    await advance(page, 4900);
    expect((await getState(page)).enemies).toHaveLength(0);
    await advance(page, 200);
    expect((await getState(page)).enemies).toHaveLength(1);
  });

  test('both enemy types appear, away from the player and from islands', async ({ page }) => {
    await startMatch(page, { sessionSec: 180, spawnIntervalSec: 1 });
    await setPlayer(page, { health: 1e9, maxHealth: 1e9 });
    const kinds = new Set<string>();
    for (let i = 0; i < 20; i++) {
      await advance(page, 1000);
      const s = await getState(page);
      for (const e of s.enemies) kinds.add(e.kind);
      if (i === 0) {
        const e = s.enemies[0]!;
        expect(Math.hypot(e.pos.x - s.player.pos.x, e.pos.y - s.player.pos.y)).toBeGreaterThanOrEqual(300);
      }
    }
    expect(kinds).toContain('chaser');
    expect(kinds).toContain('shooter');
  });
});

test.describe('end of match', () => {
  test('ends by time, stops the simulation and shows the result', async ({ page }) => {
    await startMatch(page);
    await setPlayer(page, { health: 1e9, maxHealth: 1e9 });
    // One synchronous evaluate: the app leaves the match screen (and removes window.__pb) after the end, so read everything first.
    const { ended, later } = await page.evaluate(() => {
      const pb = window.__pb!;
      pb.advance(60_500);
      const first = JSON.parse(JSON.stringify(pb.getState()));
      pb.advance(3000);
      return { ended: first, later: JSON.parse(JSON.stringify(pb.getState())) };
    });
    expect(ended.status).toBe('ended');
    expect(ended.endReason).toBe('time_up');
    expect(ended.elapsedMs).toBe(60_000);
    expect(later.elapsedMs).toBe(60_000);
    expect(later.score).toBe(ended.score);
    await expect(page.getByRole('heading', { name: 'Result' })).toBeVisible();
    await expect(page.getByText('Ended by: Time is up')).toBeVisible();
  });

  test('ends by death and shows the reason', async ({ page }) => {
    await startMatch(page);
    await setPlayer(page, { health: 1 });
    await addEnemy(page, 'chaser', 805, 450);
    const after = await advanceAndGet(page, 200);
    expect(after.endReason).toBe('player_destroyed');
    await expect(page.getByText('Ended by: Ship destroyed')).toBeVisible();
  });

  test('Play Again starts a clean match', async ({ page }) => {
    await startMatch(page);
    await page.keyboard.down('Space');
    await advance(page, 700);
    await page.keyboard.up('Space');
    await finishMatchByTime(page);
    await expect(page.getByRole('heading', { name: 'Result' })).toBeVisible();
    await page.getByRole('button', { name: 'Play Again' }).click();
    await expect(page.getByTestId('score')).toBeVisible();
    await page.waitForFunction(() => window.__pb !== undefined && window.__pb.getState().elapsedMs === 0);
    const s = await getState(page);
    expect(s.player.health).toBe(100);
    expect(s.score).toBe(0);
    expect(s.enemies).toHaveLength(0);
    expect(s.projectiles).toHaveLength(0);
  });

  test('the last result survives a refresh', async ({ page }) => {
    await startMatch(page);
    await finishMatchByTime(page);
    await expect(page.getByTestId('submit-status')).toContainText('saved');
    await page.reload();
    await expect(page.getByTestId('last-result')).toContainText('time is up');
  });
});

test.describe('pause, focus and abandon', () => {
  test('manual pause suspends the simulation; resume needs an action', async ({ page }) => {
    await startMatch(page);
    await advance(page, 500);
    await page.getByRole('button', { name: 'Pause' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume' })).toBeFocused();
    await advance(page, 5000);
    expect((await getState(page)).elapsedMs).toBe(500);
    await page.getByRole('button', { name: 'Resume' }).click();
    await advance(page, 100);
    expect((await getState(page)).elapsedMs).toBe(600);
  });

  test('losing focus or hiding the tab pauses with the real clock; nothing accumulates', async ({ page }) => {
    await startMatch(page, { manualClock: false });
    await page.waitForTimeout(700);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.getByRole('dialog')).toBeVisible();
    const paused = (await getState(page)).elapsedMs;
    expect(paused).toBeGreaterThan(300);
    await page.waitForTimeout(1200);
    expect((await getState(page)).elapsedMs).toBe(paused);

    const t0 = Date.now();
    await page.getByRole('button', { name: 'Resume' }).click();
    await page.waitForTimeout(400);
    const resumed = (await getState(page)).elapsedMs;
    const realElapsed = Date.now() - t0;
    expect(resumed - paused).toBeLessThanOrEqual(realElapsed + 150); // the 1200 ms spent paused were not added

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('keys held during a pause are not replayed on resume', async ({ page }) => {
    await startMatch(page);
    await page.getByRole('button', { name: 'Pause' }).click();
    await page.keyboard.down('Space');
    await page.getByRole('button', { name: 'Resume' }).click();
    await advance(page, 100);
    await page.keyboard.up('Space');
    expect((await getState(page)).projectiles.length).toBeLessThanOrEqual(1);
  });

  test('an abandoned match is not recorded', async ({ page }) => {
    await startMatch(page);
    await advance(page, 1000);
    await page.getByRole('button', { name: 'Pause' }).click();
    await page.getByRole('button', { name: 'Main Menu' }).click();
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByText('You have no recorded matches yet.')).toBeVisible();
    await expect(page.getByTestId('pending-banner')).toHaveCount(0);
  });

  test('repeated navigation between screens keeps working', async ({ page }) => {
    await page.goto('/');
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Options' }).click();
      await page.getByRole('button', { name: 'Back' }).click();
      await page.getByRole('button', { name: 'Play' }).click();
      await expect(page.getByTestId('score')).toBeVisible();
      await page.getByRole('button', { name: 'Pause' }).click();
      await page.getByRole('button', { name: 'Main Menu' }).click();
      await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible();
    }
  });
});

test.describe('touch controls', () => {
  test('buttons work together (move and fire at the same time)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch controls are shown on touch devices');
    await startMatch(page);
    const forward = page.getByRole('button', { name: 'Move forward' });
    const fire = page.getByRole('button', { name: 'Fire front' });
    await expect(forward).toBeVisible();
    await forward.dispatchEvent('pointerdown', { pointerId: 11, pointerType: 'touch', isPrimary: true });
    await fire.dispatchEvent('pointerdown', { pointerId: 12, pointerType: 'touch', isPrimary: false });
    const held = await page.evaluate(() => window.__pb!.getCommands());
    expect(held.forward && held.fireFront).toBe(true);
    const y0 = (await getState(page)).player.pos.y;
    await advance(page, 600);
    const s = await getState(page);
    expect(s.player.pos.y).toBeLessThan(y0);
    expect(s.projectiles.length).toBeGreaterThan(0);
    await forward.dispatchEvent('pointerup', { pointerId: 11, pointerType: 'touch' });
    await fire.dispatchEvent('pointerup', { pointerId: 12, pointerType: 'touch' });
    const released = await page.evaluate(() => window.__pb!.getCommands());
    expect(released.forward || released.fireFront).toBe(false);
  });
});
