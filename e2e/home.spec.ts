import { test, expect } from '@playwright/test';

const mainContent = (page: import('@playwright/test').Page) =>
  page.locator('#main-content').first();

test.describe('Home page (dashboard)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads and shows main content', async ({ page }) => {
    await expect(mainContent(page)).toBeVisible();
  });

  test('skip-to-main link is present in DOM', async ({ page }) => {
    const skip = page.locator('a.skip-to-main');
    await expect(skip).toHaveCount(1);
    await expect(skip).toHaveAttribute('href', '#main-content');
  });

  test('navbar has logo and key links', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('link', { name: /niklo/i }).first()).toBeVisible();
  });

  test('footer is visible', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});

test.describe('GetStarted page', () => {
  test('loads without crashing', async ({ page }) => {
    await page.goto('/welcome');
    await expect(mainContent(page)).toBeVisible();
  });
});
