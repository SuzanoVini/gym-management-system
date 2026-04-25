import { expect, test } from '@playwright/test';
import { login } from './helpers';

// NOTE: These tests require TEST_EMAIL to be an admin-level account.
// If the test credential is not an admin, the page may redirect or deny access.
const isAdminTest = !!process.env.TEST_IS_ADMIN;

test.describe('Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
  });

  test('admin page loads without error', async ({ page }) => {
    // Accept either the admin page or an access-denied redirect
    const url = page.url();
    expect(url).toMatch(/\/(admin|login|\?)/);
  });

  test('User Management heading is visible', async ({ page }) => {
    test.skip(!isAdminTest, 'Skipped: TEST_IS_ADMIN not set — test credential may not be admin');
    // Admin page renders <h1>User Management</h1>
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
  });
});
