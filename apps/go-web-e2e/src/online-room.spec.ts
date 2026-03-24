import { expect, test } from '@playwright/test';

test('moves a hosted room from waiting to ready to live through the lobby-first flow', async ({
  browser,
  page,
}) => {
  const lobbyContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const spectatorContext = await browser.newContext();
  const lobbyPage = await lobbyContext.newPage();
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

    await page.goto('/');
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
    await lobbyPage.goto('/');
    const waitingCard = lobbyPage.getByTestId(`lobby-room-${roomId}`);
    await expect(waitingCard).toContainText('Waiting', {
      timeout: 15000,
    });

    await guestPage.goto('/');
    await guestPage.getByTestId('lobby-display-name-input').fill('Guest');
    await expect(guestPage.getByTestId(`lobby-room-${roomId}`)).toContainText('Waiting', {
      timeout: 15000,
    });
    await guestPage.getByTestId(`lobby-room-${roomId}`).click();
    await guestPage.getByTestId('online-lobby-join-selected-button').click();

    await expect(page.getByTestId('claim-black')).toBeVisible();
    await expect(guestPage.getByTestId('claim-white')).toBeVisible();

    await page.getByTestId('claim-black').click();
    await guestPage.getByTestId('claim-white').click();

    await lobbyPage.goto('/');
    await expect(lobbyPage.getByTestId(`lobby-room-${roomId}`)).toContainText(
      'Ready',
      {
        timeout: 15000,
      }
    );

    await expect(page.getByTestId('start-hosted-match')).toBeEnabled();
    await page.getByTestId('start-hosted-match').click();

    await expect(page.getByTestId('game-board')).toBeVisible();
    await expect(guestPage.getByTestId('game-board')).toBeVisible();

    await lobbyPage.goto('/');
    await expect(lobbyPage.getByTestId(`lobby-room-${roomId}`)).toContainText(
      'Live',
      {
        timeout: 15000,
      }
    );

    await spectatorPage.goto('/');
    await spectatorPage.getByTestId('lobby-display-name-input').fill('Spectator');
    await expect(
      spectatorPage.getByTestId(`lobby-room-${roomId}`)
    ).toContainText('Live', {
      timeout: 15000,
    });
    await spectatorPage.getByTestId(`lobby-room-${roomId}`).click();
    await spectatorPage.getByTestId('online-lobby-join-selected-button').click();

    await expect(spectatorPage.getByTestId('game-board')).toBeVisible();
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
  } finally {
    await lobbyContext.close();
    await guestContext.close();
    await spectatorContext.close();
  }
});
