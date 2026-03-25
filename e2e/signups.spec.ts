import { expect, test } from '@playwright/test';
import { goToTab, login } from './helpers';

test.describe('Signups Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToTab(page, 'Sign-ups');
  });

  test('renders without error', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible();
  });

  test('Sign-ups heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign.ups/i })).toBeVisible();
  });

  test('table or list area is present', async ({ page }) => {
    await expect(
      page.locator('main table, main [role="table"], main .overflow-x-auto')
    ).toBeVisible();
  });
});
