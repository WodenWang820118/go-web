import { expect, test } from '@playwright/test';
import { CreateRoomResponse } from '@org/go/contracts';

test('hosts a shared online room with players, spectator, and live chat', async ({
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

    await page.goto('/');
    const hostResult = await page.evaluate(async () => {
      const response = await fetch('http://127.0.0.1:3000/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: 'Host',
        }),
      });

      return {
        ok: response.ok,
        body: (await response.json()) as CreateRoomResponse,
      };
    });
    expect(hostResult.ok).toBeTruthy();
    const host = hostResult.body;

    await page.evaluate(identity => {
      localStorage.setItem(
        `gx.go.online.room.${identity.roomId}`,
        JSON.stringify(identity.value)
      );
    }, {
      roomId: host.roomId,
      value: {
        displayName: 'Host',
        participantId: host.participantId,
        participantToken: host.participantToken,
      },
    });

    const roomUrl = `/online/room/${host.roomId}`;
    await page.goto(roomUrl);
    await expect(page.getByText(/You are here as/i)).toBeVisible();

    await guestPage.goto(roomUrl);
    await guestPage.getByTestId('join-room-form').getByRole('textbox').fill('Guest');
    await guestPage.getByRole('button', { name: /join room/i }).click();

    await spectatorPage.goto(roomUrl);
    await spectatorPage
      .getByTestId('join-room-form')
      .getByRole('textbox')
      .fill('Spectator');
    await spectatorPage.getByRole('button', { name: /join room/i }).click();

    await expect(page.getByTestId('claim-black')).toBeVisible();
    await expect(guestPage.getByTestId('claim-white')).toBeVisible();

    await page.getByTestId('claim-black').click();
    await guestPage.getByTestId('claim-white').click();

    await expect(page.getByTestId('start-hosted-match')).toBeEnabled();
    await page.getByTestId('start-hosted-match').click();

    await expect(page.getByTestId('game-board')).toBeVisible();
    await expect(guestPage.getByTestId('game-board')).toBeVisible();
    await expect(spectatorPage.getByTestId('game-board')).toBeVisible();

    await page.getByTestId('intersection-7-7').click({ force: true });
    await expect(page.getByText(/1 moves/i)).toBeVisible();
    await expect(guestPage.getByText(/1 moves/i)).toBeVisible();
    await expect(spectatorPage.getByText(/1 moves/i)).toBeVisible();

    await spectatorPage.getByTestId('chat-message-input').fill('Watching live');
    await spectatorPage.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Watching live')).toBeVisible();
    await expect(guestPage.getByText('Watching live')).toBeVisible();
  } finally {
    await guestContext.close();
    await spectatorContext.close();
  }
});
