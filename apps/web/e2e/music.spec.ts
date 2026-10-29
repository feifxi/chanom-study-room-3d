import { expect, test } from '@playwright/test';
import { enterRoom } from './helpers';

test('the music player plays, skips and remembers the volume', async ({ page, request }) => {
  await enterRoom(page);
  await page.getByRole('button', { name: 'Music', exact: true }).click();
  await expect(page.getByText('Lofi Coffee Shop')).toBeVisible();

  // Nothing plays until you press play (browsers block autoplay anyway)
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible(); // the audio element reported 'play'

  await page.getByRole('button', { name: 'Next track' }).click();
  await expect(page.getByText('Lofi Sunny Cafe')).toBeVisible();
  await page.getByRole('button', { name: 'Previous track' }).click();
  await page.getByRole('button', { name: 'Previous track' }).click(); // wraps around to the last one
  await expect(page.getByText('Lofi Midnight Club')).toBeVisible();
  await page.getByRole('button', { name: 'Next track' }).click();
  await page.getByRole('button', { name: 'Next track' }).click();

  await page.getByLabel('Music volume').fill('0.2');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('status', { name: 'Connected' })).toBeVisible({ timeout: 45_000 });
  await page.getByRole('button', { name: 'Music', exact: true }).click();
  await expect(page.getByText('Lofi Sunny Cafe')).toBeVisible();
  await expect(page.getByLabel('Music volume')).toHaveValue('0.2');

  // The files are really served
  for (const name of ['alex-morgan-lofi-coffee-shop-568150', 'alex-morgan-lofi-midnight-club-568164']) {
    const res = await request.head(`/music/${name}.mp3`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('audio/mpeg');
  }
});
