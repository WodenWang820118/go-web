import { expect, Page, test } from '@playwright/test';
import {
  createHostedRoom,
  useEnglish,
  waitForApiHealth,
} from './online-room-test-helpers';

test('creates a gomoku hosted room from the lobby dialog', async ({ page }) => {
  await waitForApiHealth();

  await useEnglish(page);
  const roomId = await createHostedRoom(page, 'Gomoku Host', {
    mode: 'gomoku',
  });

  await expect(page).toHaveURL(new RegExp(`/online/room/${roomId}$`));
  await expect(page.getByTestId('room-layout')).toBeVisible();
  await expect(page.getByTestId('claim-black')).toBeVisible();
});

test('online room auto-starts once both seats are claimed and both players can accept a rematch', async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const guestContext = await browser.newContext();
  const spectatorContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  const spectatorPage = await spectatorContext.newPage();

  try {
    await waitForApiHealth();

    await useEnglish(page);
    const roomId = await createHostedRoom(page, 'Host', { mode: 'gomoku' });

    await useEnglish(guestPage);
    await guestPage.goto(`/online/room/${roomId}`);
    await guestPage
      .getByTestId('join-room-form')
      .getByLabel('Display name')
      .fill('Guest');
    await guestPage.getByRole('button', { name: 'Join room' }).click();

    await expect(page.getByTestId('claim-black')).toBeVisible();
    await expect(guestPage.getByTestId('claim-white')).toBeVisible();

    await page.getByTestId('claim-black').click();
    await guestPage.getByTestId('claim-white').click();

    await expect(page.getByTestId('game-board')).toBeVisible();
    await expect(guestPage.getByTestId('game-board')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resign' })).toBeVisible();
    await expect(
      guestPage.getByRole('button', { name: 'Resign' }),
    ).toBeVisible();

    await useEnglish(spectatorPage);
    await spectatorPage.goto(`/online/room/${roomId}`);
    await spectatorPage
      .getByTestId('join-room-form')
      .getByLabel('Display name')
      .fill('Spectator');
    await spectatorPage.getByRole('button', { name: 'Join room' }).click();

    await expect(spectatorPage.getByTestId('join-room-form')).toHaveCount(0);
    await expect(spectatorPage.getByTestId('game-board')).toBeVisible();
    const spectatorChatInput = spectatorPage.getByTestId('chat-message-input');
    await expect(spectatorChatInput).toBeEditable();
    await spectatorChatInput.fill('Watching live');
    await spectatorChatInput.press('Enter');
    await expect(page.getByText('Watching live')).toBeVisible();

    await page.getByRole('button', { name: 'Resign' }).click();

    await expect(page.getByTestId('room-resign-result-dialog')).toBeVisible();
    await expect(
      guestPage.getByTestId('room-resign-result-dialog'),
    ).toBeVisible();
    await expect(
      spectatorPage.getByTestId('room-resign-result-dialog'),
    ).toBeVisible();

    await page.getByTestId('room-resign-result-dialog-close').click();
    await guestPage.getByTestId('room-resign-result-dialog-close').click();
    await spectatorPage.getByTestId('room-resign-result-dialog-close').click();

    await expect(page.getByTestId('room-rematch-dialog')).toBeVisible();
    await expect(guestPage.getByTestId('room-rematch-dialog')).toBeVisible();
    await expect(
      spectatorPage.getByTestId('room-rematch-dialog'),
    ).toBeVisible();
    await expect(
      spectatorPage.getByTestId('room-rematch-dialog-close'),
    ).toBeVisible();
    await spectatorPage.getByTestId('room-rematch-dialog-close').click();
    await expect(spectatorPage.getByTestId('room-rematch-dialog')).toHaveCount(
      0,
    );

    await page.getByTestId('room-rematch-dialog-accept').click();
    await expect(
      guestPage.getByTestId('room-rematch-dialog-status-black'),
    ).toContainText('Ready');

    await guestPage.getByTestId('room-rematch-dialog-accept').click();

    await expect(page.getByTestId('room-rematch-dialog')).toHaveCount(0);
    await expect(guestPage.getByTestId('room-rematch-dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Resign' })).toBeVisible();
    await expect(
      guestPage.getByRole('button', { name: 'Resign' }),
    ).toBeVisible();

    await page.getByTestId('intersection-0-0').click();
    await expect(
      page
        .getByTestId('intersection-0-0')
        .locator('circle[fill="url(#stone-black)"]'),
    ).toHaveCount(1);
    await expect(
      guestPage
        .getByTestId('intersection-0-0')
        .locator('circle[fill="url(#stone-black)"]'),
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
  test.setTimeout(60_000);

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  try {
    await waitForApiHealth();

    await useEnglish(page);
    const roomId = await createHostedRoom(page, 'Host', { mode: 'gomoku' });

    await useEnglish(guestPage);
    await guestPage.goto(`/online/room/${roomId}`);
    await guestPage
      .getByTestId('join-room-form')
      .getByLabel('Display name')
      .fill('Guest');
    await guestPage.getByRole('button', { name: 'Join room' }).click();

    await page.getByTestId('claim-black').click();
    await guestPage.getByTestId('claim-white').click();
    await expect(page.getByTestId('game-board')).toBeVisible();

    await page.getByRole('button', { name: 'Resign' }).click();

    await expect(page.getByTestId('room-resign-result-dialog')).toBeVisible();
    await expect(
      guestPage.getByTestId('room-resign-result-dialog'),
    ).toBeVisible();

    await page.getByTestId('room-resign-result-dialog-close').click();
    await guestPage.getByTestId('room-resign-result-dialog-close').click();

    await expect(page.getByTestId('room-rematch-dialog')).toBeVisible();
    await expect(guestPage.getByTestId('room-rematch-dialog')).toBeVisible();

    await page.getByTestId('room-rematch-dialog-decline').click();

    await expect(guestPage.getByTestId('room-rematch-dialog')).toHaveCount(0);
    await expect(
      page.getByTestId('room-sidebar-message-rematch-blocked'),
    ).toBeVisible();
    await expect(
      guestPage.getByTestId('room-sidebar-message-rematch-blocked'),
    ).toBeVisible();

    await page.getByTestId('release-black').click();
    await expect(page.getByTestId('claim-black')).toBeVisible();
    await page.getByTestId('claim-black').click();

    await expect(
      page.getByTestId('room-sidebar-message-rematch-blocked'),
    ).toHaveCount(0);
    await expect(
      guestPage.getByTestId('room-sidebar-message-rematch-blocked'),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Resign' })).toBeVisible();
    await expect(
      guestPage.getByRole('button', { name: 'Resign' }),
    ).toBeVisible();
  } finally {
    await guestContext.close();
  }
});

test('hosted Go resolves nigiri, shows clocks, and completes scoring agreement', async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  try {
    await waitForApiHealth();

    await useEnglish(page);
    const roomId = await createHostedRoom(page, 'Go Host', {
      mode: 'go',
      boardSize: 9,
    });

    await useEnglish(guestPage);
    await guestPage.goto(`/online/room/${roomId}`);
    await guestPage
      .getByTestId('join-room-form')
      .getByLabel('Display name')
      .fill('Go Guest');
    await guestPage.getByRole('button', { name: 'Join room' }).click();

    await page.getByTestId('claim-black').click();
    await guestPage.getByTestId('claim-white').click();

    await expect(
      guestPage.getByTestId('room-sidebar-nigiri-panel'),
    ).toBeVisible();
    await guestPage.getByTestId('room-nigiri-guess-odd').click();
    await expect(page.getByTestId('room-sidebar-nigiri-panel')).toContainText(
      /takes Black/,
    );

    await expect(page.getByTestId('game-board')).toBeVisible();
    await expect(guestPage.getByTestId('game-board')).toBeVisible();
    await expect(
      page.locator('[aria-label*="Main time"]').first(),
    ).toBeVisible();
    await expect(
      guestPage.locator('[aria-label*="Main time"]').first(),
    ).toBeVisible();

    const { blackPage, whitePage } = await resolveNigiriTurnPages(
      page,
      guestPage,
    );

    await expect(
      blackPage.getByRole('button', { name: 'Pass', exact: true }),
    ).toBeEnabled();
    await blackPage.getByRole('button', { name: 'Pass', exact: true }).click();
    await expect(
      whitePage.getByRole('button', { name: 'Pass', exact: true }),
    ).toBeEnabled();
    await whitePage.getByRole('button', { name: 'Pass', exact: true }).click();

    await expect(page.getByTestId('room-confirm-scoring')).toBeVisible();
    await expect(guestPage.getByTestId('room-confirm-scoring')).toBeVisible();

    await page.getByTestId('room-confirm-scoring').click();
    await guestPage.getByTestId('room-confirm-scoring').click();

    await expect(page.getByText(/wins by/i).first()).toBeVisible();
    await expect(guestPage.getByText(/wins by/i).first()).toBeVisible();
    await expect(page.getByTestId('room-rematch-dialog')).toBeVisible();
    await expect(guestPage.getByTestId('room-rematch-dialog')).toBeVisible();
  } finally {
    await guestContext.close();
  }
});

async function resolveNigiriTurnPages(
  hostPage: Page,
  guestPage: Page,
): Promise<{ blackPage: Page; whitePage: Page }> {
  const nigiriText =
    (await hostPage.getByTestId('room-sidebar-nigiri-panel').textContent()) ??
    '';

  return nigiriText.includes('Go Host takes Black')
    ? { blackPage: hostPage, whitePage: guestPage }
    : { blackPage: guestPage, whitePage: hostPage };
}
