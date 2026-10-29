import { expect, test } from '@playwright/test';
import { SOFA } from '@study/shared';
import { enterRoom, me, uniqueName, useProfile, walkTo } from './helpers';

test('chat: messages reach other people, and joins and leaves are announced', async ({ browser }) => {
  const alice = await browser.newPage();
  const bob = await browser.newPage();
  const [aliceName, bobName] = [uniqueName('Alice'), uniqueName('Bob')];
  await useProfile(alice, aliceName);
  await useProfile(bob, bobName);

  await enterRoom(alice);
  await enterRoom(bob);
  const aliceChat = alice.getByRole('region', { name: 'Chat' });
  await expect(aliceChat.getByText(`${bobName} joined the room`)).toBeVisible();

  await bob.getByPlaceholder(/Type a message/).fill('hello from bob');
  await bob.keyboard.press('Enter');
  await expect(aliceChat.getByText('hello from bob')).toBeVisible();

  // Leaving with the button is announced right away. (Closing the tab counts as a dropped
  // connection: the server keeps the seat for 20 s in case they come back.)
  await bob.getByRole('link', { name: 'Leave' }).click();
  await expect(bob).toHaveURL('/');
  await expect(aliceChat.getByText(`${bobName} left the room`)).toBeVisible();
  await bob.close();
  await alice.close();
});

test('the dock chat button hides and shows the chat', async ({ page }) => {
  await enterRoom(page);
  const chat = page.getByRole('region', { name: 'Chat' });
  await expect(chat).toBeVisible();
  await page.getByRole('button', { name: 'Chat' }).click();
  await expect(chat).toBeHidden();
  await page.keyboard.press('Enter'); // Enter opens it again from anywhere
  await expect(chat).toBeVisible();
  await expect(page.getByPlaceholder(/Type a message/)).toBeFocused();
});

test('day / night choice is remembered', async ({ page }) => {
  await enterRoom(page);
  await page.getByRole('radio', { name: 'Always night' }).click();
  await page.reload();
  await expect(page.getByText('Connected')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Always night' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'Follow the clock' }).click();
});

test('zoom buttons change the camera zoom', async ({ page }) => {
  await enterRoom(page);
  await expect(page.getByText('100%')).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByText('120%')).toBeVisible();
  await page.getByRole('button', { name: 'Zoom out' }).click();
  await expect(page.getByText('100%')).toBeVisible();
});

test('you can sit on the sofa and get up in front of it', async ({ page }) => {
  await enterRoom(page);
  await walkTo(page, SOFA.maxX + 0.4, 4.1);
  await expect(page.getByText('Press E to sit on the sofa')).toBeVisible();
  await page.keyboard.press('e');
  await expect(page.getByText(/Lounging on the sofa/)).toBeVisible();
  await expect(page.getByText(/Sofa · \d+ (person|people) here/)).toBeVisible();
  expect((await me(page)).seatId).toMatch(/^sofa-/);

  await page.keyboard.press('e');
  await expect(page.getByText(/Lounging on the sofa/)).toBeHidden();
  await expect.poll(async () => (await me(page)).x).toBeGreaterThan(SOFA.maxX);
});
