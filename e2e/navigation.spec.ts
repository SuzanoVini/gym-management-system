import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('main dashboard loads after login', async ({ page }) => {
    await expect(page).toHaveURL('/');
    // app-shell is a custom CSS class defined in globals.css — use data-sidebar attribute for robustness
    await expect(page.locator('[data-sidebar]')).toBeVisible();
  });

  test('sidebar navigation is present', async ({ page }) => {
    // <aside className="app-sidebar"> — use ARIA complementary role
    await expect(page.getByRole('complementary')).toBeVisible();
  });

  test('all main tab buttons are visible in sidebar', async ({ page }) => {
    // Verify all 6 tab buttons are present in one test to avoid repeated logins
    const tabs = ['Overview', 'Insights', 'Intros', 'Sign-ups', 'Cancellations', 'Holds'];
    for (const tab of tabs) {
      await expect(page.getByRole('button', { name: new RegExp(tab, 'i') })).toBeVisible();
    }
  });
});
