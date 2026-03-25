import { expect, test } from '@playwright/test';
import { goToTab, login } from './helpers';

test.describe('Overview Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToTab(page, 'Overview');
  });

  test('renders without error', async ({ page }) => {
    // The overview tab is the default — verify the main content area is present
    await expect(page.locator('main')).toBeVisible();
  });

  test('shows at least one summary stat or card', async ({ page }) => {
    // Overview renders stat cards/charts — look for any bg-white card or stat element
    const cards = page.locator('main .bg-white');
    await expect(cards.first()).toBeVisible();
  });
});
