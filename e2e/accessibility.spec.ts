import { test, expect } from '@playwright/test';

test.describe('Accessibility basics', () => {
  test('dashboard has at least one heading', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('h1, h2, h3, h4, h5, h6');
    expect(await page.getByRole('heading').count()).toBeGreaterThanOrEqual(1);
  });

  test('all images on dashboard have alt attributes', async ({ page }) => {
    await page.goto('/');
    const imgs = await page.locator('img').all();
    for (const img of imgs) {
      expect(await img.getAttribute('alt')).not.toBeNull();
    }
  });

  test('login page input has a label', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/mobile number/i)).toBeVisible();
  });

  test('navbar has role=banner', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
  });

  test('skip-to-main link target exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#main-content').first()).toBeVisible();
  });

  test('bus booking page is keyboard navigable', async ({ page }) => {
    await page.goto('/buses');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused);
  });

  test('footer has role=contentinfo', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});
