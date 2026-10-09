import { expect, test } from '@playwright/test';

test('main menu is reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible();
});

test('options persist after refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Options' }).click();
  await page.getByLabel('Game session time (seconds)').fill('90');
  await page.getByRole('button', { name: 'Save options' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByLabel('Game session time (seconds)')).toHaveValue('90');
});
