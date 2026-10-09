import { expect, test as base } from '@playwright/test';

/** Every test fails if the console shows an unhandled error (challenge: "console without unhandled errors"). */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        // Failed requests are expected in the tests that inject network failures on purpose.
        if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text());
      });
      await use(errors);
      expect(errors, 'unexpected console errors').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
