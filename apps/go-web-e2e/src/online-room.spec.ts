import { expect, test } from '@playwright/test';

test('moves a hosted room from waiting to ready to live through the online lobby', async ({
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
    await page.getByRole('link', { name: 'Open online lobby', exact: true }).click();
    await page
      .getByTestId('online-lobby-create-form')
      .getByRole('textbox')
      .fill('Host');
    await page.getByRole('button', { name: /create room/i }).click();
    await expect(page).toHaveURL(/\/online\/room\/[A-Z0-9]+$/, {
      timeout: 10000,
    });
    await expect(page.getByText(/You are here as/i)).toBeVisible({
      timeout: 10000,
    });

    const roomIdMatch = page.url().match(/\/online\/room\/([A-Z0-9]+)$/);
    expect(roomIdMatch?.[1]).toBeTruthy();
    const roomId = roomIdMatch![1];
    const serverHost = new URL(page.url()).hostname;

    await expect
      .poll(
        async () => await fetchLobbyStatus(roomId, serverHost),
        {
          timeout: 15000,
        }
      )
      .toBe('waiting');

    await lobbyPage.goto('/');
    await lobbyPage.getByRole('link', { name: 'Open online lobby', exact: true }).click();
    const lobbyCard = lobbyPage.getByTestId(`lobby-room-${roomId}`);
    await expect(lobbyCard).toContainText('Waiting - open seats');

    await guestPage.goto('/');
    await guestPage.getByRole('link', { name: 'Open online lobby', exact: true }).click();
    await guestPage
      .getByTestId(`lobby-room-${roomId}`)
      .getByRole('link', { name: /open room/i })
      .click();
    await guestPage.getByTestId('join-room-form').getByRole('textbox').fill('Guest');
    await guestPage.getByRole('button', { name: /join room/i }).click();

    await expect(page.getByTestId('claim-black')).toBeVisible();
    await expect(guestPage.getByTestId('claim-white')).toBeVisible();

    await page.getByTestId('claim-black').click();
    await guestPage.getByTestId('claim-white').click();

    await expect
      .poll(
        async () => await fetchLobbyStatus(roomId, serverHost),
        {
          timeout: 15000,
        }
      )
      .toBe('ready');

    await lobbyPage.goto('/');
    await lobbyPage.getByRole('link', { name: 'Open online lobby', exact: true }).click();
    await expect(lobbyPage.getByTestId(`lobby-room-${roomId}`)).toContainText(
      'Ready - waiting for host start'
    );

    await expect(page.getByTestId('start-hosted-match')).toBeEnabled();
    await page.getByTestId('start-hosted-match').click();

    await expect(page.getByTestId('game-board')).toBeVisible();
    await expect(guestPage.getByTestId('game-board')).toBeVisible();

    await expect
      .poll(
        async () => await fetchLobbyStatus(roomId, serverHost),
        {
          timeout: 15000,
        }
      )
      .toBe('live');

    await lobbyPage.goto('/');
    await lobbyPage.getByRole('link', { name: 'Open online lobby', exact: true }).click();
    await expect(lobbyPage.getByTestId(`lobby-room-${roomId}`)).toContainText(
      'Live - watch and chat'
    );

    await spectatorPage.goto('/');
    await spectatorPage
      .getByRole('link', { name: 'Open online lobby', exact: true })
      .click();
    await spectatorPage
      .getByTestId(`lobby-room-${roomId}`)
      .getByRole('link', { name: /watch room/i })
      .click();
    await expect(spectatorPage.getByText('Join as spectator')).toBeVisible();
    await spectatorPage
      .getByTestId('join-room-form')
      .getByRole('textbox')
      .fill('Spectator');
    await spectatorPage.getByRole('button', { name: /join room/i }).click();

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

async function fetchLobbyStatus(
  roomId: string,
  serverHost: string
): Promise<string | null> {
  const response = await fetch(`http://${serverHost}:3000/api/rooms`);

  if (!response.ok) {
    return null;
  }

  try {
    const body = (await response.json()) as {
      rooms?: Array<{
        roomId: string;
        status: string;
      }>;
    };

    if (!Array.isArray(body.rooms)) {
      return null;
    }

    return body.rooms.find(room => room.roomId === roomId)?.status ?? null;
  } catch {
    return null;
  }
}
