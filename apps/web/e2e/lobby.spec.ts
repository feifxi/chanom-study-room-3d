import { expect, test } from '@playwright/test';
import { uniqueName } from './helpers';

test('lobby shows your character and the rooms, and remembers your outfit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your character' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Public rooms' })).toBeVisible();

  const name = uniqueName('Mint');
  await page.getByLabel('Nickname').fill(name);
  await page.getByRole('button', { name: 'Cat ears' }).click();
  await page.reload();
  await expect(page.getByLabel('Nickname')).toHaveValue(name);
  await expect(page.getByRole('button', { name: 'Cat ears' })).toHaveClass(/bg-accent-soft/);
});

test('"Enter the library" takes you into a room', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Enter the library/ }).click();
  await expect(page).toHaveURL(/\/room/);
  await expect(page.getByRole('status', { name: 'Connected' })).toBeVisible();
});
