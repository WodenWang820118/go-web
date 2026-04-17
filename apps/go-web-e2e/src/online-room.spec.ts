import { expect, Page, test } from '@playwright/test';

const goServerOrigin = (process.env['GO_SERVER_ORIGIN'] || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  ''
);
const goServerOriginStorageKey = 'gx.go.serverOrigin';

test('online room auto-starts once both seats are claimed and both players can accept a rematch', async ({
  browser,
  page,
}) => {
  const guestContext = await browser.newContext();
  const spectatorContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  const spectatorPage = await spectatorContext.newPage();

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

    await expect(page.getByTestId('claim-black')).toBeVisible();
    await expect(guestPage.getByTestId('claim-white')).toBeVisible();

    await page.getByTestId('claim-black').click();
    await guestPage.getByTestId('claim-white').click();

    await expect(page.getByTestId('game-board')).toBeVisible();
    await expect(guestPage.getByTestId('game-board')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resign' })).toBeVisible();
    await expect(guestPage.getByRole('button', { name: 'Resign' })).toBeVisible();

    await useEnglish(spectatorPage);
    await spectatorPage.goto(`/online/room/${roomId}`);
    await spectatorPage.getByTestId('join-room-form').getByLabel('Display name').fill('Spectator');
    await spectatorPage.getByRole('button', { name: 'Join room' }).click();

    await expect(spectatorPage.getByTestId('game-board')).toBeVisible();
    await spectatorPage.getByTestId('chat-message-input').fill('Watching live');
    await spectatorPage.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Watching live')).toBeVisible();

    await page.getByRole('button', { name: 'Resign' }).click();

    await expect(page.getByTestId('room-resign-result-dialog')).toBeVisible();
    await expect(guestPage.getByTestId('room-resign-result-dialog')).toBeVisible();
    await expect(spectatorPage.getByTestId('room-resign-result-dialog')).toBeVisible();

    await page.getByTestId('room-resign-result-dialog-close').click();
    await guestPage.getByTestId('room-resign-result-dialog-close').click();
    await spectatorPage.getByTestId('room-resign-result-dialog-close').click();

    await expect(page.getByTestId('room-rematch-dialog')).toBeVisible();
    await expect(guestPage.getByTestId('room-rematch-dialog')).toBeVisible();
    await expect(spectatorPage.getByTestId('room-rematch-dialog')).toBeVisible();
    await expect(spectatorPage.getByTestId('room-rematch-dialog-close')).toBeVisible();
    await spectatorPage.getByTestId('room-rematch-dialog-close').click();
    await expect(spectatorPage.getByTestId('room-rematch-dialog')).toHaveCount(0);

    await page.getByTestId('room-rematch-dialog-accept').click();
    await expect(guestPage.getByTestId('room-rematch-dialog-status-black')).toContainText(
      'Ready'
    );

    await guestPage.getByTestId('room-rematch-dialog-accept').click();

    await expect(page.getByTestId('room-rematch-dialog')).toHaveCount(0);
    await expect(guestPage.getByTestId('room-rematch-dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Resign' })).toBeVisible();
    await expect(guestPage.getByRole('button', { name: 'Resign' })).toBeVisible();

    await page.getByTestId('intersection-0-0').click();
    await expect(page.getByTestId('intersection-0-0').locator('circle[fill="url(#stone-black)"]'))
      .toHaveCount(1);
    await expect(
      guestPage.getByTestId('intersection-0-0').locator('circle[fill="url(#stone-black)"]')
    ).toHaveCount(1);
  } finally {
    await guestContext.close();
    await spectatorContext.close();
  }
});

test('online room stays idle after a rematch decline until a seat changes', async ({
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

    await page.getByTestId('claim-black').click();
    await guestPage.getByTestId('claim-white').click();
    await expect(page.getByTestId('game-board')).toBeVisible();

    await page.getByRole('button', { name: 'Resign' }).click();

    await expect(page.getByTestId('room-resign-result-dialog')).toBeVisible();
    await expect(guestPage.getByTestId('room-resign-result-dialog')).toBeVisible();

    await page.getByTestId('room-resign-result-dialog-close').click();
    await guestPage.getByTestId('room-resign-result-dialog-close').click();

    await expect(page.getByTestId('room-rematch-dialog')).toBeVisible();
    await expect(guestPage.getByTestId('room-rematch-dialog')).toBeVisible();

    await page.getByTestId('room-rematch-dialog-decline').click();

    await expect(guestPage.getByTestId('room-rematch-dialog')).toHaveCount(0);
    await expect(page.getByTestId('room-sidebar-message-rematch-blocked')).toBeVisible();
    await expect(guestPage.getByTestId('room-sidebar-message-rematch-blocked')).toBeVisible();

    await page.getByTestId('release-black').click();
    await expect(page.getByTestId('claim-black')).toBeVisible();
    await page.getByTestId('claim-black').click();

    await expect(page.getByTestId('room-sidebar-message-rematch-blocked')).toHaveCount(0);
    await expect(guestPage.getByTestId('room-sidebar-message-rematch-blocked')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Resign' })).toBeVisible();
    await expect(guestPage.getByRole('button', { name: 'Resign' })).toBeVisible();
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
  return match![1];
}
