import { expect, Page, test } from '@playwright/test';

test('creates a hosted room, seats players, starts a match, and supports spectators plus chat', async ({
  browser,
  page,
}) => {
  const guestContext = await browser.newContext();
  const spectatorContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  const spectatorPage = await spectatorContext.newPage();

  try {
    await expect
      .poll(
        async () => {
          try {
            const response = await fetch('http://127.0.0.1:3000/api/health');
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

    await useEnglish(page);
    await page.getByTestId('lobby-display-name-input').fill('Host');
    await page.getByTestId('online-lobby-create-button').click();
    await expect(page).toHaveURL(/\/online\/room\/[A-Z0-9]+$/, {
      timeout: 10000,
    });
    await expect(page.getByText(/You are here as/i)).toBeVisible({
      timeout: 10000,
    });

    const roomIdMatch = page.url().match(/\/online\/room\/([A-Z0-9]+)$/);
    expect(roomIdMatch?.[1]).toBeTruthy();
    const roomId = roomIdMatch![1];

    await useEnglish(guestPage);
    await guestPage.goto(`/online/room/${roomId}`);
    await guestPage.getByTestId('join-room-form').getByLabel('Display name').fill('Guest');
    await guestPage.getByRole('button', { name: 'Join room' }).click();

    await expect(page.getByTestId('claim-black')).toBeVisible();
    await expect(guestPage.getByTestId('claim-white')).toBeVisible();

    await page.getByTestId('claim-black').click();
    await guestPage.getByTestId('claim-white').click();

    await expect(page.getByTestId('start-hosted-match')).toBeEnabled();
    await page.getByTestId('start-hosted-match').click();

    await expect(page.getByTestId('game-board')).toBeVisible();
    await expect(guestPage.getByTestId('game-board')).toBeVisible();

    await useEnglish(spectatorPage);
    await spectatorPage.goto(`/online/room/${roomId}`);
    await spectatorPage.getByTestId('join-room-form').getByLabel('Display name').fill('Spectator');
    await spectatorPage.getByRole('button', { name: 'Join room' }).click();

    await expect(spectatorPage.getByTestId('game-board')).toBeVisible();
    await expect(spectatorPage.getByTestId('room-chat-panel')).toBeVisible();
    await expect(spectatorPage.getByTestId('room-participants-panel')).toBeVisible();
    await expect(spectatorPage.getByTestId('room-move-log-panel')).toBeVisible();
    await expect(spectatorPage.getByTestId('claim-black')).toHaveCount(0);
    await expect(spectatorPage.getByTestId('claim-white')).toHaveCount(0);

    await page.getByTestId('intersection-7-7').click({ force: true });
    await expect(page.getByText(/1 moves/i)).toBeVisible();
    await expect(guestPage.getByText(/1 moves/i)).toBeVisible();
    await expect(spectatorPage.getByText(/1 moves/i)).toBeVisible();

    await spectatorPage.getByTestId('chat-message-input').fill('Watching live');
    await spectatorPage.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Watching live')).toBeVisible();
    await expect(guestPage.getByText('Watching live')).toBeVisible();

    await spectatorPage.setViewportSize({ width: 390, height: 844 });

    const boardBox = await spectatorPage.getByTestId('game-board').boundingBox();
    const chatBox = await spectatorPage.getByTestId('room-chat-panel').boundingBox();

    expect(boardBox).not.toBeNull();
    expect(chatBox).not.toBeNull();
    expect(chatBox!.y).toBeGreaterThanOrEqual(boardBox!.y + boardBox!.height - 1);

    await expect(spectatorPage.getByTestId('board-coordinates-top')).not.toBeVisible();
    await expect(spectatorPage.getByTestId('board-coordinates-right')).not.toBeVisible();
    await expect(spectatorPage.getByTestId('board-coordinates-bottom')).toBeVisible();
    await expect(spectatorPage.getByTestId('board-coordinates-left')).toBeVisible();
  } finally {
    await guestContext.close();
    await spectatorContext.close();
  }
});

async function useEnglish(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('locale-option-en').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
}
