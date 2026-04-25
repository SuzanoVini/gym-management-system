import { expect, test } from '@playwright/test';
import { goToTab, login } from './helpers';

test.describe('Overview Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToTab(page, 'Overview');
  });

  test('renders without error', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible();
  });

  test('Monthly Trends heading is visible', async ({ page }) => {
    // OverviewTab renders an h2 "Monthly Trends" — stable semantic assertion
    await expect(page.getByRole('heading', { name: /monthly trends/i })).toBeVisible();
  });
});
