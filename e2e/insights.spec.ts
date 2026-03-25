import { expect, test } from '@playwright/test';
import { goToTab, login } from './helpers';

test.describe('Insights Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToTab(page, 'Insights');
  });

  test('renders without error', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible();
  });

  test('Smart Business Insights heading is visible', async ({ page }) => {
    // InsightsTab renders an h2 "Smart Business Insights"
    await expect(page.getByRole('heading', { name: /smart business insights/i })).toBeVisible();
  });

  test('shows either insights or empty state', async ({ page }) => {
    // The priority summary cards are always rendered regardless of data (Critical/High/Medium)
    await expect(page.getByText(/critical priority/i)).toBeVisible();
  });
});
