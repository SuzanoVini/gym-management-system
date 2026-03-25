import { expect, test } from '@playwright/test';
import { goToTab, login } from './helpers';

test.describe('Intros Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToTab(page, 'Intros');
  });

  test('renders without error', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible();
  });

  test('table or list area is present', async ({ page }) => {
    // IntrosTab renders a Table component with a scrollable container
    await expect(
      page.locator('main table, main [role="table"], main .overflow-x-auto')
    ).toBeVisible();
  });

  test('Add Intro button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add intro/i })).toBeVisible();
  });
});
