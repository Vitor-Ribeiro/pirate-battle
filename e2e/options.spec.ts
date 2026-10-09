import { expect, test } from './fixtures';

test('options: navigation, validation and persistence after refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible();

  const session = page.getByLabel('Game session time (seconds)');
  const spawn = page.getByLabel('Enemy spawn time (seconds)');
  const save = page.getByRole('button', { name: 'Save options' });

  await session.fill('30');
  await expect(page.getByRole('alert').first()).toContainText('between 60 and 180');
  await expect(save).toBeDisabled();

  await session.fill('90');
  await spawn.fill('0');
  await expect(page.getByRole('alert').first()).toContainText('between 0.5 and 10');
  await expect(save).toBeDisabled();

  await spawn.fill('3');
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByRole('status').filter({ hasText: 'Options saved.' })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(session).toHaveValue('90');
  await expect(spawn).toHaveValue('3');
});

test('options: corrupted stored values fall back to defaults', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pirate-battle:options:v1', '{"sessionSec":5,"spawnIntervalSec":"x"}'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByLabel('Game session time (seconds)')).toHaveValue('120');
});
