import { expect, test } from '@playwright/test';
import {
  createHostedRoom,
  useEnglish,
  waitForApiHealth,
} from './online-room-test-helpers';

test('host confirms leaving a room, which closes it and removes it from the lobby', async ({
  page,
}) => {
  await waitForApiHealth();

  await useEnglish(page);
  const roomId = await createHostedRoom(page, 'Host');

  await page.getByTestId('room-back-to-lobby').click();
  await expect(page.getByTestId('room-leave-dialog')).toBeVisible();
  await page.getByTestId('room-leave-dialog-accept').click();

  await expect(page).toHaveURL(/\/$/, {
    timeout: 10000,
  });
  await expect(page.getByTestId('lobby-message-rail')).toContainText(
    'Room closed.',
  );
  await expect(page.getByTestId(`lobby-room-${roomId}`)).toHaveCount(0);

  await page.goto(`/online/room/${roomId}`);
  await expect(page.getByText('This room could not be found.')).toBeVisible();
});

test('guests return to the lobby when the host closes the room', async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  try {
    await waitForApiHealth();

    await useEnglish(page);
    const roomId = await createHostedRoom(page, 'Host');

    await useEnglish(guestPage);
    await guestPage.goto(`/online/room/${roomId}`);
    await guestPage
      .getByTestId('join-room-form')
      .getByLabel('Display name')
      .fill('Guest');
    await guestPage.getByRole('button', { name: 'Join room' }).click();
    await expect(guestPage.getByTestId('join-room-form')).toHaveCount(0);
    await expect(guestPage.getByTestId('room-layout')).toBeVisible();

    await page.getByTestId('room-back-to-lobby').click();
    await expect(page.getByTestId('room-leave-dialog')).toBeVisible();
    await page.getByTestId('room-leave-dialog-accept').click();

    await expect(page).toHaveURL(/\/$/, {
      timeout: 10000,
    });
    await expect(guestPage).toHaveURL(/\/$/, {
      timeout: 10000,
    });
    await expect(guestPage.getByTestId('lobby-message-rail')).toContainText(
      'The host closed the room.',
    );

    await guestPage.goto(`/online/room/${roomId}`);
    await expect(
      guestPage.getByText('This room could not be found.'),
    ).toBeVisible();
  } finally {
    await guestContext.close();
  }
});
