import { expect, test } from './fixtures';
import { advance, prepare, startMatch } from './helpers';

// Baselines are versioned in e2e/__screenshots__/<project>/. Generate them once with `npm run test:e2e:update`
// and review the images. Always generate and run them on the same OS (see README).
test('visual: main menu', async ({ page }) => {
  await prepare(page, { scenario: 'success', sessionSec: 120, spawnIntervalSec: 2 });
  await page.goto('/');
  await expect(page.getByTestId('ranking-panel').locator('tbody tr').first()).toBeVisible();
  await expect(page).toHaveScreenshot('menu.png', { animations: 'disabled', fullPage: true });
});

test('visual: arena in a stable state', async ({ page }) => {
  await startMatch(page, { seed: 7 });
  await advance(page, 0);
  await expect(page).toHaveScreenshot('arena.png', { animations: 'disabled' });
});

test('visual: result screen', async ({ page }) => {
  await startMatch(page, { seed: 7 });
  await page.evaluate(() => {
    window.__pb!.setPlayer({ health: 1e9, maxHealth: 1e9 });
    window.__pb!.advance(60_500);
  });
  await expect(page.getByRole('heading', { name: 'Result' })).toBeVisible();
  await expect(page.getByTestId('submit-status')).toContainText('Match saved');
  await expect(page).toHaveScreenshot('result.png', { animations: 'disabled' });
});
