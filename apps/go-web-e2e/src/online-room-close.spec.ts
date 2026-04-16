import { expect, Page, test } from '@playwright/test';

const goServerOrigin = (process.env['GO_SERVER_ORIGIN'] || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  ''
);
const goServerOriginStorageKey = 'gx.go.serverOrigin';

test('host confirms leaving a room, which closes it and removes it from the lobby', async ({
  page,
}) => {
  await waitForApiHealth();

  await useEnglish(page);
  await page.getByTestId('lobby-display-name-input').fill('Host');
  await page.getByTestId('online-lobby-create-button').click();
  await expect(page).toHaveURL(/\/online\/room\/[A-Z0-9]+$/, {
    timeout: 10000,
  });

  const roomId = getRoomIdFromUrl(page.url());

  await page.getByTestId('room-back-to-lobby').click();
  await expect(page.getByTestId('room-leave-dialog')).toBeVisible();
  await page.getByTestId('room-leave-dialog-accept').click();

  await expect(page).toHaveURL(/\/$/, {
    timeout: 10000,
  });
  await expect(page.getByTestId('lobby-message-rail')).toContainText('Room closed.');
  await expect(page.getByTestId(`lobby-room-${roomId}`)).toHaveCount(0);

  await page.goto(`/online/room/${roomId}`);
  await expect(page.getByText('This room could not be found.')).toBeVisible();
});

test('guests return to the lobby when the host closes the room', async ({
  browser,
  page,
}) => {
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  try {
    await waitForApiHealth();

    await useEnglish(page);
    await page.getByTestId('lobby-display-name-input').fill('Host');
    await page.getByTestId('online-lobby-create-button').click();
    await expect(page).toHaveURL(/\/online\/room\/[A-Z0-9]+$/, {
      timeout: 10000,
    });

    const roomId = getRoomIdFromUrl(page.url());

    await useEnglish(guestPage);
    await guestPage.goto(`/online/room/${roomId}`);
    await guestPage.getByTestId('join-room-form').getByLabel('Display name').fill('Guest');
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
    await expect(guestPage.getByText('This room could not be found.')).toBeVisible();
  } finally {
    await guestContext.close();
  }
});

async function useEnglish(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: goServerOriginStorageKey,
      value: goServerOrigin,
    }
  );
  await page.goto('/');
  await page.getByTestId('locale-option-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
}

async function waitForApiHealth(): Promise<void> {
  await expect
    .poll(
      async () => {
        try {
          const response = await fetch(`${goServerOrigin}/api/health`);
          return response.ok;
        } catch {
          return false;
        }
      },
      {
        timeout: 30000,
      }
    )
    .toBe(true);
}

function getRoomIdFromUrl(url: string): string {
  const match = url.match(/\/online\/room\/([A-Z0-9]+)$/);
  expect(match?.[1]).toBeTruthy();
  return match?.[1] ?? '';
}
