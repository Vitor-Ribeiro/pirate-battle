import { expect, test } from './fixtures';
import { chooseScenario, setScenarioQuietly, finishMatchByTime, prepare, showTab, startMatch } from './helpers';

test.describe('ranking', () => {
  test('shows a paginated list ordered by rank', async ({ page }) => {
    await prepare(page, { scenario: 'many-pages', sessionSec: 120, spawnIntervalSec: 2 });
    await page.goto('/');
    const rows = page.getByTestId('ranking-panel').locator('tbody tr');
    await expect(rows).toHaveCount(10);
    await expect(page.getByText('Page 1 of 6')).toBeVisible();
    await expect(rows.first().locator('td').first()).toHaveText('1');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Page 2 of 6')).toBeVisible();
    await expect(rows.first().locator('td').first()).toHaveText('11');
  });

  test('shows loading, then an empty state', async ({ page }) => {
    await prepare(page, { scenario: 'empty' });
    await page.goto('/');
    await expect(page.getByText('No matches yet. Play one to enter the ranking.')).toBeVisible();
  });

  test('shows an error and recovers with "Try again"', async ({ page }) => {
    await prepare(page, { scenario: 'ranking-error' });
    await page.goto('/');
    await expect(page.getByTestId('ranking-panel').getByRole('alert')).toContainText('Could not load the ranking', { timeout: 15_000 });
    await setScenarioQuietly(page, 'success');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByTestId('ranking-panel').locator('tbody tr').first()).toBeVisible();
  });

  test('a slow response keeps the interface usable and visible', async ({ page }) => {
    await prepare(page, { scenario: 'slow' });
    await page.goto('/');
    await expect(page.getByText('Loading ranking…')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play' })).toBeEnabled();
    await expect(page.getByTestId('ranking-panel').locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });
  });

  test('late responses never overwrite newer pages', async ({ page }) => {
    await prepare(page, { scenario: 'many-pages', sessionSec: 120, spawnIntervalSec: 2 });
    await page.goto('/?scenario=variable-latency');
    const next = page.getByRole('button', { name: 'Next' });
    const prev = page.getByRole('button', { name: 'Previous' });
    await expect(next).toBeEnabled({ timeout: 15_000 });
    await next.click();
    await expect(prev).toBeEnabled({ timeout: 15_000 });
    await prev.click();
    await expect(page.getByText('Page 1 of 6')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('ranking-panel').locator('tbody tr').first().locator('td').first()).toHaveText('1', { timeout: 15_000 });
  });
});

test.describe('match history', () => {
  test('empty and error states', async ({ page }) => {
    await prepare(page, { scenario: 'history-error' });
    await page.goto('/');
    await showTab(page, 'Match History');
    await expect(page.getByTestId('history-panel').getByRole('alert')).toContainText('Could not load your history', { timeout: 15_000 });
    await setScenarioQuietly(page, 'success');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText('You have no recorded matches yet.')).toBeVisible();
  });
});

test.describe('registering a match', () => {
  test('a finished match appears in both tabs, once', async ({ page }) => {
    await startMatch(page);
    await finishMatchByTime(page);
    await expect(page.getByTestId('submit-status')).toContainText('Match saved');
    await page.getByRole('button', { name: 'Main Menu' }).click();

    await showTab(page, 'Match History');
    await expect(page.getByTestId('history-panel').locator('tbody tr')).toHaveCount(1);

    await showTab(page, 'Ranking');
    await expect(page.getByTestId('ranking-panel').getByText('You')).toHaveCount(0);
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByTestId('ranking-panel').getByText('You')).toHaveCount(1);
  });

  test('a failed submission stays pending, survives a refresh and recovers without duplicates', async ({ page }) => {
    await startMatch(page, { scenario: 'submit-unavailable' });
    await finishMatchByTime(page);
    await expect(page.getByTestId('submit-status')).toContainText('stored on this device', { timeout: 15_000 });

    await page.reload();
    await expect(page.getByTestId('pending-banner')).toContainText('1 match waiting');

    await chooseScenario(page, 'success');
    await page.getByRole('button', { name: 'Retry saving' }).click();
    await expect(page.getByTestId('pending-banner')).toHaveCount(0, { timeout: 15_000 });

    await showTab(page, 'Match History');
    await expect(page.getByTestId('history-panel').locator('tbody tr')).toHaveCount(1);
  });

  test('the player can start another match while a record is pending', async ({ page }) => {
    await startMatch(page, { scenario: 'submit-unavailable' });
    await finishMatchByTime(page);
    await page.getByRole('button', { name: 'Play Again' }).click();
    await expect(page.getByTestId('score')).toBeVisible();
  });

  test('timeout after the server saved the match recovers without duplication', async ({ page }) => {
    test.setTimeout(90_000);
    await startMatch(page, { scenario: 'submit-timeout-after-commit' });
    await finishMatchByTime(page);
    await expect(page.getByTestId('submit-status')).toContainText('Match saved', { timeout: 30_000 });
    await page.getByRole('button', { name: 'Main Menu' }).click();
    await showTab(page, 'Match History');
    await expect(page.getByTestId('history-panel').locator('tbody tr')).toHaveCount(1);
  });
});
