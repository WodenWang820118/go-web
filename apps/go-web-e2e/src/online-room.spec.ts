import { expect, Page, test } from '@playwright/test';

const goServerOrigin = (process.env['GO_SERVER_ORIGIN'] || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  ''
);
const goServerOriginStorageKey = 'gx.go.serverOrigin';

test('online room auto-starts with saved settings and both players can accept a rematch', async ({
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

    await expect(page.getByTestId('room-next-match-form')).toBeVisible();
    await page.getByTestId('room-next-match-form').getByLabel('Mode').selectOption('gomoku');
    await page.getByTestId('save-next-match-settings').click();
    await expect(page.getByTestId('room-next-match-summary')).toContainText('Gomoku');

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
    await expect(page.getByTestId('save-next-match-settings')).toHaveCount(0);

    await useEnglish(spectatorPage);
    await spectatorPage.goto(`/online/room/${roomId}`);
    await spectatorPage.getByTestId('join-room-form').getByLabel('Display name').fill('Spectator');
    await spectatorPage.getByRole('button', { name: 'Join room' }).click();

    await expect(spectatorPage.getByTestId('game-board')).toBeVisible();
    await spectatorPage.getByTestId('chat-message-input').fill('Watching live');
    await spectatorPage.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Watching live')).toBeVisible();

    await playWinningGomokuSequence(page, guestPage);

    await expect(page.getByTestId('room-rematch-banner')).toBeVisible();
    await expect(guestPage.getByTestId('room-rematch-banner')).toBeVisible();

    await page.getByTestId('room-rematch-accept').click();
    await expect(guestPage.getByTestId('room-rematch-status-black')).toContainText('Ready');

    await guestPage.getByTestId('room-rematch-accept').click();

    await expect(page.getByTestId('room-rematch-banner')).toHaveCount(0);
    await expect(guestPage.getByTestId('room-rematch-banner')).toHaveCount(0);
    await expect(page.getByText(/0 moves/i)).toBeVisible();
    await expect(guestPage.getByText(/0 moves/i)).toBeVisible();
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

    await page.getByTestId('room-next-match-form').getByLabel('Mode').selectOption('gomoku');
    await page.getByTestId('save-next-match-settings').click();

    await useEnglish(guestPage);
    await guestPage.goto(`/online/room/${roomId}`);
    await guestPage.getByTestId('join-room-form').getByLabel('Display name').fill('Guest');
    await guestPage.getByRole('button', { name: 'Join room' }).click();

    await page.getByTestId('claim-black').click();
    await guestPage.getByTestId('claim-white').click();
    await expect(page.getByTestId('game-board')).toBeVisible();

    await playWinningGomokuSequence(page, guestPage);

    await expect(page.getByTestId('room-rematch-banner')).toBeVisible();
    await page.getByTestId('room-rematch-decline').click();

    await expect(page.getByTestId('room-rematch-blocked')).toBeVisible();
    await expect(guestPage.getByTestId('room-rematch-blocked')).toBeVisible();

    await page.getByTestId('release-black').click();
    await expect(page.getByTestId('claim-black')).toBeVisible();
    await page.getByTestId('claim-black').click();

    await expect(page.getByTestId('room-rematch-blocked')).toHaveCount(0);
    await expect(guestPage.getByTestId('room-rematch-blocked')).toHaveCount(0);
    await expect(page.getByText(/0 moves/i)).toBeVisible();
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

async function playWinningGomokuSequence(hostPage: Page, guestPage: Page): Promise<void> {
  const sequence = [
    { page: hostPage, point: 'intersection-0-0' },
    { page: guestPage, point: 'intersection-0-1' },
    { page: hostPage, point: 'intersection-1-0' },
    { page: guestPage, point: 'intersection-1-1' },
    { page: hostPage, point: 'intersection-2-0' },
    { page: guestPage, point: 'intersection-2-1' },
    { page: hostPage, point: 'intersection-3-0' },
    { page: guestPage, point: 'intersection-3-1' },
    { page: hostPage, point: 'intersection-4-0' },
  ];

  for (const move of sequence) {
    await move.page.getByTestId(move.point).click({ force: true });
  }
}
