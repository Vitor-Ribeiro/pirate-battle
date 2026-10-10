import { expect, test as base } from '@playwright/test';


export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        
        if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text());
      });
      await use(errors);
      expect(errors, 'unexpected console errors').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
