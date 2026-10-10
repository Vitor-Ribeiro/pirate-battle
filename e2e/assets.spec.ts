import { expect, test } from './fixtures';
import { prepare } from './helpers';


test.use({ serviceWorkers: 'block' });


test('assets: a loading failure shows an error and "Retry" starts the match', async ({ page }) => {
  await prepare(page, { manualClock: true });
  await page.route('**/assets/png/default/ships/ship_5.png', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();

  await expect(page.getByRole('alert')).toContainText('Could not load game assets');

  await page.unroute('**/assets/png/default/ships/ship_5.png');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByTestId('score')).toBeVisible();
  await page.waitForFunction(() => window.__pb !== undefined);
});

test('assets: a loading state is visible while textures load', async ({ page }) => {
  await prepare(page, { manualClock: true });
  await page.route('**/assets/png/default/effects/*.png', async (route) => {
    await new Promise((r) => setTimeout(r, 600));
    await route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByText('Loading assets…')).toBeVisible();
  await expect(page.getByTestId('score')).toBeVisible();
});
