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

  test('priority summary cards are always visible', async ({ page }) => {
    // All three priority cards (Critical/High/Medium) are rendered unconditionally
    await expect(page.getByText(/critical priority/i)).toBeVisible();
    await expect(page.getByText(/high priority/i)).toBeVisible();
    await expect(page.getByText(/medium priority/i)).toBeVisible();
  });
});
