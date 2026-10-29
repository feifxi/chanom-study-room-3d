import { expect, test } from '@playwright/test';
import { enterRoom, uniqueName, useProfile } from './helpers';

const GAME_URL = 'http://localhost:2567';
/** Matches the dev default in apps/game's dev script; set ADMIN_PASSWORD to override. */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'chanom-dev';

test.beforeEach(async ({ request }) => {
  const health = (await (await request.get(`${GAME_URL}/health`)).json()) as { stats: boolean };
  test.skip(!health.stats, 'feedback needs the database');
});

test('leaving asks for feedback once, and it shows up on the admin page', async ({ page }) => {
  const name = uniqueName('Fern');
  const comment = `e2e feedback ${name}`;
  await useProfile(page, name);
  await enterRoom(page);

  await page.getByRole('button', { name: 'Leave' }).click();
  const card = page.getByRole('dialog', { name: /Before you go/ });
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: 'Send & leave' })).toBeDisabled();
  await card.getByRole('radio', { name: 'Love it' }).click();
  await card.getByRole('button', { name: /Have an idea/ }).click();
  await card.getByRole('textbox').fill(comment);
  await card.getByRole('button', { name: 'Send & leave' }).click();
  await expect(page).toHaveURL('/');

  // Sent once: the next leave is instant
  await enterRoom(page);
  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page).toHaveURL('/');

  // Admin: wrong password, then the right one
  await page.goto('/admin');
  await page.getByLabel('Password').fill('not-it');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Wrong password')).toBeVisible();
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
  const entry = page.getByRole('listitem').filter({ hasText: comment });
  await expect(entry).toBeVisible();
  await expect(entry.getByText('💡 Have an idea')).toBeVisible();

  // Clean up after ourselves
  page.once('dialog', (d) => d.accept());
  await entry.getByRole('button', { name: `Delete feedback from ${name}` }).click();
  await expect(entry).toHaveCount(0);
});

test('the admin data needs a session', async ({ request }) => {
  expect((await request.get(`${GAME_URL}/admin/overview`)).status()).toBe(401);
  expect((await request.get(`${GAME_URL}/admin/feedback.csv`)).status()).toBe(401);
});
