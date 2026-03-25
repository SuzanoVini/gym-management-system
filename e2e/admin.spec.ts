import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test('admin page loads without error', async ({ page }) => {
    expect(page.url()).toContain('/admin');
  });

  test('User Management heading is visible', async ({ page }) => {
    // Admin page renders <h1>User Management</h1>
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
  });
});
