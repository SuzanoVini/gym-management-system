import { expect, test } from '@playwright/test';
import { goToTab, login } from './helpers';

test.describe('Holds Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToTab(page, 'Holds');
  });

  test('renders without error', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible();
  });

  test('table or list area is present', async ({ page }) => {
    await expect(
      page.locator('main table, main [role="table"], main .overflow-x-auto')
    ).toBeVisible();
  });
});
