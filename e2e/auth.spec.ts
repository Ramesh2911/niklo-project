import { test, expect } from '@playwright/test';

test.describe('Auth flow', () => {
  test('Login page renders phone input and Send OTP button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/mobile number/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send otp/i })).toBeVisible();
  });

  test('Send OTP button is disabled or ignored with empty input', async ({ page }) => {
    await page.goto('/login');
    const btn = page.getByRole('button', { name: /send otp/i });
    await btn.click();
    // OTP modal should NOT appear
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('entering 10-digit number and clicking Send OTP opens OTP modal', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/mobile number/i).fill('9999999999');
    await page.getByRole('button', { name: /send otp/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 4000 });
    await expect(page.getByText(/enter otp/i)).toBeVisible();
  });

  test('OTP modal has 6 digit inputs', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/mobile number/i).fill('9999999999');
    await page.getByRole('button', { name: /send otp/i }).click();
    await page.getByRole('dialog').waitFor({ timeout: 4000 });
    const otpInputs = page.getByRole('dialog').locator('input[maxlength="1"]');
    await expect(otpInputs).toHaveCount(6);
  });
});
