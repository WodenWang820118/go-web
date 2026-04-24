import { expect, Page, test } from '@playwright/test';
import { useEnglish } from './online-room-test-helpers';
import {
  createDenseLobbyRooms,
  createLobbyRoom,
  mockLobby,
} from './test-support/lobby-fixtures';

test('uses zh-TW by default and persists an English override across reloads', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(
    page.getByRole('link', { name: '開始本機圍棋', exact: true }),
  ).toBeVisible();

  await page.getByTestId('locale-option-en').click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('link', { name: 'Start local Go', exact: true }),
  ).toBeVisible();

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('link', { name: 'Start local Go', exact: true }),
  ).toBeVisible();
});

test('starts a Go match and enters the scoring flow', async ({ page }) => {
  await useEnglish(page);

  await clickLocalLink(page, '/setup/go');
  await expect(page.getByTestId('setup-form')).toBeVisible();

  await page.getByTestId('setup-nigiri-odd-button').click();
  await expect(page.getByTestId('setup-nigiri-result')).toContainText(
    /starts as Black/i,
  );
  await expect(
    page.getByRole('button', { name: /start local match/i }),
  ).toBeEnabled();
  await page.getByRole('button', { name: /start local match/i }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();

  await page.getByRole('button', { name: 'Pass' }).click();
  await page.getByRole('button', { name: 'Pass' }).click();

  await expect(
    page.getByRole('button', { name: /black confirms/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /white confirms/i }),
  ).toBeVisible();
});

test('starts a Gomoku match and creates five in a row', async ({ page }) => {
  await useEnglish(page);

  await clickLocalLink(page, '/setup/gomoku');
  await page.getByRole('button', { name: /start local match/i }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();

  for (const point of [
    '3-7',
    '0-0',
    '4-7',
    '0-1',
    '5-7',
    '0-2',
    '6-7',
    '0-3',
    '7-7',
  ]) {
    await page.getByTestId(`intersection-${point}`).click();
  }

  const resultDialog = page.getByTestId('match-result-dialog');
  await expect(resultDialog).toBeVisible();
  await expect(resultDialog.getByText(/five in a row/i)).toBeVisible();
});

test('keeps the desktop lobby pinned to the viewport while the room table scrolls internally', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockLobby(page, createDenseLobbyRooms());
  await useEnglish(page);

  const scrollOverflow = await page.evaluate(() => {
    const root = document.scrollingElement;
    return root ? root.scrollHeight - window.innerHeight : 0;
  });
  expect(scrollOverflow).toBeLessThanOrEqual(1);

  const panel = page.getByTestId('lobby-room-table-scroll');
  const header = page.getByTestId('lobby-room-table-head');

  await expect(panel).toBeVisible();
  await expect(page.getByTestId('lobby-announcement-panel')).toBeVisible();
  await expect(page.getByTestId('lobby-online-players-panel')).toBeVisible();

  const panelMetrics = await panel.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
  }));
  expect(panelMetrics.scrollHeight).toBeGreaterThan(panelMetrics.clientHeight);

  const beforeHeader = await header.boundingBox();
  await panel.evaluate((node) => {
    node.scrollTop = 480;
    node.dispatchEvent(new Event('scroll'));
  });
  const afterScrollTop = await panel.evaluate((node) => node.scrollTop);
  const afterHeader = await header.boundingBox();

  expect(afterScrollTop).toBeGreaterThan(0);
  expect(Math.abs((beforeHeader?.y ?? 0) - (afterHeader?.y ?? 0))).toBeLessThan(
    4,
  );
});

test('shows the dense lobby with announcement and online-player panels on tablet widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await mockLobby(page, createDenseLobbyRooms());
  await useEnglish(page);

  const scrollOverflow = await page.evaluate(() => {
    const root = document.scrollingElement;
    return root ? root.scrollHeight - window.innerHeight : 0;
  });
  expect(scrollOverflow).toBeLessThanOrEqual(1);

  await page.getByTestId('lobby-tab-ready').click();
  await expect(page.getByTestId('lobby-room-READY05')).toBeVisible();
  await expect(page.getByTestId('lobby-announcement-panel')).toBeVisible();
  await expect(page.getByTestId('lobby-online-players-panel')).toBeVisible();
  await expect(page.getByTestId('online-lobby-selected-room')).toHaveCount(0);
});

test('renders stacked mobile cards with working open-room and join actions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockLobby(page, [
    createLobbyRoom('WAIT01', 'waiting', 'Waiting Host 01'),
    createLobbyRoom('WAIT02', 'waiting', 'Waiting Host 02'),
  ]);
  await useEnglish(page);

  await expect(page.getByTestId('online-lobby-selected-room')).toHaveCount(0);
  await expect(page.getByTestId('lobby-mobile-room-WAIT01')).toBeVisible();
  await expect(page.getByTestId('lobby-announcement-panel')).toBeVisible();
  await expect(page.getByTestId('lobby-online-players-panel')).toBeVisible();

  await page.getByTestId('online-lobby-mobile-open-WAIT01').click();
  await expect(page).toHaveURL(/\/online\/room\/WAIT01$/);
  await expect(page.getByTestId('room-layout')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('lobby-mobile-room-WAIT01')).toBeVisible();

  await page.getByTestId('lobby-display-name-input').fill('Captain');
  await page.getByTestId('online-lobby-mobile-primary-WAIT01').click();
  await expect(page).toHaveURL(/\/online\/room\/WAIT01$/);
  await expect(page.getByTestId('room-layout')).toBeVisible();
});

async function clickLocalLink(
  page: Page,
  href: '/setup/go' | '/setup/gomoku',
): Promise<void> {
  await page
    .locator(`a[href="${href}"]`)
    .evaluate((node: HTMLAnchorElement) => node.click());
}
